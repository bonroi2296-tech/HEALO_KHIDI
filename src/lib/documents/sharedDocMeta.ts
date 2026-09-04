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

/**
 * 내려받을 때 뜨는 이름을 **원본 파일명**으로 맞춘다.
 *
 * 왜 (2026-08-05 PO: *"꼭 앞에 이런 변수가 들어가야해?"*): 저장소에 넣을 때 파일마다
 * `<임의값>_원래이름.pdf` 로 저장한다 — 같은 이름을 올려도 서로 안 덮어쓰게 하려는 것이고
 * **저장소 안에서만 필요한 장치**다. 그런데 서명 주소를 그냥 내주면 그 임의값이 붙은 채로
 * 내려받기 창에 뜬다(`c065dd80-…_SECOND_OPINION_RU.pdf`). 저장 이름은 따로 지정해야 한다.
 */
export function withDownloadName(signedUrl: string | null | undefined, fileName: string): string | null {
  if (!signedUrl) return null;
  try {
    const u = new URL(signedUrl);
    u.searchParams.set("download", fileName); // 이미 있으면 갈아끼운다
    return u.toString();
  } catch {
    return signedUrl; // 주소 모양이 예상과 다르면 원래 것을 그대로 — 내려받기가 죽는 것보다 낫다
  }
}

/**
 * 「서명 주소에 파일 이름을 붙이는 잘못된 방식」을 찾는다 — 자동 검사 전용(런타임에서 안 부른다).
 *
 * 왜 (반성문 #181, 2026-09-02): `createSignedUrl(path, ttl, { download: 이름 })` 을 쓰면
 * supabase-js 가 주소를 «두 번» 인코딩해(`%` → `%25`) 러시아어·한글 이름이
 * `%D0%98…` 라는 글자 그대로 저장된다. 이름은 위 `withDownloadName()` 으로 붙여야 한다.
 *
 * ⚠️ 호출 «안»만 보면 새어나간다 — 2026-07-30 사고는 옵션을 변수에 담아 넘겨서
 *    (`const signOpts = { download: 이름 }`) 호출 자리에 `download:` 가 없었다.
 *    그래서 파일 전체를 보되, 주석은 뺀다(이 주의 문구 자체가 걸리면 안 되니까).
 *    `{ download: true }`(빈 값) 는 `%` 를 안 만들어 안전하므로 통과시킨다.
 */
export function findBadDownloadOption(src: string): string[] {
  if (!/createSignedUrls?\(/.test(src)) return [];
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  return [...code.matchAll(/download:\s*([^,}\s]+)/g)]
    .map((m) => m[1])
    .filter((v) => v !== "true");
}

/**
 * `Content-Disposition` 헤더 값을 만든다 — 비ASCII 파일명을 «안전하게» 싣는 유일한 방법.
 *
 * 왜 (2026-09-02 실측): 헤더에 러시아어·한글을 그대로 넣으면 **깨지는 게 아니라 요청이 죽는다**
 * (`ERR_INVALID_CHAR`). 실제로 환자 이름이 키릴·한글이면 동의서 PDF 발급이 500 으로 실패하고
 * 있었다(영어 이름만 성공). 헤더는 ASCII 만 실을 수 있기 때문이다.
 *
 * 그래서 두 벌을 같이 낸다. `filename=` 에는 ASCII 로 바꾼 이름(구형 클라이언트용),
 * `filename*=UTF-8''` 에는 퍼센트 인코딩한 원본(RFC 5987 — 요즘 브라우저는 이걸 읽는다).
 */
export function contentDisposition(fileName: string, kind: "attachment" | "inline" = "attachment"): string {
  // 남기는 것 = ASCII 출력문자에서 `"` 와 역슬래시만 뺀 것(그 둘은 헤더 문법을 깨뜨린다).
  const safe = String(fileName).replace(/[^\x20-\x21\x23-\x5B\x5D-\x7E]/g, "_") || "download";
  return `${kind}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
