/**
 * healwith: 에이전시 포털 — 코디 한글 메모 자동번역
 *
 * POST /api/agency/translate  { texts: string[], lang: "en"|"ru"|"kz"|"zh"|"ja" }
 *   → { ok, translations: { [원문]: 번역문 } }  (한글 없는 문구는 결과에 없음 → 화면이 원문 폴백)
 *
 * 인증: checkAgencyAuth (에이전시/의료기관/스태프). 캐시(note_translations) 우선이라 반복 호출도 저렴.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { translateNotes, isNoteTargetLang } from "@/lib/translate/shortText";

const MAX_TEXTS = 120;      // 한 요청당 번역 문구 상한(케이스 다수 + 타임라인 대비)
const MAX_LEN = 2000;       // 문구 1개 최대 길이(코디 메모는 보통 짧음)

export async function POST(request: NextRequest) {
  const auth = await checkAgencyAuth(request);
  if (!auth.isAgencyUser) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const lang = body?.lang;
  if (!isNoteTargetLang(lang)) {
    // ko 등 번역 불필요 → 빈 결과(정상)
    return NextResponse.json({ ok: true, translations: {} });
  }

  const texts = Array.isArray(body?.texts)
    ? body.texts
        .filter((t: any) => typeof t === "string")
        .slice(0, MAX_TEXTS)
        .map((t: string) => t.slice(0, MAX_LEN))
    : [];

  if (texts.length === 0) {
    return NextResponse.json({ ok: true, translations: {} });
  }

  try {
    const translations = await translateNotes(texts, lang);
    return NextResponse.json({ ok: true, translations });
  } catch (err: any) {
    console.error("[agency/translate] error:", err?.message?.slice(0, 160));
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
