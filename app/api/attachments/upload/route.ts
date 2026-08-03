/**
 * healwith: 문의 첨부파일 업로드 — 서명 URL 발급 + 업로드 후 검증 (공개 — 인테이크 플로우)
 *
 * 왜 서버 경유(multipart)를 버렸나 (2026-08-03):
 *   Vercel 함수는 요청 본문이 4.5MB 를 넘으면 우리 코드에 닿기 전에 413 으로 끊는다
 *   (실측: 4MB 통과 / 5MB FUNCTION_PAYLOAD_TOO_LARGE). 화면엔 "10MB 까지"라고 적혀 있었으니
 *   5~10MB 파일은 안내대로 올려도 이유 없이 실패했다. 문의 #60 (131MB PDF) 이 드러낸 문제.
 *   → 브라우저가 Supabase Storage 로 직접 올리게 하고, 서버는 앞뒤만 잡는다.
 *
 * 2단계 (공용 부품은 src/lib/storage/directUpload.ts):
 *   1) { phase: "sign",   name, type, size } → { signedUrl, path, name, type }
 *   2) { phase: "commit", path, type }       → 앞 512바이트로 위장 검사, 어긋나면 삭제
 *
 * 보안 (서버 경유일 때와 동일한 성질 유지):
 * - Rate limit (IP당 분당 20회 — 파일 1개에 2회 호출이므로 5개 + 재시도 여유)
 * - 크기·MIME: 여기 + attachments 버킷 설정 양쪽 (버킷이 최종 방어선)
 * - magic bytes 검증: 업로드 «후» 서버가 직접 읽어서 확인, 실패하면 그 자리에서 삭제
 * - 파일명 sanitize + crypto.randomUUID 경로 — enumeration 방지
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from "@/lib/storage/directUpload";

// Supabase 프로젝트 전역 업로드 상한과 동일(실측 2026-08-03: 50MB 성공 / 51MB 거부).
// 더 키우려면 Supabase 대시보드 Storage → Upload file size limit 를 먼저 올려야 한다.
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const BUCKET = "attachments";
const DIR = "inquiry";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// 파일 1개당 sign + commit 2회. 첨부 5개 + 재시도까지 감안해 분당 20회.
const UPLOAD_RATE = { windowMs: 60 * 1000, maxRequests: 20, apiName: "attachments_upload" };

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getClientIp(request), UPLOAD_RATE);
  const headers = getRateLimitHeaders(rl);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited", detail: rl.reason }, { status: 429, headers });
  }

  try {
    const body = await request.json();

    if (body.phase === "commit") {
      const path = String(body.path || "");
      if (!isOwnPath(DIR, path)) {
        return Response.json({ ok: false, error: "invalid_path" }, { status: 400, headers });
      }
      const type = normalizeMime(path, String(body.type || ""));
      const verified = await verifyUploaded(BUCKET, path, type, MAX_FILE_SIZE);
      if (!verified.ok) {
        return Response.json({ ok: false, error: verified.error }, { status: 400, headers });
      }
      return Response.json({ ok: true, path }, { headers });
    }

    const signed = await issueUploadUrl(body, {
      bucket: BUCKET,
      dir: DIR,
      allowed: ALLOWED_TYPES,
      maxBytes: MAX_FILE_SIZE,
    });
    if (!signed.ok) {
      return Response.json(
        { ok: false, error: signed.error, detail: signed.detail },
        { status: signed.status, headers }
      );
    }
    return Response.json(
      { ok: true, signedUrl: signed.signedUrl, path: signed.path, name: signed.name, type: signed.type },
      { headers }
    );
  } catch (err) {
    console.error("[api/attachments/upload] unexpected error:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
