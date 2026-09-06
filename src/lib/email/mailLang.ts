/**
 * 메일 템플릿 언어 판정 — 순수 함수(server-only 아님 → 단위 시험 가능).
 *
 * 왜 (2026-09-06 독립 리뷰): 카자흐어는 내부코드 «kz»·BCP47 «kk»·DB 의 «kz-KZ»/«KK» 등 표기가 여럿인데
 *   템플릿 셋(리마인더·교육·설문)이 저마다 `=== "kk"`·`.slice(0,2)`·화이트리스트로 따로 판정하고 있었다.
 *   판정이 갈리면 «링크는 kz 인데 본문은 한국어» 같은 메일이 나간다(POSTMORTEMS #23 부류).
 *   → 게스트 링크와 같은 정규화(normalizeLocaleParam)를 한 곳에서 쓰고, 템플릿 키가 kz 든 kk 든 있는 쪽을 고른다.
 */
import { normalizeLocaleParam } from "@/lib/i18n/guestLinkLang";

/**
 * raw(어떤 표기든) → 템플릿 STRINGS 에 실제로 있는 키. 우리 6개 언어가 아니면 fallback.
 * - "kz" / "kk" / "kz-KZ" / "KK" → STRINGS 에 "kz" 가 있으면 "kz", 없고 "kk" 가 있으면 "kk".
 */
export function resolveMailLang<K extends string>(
  raw: unknown,
  strings: Record<K, unknown>,
  fallback: K,
): K {
  const norm = normalizeLocaleParam(raw);
  if (!norm) return fallback;
  if (norm in strings) return norm as K;
  if (norm === "kz" && "kk" in strings) return "kk" as K;
  return fallback;
}

/** `<html lang="">` 용 BCP47 — 내부코드 kz 는 kk 로(«kz» 는 나라 코드지 언어 태그가 아니다). */
export function toBcp47(lang: string): string {
  return lang === "kz" ? "kk" : lang;
}
