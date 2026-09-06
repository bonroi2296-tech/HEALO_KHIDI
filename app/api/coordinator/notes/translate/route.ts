/**
 * healwith: 코디·어드민이 보는 짧은 글을 «내 언어»로 옮겨준다 (직원 전용)
 *
 * POST { texts: string[], lang } → { ok, map: { 원문 → 번역문 } }
 *
 * 왜 (2026-08-06 PO: *"뭐는 한글이고 뭐는 외국어고 좀 복잡한데"*): 환자가 러시아어로 보낸
 *   「추가 정보」가 코디 화면에 러시아어 그대로 뜬다. 서류·소견은 이미 번역 단추가 있는데
 *   **환자가 직접 쓴 글만 길이 없었다** — 정작 제일 자주 읽는 글이다.
 *
 * 환자 화면 쪽에 있던 `/api/inquiries/claim/translate` 와 **같은 함수**(`translateNotes`)를 쓴다
 * (그 경로는 2026-08-18 PO 결정으로 환자 화면 단추가 빠지면서 2026-09-06 에 지웠다 — 이제 이 함수를 쓰는 창구는 여기뿐).
 *   · 저절로 안 바꾼다 — 누를 때만.
 *   · (원문, 대상언어)로 저장해 두므로 두 번째부터는 부르지 않는다(0원).
 *   · 환자 화면에서 이미 번역된 글이면 여기서도 그 저장분을 그대로 쓴다(같은 표를 본다).
 *
 * 직원 전용이라 문의 소속 검사는 안 한다 — 직원은 어차피 그 글을 화면에서 보고 있다.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { translateNotes, isNoteTargetLang } from "@/lib/translate/shortText";

const RATE = { windowMs: 60 * 1000, maxRequests: 30, apiName: "coordinator_notes_translate" };
const MAX_ITEMS = 40;
const MAX_LEN = 8000;

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const rl = checkRateLimit(getClientIp(request), RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const body = await request.json();
    const lang = String(body?.lang || "");
    if (!isNoteTargetLang(lang)) return Response.json({ ok: false, error: "bad_lang" }, { status: 400 });

    const texts = (Array.isArray(body?.texts) ? body.texts : [])
      .filter((t: unknown): t is string => typeof t === "string")
      .map((t: string) => t.trim())
      .filter(Boolean)
      .slice(0, MAX_ITEMS)
      .map((t: string) => t.slice(0, MAX_LEN));
    if (!texts.length) return Response.json({ ok: true, map: {} });

    return Response.json({ ok: true, map: await translateNotes(texts, lang) });
  } catch (err: any) {
    console.error("[coordinator/notes/translate]", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
