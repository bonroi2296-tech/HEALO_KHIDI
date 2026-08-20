#!/usr/bin/env node
/**
 * 번역 「품질」 자동검사 — 키가 있느냐가 아니라 **값이 쓸 만하냐**를 본다.
 *
 * 기존 `check:i18n` 은 «키가 비었나»만 봤다. 그래서 값이 채워져 있기만 하면
 *   · 한국어 원문의 등록번호·주소·기한이 통째로 빠져도
 *   · 카자흐어 화면에 러시아어가 그대로 나가도
 *   · 같은 병원이 화면마다 다른 이름으로 불려도
 * 전부 초록불이었다. 실제로 그 세 가지가 다 있었다(2026-08-20 실측).
 * 그 결과 **원어민 코디네이터가 화면을 하나씩 보며 손으로 고치는 것**이 유일한 그물이었다.
 *
 * 여기서 잡는 것 — 전부 「기계가 확실히 잴 수 있는 것」만 넣었다(사람 판단이 필요한 문체·어감은 안 본다):
 *   A. 사실 유실   : 한국어 원문에 있던 숫자·등록번호·이메일·주소 자리표가 번역에서 사라짐
 *   B. 언어 섞임   : 카자흐어 값이 러시아어 값과 글자까지 똑같음(= 카자흐어로 안 옮겨짐)
 *   C. 미번역      : 러시아어·카자흐어 자리에 키릴 한 글자 없이 라틴 문장만 있음
 *   D. 용어 흔들림 : 용어집(src/lib/i18n/glossary.js) 위반
 *   E. 자리표 깨짐 : {name} · %s 같은 치환 자리가 원문과 개수가 다름
 *
 * 실행:
 *   node scripts/check-i18n-quality.mjs             # 사람이 읽는 보고서
 *   node scripts/check-i18n-quality.mjs --strict    # locked 위반·심각 항목이 있으면 exit 1 (CI)
 *   node scripts/check-i18n-quality.mjs --selftest  # 검출기 자체가 살아있는지 (일부러 심은 오류를 잡나)
 *   node scripts/check-i18n-quality.mjs --json      # 기계용
 *
 * ⚠️ 이 검사는 «번역이 자연스러운가»를 판정하지 않는다. 그건 원어민만 할 수 있다.
 *    여기 목적은 **원어민이 같은 실수를 두 번 잡지 않게** 기계가 먼저 걷어내는 것이다.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const STRICT = process.argv.includes("--strict");
const AS_JSON = process.argv.includes("--json");
const SELFTEST = process.argv.includes("--selftest");
const STRICT_ALL = process.argv.includes("--strict-all");
// CI 가 «막는» 언어 — 1차 타깃 두 개부터. 나머지(en·zh·ja)는 보고만 하고 차단하지 않는다.
// 왜: 전 언어를 한 번에 막으면 첫날부터 26건 빨강이라 아무도 안 본다. 막는 범위는
// 그 언어가 0건이 된 뒤에 늘리는 게 «초록불을 믿을 수 있게» 유지하는 유일한 방법이다.
const BLOCKING_LANGS = new Set(["ru", "kz"]);

// 검사 대상 언어 — 화면에 실제로 나가는 6개 중 «한국어에서 옮겨지는» 쪽.
const TARGET_LANGS = ["ru", "kz", "en", "zh", "ja"];
// 사실 유실(A)·자리표(E) 는 원문 대조가 필요하므로 ko 가 있는 키만 본다.
const SOURCE_LANG = "ko";

// ── 허용목록 ────────────────────────────────────────────────────────────────
// 라틴 그대로 나가는 게 정상인 것들(브랜드·기술 표준·파일형식·법령 코드).
const LATIN_OK = [
  "healwith", "HEALO", "KHIDI", "Immune Hospital", "ITCRN",
  "PDF", "JPG", "JPEG", "PNG", "WebP", "MB", "GB", "KB", "CT", "MRI", "PET",
  "AES", "TLS", "GDPR", "PIPA", "DPO", "K-ETA", "AI", "HD", "TSH", "VATS",
  "Chrome", "Safari", "Edge", "Google", "Gemini", "WhatsApp", "Telegram", "KakaoTalk",
  "email", "e-mail", "Email", "E-mail", "cookie", "Cookie", "ID", "KRW", "USD", "http", "https",
];
// 「값이 곧 예시」인 자리 — 이메일 자리표시문·전화 예시는 번역하면 오히려 틀린다.
const PLACEHOLDER_KEYS = /(Placeholder|\.ph$|placeholder)/;
// 단위 자체가 언어마다 바뀌는 값(201만 → 2,01 млн). 자릿수 비교가 성립하지 않는다.
const UNIT_CONVERTED_KEYS = new Set(["careJourney.stat2Value", "socialProof.stat1Big", "socialProof.stat2Big"]);
// kz 와 ru 가 같아도 되는 것 — 국제 공통 의학·행정 용어, 고유명사, 기호·숫자만 있는 값.
const KZ_RU_SAME_OK = new Set([
  "Химиотерапия", "Иммунотерапия", "Стационар", "Рецепт", "Медиана", "Анестезия",
  "Виза", "Диагноз", "Аккаунт", "Бюджет", "Триггер", "Координатор", "Телемедицина",
  "Гипертония", "Гепатит", "Аллергия", "Бета", "Мессенджер", "Оператор", "Компания",
  "Веб-сайт", "Алматы", "Астана", "Телефон", "ID / Телефон", "AI-агент",
]);
// 한국 지명·병원 이름의 키릴 음차 — 두 언어가 같은 게 «맞다»(고유명사라 옮기는 게 아니라 적는 것).
const TRANSLITERATED_PROPER = [
  "Кансо", "Кванмён", "Сондон", "Синчон", "Синчхон", "Магок", "Чхольсан", "Содэмун",
  "Сеул", "Кёнги", "Ихва", "Мокдон", "Куро", "Северанс", "Мёнрёк",
];

const isNumericOnly = (s) => !/[\p{L}]/u.test(s);
/** 「2,01 млн+」 「Макс. 200МБ」처럼 숫자와 단위뿐인 짧은 값 — 두 언어가 같아도 정상. */
const isNumberWithUnit = (s) =>
  s.trim().length <= 24 && /\d/.test(s) && !/[Ѐ-ӿ]{6,}/.test(s.replace(/\s/g, ""));
