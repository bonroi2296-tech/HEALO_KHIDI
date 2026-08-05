/**
 * 환자에게 보낼 서류의 «언어»와 «보일 이름» — 서버·화면이 같은 규칙을 쓰게 한 곳에 둔다.
 *
 * 왜 (2026-08-05): 한 케이스에 러시아어·카자흐어를 같이 보낸다. 코디가 파일마다 손으로
 * 언어를 고르게 하면 다섯 번에 한 번은 빠뜨린다 → **파일명에서 먼저 알아맞히고**, 틀리면
 * 코디가 화면에서 고친다(추측은 «초깃값»이지 «정답»이 아니다).
 */

/** 우리가 쓰는 6개 언어. 화면 배지·정렬이 이 목록을 따른다. */
export const DOC_LANGS = ["ru", "kz", "en", "ko", "zh", "ja"] as const;
export type DocLang = (typeof DOC_LANGS)[number];

/** 배지에 찍는 짧은 이름 — 환자가 자기 언어를 «글자 모양»으로 알아본다. */
export const DOC_LANG_LABEL: Record<string, string> = {
  ru: "Русский",
  kz: "Қазақша",
  en: "English",
  ko: "한국어",
  zh: "中文",
  ja: "日本語",
};

// 파일명에 쓰이는 표기들. `_RU_`·`-kz-`·` KZ.` 처럼 **토막으로 떨어져 있을 때만** 센다 —
// 그냥 포함으로 찾으면 사람 이름(TULEGEN 의 EN 등)에 걸린다.
const LANG_TOKENS: Record<string, DocLang> = {
  ru: "ru", rus: "ru", russian: "ru", рус: "ru",
  kz: "kz", kaz: "kz", kk: "kz", kazakh: "kz", каз: "kz",
  en: "en", eng: "en", english: "en",
  ko: "ko", kor: "ko", korean: "ko", 한국어: "ko",
  zh: "zh", cn: "zh", chinese: "zh",
  ja: "ja", jp: "ja", japanese: "ja",
};

/**
 * 파일명에서 언어를 알아맞힌다. 못 맞히면 null(=코디가 고른다).
 * 여러 언어 토막이 섞여 있으면 **포기한다** — 반만 맞는 추측이 제일 해롭다.
 */
export function guessDocLang(fileName: string): DocLang | null {
  const base = String(fileName).replace(/\.[a-z0-9]+$/i, "");
  const found = new Set<DocLang>();
  for (const tok of base.split(/[^A-Za-zА-Яа-яЁё가-힣]+/)) {
    const hit = LANG_TOKENS[tok.toLowerCase()];
    if (hit) found.add(hit);
  }
  return found.size === 1 ? [...found][0] : null;
}

/** 화면에 뜰 이름 — 코디가 붙인 이름이 있으면 그것, 없으면 파일명(확장자만 뗀다). */
export function docDisplayTitle(title: string | null | undefined, fileName: string): string {
  const t = (title || "").trim();
  if (t) return t;
  return String(fileName).replace(/\.[a-z0-9]+$/i, "") || String(fileName);
}
