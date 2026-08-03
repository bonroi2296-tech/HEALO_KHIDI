/**
 * healwith: 첨부파일 업로드 — 서명 URL 발급 + 업로드 후 검증 (공개 — 인테이크 플로우)
 *
 * 왜 서버 경유(multipart)를 버렸나 (2026-08-03):
 *   Vercel 함수는 요청 본문이 4.5MB 를 넘으면 우리 코드에 닿기 전에 413 으로 끊는다
 *   (실측: 4MB 통과 / 5MB FUNCTION_PAYLOAD_TOO_LARGE). 화면엔 "10MB 까지"라고 적혀 있었으니
 *   5~10MB 파일은 안내대로 올려도 이유 없이 실패했다. 문의 #60 (131MB PDF) 이 드러낸 문제.
 *   → 브라우저가 Supabase Storage 로 직접 올리게 하고(4.5MB 벽 우회), 서버는 앞뒤만 잡는다.
 *
 * 2단계:
 *   1) sign    { name, type, size }  → { signedUrl, path, name, type }
 *   2) confirm { confirmPath, type } → 실제 저장된 파일 앞 512 바이트를 읽어 위장 검사
 *
 * 보안 (서버 경유일 때와 동일한 성질 유지):
 * - Rate limit (IP당 분당 20회 — 파일 1개에 2회 호출이므로 5개 + 재시도 여유)
 * - 크기 제한: 여기 + attachments 버킷 file_size_limit 양쪽 (버킷이 최종 방어선)
 * - MIME 화이트리스트: 여기 + 버킷 allowed_mime_types 양쪽
 * - magic bytes 검증: 업로드 «후» 서버가 직접 읽어서 확인, 실패하면 그 자리에서 삭제
 * - 파일명 sanitize + crypto.randomUUID 경로 — enumeration 방지
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { randomUUID } from "node:crypto";
import { verifyFileMagic } from "@/lib/security/fileMagic";

// Supabase 프로젝트 전역 업로드 상한과 동일(실측 2026-08-03: 50MB 성공 / 51MB 거부).
// 더 키우려면 Supabase 대시보드 Storage → Upload file size limit 를 먼저 올려야 한다.
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// 파일 1개당 sign + confirm 2회. 첨부 5개 + 재시도까지 감안해 분당 20회.
const UPLOAD_RATE = {
  windowMs: 60 * 1000,
  maxRequests: 20,
  apiName: "attachments_upload",
};

// sign 이 만든 경로만 confirm 할 수 있게 — 남의 파일을 지우는 통로가 되지 않도록.
const OWN_PATH = /^inquiry\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/;

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
  const rlHeaders = getRateLimitHeaders(rl);

  try {
    const body = (await request.json()) as {
      name?: string;
      type?: string;
      size?: number;
      confirmPath?: string;
    };
    const type = typeof body.type === "string" ? body.type : "";

    // ── 2단계: 업로드 끝난 파일 검증 ────────────────────────────────
    if (body.confirmPath) {
      const path = body.confirmPath;
      if (!OWN_PATH.test(path)) {
        return Response.json({ ok: false, error: "invalid_path" }, { status: 400, headers: rlHeaders });
      }

      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("attachments")
        .createSignedUrl(path, 60);
      if (signErr || !signed?.signedUrl) {
        return Response.json({ ok: false, error: "upload_failed" }, { status: 400, headers: rlHeaders });
      }

      // DICOM 은 오프셋 128 에 "DICM" 이 있으므로 앞 512 바이트를 받아야 한다.
      const head = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-511" } });
      if (!head.ok) {
        return Response.json({ ok: false, error: "upload_failed" }, { status: 400, headers: rlHeaders });
      }
      const magic = verifyFileMagic(Buffer.from(await head.arrayBuffer()), type);
      if (!magic.ok) {
        console.warn(
          `[api/attachments/upload] magic check failed: declared=${type} reason=${magic.reason}`
        );
        await supabaseAdmin.storage.from("attachments").remove([path]);
        return Response.json({ ok: false, error: "invalid_file_content" }, { status: 400, headers: rlHeaders });
      }

      return Response.json({ ok: true, path }, { headers: rlHeaders });
    }

    // ── 1단계: 서명 URL 발급 ───────────────────────────────────────
    const name = typeof body.name === "string" ? body.name : "";
    const size = typeof body.size === "number" ? body.size : -1;

    if (!name || size < 0) {
      return Response.json({ ok: false, error: "file_required" }, { status: 400, headers: rlHeaders });
    }
    if (size > MAX_FILE_SIZE) {
      return Response.json(
        { ok: false, error: "file_too_large", maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400, headers: rlHeaders }
      );
    }
    if (!ALLOWED_TYPES.has(type)) {
      return Response.json(
        { ok: false, error: "invalid_file_type", allowed: Array.from(ALLOWED_TYPES) },
        { status: 400, headers: rlHeaders }
      );
    }

    // ✅ 파일명 enumeration 방지를 위해 randomUUID prefix 사용
    const path = `inquiry/${randomUUID()}_${sanitizeFileName(name)}`;
    const { data, error } = await supabaseAdmin.storage
      .from("attachments")
      .createSignedUploadUrl(path);

    if (error || !data?.signedUrl) {
      console.error("[api/attachments/upload] sign error:", error);
      return Response.json({ ok: false, error: "upload_failed" }, { status: 500, headers: rlHeaders });
    }

    return Response.json(
      {
        ok: true,
        signedUrl: data.signedUrl,
        path,
        // U+FFFD 세척: zip 등에서 깨진 키릴 파일명이 그대로 돌아가면 클라가 이후 요청 본문에
        // 실어 보내다 인코딩 가드(#92)에 계속 400으로 막힘 — 표시용 이름이라 제거해도 무손실.
        name: name.replace(/�/g, ""),
        type,
      },
      { headers: rlHeaders }
    );
  } catch (err) {
    console.error("[api/attachments/upload] unexpected error:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