/** 고유명사 음차만으로 이뤄진 값 — 지점 이름·주소 음차가 여기 해당한다. */
const isProperNounOnly = (s) => {
  let rest = s;
  for (const w of TRANSLITERATED_PROPER) rest = rest.split(w).join(" ");
  return !/[Ѐ-ӿ]{3,}/.test(rest);
};

// ── 검출기 ─────────────────────────────────────────────────────────────────

/** 숫자를 「구분자 무시」로 비교한다 — 50,000 · 50 000 · 50000 은 같은 사실이다. */
function factTokens(s) {
  if (!s) return [];
  const out = [];
  let rest = s;
  const eat = (re, tag) => {
    for (const m of [...s.matchAll(re)]) {
      out.push(typeof tag === 'function' ? tag(m) : `${tag}:${m[0]}`);
      rest = rest.split(m[0]).join(' ');
    }
  };
  // 형태가 있는 사실부터 먹고 «원문에서 빼둔다» — 안 빼면 아래 맨 숫자 비교가 같은 걸 두 번 센다.
  eat(/[A-Z]-\d{4}-\d{2}-\d{2}-\d{4,6}/g, 'code');
  eat(/[\w.+-]+@[\w-]+\.[\w-]+(?:\.[\w-]+)*/g, (m) => `mail:${m[0].toLowerCase().replace(/[.]+$/, '')}`);
  eat(/https?:\/\/[^\s)]+/g, 'url');
  eat(/\b[A-Z]-\d(?:-\d)?\b/g, 'visa');

  // 날짜는 «자리 순서»가 언어마다 다르다(2024.11.06 = 6 ноября 2024 = 2024 ж. 6 қараша).
  // 한 덩어리로 정규화해 비교하고, 그 숫자들은 맨 숫자 비교에서 뺀다 — 안 그러면 정상 번역이 빨개진다.
  const MONTH_RU = { янв: 1, фев: 2, мар: 3, апр: 4, ма: 5, июн: 6, июл: 7, авг: 8, сен: 9, окт: 10, ноя: 11, дек: 12 };
  const MONTH_KZ = { қаңтар: 1, ақпан: 2, наурыз: 3, сәуір: 4, мамыр: 5, маусым: 6, шілде: 7, тамыз: 8, қыркүйек: 9, қазан: 10, қараша: 11, желтоқсан: 12 };
  eat(/(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/g, (m) => `date:${m[1]}-${+m[2]}-${+m[3]}`);
  eat(/(\d{1,2})\s+(янв|фев|мар|апр|ма|июн|июл|авг|сен|окт|ноя|дек)[а-яё]*\s+(\d{4})/gi, (m) => `date:${m[3]}-${MONTH_RU[m[2].toLowerCase()]}-${+m[1]}`);
  eat(/(\d{4})\s*ж\.?\s*(\d{1,2})\s*(қаңтар|ақпан|наурыз|сәуір|мамыр|маусым|шілде|тамыз|қыркүйек|қазан|қараша|желтоқсан)/gi, (m) => `date:${m[1]}-${MONTH_KZ[m[3].toLowerCase()]}-${+m[2]}`);
  // 년-월만 있는 것(2025년 12월 = декабрь 2025)
  eat(/(\d{4})\s*년\s*(\d{1,2})\s*월/g, (m) => `ym:${m[1]}-${+m[2]}`);
  eat(/(январ|феврал|март|апрел|ма|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-яё]*\s+(\d{4})/gi, (m) => {
    const k = m[1].toLowerCase().slice(0, 3);
    return `ym:${m[2]}-${MONTH_RU[k] ?? MONTH_RU[m[1].toLowerCase().slice(0, 2)]}`;
  });
  eat(/(\d{4})\s*жыл[а-яәғқңөұүһі]*\s*(қаңтар|ақпан|наурыз|сәуір|мамыр|маусым|шілде|тамыз|қыркүйек|қазан|қараша|желтоқсан)[а-яәғқңөұүһі]*/gi,
    (m) => `ym:${m[1]}-${MONTH_KZ[m[2].toLowerCase()]}`);

  // 맨 숫자. 천단위 구분(뒤 3자리)만 «붙이고», 나머지 쉼표·마침표는 «자른다».
  // 50,000 = 50 000 = 50000 은 같은 사실이고, 36.8% 와 36,8% 도 같은 사실이기 때문이다.
  // 「6,7,10층」 같은 열거도 이 규칙으로 6 / 7 / 10 으로 갈린다.
  const normalized = rest.replace(/(\d)[\u00a0\u202f ,](?=\d{3}(?!\d))/g, "$1");
  for (const m of normalized.matchAll(/\d+/g)) {
    if (m[0].length >= 2) out.push(`num:${m[0]}`);
  }
  return [...new Set(out)];
}

