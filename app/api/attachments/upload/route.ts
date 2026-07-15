/**
 * healwith: 첨부파일 서버 경유 업로드 API (공개 — 인테이크 플로우)
 *
 * 보안:
 * - Rate limit (IP당 분당 5회) — storage 폭파 방지
 * - 파일 크기 제한 (10MB)
 * - MIME 화이트리스트
 * - 파일명 sanitize + crypto.randomUUID 경로 — enumeration 방지
 *
 * ⚠️ 과거 버전은 무제한 익명 업로드 허용 → 아무나 10MB 파일 무제한 업로드 가능했음.
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { randomUUID } from "node:crypto";
import { verifyFileMagic } from "@/lib/security/fileMagic";

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

// Public upload 전용 rate limit: 분당 5회 (봇 차단, 정상 사용자는 충분)
const UPLOAD_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 5,
  apiName: "attachments_upload",
};

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9가-힣._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  // ✅ Rate limit 먼저
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(clientIp, UPLOAD_RATE);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited", detail: rl.reason },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

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
    // ✅ 파일명 enumeration 방지를 위해 randomUUID prefix 사용
    const filePath = `inquiry/${randomUUID()}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Magic bytes 검증 — content-type spoofing 차단
    const magicCheck = verifyFileMagic(buffer, file.type);
    if (!magicCheck.ok) {
      console.warn(
        `[api/attachments/upload] magic check failed: declared=${file.type} reason=${magicCheck.reason}`
      );
      return Response.json(
        { ok: false, error: "invalid_file_content" },
        { status: 400 }
      );
    }

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

    return Response.json(
      {
        ok: true,
        path: filePath,
        // U+FFFD 세척: zip 등에서 깨진 키릴 파일명이 그대로 돌아가면 클라가 이후 요청 본문에
        // 실어 보내다 인코딩 가드(#92)에 계속 400으로 막힘 — 표시용 이름이라 제거해도 무손실.
        name: file.name.replace(/�/g, ""),
        type: file.type,
      },
      { headers: getRateLimitHeaders(rl) }
    );
  } catch (err) {
    console.error("[api/attachments/upload] unexpected error:", err);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
