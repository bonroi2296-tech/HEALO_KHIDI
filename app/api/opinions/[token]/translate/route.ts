/**
 * healwith: 첨부 서류 번역 — 의료진(소견 요청 링크) 창구
 *
 * POST /api/opinions/[token]/translate  { path } → { doc }
 *
 * 왜 따로 있나 (2026-08-04): 소견 화면은 첨부 «앞 5개»만 미리 번역해 준다(비용 때문).
 *   그런데 6번째부터는 **말없이** 원문만 나왔다 — 원장님은 «번역이 안 되는 서류»인 줄 안다.
 *   상한을 올리면 아무도 안 볼 서류까지 미리 번역해 돈을 쓴다.
 *   → 미리 하는 대신 **누를 때** 한다. 실제로 보는 것만 번역하니 조용한 누락도, 낭비도 없다.
 *
 * 계정이 없으므로 링크(토큰)가 열쇠다 — 살아 있는 링크인지, 그 링크의 문의 파일인지 확인한다.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { translateMedicalDoc } from "@/lib/documents/translateDoc";

// 번역은 한 번 하면 저장돼 다음엔 공짜다. 그래도 연타로 돈이 새지 않게 분당 6회.
const RATE = { windowMs: 60_000, maxRequests: 6, apiName: "opinion_translate" };

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(request);
  const rl = await checkRateLimitPersistent(ip, RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const { token } = await context.params;
    if (!token || !/^[0-9a-f]{32,64}$/i.test(token)) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    const { data: req } = await (supabaseAdmin as any)
      .from("opinion_requests")
      .select("inquiry_id, revoked, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (!req || req.revoked) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    if (req.expires_at && new Date(req.expires_at).getTime() < Date.now()) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    const { path, name } = await request.json();
    // 링크가 가리키는 문의의 파일만.
    if (typeof path !== "string" || !path.startsWith(`inquiry/${req.inquiry_id}/`)) {
      return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }

    const r = await translateMedicalDoc({ path, name: typeof name === "string" ? name : undefined, lang: "ko" });
    if (!r.ok) return Response.json({ ok: false, error: r.error }, { status: 502 });
    return Response.json({ ok: true, doc: r.doc });
  } catch (err) {
    console.error("[opinion/translate] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
