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
import { UPLOAD_POLICY } from "@/lib/uploadPolicy";

// Supabase 프로젝트 전역 업로드 상한과 동일(실측 2026-08-03: 200MB 성공 / 201MB 거부).
// 이 값을 더 키우려면 Supabase 대시보드 Storage → Settings → Global file size limit 를 먼저 올린다.
// (지출 상한(spend cap)이 켜진 상태의 천장은 원래 50MB 였는데 PO 결정으로 200MB 로 올림.)
const MAX_FILE_SIZE = 2000 * 1024 * 1024;
const BUCKET = "attachments";
const DIR = "inquiry";

// 영상(병원 CD) 형식은 uploadPolicy 의 imaging 규칙을 그대로 끌어다 쓴다.
// 화면과 서버가 «다른 목록»을 들고 있으면 「화면에선 골라지는데 서버가 막는」 반쪽이 된다.
// ⚠️ 위장 검사(verifyUploaded)는 그대로 둔다 — 공개 창구라 확장자·MIME 만 믿으면 안 된다.
// 의료서류·음성·텍스트는 medicalDoc 규칙을 그대로 끌어다 쓴다. 예전엔 여기에 목록을 손으로
// 베껴 뒀는데, 그러면 uploadPolicy 에 형식을 하나 더해도 이 창구만 «모르는» 상태가 된다
// (2026-09-02: 음성·TXT 를 더하다 발견).
const ALLOWED_TYPES = new Set([
  ...UPLOAD_POLICY.medicalDoc.mimes,
  ...UPLOAD_POLICY.imaging.mimes,
]);

// 파일 1개당 sign + commit 2회 — 그래서 여기 숫자의 «절반»이 실질 파일 상한이다.
// 20 이던 동안 실질 상한은 분당 파일 10개였고, 2026-09-08 실서비스에서 실제 환자 서류
// (유방암 케이스 PDF 44장)를 올리다 429 가 8건 났다. 화면엔 「올리지 못했습니다」만 떠서
// 사유도 안 보였다 — 의료 서류가 조용히 빠지는 자리다. 「첨부 5개」를 기준으로 잡은 옛 값이
// 실제 암환자 의무기록 한 벌(40~50장)과 안 맞았다.
//
// 🔑 값을 정하는 기준은 «사람이 한 번에 올릴 수 있는 최대치»다. 접수 한 건의 첨부 상한이
//    100장이므로 최대 200회. 그래서 200 = «사람은 절대 안 걸리는 높이».
//    60 으로 잡았을 때 실측에서 35장에 429 가 3번 났다 — 화면이 동시 3개로 올려 순간적으로
//    몰리기 때문이다. 재시도가 받아내긴 하지만 애초에 안 걸리는 게 낫다.
//
// 🛑 그럼 아예 없애면 안 되나(2026-09-08 PO 질문): 안 된다. 이 창구는 «로그인 없이» 부를 수 있고,
//    Supabase 에 지출 상한이 켜져 있다(2026-08-03 실측). 누가 저장소를 채우면 한도에 걸려
//    «진짜 환자가 서류를 못 올리는» 상태가 된다 — 돈보다 이쪽이 위험하다.
//    200/분 = 초당 3.3회. 사람의 최대치보다 높고, 봇(초당 수백 회)에는 그대로 벽이다.
//    실사용 실측(8/26~9/6): 하루 1~9개. 평상시 트래픽과는 비교도 안 되는 여유다.
const UPLOAD_RATE = { windowMs: 60 * 1000, maxRequests: 200, apiName: "attachments_upload" };

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
