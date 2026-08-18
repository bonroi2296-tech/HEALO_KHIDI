/**
 * healwith: Patient Documents API (authenticated, cross-consultation)
 *
 * GET    /api/patient/documents            — 로그인 환자 본인의 모든 의료 문서 목록
 * POST   /api/patient/documents            — 의료 문서 업로드 (consultationId 선택)
 * DELETE /api/patient/documents?id=<uuid>  — 본인 문서 소프트 삭제(deleted_at, 파일·행은 남김)
 *
 * 환자가 본인의 모든 상담에 걸쳐 업로드한 문서를 한 곳에서 조회/업로드합니다.
 * consultation_id가 NOT NULL이므로, 업로드 시 consultationId가 필요합니다.
 * 클라이언트는 consultation 목록에서 선택해 업로드합니다.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { uploadLimiter } from "@/lib/api/rateLimiter";
import { sanitizeString } from "@/lib/api/sanitize";
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from "@/lib/storage/directUpload";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/dicom",
];

// 예전엔 20MB 라고 적어놓고 실제로는 4.5MB 에서 끊겼다(서버 경유 방식의 Vercel 본문 한도).
// 지금은 브라우저 → Storage 직행이라 이 숫자가 진짜 상한이다(실측: 200MB 성공 / 201MB 거부).
const MAX_SIZE = 200 * 1024 * 1024;

async function getAuthUser(request: NextRequest) {
  const supabase = createSupabaseServerClientFromRequest(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ─── GET: 환자 본인의 모든 문서 목록 ───
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // 본인 consultation_sessions 조회
  const { data: sessions, error: sessionErr } = await supabaseAdmin
    .from("consultation_sessions")
    .select("id, session_type, scheduled_at, status")
    // 계정 생성 세션은 patient_user_id 에 저장됨(레거시 일부만 patient_id). 둘 다 매칭.
    .or(`patient_user_id.eq.${user.id},patient_id.eq.${user.id}`);

  if (sessionErr) {
    console.error("[patient/documents] sessions error:", sessionErr.message);
    return Response.json(
      { ok: false, error: "sessions_query_failed" },
      { status: 500 }
    );
  }

  const sessionIds = (sessions || []).map((s) => s.id);
  const sessionMap = new Map(
    (sessions || []).map((s) => [s.id, s])
  );

  if (sessionIds.length === 0) {
    return Response.json({ ok: true, data: [], consultations: [] });
  }

  // 모든 consultation의 문서 조회
  const { data: docs, error: docErr } = await supabaseAdmin
    .from("consultation_documents")
    .select(
      "id, consultation_id, file_name, file_type, file_size, storage_path, document_type, description, created_at"
    )
    .in("consultation_id", sessionIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (docErr) {
    console.error("[patient/documents] docs error:", docErr.message);
    return Response.json(
      { ok: false, error: "documents_query_failed" },
      { status: 500 }
    );
  }

  // 각 문서에 signed URL 생성 + consultation 정보 포함
  const docsWithUrls = await Promise.all(
    (docs || []).map(async (doc) => {
      const { data: urlData } = await supabaseAdmin.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 3600);
      const session = sessionMap.get(doc.consultation_id);
      return {
        ...doc,
        url: urlData?.signedUrl || null,
        consultation: session || null,
      };
    })
  );

  return Response.json({
    ok: true,
    data: docsWithUrls,
    consultations: sessions || [],
  });
}

// ─── POST: 문서 업로드 ───
export async function POST(request: NextRequest) {
  try {
    const limited = uploadLimiter.check(request);
    if (limited) return limited;

    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const consultationId = sanitizeString(body.consultationId, 64);
    // 일부 화면은 docType 키로 보냄 (DocumentsPremium) → 둘 다 수용해 문서 종류 보존.
    const documentType = sanitizeString(body.documentType ?? body.docType, 50) || "other";
    const description = sanitizeString(body.description, 500);

    if (!consultationId) {
      return Response.json(
        { ok: false, error: "consultationId is required" },
        { status: 400 }
      );
    }

    // 본인 consultation인지 확인 — sign·commit 두 단계 모두에서 검사한다.
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id, patient_id, patient_user_id")
      .eq("id", consultationId)
      .single();

    if (sessionErr || !session) {
      return Response.json(
        { ok: false, error: "Consultation not found" },
        { status: 404 }
      );
    }
    // 계정 세션은 patient_user_id, 레거시는 patient_id — 둘 중 하나라도 본인이면 허용
    if (session.patient_user_id !== user.id && session.patient_id !== user.id) {
      return Response.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const dir = `consultations/${consultationId}`;

    // ── 2단계: 업로드 끝난 파일 검증 + 문서 기록 저장 ──
    if (body.phase === "commit") {
      const storagePath = String(body.path || "");
      if (!isOwnPath(dir, storagePath)) {
        return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
      }
      const fileType = normalizeMime(storagePath, String(body.type || ""));
      const verified = await verifyUploaded("documents", storagePath, fileType, MAX_SIZE);
      if (!verified.ok) {
        return Response.json({ ok: false, error: verified.error }, { status: 400 });
      }

      const { data: doc, error: dbError } = await supabaseAdmin
        .from("consultation_documents")
        .insert({
          consultation_id: consultationId,
          file_name: sanitizeString(body.name, 200),
          file_type: fileType,
          file_size: verified.size, // 선언값이 아니라 실제 저장된 크기
          storage_path: storagePath,
          document_type: documentType,
          description,
        })
        .select()
        .single();

      // 같은 commit 이 두 번 오면(브라우저 재전송 — 2026-08-18 실사고: 0.4초 간격 2번 → 목록 2줄)
      // DB 유일 인덱스(storage_path, 살아있는 줄)가 두 번째를 막는다. 그때는 실패가 아니라
      // «이미 저장된 그 줄»을 돌려준다. 여기서 파일을 지우면 첫 줄이 빈 파일을 가리키게 된다 — 절대 금지.
      if (dbError?.code === "23505") {
        const { data: existing } = await supabaseAdmin
          .from("consultation_documents")
          .select()
          .eq("storage_path", storagePath)
          .is("deleted_at", null)
          .maybeSingle();
        if (existing) return Response.json({ ok: true, data: existing });
      }

      if (dbError) {
        console.error("[patient/documents] db error:", dbError);
        await supabaseAdmin.storage.from("documents").remove([storagePath]);
        return Response.json(
          { ok: false, error: "Failed to save document metadata" },
          { status: 500 }
        );
      }

      return Response.json({ ok: true, data: doc });
    }

    // ── 1단계: 서명 URL 발급 ──
    const signed = await issueUploadUrl(body, {
      bucket: "documents",
      dir,
      allowed: ALLOWED_TYPES,
      maxBytes: MAX_SIZE,
    });
    if (!signed.ok) {
      return Response.json(
        { ok: false, error: signed.error, detail: signed.detail },
        { status: signed.status }
      );
    }
    return Response.json({
      ok: true,
      signedUrl: signed.signedUrl,
      path: signed.path,
      name: signed.name,
      type: signed.type,
    });
  } catch (error: any) {
    console.error("[patient/documents] exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

// ─── DELETE: 본인 문서 소프트 삭제 (?id=) ───
// 소프트인 이유: 기록 보존 원칙(docs/rules/SELF_QA.md). 상담·소견의 근거였을 수 있는 자료라
// 행·파일은 남기고 deleted_at 만 찍는다 → 환자·코디·상담방 목록 전부에서 사라진다.
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const id = sanitizeString(request.nextUrl.searchParams.get("id"), 64);
    if (!id) {
      return Response.json({ ok: false, error: "id_required" }, { status: 400 });
    }

    const { data: doc } = await supabaseAdmin
      .from("consultation_documents")
      .select("id, consultation_id, deleted_at")
      .eq("id", id)
      .maybeSingle();
    if (!doc) {
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    // 이미 지운 것 — 다시 눌러도(재전송 포함) 탈 없이
    if (doc.deleted_at) return Response.json({ ok: true });

    // 본인 상담의 문서인지 — POST 와 같은 기준(계정 세션 patient_user_id, 레거시 patient_id)
    const { data: session } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id, patient_id, patient_user_id")
      .eq("id", doc.consultation_id)
      .maybeSingle();
    if (!session || (session.patient_user_id !== user.id && session.patient_id !== user.id)) {
      return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from("consultation_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[patient/documents] delete error:", error.message);
      return Response.json({ ok: false, error: "delete_failed" }, { status: 500 });
    }
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("[patient/documents] delete exception:", error);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
