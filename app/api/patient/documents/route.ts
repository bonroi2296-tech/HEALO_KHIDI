/**
 * HEALO: Patient Documents API (authenticated, cross-consultation)
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
import { createSupabaseServerClientFromRequest } from "../../../../src/lib/supabase/server";
import { supabaseAdmin } from "../../../../src/lib/rag/supabaseAdmin";
import { uploadLimiter } from "../../../../src/lib/api/rateLimiter";
import { sanitizeString } from "../../../../src/lib/api/sanitize";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/dicom",
];

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

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
    .eq("patient_id", user.id);

  if (sessionErr) {
    console.error("[patient/documents] sessions error:", sessionErr.message);
    return Response.json(
      { ok: false, error: sessionErr.message },
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
      { ok: false, error: docErr.message },
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const consultationId = sanitizeString(
      formData.get("consultationId") as string,
      64
    );
    const documentType =
      sanitizeString(formData.get("documentType") as string, 50) || "other";
    const description = sanitizeString(
      formData.get("description") as string,
      500
    );

    if (!file) {
      return Response.json(
        { ok: false, error: "No file provided" },
        { status: 400 }
      );
    }
    if (!consultationId) {
      return Response.json(
        { ok: false, error: "consultationId is required" },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        {
          ok: false,
          error: `File type not allowed. Accepted: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return Response.json(
        {
          ok: false,
          error: `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // 본인 consultation인지 확인
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from("consultation_sessions")
      .select("id, patient_id")
      .eq("id", consultationId)
      .single();

    if (sessionErr || !session) {
      return Response.json(
        { ok: false, error: "Consultation not found" },
        { status: 404 }
      );
    }
    if (session.patient_id !== user.id) {
      return Response.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // 업로드
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `consultations/${consultationId}/${Date.now()}_${crypto
      .randomUUID()
      .slice(0, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[patient/documents] upload error:", uploadError);
      return Response.json(
        { ok: false, error: "Failed to upload file" },
        { status: 500 }
      );
    }

    const { data: doc, error: dbError } = await supabaseAdmin
      .from("consultation_documents")
      .insert({
        consultation_id: consultationId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
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
  } catch (error: any) {
    console.error("[patient/documents] exception:", error);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