function detectLostFacts(ko, translated) {
  if (!ko || !translated) return [];
  const want = factTokens(ko);
  const have = new Set(factTokens(translated));
  return want.filter((t) => !have.has(t));
}

function detectPlaceholderMismatch(ko, translated) {
  const grab = (s) => (s.match(/\{\{?\s*\w+\s*\}?\}|%[sd]/g) || []).sort();
  const a = grab(ko || "");
  const b = grab(translated || "");
  if (a.length === 0 && b.length === 0) return null;
  return a.join("|") === b.join("|") ? null : { expected: a, got: b };
}

/**
 * 목록 항목이 통째로 사라졌는지 — 「•」 줄 수와 문단 수를 센다.
 *
 * 왜 필요한가: 숫자가 안 붙은 항목은 A(사실 유실) 로 안 걸린다. 실제로 카자흐어 환자
 * 교육자료에서 응급 증상이 2~3개씩 빠져 있었는데(「얼굴·목이 부어오름」, 「극심한 가려움증」)
 * 숫자가 없어 어떤 검사도 못 봤다. **안전 안내에서 항목이 빠지는 건 문장이 어색한 것보다 위험하다.**
 */
function detectDroppedItems(ko, translated) {
  const bullets = (s) => (s.match(/^\s*[•·▪-]\s+\S/gm) || []).length;
  const a = bullets(ko || "");
  const b = bullets(translated || "");
  if (a < 3) return null; // 목록이라 부를 만한 것만 본다
  if (b >= a) return null;
  return { expected: a, got: b };
}

