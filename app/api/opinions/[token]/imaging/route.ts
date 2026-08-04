/**
 * healwith: 병원 CD(CT) 묶음 보기 — 의료진(소견 요청 링크) 창구
 *
 * POST /api/opinions/[token]/imaging  { path }
 *   → { series, urls, docs, skipped, extras }
 *
 * 왜 따로 있나: 소견을 주는 원장님은 우리 계정이 없다. 링크(토큰)가 곧 열쇠다.
 *   그래서 «코디 전용» 창구를 그대로 쓸 수 없고, 대신 여기서 세 가지를 확인한다 —
 *   ①링크가 살아 있나(폐기·만료 아님) ②그 링크가 가리키는 문의의 파일인가 ③횟수 제한.
 *   준비 자체는 코디 창구와 **같은 부품**(prepareStudy)이라 화면이 어긋나지 않는다.
 *
 * 왜 필요했나 (PO 지적 2026-08-03): *"정작 의료진이 보는 페이지에는 영상도 안 보이고"* —
 *   코디 화면에만 붙여놨더니, 정작 판단하는 사람은 CT 를 못 보고 「번역 실패」만 보고 있었다.
 */
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { prepareStudy } from "@/lib/imaging/prepareStudy";

// 한 번 풀면 다음부터는 만들어 둔 걸 주므로 넉넉히 잡아도 비용이 안 튄다.
const RATE = { windowMs: 60_000, maxRequests: 20, apiName: "opinion_imaging" };

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

    const { data: req } = await (supabaseAdmin as any)
      .from("opinion_requests")
      .select("inquiry_id, revoked, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (!req || req.revoked) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    if (req.expires_at && new Date(req.expires_at).getTime() < Date.now()) {
      return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    }

    const { path, series } = await request.json();
    // 링크가 가리키는 문의의 파일만. 남의 문의 경로를 넣어도 여기서 막힌다.
    if (typeof path !== "string" || !path.startsWith(`inquiry/${req.inquiry_id}/`)) {
      return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }

    const want = Number.isInteger(series) && series >= 0 && series < 50 ? series : 0;
    const r = await prepareStudy(path, want);
    if (!r.ok) return Response.json({ ok: false, error: r.error }, { status: r.status });
    return Response.json(r);
  } catch (err) {
    console.error("[opinion/imaging] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
