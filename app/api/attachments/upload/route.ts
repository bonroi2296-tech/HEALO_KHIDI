/**
 * HEALO: 첨부파일 서버 경유 업로드 API
 * 
 * 클라이언트가 Supabase Storage에 직접 업로드하는 대신
 * 서버에서 검증 후 service_role로 업로드합니다.
 * 
 * 보안:
 * - 파일 크기 제한 (10MB)
 * - 허용 MIME 타입 제한
 * - 파일명 sanitize
 * - inquiry/ 경로에만 업로드 허용
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { NextRequest } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json(
        { ok: false, error: "file_required" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { ok: false, error: "file_too_large", maxSize: "10MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { ok: false, error: "invalid_file_type", allowed: Array.from(ALLOWED_TYPES) },
        { status: 400 }
      );
    }

    const safeName = sanitizeFileName(file.name);
    const filePath = `inquiry/${Date.now()}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("attachments")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[api/attachments/upload] storage error:", uploadError);
      return Response.json(
        { ok: false, error: "upload_failed" },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      path: filePath,
      name: file.name,
      type: file.type,
    });
  } catch (err) {
    console.error("[api/attachments/upload] unexpected error:", err);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
