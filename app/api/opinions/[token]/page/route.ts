/**
 * healwith: 첨부 PDF 를 «사진 한 쪽»으로 보여주는 창구 — 의료진(소견 요청 링크)
 *
 * GET /api/opinions/[token]/page?path=...        → { ok, pages }   (쪽 수만)
 * GET /api/opinions/[token]/page?path=...&p=3    → JPEG 한 쪽
 *
 * 왜 (2026-08-04): 브라우저 내장 PDF 뷰어에 맡겼더니 PO 화면에서 하얗게만 떴다.
 *   폰에서는 아예 안 된다. 그래서 서버가 그려서 사진으로 준다 — 어디서든 뜬다.
 *
 * 보안은 다른 창구와 같다: ①살아 있는 링크인가 ②그 링크의 문의 파일인가 ③횟수 제한.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { renderPdfPage } from "@/lib/documents/pdfPage";

const RATE = { windowMs: 60_000, maxRequests: 120, apiName: "opinion_page" };

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
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

    const path = request.nextUrl.searchParams.get("path") || "";
    if (!path.startsWith(`inquiry/${req.inquiry_id}/`)) {
      return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }
    const raw = request.nextUrl.searchParams.get("p");
    const p = raw === null ? undefined : Number(raw);
    if (p !== undefined && (!Number.isInteger(p) || p < 0 || p > 999)) {
      return Response.json({ ok: false, error: "invalid_page" }, { status: 400 });
    }

    const r = await renderPdfPage("attachments", path, p);
    if (!r.ok) return Response.json({ ok: false, error: r.error }, { status: r.error === "not_found" ? 404 : 400 });
    if (!r.image) return Response.json({ ok: true, pages: r.pages });

    return new Response(new Uint8Array(r.image), {
      headers: {
        "Content-Type": "image/jpeg",
        // 같은 쪽을 앞뒤로 오갈 때 다시 그리지 않게. 링크 자체가 열쇠라 private.
        "Cache-Control": "private, max-age=3600",
        "X-Pdf-Pages": String(r.pages),
      },
    });
  } catch (err) {
    console.error("[opinion/page] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
