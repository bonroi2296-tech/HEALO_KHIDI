/**
 * healwith: Patient Documents API (authenticated, cross-consultation)
 *
 * GET  /api/patient/documents              — 로그인 환자 본인의 모든 의료 문서 목록
 * POST /api/patient/documents              — 의료 문서 업로드 (consultationId 선택)
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
// 지금은 브라우저 → Storage 직행이라 이 숫자가 진짜 상한이다.
const MAX_SIZE = 50 * 1024 * 1024;

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
