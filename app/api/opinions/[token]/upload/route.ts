/**
 * healwith: 소견 주시는 분이 «문서를 같이» 올리는 창구 (계정 없음 · 링크가 열쇠)
 *
 * POST /api/opinions/[token]/upload
 *   1) { phase: "sign",   name, type, size } → { signedUrl, path }
 *   2) { phase: "commit", path, name, type } → { ok, file }
 *
 * 왜 (PO 요청 2026-08-04): 원장님이 소견을 글로만 주는 게 아니라 **견적서·검사 안내문 같은
 *   서류를 같이 주는 일이 많다.** 지금까지는 붙일 데가 없어 메일·카톡으로 따로 오갔고,
 *   그러면 케이스에 안 남는다.
 *
 * 보안: 계정이 없으니 링크(토큰)가 열쇠다 — ①살아 있는 링크인가 ②그 링크의 문의 폴더인가
 *   ③올린 파일 앞부분을 읽어 «선언한 형식이 맞는지»(위장 검사) ④횟수 제한.
 *   저장 위치는 inquiry/<문의번호>/opinion/ 로, 환자 서류(staff/)와 섞이지 않게 갈라 둔다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { issueUploadUrl, verifyUploaded, isOwnPath, normalizeMime } from "@/lib/storage/directUpload";

const BUCKET = "attachments";
const MAX_SIZE = 50 * 1024 * 1024; // 소견 첨부는 서류다 — 영상 묶음까지 받을 자리는 아니다
const RATE = { windowMs: 60_000, maxRequests: 20, apiName: "opinion_upload" };

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // 견적서는 엑셀로 오는 일이 많다
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/** 토큰 → 살아 있는 요청 행. 없으면 null. */
async function resolve(token: string) {
  const { data } = await (supabaseAdmin as any)
    .from("opinion_requests")
    .select("inquiry_id, revoked, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.revoked) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const { token } = await context.params;
    if (!token || !/^[0-9a-f]{32,64}$/i.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }
    const req = await resolve(token);
    if (!req) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });

    const dir = `inquiry/${req.inquiry_id}/opinion`;
    const body = await request.json();

    // ── 1단계: 서명 URL 발급 ──
    if (body.phase !== "commit") {
      const signed = await issueUploadUrl(body, { bucket: BUCKET, dir, allowed: ALLOWED_TYPES, maxBytes: MAX_SIZE });
      if (!signed.ok) {
        return Response.json({ ok: false, error: signed.error, detail: signed.detail }, { status: signed.status });
      }
      return Response.json({ ok: true, signedUrl: signed.signedUrl, path: signed.path, name: signed.name, type: signed.type });
    }

    // ── 2단계: 올라간 파일 확인 ──
    const path = String(body.path || "");
    if (!isOwnPath(dir, path)) return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    const type = normalizeMime(path, String(body.type || ""));
    const verified = await verifyUploaded(BUCKET, path, type, MAX_SIZE);
    if (!verified.ok) return Response.json({ ok: false, error: verified.error }, { status: 400 });

    // 여기서는 저장만 «확인»하고 끝낸다 — 소견 본문과 함께 제출될 때 case_opinions 에 붙는다.
    return Response.json({
      ok: true,
      file: { path, name: String(body.name || path.split("/").pop() || "file").slice(0, 300), type },
    });
  } catch (err) {
    console.error("[opinion/upload] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