function detectUntranslatedLatin(value) {
  if (!value) return false;
  if (/[Ѐ-ӿ]/.test(value)) return false; // 키릴이 한 글자라도 있으면 통과
  let rest = value;
  for (const w of LATIN_OK) rest = rest.split(w).join(" ");
  return /[A-Za-z]{4,}/.test(rest);
}

function detectKzEqualsRu(ru, kz) {
  if (!ru || !kz || ru !== kz) return false;
  if (KZ_RU_SAME_OK.has(kz.trim())) return false;
  if (isNumericOnly(kz)) return false;
  if (kz.trim().length < 6) return false;
  // 라틴만인 값(형식·자리표·브랜드)은 두 언어가 같아도 정상
  if (!/[Ѐ-ӿ]/.test(kz)) return false;
  // 숫자+단위(200МБ·2,01 млн)와 고유명사 음차(Кванмён·Сондон-гу, Сеул)는 두 언어가 같은 게 맞다.
  if (isNumberWithUnit(kz)) return false;
  if (isProperNounOnly(kz)) return false;
  return true;
}

function detectGlossary(entryList, lang, key, value) {
  const hits = [];
  if (!value) return hits;
  for (const e of entryList) {
    if (e.exceptKeys?.some((p) => key.startsWith(p))) continue;
    for (const bad of e.avoid?.[lang] || []) {
      // 단어 경계 — 키릴/라틴 모두 안전하게 다루려고 «앞뒤가 글자가 아닌지»로 본다.
      // 대소문자는 무시한다(문장 첫 글자만 대문자인 경우가 태반이라 구분하면 절반을 놓친다).
      const re = new RegExp(`(^|[^\\p{L}])${bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu");
      if (re.test(value)) {
        hits.push({ id: e.id, status: e.status, bad, use: e.use?.[lang] || "", why: e.why });
        break;
      }
    }
  }
  return hits;
}

// ── 자체검사 ───────────────────────────────────────────────────────────────
function selftest() {
  const cases = [
    ["사실 유실", () => detectLostFacts("등록번호 A-2026-01-02-06761 입니다", "Зарегистрированный посредник").length > 0],
    ["사실 유실 — 구분자만 다른 건 통과", () => detectLostFacts("누적 50,000+ 사례", "более 50 000 случаев").length === 0],
    ["사실 유실 — 90일 빠짐", () => detectLostFacts("C-3-3 90일 이내", "C-3-3 қысқа мерзім").length > 0],
    ["항목 유실 검출", () => detectDroppedItems("• 하나\n• 둘\n• 셋\n• 넷", "• бір\n• екі") !== null],
    ["항목 수가 같으면 통과", () => detectDroppedItems("• 하나\n• 둘\n• 셋", "• бір\n• екі\n• үш") === null],
    ["짧은 목록은 안 본다", () => detectDroppedItems("• 하나\n• 둘", "• бір") === null],
    ["자리표 깨짐", () => detectPlaceholderMismatch("안녕 {name}", "Привет") !== null],
    ["자리표 정상", () => detectPlaceholderMismatch("안녕 {name}", "Привет, {name}") === null],
    ["미번역 라틴", () => detectUntranslatedLatin("Inquiry Form") === true],
    ["미번역 — 브랜드는 통과", () => detectUntranslatedLatin("healwith") === false],
    ["미번역 — 키릴 있으면 통과", () => detectUntranslatedLatin("Форма healwith") === false],
    ["kz=ru 검출", () => detectKzEqualsRu("Иммунная Клиника Кансо", "Иммунная Клиника Кансо") === true],
    ["kz=ru 공통용어는 통과", () => detectKzEqualsRu("Химиотерапия", "Химиотерапия") === false],
    ["kz=ru 고유명사 음차는 통과", () => detectKzEqualsRu("Сондон-гу, Сеул", "Сондон-гу, Сеул") === false],
    ["kz=ru 숫자+단위는 통과", () => detectKzEqualsRu("Макс. 200МБ", "Макс. 200МБ") === false],
    ["날짜 — 자리 순서가 달라도 통과", () => detectLostFacts("조사 결과 (2024.11.06)", "опроса (6 ноября 2024)").length === 0],
    ["날짜 — 날짜가 통째로 빠지면 검출", () => detectLostFacts("조사 결과 (2024.11.06)", "по данным опроса").length > 0],
    [
      "용어집 위반 검출",
      () =>
        detectGlossary(
          [{ id: "t", status: "locked", use: { kz: "науқас" }, avoid: { kz: ["пациент"] } }],
          "kz",
          "x.y",
          "Пациент · Алматы",
        ).length > 0,
    ],
    [
      "용어집 — 다른 단어 안에 든 것은 오탐 아님",
      () =>
        detectGlossary(
          [{ id: "t", status: "locked", use: { kz: "Сн" }, avoid: { kz: ["Сб"] } }],
          "kz",
          "x.y",
          "Сенбі",
        ).length === 0,
    ],
  ];
  let bad = 0;
  for (const [name, fn] of cases) {
    let ok = false;
    try {
      ok = fn();
    } catch (e) {
      ok = false;
      name.length; // noop
    }
    if (!ok) {
      bad++;
      console.error(`  ✗ 자체검사 실패: ${name}`);
    }
  }
  if (bad) {
    console.error(`[selftest] ${bad}건 실패 — 검출기가 고장났다. 고치기 전엔 이 검사 결과를 믿지 마라.`);
    process.exit(1);
  }
  console.log(`[selftest] ${cases.length}건 통과 — 검출기 정상.`);
}

// ── 본 검사 ────────────────────────────────────────────────────────────────
async function main() {
  if (SELFTEST) selftest();

  const dictUrl = pathToFileURL(path.join(ROOT, "src/lib/i18n/dictionary.js")).href;
  const glossUrl = pathToFileURL(path.join(ROOT, "src/lib/i18n/glossary.js")).href;
  const { DICTIONARY } = await import(dictUrl);
  const { GLOSSARY } = await import(glossUrl);

  const findings = [];
  const ko = DICTIONARY[SOURCE_LANG] || {};
  const ru = DICTIONARY.ru || {};

  for (const lang of TARGET_LANGS) {
    const dict = DICTIONARY[lang];
    if (!dict) continue;
    const gloss = GLOSSARY.filter((e) => e.use?.[lang] || (e.avoid?.[lang]?.length ?? 0) > 0);

    for (const [key, value] of Object.entries(dict)) {
      if (typeof value !== "string" || !value.trim()) continue;
      const src = ko[key];

      if (src) {
        for (const lost of UNIT_CONVERTED_KEYS.has(key) ? [] : detectLostFacts(src, value)) {
          findings.push({
            kind: "fact-lost", severity: "high", lang, key, detail: lost,
            ko: src, value,
            hint: "한국어 원문에 있던 사실(번호·기한·금액)이 번역에 없다. 환자가 그 정보를 못 본다.",
          });
        }
        const dropped = detectDroppedItems(src, value);
        if (dropped) {
          findings.push({
            kind: "items-dropped", severity: "high", lang, key,
            detail: `원문 ${dropped.expected}개 항목 → 번역 ${dropped.got}개`,
            ko: src, value,
            hint: "목록 항목이 통째로 빠졌다. 증상·주의사항 목록이면 환자 안전 문제다.",
          });
        }
        const ph = detectPlaceholderMismatch(src, value);
        if (ph) {
          findings.push({
            kind: "placeholder", severity: "high", lang, key,
            detail: `원문 ${ph.expected.join(",") || "(없음)"} → 번역 ${ph.got.join(",") || "(없음)"}`,
            ko: src, value, hint: "치환 자리가 안 맞으면 화면에 값이 안 채워지거나 이름이 사라진다.",
          });
        }
      }

      if ((lang === "ru" || lang === "kz") && !PLACEHOLDER_KEYS.test(key) && detectUntranslatedLatin(value)) {
        findings.push({
          kind: "untranslated", severity: "high", lang, key, detail: value,
          ko: src || "", value, hint: "키릴이 한 글자도 없다 — 번역이 안 된 채로 화면에 나간다.",
        });
      }

      if (
        lang === "kz" &&
        !PLACEHOLDER_KEYS.test(key) &&
        !UNIT_CONVERTED_KEYS.has(key) &&
        detectKzEqualsRu(ru[key], value)
      ) {
        findings.push({
          kind: "kz-equals-ru", severity: "medium", lang, key, detail: value,
          ko: src || "", value,
          hint: "카자흐어 화면에 러시아어가 그대로 나간다. 국제 공통 용어면 허용목록(KZ_RU_SAME_OK)에 넣어라.",
        });
      }

      for (const g of detectGlossary(gloss, lang, key, value)) {
        findings.push({
          kind: "glossary", severity: g.status === "locked" ? "high" : "low",
          lang, key, detail: `"${g.bad}" → "${g.use}"`, ko: src || "", value,
          hint: g.why, glossaryStatus: g.status, glossaryId: g.id,
        });
      }
    }
  }

  if (AS_JSON) {
    console.log(JSON.stringify({ findings }, null, 2));
  } else {
    report(findings);
  }

  // CI 차단 기준: 사실 유실·자리표·미번역·확정 용어(locked) 위반 — 그중 BLOCKING_LANGS 만.
  // 「제안」 용어와 kz=ru 는 원어민 확정 전이므로 막지 않는다(막으면 아무도 안 본다).
  const blocking = findings.filter(
    (f) => f.severity === "high" && (STRICT_ALL || BLOCKING_LANGS.has(f.lang)),
  );
  if ((STRICT || STRICT_ALL) && blocking.length) {
    console.error(
      `\n[i18n-quality] 차단 ${blocking.length}건 (${STRICT_ALL ? "전 언어" : [...BLOCKING_LANGS].join("·")}) — 위 항목을 고치고 다시 돌려라.`,
    );
    process.exit(1);
  }
}

function report(findings) {
  const byKind = {};
  for (const f of findings) (byKind[f.kind] ||= []).push(f);
  const title = {
    "fact-lost": "A. 사실 유실 (원문의 번호·기한·금액이 번역에 없다)",
    placeholder: "E. 자리표 깨짐 ({name}·%s 개수 불일치)",
    untranslated: "C. 미번역 (키릴 0 — 번역 안 된 채 나감)",
    "kz-equals-ru": "B. 언어 섞임 (카자흐어 자리에 러시아어 그대로)",
    "items-dropped": "F. 항목 유실 (목록에서 줄이 통째로 빠짐)",
    glossary: "D. 용어 흔들림 (용어집 위반)",
  };
  const order = ["fact-lost", "items-dropped", "placeholder", "untranslated", "glossary", "kz-equals-ru"];

  console.log("\n===== 번역 품질 검사 =====");
  if (!findings.length) {
    console.log("발견 0건.");
    return;
  }
  for (const kind of order) {
    const list = byKind[kind];
    if (!list?.length) continue;
    console.log(`\n## ${title[kind]} — ${list.length}건`);
    const show = list.slice(0, 30);
    for (const f of show) {
      const flag = f.glossaryStatus === "proposed" ? " (제안·경고만)" : "";
      console.log(`  [${f.lang}] ${f.key}${flag}`);
      console.log(`      ${f.detail}`);
      if (f.ko) console.log(`      원문: ${f.ko.slice(0, 80)}`);
      console.log(`      번역: ${String(f.value).slice(0, 80)}`);
    }
    if (list.length > show.length) console.log(`  … 외 ${list.length - show.length}건`);
  }
  const high = findings.filter((f) => f.severity === "high");
  const blocked = high.filter((f) => STRICT_ALL || BLOCKING_LANGS.has(f.lang)).length;
  console.log(
    `\n합계 ${findings.length}건 — 지금 막는 것 ${blocked}건(${[...BLOCKING_LANGS].join("·")}) / ` +
      `아직 안 막는 것 ${high.length - blocked}건(en·zh·ja, 고칠 목록) / 참고 ${findings.length - high.length}건`,
  );
}

main().catch((e) => {
  console.error("[i18n-quality] 실행 실패:", e?.message || e);
  process.exit(1);
});
