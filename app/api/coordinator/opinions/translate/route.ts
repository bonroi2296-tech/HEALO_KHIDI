/**
 * healwith: 전문의 소견 — 에이전시 공개용 확정본 AI 재번역 (코디·어드민 전용)
 *
 * POST /api/coordinator/opinions/translate  { text: string, lang: "en"|"ru"|"kz"|"zh"|"ja" }
 *   → { ok, translated }  (대상 언어가 아니면 원문 그대로 반환 — 코디가 그대로 써도 무해)
 *
 * 소견은 접수 시점에 이미 자동 번역돼 auto_translated_text 에 들어간다(opinions/[token],
 * coordinator/opinions). 이 라우트는 코디가 초안을 날려먹었거나 번역이 실패했을 때 쓰는
 * "다시 번역" 버튼용이다. 저장은 안 한다 — 초안만 돌려준다.
 *
 * 번역 본체는 translateOpinionText 하나만 쓴다(자동·수동 경로가 같은 프롬프트를 공유해야
 * 코디가 보는 결과가 갈리지 않는다).
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { isNoteTargetLang } from "@/lib/translate/shortText";
import { translateOpinionText } from "@/lib/opinions/translateOpinion";

export async function POST(request: NextRequest) {
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.slice(0, 8000).trim() : "";
  const lang = body?.lang;
  if (!text) return Response.json({ ok: false, error: "empty_text" }, { status: 400 });
  if (!isNoteTargetLang(lang)) {
    return Response.json({ ok: true, translated: text }); // ko 등 번역 불필요 — 원문 그대로
  }

  const translated = await translateOpinionText(text, lang);
  if (!translated) {
    // 키 없음·모델 실패 둘 다 여기로 온다. 상세 사유는 서버 로그에만(응답에 error.message 금지).
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
  return Response.json({ ok: true, translated });
}
