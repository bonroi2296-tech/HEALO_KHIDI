/**
 * healwith: 진행상황 링크에 뜬 글을 «읽는 사람 언어»로 옮겨준다 (계정 없이)
 *
 * POST { token, texts: string[], lang } → { ok, map: { 원문 → 번역문 } }
 *
 * 왜 (2026-08-06 PO): *"뭐는 한글이고 뭐는 외국어고 좀 복잡한데.. 선택한 언어에 맞춰서 자동
 *   번역해버리면 이건 또 곤란하고 뭐가 좋을까"*
 *
 * **저절로 번역하지 않는다.** 화면은 늘 원문을 보여주고, 사람이 「번역해서 보기」를 눌렀을 때만
 * 이 주소를 부른다. 이유는 두 가지다:
 *   ① 소견은 의료진이 그 언어로 «확정한» 문서다. 기계가 다시 옮긴 걸 기본값으로 깔면
 *      오역이 진료 판단에 섞이고, 무엇이 원본인지 흐려진다.
 *   ② 안 누른 글은 부르지 않으니 비용이 실제로 읽는 만큼만 든다.
 *
 * 비용 (PO 질문: *"누를때마다 돈 나가는거야?"*): 아니다. `translateNotes` 가 (원문해시, 대상언어)로
 *   `note_translations` 에 적어두고 다음부터는 그걸 돌려준다 — 같은 글은 몇 번 눌러도, 다른
 *   사람이 눌러도 0원. 새 글일 때만 한 번 부르고, 여러 글은 한 번에 묶어 보낸다.
 *
 * ⚠️ 공개 링크로 들어오는 호출이라: ①토큰이 진짜 문의인지 확인 ②횟수 제한 ③건수·길이 상한.
 *    번역 대상은 **그 문의에 실제로 딸린 글**로 한정한다 — 남의 글을 여기로 넣어 번역기로
 *    쓰지 못하게(원문을 대조해서 목록에 없으면 버린다).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/lib/rateLimit";
import { translateNotes, isNoteTargetLang } from "@/lib/translate/shortText";
import { readFollowUps } from "@/lib/inquiry/followUps";
import { decryptMaybe } from "@/lib/security/encryptionV2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATE = { windowMs: 60 * 1000, maxRequests: 20, apiName: "claim_translate" };
const MAX_ITEMS = 40;
const MAX_LEN = 8000;

/** 이 문의에 «실제로» 딸린 글 전부 — 여기 없는 원문은 번역해 주지 않는다. */
async function allowedTexts(inq: any): Promise<Set<string>> {
  const set = new Set<string>();
  const add = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) set.add(s);
  };

  add(decryptMaybe(inq.message));
  for (const f of readFollowUps(inq.follow_ups)) add(f.text);

  // 코디 소식 + 공개된 소견 — 화면에 뜨는 긴 글이 여기 있다.
  const [{ data: updates }, { data: opinions }] = await Promise.all([
    (supabaseAdmin as any).from("case_updates").select("body").eq("inquiry_id", inq.id),
    (supabaseAdmin as any)
      .from("case_opinions")
      .select("released_text, released_at")
      .eq("inquiry_id", inq.id)
      .not("released_at", "is", null),
  ]);
  for (const u of updates || []) add(u.body);
  for (const o of opinions || []) add(decryptMaybe(o.released_text));

  return set;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  try {
    const body = await request.json();
    const token = String(body?.token || "");
    const lang = String(body?.lang || "");
    if (!UUID_RE.test(token)) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });
    if (!isNoteTargetLang(lang)) return Response.json({ ok: false, error: "bad_lang" }, { status: 400 });

    const { data: rows, error: findErr } = await (supabaseAdmin as any)
      .from("inquiries")
      .select("id, message, follow_ups")
      .eq("public_token", token)
      .limit(1);
    if (findErr) throw findErr;
    const inq = rows?.[0];
    if (!inq) return Response.json({ ok: false, error: "invalid_link" }, { status: 404 });

    const asked = (Array.isArray(body?.texts) ? body.texts : [])
      .filter((t: unknown): t is string => typeof t === "string")
      .map((t: string) => t.trim())
      .filter(Boolean)
      .slice(0, MAX_ITEMS)
      .map((t: string) => t.slice(0, MAX_LEN));
    if (!asked.length) return Response.json({ ok: true, map: {} });

    // 이 문의에 딸린 글만 통과 — 이 주소를 아무 글이나 넣는 번역기로 못 쓰게.
    const allowed = await allowedTexts(inq);
    const safe = asked.filter((t: string) => allowed.has(t));
    if (!safe.length) return Response.json({ ok: true, map: {} });

    return Response.json({ ok: true, map: await translateNotes(safe, lang) });
  } catch (err: any) {
    console.error("[inquiries/claim/translate]", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
