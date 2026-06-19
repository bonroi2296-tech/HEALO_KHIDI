/**
 * healwith: 관리자 이미지 업로드 API
 * 
 * 경로: /api/admin/upload
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 브라우저에서 직접 Storage 접근 차단
 * - 서버에서 service_role로 안전하게 업로드
 * - 파일 크기/타입 검증
 * - 업로드 이력 감사 로그
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "@/lib/audit/adminAuditLog";

// 허용된 이미지 MIME 타입
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// 최대 파일 크기 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST: 이미지 업로드 (관리자 전용)
 * 
 * Content-Type: multipart/form-data
 * Body: FormData with 'file' field
 * 
 * Response:
 * {
 *   ok: true,
 *   url: "https://..."
 * }
 */
export async function POST(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // 1. 관리자 권한 확인
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response;
  }
  const { authResult } = auth;

  // ========================================
  // 2. FormData 파싱
  // ========================================
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { ok: false, error: "invalid_form_data", detail: "FormData 파싱 실패" },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json(
      { ok: false, error: "file_required", detail: "파일이 필요합니다." },
      { status: 400 }
    );
  }

  // ========================================
  // 3. 파일 검증
  // ========================================

  // 3.1. MIME 타입 검증
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return Response.json(
      {
        ok: false,
        error: "invalid_file_type",
        detail: `허용되지 않는 파일 타입: ${file.type}. JPG, PNG, WEBP, GIF만 가능합니다.`,
      },
      { status: 400 }
    );
  }

  // 3.2. 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      {
        ok: false,
        error: "file_too_large",
        detail: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 가능합니다.`,
      },
      { status: 400 }
    );
  }

  // ========================================
  // 4. 파일명 생성 (충돌 방지)
  // ========================================
  const fileExt = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const fileName = `${timestamp}-${randomId}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  // ========================================
  // 5. Storage 업로드 (service_role)
  // ========================================
  try {
    // File을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("images")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[admin/upload] Storage upload error:", uploadError.message);
      return Response.json(
        {
          ok: false,
          error: "upload_failed",
        },
        { status: 500 }
      );
    }

    // ========================================
    // 6. Public URL 생성
    // ========================================
    const { data: urlData } = supabaseAdmin.storage
      .from("images")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // ========================================
    // 7. 감사 로그 기록
    // ========================================
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "UPLOAD_IMAGE",
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: {
        file_name: fileName,
        file_size: file.size,
        file_type: file.type,
        url: publicUrl,
      },
    }).catch((err) => {
      console.error("[admin/upload] Audit log failed:", err.message);
    });

    // ========================================
    // 8. 응답 반환
    // ========================================
    console.log(`[admin/upload] ✅ Uploaded: ${fileName} (${file.size} bytes)`);
    return Response.json({
      ok: true,
      url: publicUrl,
      fileName,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error: any) {
    console.error("[admin/upload] Exception:", error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    );
  }
}
