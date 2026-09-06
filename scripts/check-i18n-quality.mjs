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
// 사람 이름 라틴 표기(「Dr. Hwang Yi-jun」) — 음차할지 라틴을 유지할지는 «표기 정책»이지 번역 결함이 아니다.
// 결정 전까지 검사에서 빼고, 코디 확인 요청 문서(docs/i18n/용어확정_요청_코디네이터.md)로 넘긴다.
const PERSON_NAME_LATIN = /^(Dr\.|Prof\.)\s+[A-Z]/;
// 단위 자체가 언어마다 바뀌는 값(201만 → 2,01 млн). 자릿수 비교가 성립하지 않는다.
const UNIT_CONVERTED_KEYS = new Set([
  "careJourney.stat2Value", "socialProof.stat1Big", "socialProof.stat2Big",
  "home.stats.items.1.value", // 201만+ → 2,01 млн+ / 2.01M+ (자릿수 비교가 성립하지 않는다)
]);
// kz 와 ru 가 같아도 되는 것 — 국제 공통 의학·행정 용어, 고유명사, 기호·숫자만 있는 값.
const KZ_RU_SAME_OK = new Set([
  "Химиотерапия", "Иммунотерапия", "Стационар", "Рецепт", "Медиана", "Анестезия",
  "Виза", "Диагноз", "Аккаунт", "Бюджет", "Триггер", "Координатор", "Телемедицина",
  "Гипертония", "Гепатит", "Аллергия", "Бета", "Мессенджер", "Оператор", "Компания",
  "Веб-сайт", "Алматы", "Астана", "Телефон", "ID / Телефон", "AI-агент",
  // 2026-09-05 암종 상세·치료 카드를 그물에 넣으며 — 국제 의학 용어(카자흐어 표준도 같은 꼴)
  "Лимфедема", "Демпинг-синдром", "Гипокальциемия", "Иммунитет", "Глутатион", "Иммуноцианин",
]);
// 한국 지명·병원 이름의 키릴 음차 — 두 언어가 같은 게 «맞다»(고유명사라 옮기는 게 아니라 적는 것).
// 사람 이름 칸 — 한국인 이름의 키릴 음차는 러·카가 같은 게 맞다(옮기는 게 아니라 적는 것). 키로 가른다(값 휴리스틱은 「Иммунная Клиника」 검출과 충돌).
const PROPER_NOUN_KEYS = /(^|\.)(doctors\.\d+\.name|director\.name|representative)$/;
const TRANSLITERATED_PROPER = [
  "Кансо", "Кванмён", "Сондон", "Синчон", "Синчхон", "Магок", "Чхольсан", "Содэмун",
  "Сеул", "Кёнги", "Ихва", "Мокдон", "Куро", "Северанс", "Мёнрёк",
];

// 원어민이 「숫자 대신 말」로 옮긴 것 — 뜻이 같으면 사실 유실이 아니다.
// 예: 「24시간」 → круглосуточно / тәулік бойы. 이걸 막으면 검사가 «자연스러운 번역»을 방해한다.
const FACT_EQUIVALENTS = [
  { token: "num:24", any: [/круглосуточн/i, /тәулік бойы/i, /24\/7/, /round[- ]the[- ]clock/i, /全天候/, /24時間/] },
  { token: "num:100", any: [/почти\s+все/i, /барлығына жуық/i] },
  // 「10년 전 대비」 → a decade ago / 十年前. 「1,000년 이상」 → 千年 / millennium.
  { token: "num:10", any: [/\ba decade\b/i, /\bdecades?\b/i, /十年/, /十数年/, /десятилет/i, /онжылд/i] },
  { token: "num:1000", any: [/millenni/i, /千年/, /тысячелет/i, /мыңжылд/i] },
  // 「91일 이상」 = 「90일 초과」 — 영어 화면은 ≤90 / >90 쌍으로 맞춰 쓴다(같은 사실의 다른 표기).
  { token: "num:91", any: [/>\s*90/, /90\+/, /more than 90/i, /over 90/i] },
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
function factTokens(input) {
  if (!input) return [];
  // 조판용 하이픈(‑ – — −)을 ASCII 로 맞춘다. 러시아어 문장은 C‑3‑3 처럼 U+2011 을 쓰는데
  // 이걸 안 맞추면 «비자 번호가 번역에서 사라졌다»는 가짜 경고가 뜬다(실제로는 멀쩡했다).
  const s = String(input).replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-");
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
  const MONTH_EN = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  const MONTH_KZ = { қаңтар: 1, ақпан: 2, наурыз: 3, сәуір: 4, мамыр: 5, маусым: 6, шілде: 7, тамыз: 8, қыркүйек: 9, қазан: 10, қараша: 11, желтоқсан: 12 };
  eat(/(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/g, (m) => `date:${m[1]}-${+m[2]}-${+m[3]}`);
  // 중국어·일본어는 年/月/日 글자가 달라 위 규칙에 안 걸린다. 영어는 월 이름이 말이다.
  // 이 둘이 없으면 «정확히 옮긴» 날짜가 사실 유실로 잡힌다 — 검사가 정상 번역을 나무라는 꼴.
  eat(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g, (m) => `date:${m[1]}-${+m[2]}-${+m[3]}`);
  eat(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/gi,
    (m) => `date:${m[3]}-${MONTH_EN[m[1].toLowerCase()]}-${+m[2]}`);
  eat(/(\d{1,2})\s+(янв|фев|мар|апр|ма|июн|июл|авг|сен|окт|ноя|дек)[а-яё]*\s+(\d{4})/gi, (m) => `date:${m[3]}-${MONTH_RU[m[2].toLowerCase()]}-${+m[1]}`);
  eat(/(\d{4})\s*ж\.?\s*(\d{1,2})\s*(қаңтар|ақпан|наурыз|сәуір|мамыр|маусым|шілде|тамыз|қыркүйек|қазан|қараша|желтоқсан)/gi, (m) => `date:${m[1]}-${MONTH_KZ[m[3].toLowerCase()]}-${+m[2]}`);
  // 년-월만 있는 것(2025년 12월 = декабрь 2025)
  eat(/(\d{4})\s*년\s*(\d{1,2})\s*월/g, (m) => `ym:${m[1]}-${+m[2]}`);
  eat(/(\d{4})\s*年\s*(\d{1,2})\s*月/g, (m) => `ym:${m[1]}-${+m[2]}`);
  eat(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})/gi,
    (m) => `ym:${m[2]}-${MONTH_EN[m[1].toLowerCase()]}`);
  eat(/(январ|феврал|март|апрел|ма|июн|июл|август|сентябр|октябр|ноябр|декабр)[а-яё]*\s+(\d{4})/gi, (m) => {
    const k = m[1].toLowerCase().slice(0, 3);
    return `ym:${m[2]}-${MONTH_RU[k] ?? MONTH_RU[m[1].toLowerCase().slice(0, 2)]}`;
  });
  eat(/(\d{4})\s*жыл[а-яәғқңөұүһі]*\s*(қаңтар|ақпан|наурыз|сәуір|мамыр|маусым|шілде|тамыз|қыркүйек|қазан|қараша|желтоқсан)[а-яәғқңөұүһі]*/gi,
    (m) => `ym:${m[1]}-${MONTH_KZ[m[2].toLowerCase()]}`);

  // 한 자리 수도 «단위가 붙으면» 사실이다 — 「8MHz」(온열 주파수)·「1인실」·「6층」. 아래 맨 숫자 규칙은 2자리 이상만
  // 보므로 이런 게 빠져도 초록이었다(2026-09-05 독립 리뷰가 kz 에서 8 МГц 를 지우고 실증).
  // 단위는 «말로 잘 안 옮기는» 물리·기술 단위와 층·인실만 — 분·회·명·단계·개월은 원어민이 «одной минуты·бес кезең»처럼 말로
  // 옮기는 게 자연스러워 넣으면 정상 번역 15건이 빨개졌다(실측). 비교는 «숫자»로만(unit:8) — 단위 표기는 언어마다 달라도 되고,
  // 번역 쪽은 맨 한 자리 수·수사(одн·бір·one·一 …)도 have 로 친다(detectLostFacts).
  eat(new RegExp(String.raw`(?<!\d)(\d)(?:[.,]\d+)?\s?(?:MHz|㎒|МГц|°C|℃|%|mg|мг|ml|мл|kg|кг|cm|см|mm|мм|층|인실|этаж|қабат|階|层)`, "gi"),
    (m) => `unit:${m[1]}`);

  // 맨 숫자. 천단위 구분(뒤 3자리)만 «붙이고», 나머지 쉼표·마침표는 «자른다».
  // 50,000 = 50 000 = 50000 은 같은 사실이고, 36.8% 와 36,8% 도 같은 사실이기 때문이다.
  // 「6,7,10층」 같은 열거도 이 규칙으로 6 / 7 / 10 으로 갈린다.
  const normalized = rest.replace(/(\d)[\u00a0\u202f ,](?=\d{3}(?!\d))/g, "$1");
  for (const m of normalized.matchAll(/\d+/g)) {
    if (m[0].length >= 2) out.push(`num:${m[0]}`);
  }
  return [...new Set(out)];
}

// 한 자리 수를 말(수사)로 옮긴 것 — 「1인실 → одноместные」「5단계 → бес кезең」. 뜻이 같으면 사실 유실이 아니다.
const NUMBER_WORDS = {
  1: /одн[аоиуые]|один|\bбір\b|\bone\b|\bsingle\b|[一１]|ひと|いち/i,
  2: /дв[аеух]|\bекі\b|\btwo\b|[二两２]|ふた|に/i,
  3: /тр[иех]|\bүш\b|\bthree\b|[三３]|さん|みっ/i,
  4: /четыр|\bтөрт\b|\bfour\b|[四４]|よん|し/i,
  5: /пят|\bбес\b|\bfive\b|[五５]|ご/i,
  6: /шест|\bалты\b|\bsix\b|[六６]|ろく/i,
  7: /сем[ьи]|\bжеті\b|\bseven\b|[七７]|なな|しち/i,
  8: /восем|восьм|\bсегіз\b|\beight\b|[八８]|はち/i,
  9: /девят|\bтоғыз\b|\bnine\b|[九９]|きゅう/i,
};

function detectLostFacts(ko, translated) {
  if (!ko || !translated) return [];
  const want = factTokens(ko);
  // 번역 쪽은 맨 한 자리 수도 «있다»로 친다 — 「3 часа」처럼 단위 목록에 없는 말이 붙어도 숫자가 살아 있으면 사실은 산 것.
  const have = new Set([...factTokens(translated), ...[...String(translated).matchAll(/\d/g)].map((m) => `unit:${m[0]}`)]);
  return want.filter((t) => {
    if (have.has(t)) return false;
    const eq = FACT_EQUIVALENTS.find((e) => e.token === t);
    if (eq && eq.any.some((re) => re.test(translated))) return false; // 말로 옮긴 것 — 통과
    if (t.startsWith("unit:") && NUMBER_WORDS[t.slice(5)]?.test(String(translated))) return false; // 수사로 옮긴 것 — 통과
    return true;
  });
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
    // onlyKeys 가 있으면 그 화면들에서만 본다 — приём·расчёт 처럼 «다른 뜻으로도 맞는» 말은
    // 전 화면에서 잡으면 오탐이 정탐을 덮는다.
    if (e.onlyKeys && !e.onlyKeys.some((p) => key.startsWith(p))) continue;
    for (const bad of e.avoid?.[lang] || []) {
      // 단어 경계 — 키릴/라틴 모두 안전하게 다루려고 «앞뒤가 글자가 아닌지»로 본다.
      // 대소문자는 무시한다(문장 첫 글자만 대문자인 경우가 태반이라 구분하면 절반을 놓친다).
      // 「пациент*」처럼 끝에 * 를 붙이면 «어간» 매칭 — 카자흐어는 격어미가 붙어(пациенттерінде…) 낱말을 나열해선 못 잡는다
      // (2026-09-05 독립 리뷰: 고친 5곳 중 2곳은 이 검사에 애초에 안 보였다).
      const stem = bad.endsWith("*");
      const word = (stem ? bad.slice(0, -1) : bad).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|[^\\p{L}])${word}${stem ? "\\p{L}*" : ""}([^\\p{L}]|$)`, "iu");
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
    // ↓ 2026-08-21 리뷰에서 나온 «검사기 자신의 오탐» 4종 — 고친 뒤 다시 새지 않게 잠근다.
    [
      "오탐 방지 — 조판용 하이픈(C‑3‑3, U+2011)도 같은 비자 번호로 본다",
      () => detectLostFacts("장기 치료는 G-1-10, 단기는 C-3-3 비자", "долгосрочного — G‑1‑10, краткосрочного C‑3‑3").length === 0,
    ],
    [
      "오탐 방지 — 영어 월 표기(February 2026)를 날짜로 읽는다",
      () => detectLostFacts("최종 업데이트: 2026년 2월", "Last updated: February 2026").length === 0,
    ],
    [
      "오탐 방지 — 중국어·일본어 년월(2026年2月)을 날짜로 읽는다",
      () =>
        detectLostFacts("최종 업데이트: 2026년 2월", "最后更新：2026 年 2 月").length === 0 &&
        detectLostFacts("최종 업데이트: 2026년 2월", "最終更新：2026年2月").length === 0,
    ],
    [
      "오탐 방지 — 「10년 전 대비」를 말로 옮긴 것(a decade / 十年前)은 사실 유실이 아니다",
      () =>
        detectLostFacts("10년 전 대비 향상", "improved over a decade").length === 0 &&
        detectLostFacts("10년 전 대비 향상", "较十年前大幅提高").length === 0,
    ],
    [
      "홈 콘텐츠 평탄화 — 중첩·배열이 사전과 같은 모양으로 펴진다",
      () => {
        const out = flattenHomeContent(
          { hero: { title: { ko: "가", ru: "А" } }, items: [{ name: { ko: "나", ru: "Б" } }] },
          "home",
          {},
        );
        return out["home.hero.title"]?.ru === "А" && out["home.items.0.name"]?.ru === "Б";
      },
    ],
    [
      "용어집 onlyKeys — 지정한 화면 밖에서는 안 잡는다(приём 은 «서류 접수»로도 맞는 말)",
      () => {
        const e = [{ id: "t", status: "proposed", use: { ru: "консультация" }, avoid: { ru: ["приём"] }, onlyKeys: ["consult"] }];
        return (
          detectGlossary(e, "ru", "consult.title", "Онлайн приём").length === 1 &&
          detectGlossary(e, "ru", "visaDocs.title", "Приём документов").length === 0
        );
      },
    ],
    ["사실 유실 — 90일 빠짐", () => detectLostFacts("C-3-3 90일 이내", "C-3-3 қысқа мерзім").length > 0],
    ["사실 — 숫자를 말로 옮긴 것은 통과", () => detectLostFacts("24시간 답변", "тәулік бойы жауап береміз").length === 0],
    ["항목 유실 검출", () => detectDroppedItems("• 하나\n• 둘\n• 셋\n• 넷", "• бір\n• екі") !== null],
    ["항목 수가 같으면 통과", () => detectDroppedItems("• 하나\n• 둘\n• 셋", "• бір\n• екі\n• үш") === null],
    ["짧은 목록은 안 본다", () => detectDroppedItems("• 하나\n• 둘", "• бір") === null],
    ["자리표 깨짐", () => detectPlaceholderMismatch("안녕 {name}", "Привет") !== null],
    ["자리표 정상", () => detectPlaceholderMismatch("안녕 {name}", "Привет, {name}") === null],
    ["미번역 라틴", () => detectUntranslatedLatin("Inquiry Form") === true],
    ["미번역 — 브랜드는 통과", () => detectUntranslatedLatin("healwith") === false],
    ["미번역 — 키릴 있으면 통과", () => detectUntranslatedLatin("Форма healwith") === false],
    ["사실 유실 — 단위 붙은 한 자리 수(8MHz)도 사실", () => detectLostFacts("8MHz 고주파 온열", "Жоғары жиілікті жылу").length === 1 && detectLostFacts("8MHz 고주파 온열", "8 МГц жоғары жиілікті жылу").length === 0],
    ["사실 유실 — 한 자리 수를 수사로 옮긴 것은 통과(1인실 → одноместные), 아예 빠지면 잡는다", () => detectLostFacts("1인실 기준", "одноместные палаты").length === 0 && detectLostFacts("1인실 기준", "палаты").length === 1],
    ["용어집 어간 매칭 — пациент* 가 격어미 붙은 꼴을 잡는다", () => detectGlossary([{ id: "t", status: "locked", use: { kz: "науқас" }, avoid: { kz: ["пациент*"] } }], "kz", "k", "гастрэктомия пациенттерінде").length === 1 && detectGlossary([{ id: "t", status: "locked", use: { kz: "науқас" }, avoid: { kz: ["пациент*"] } }], "kz", "k", "науқастарында").length === 0],
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
/**
 * HOME_CONTENT(중첩 + 배열)를 사전과 같은 모양 {키: {언어: 값}} 으로 편다.
 * 잎 판정은 «ko 나 ru 가 문자열인 객체» — 그 아래로는 더 안 들어간다.
 */
const SEEN_LEAVES = new WeakSet(); // 같은 객체(치료법 name 등)를 여러 경로가 참조하면 한 번만 보고한다
function flattenHomeContent(node, prefix, out) {
  if (!node || typeof node !== "object") return out;
  if (typeof node.ko === "string" || typeof node.ru === "string") {
    if (SEEN_LEAVES.has(node)) return out;
    SEEN_LEAVES.add(node);
    out[prefix] = node;
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) v.forEach((item, i) => flattenHomeContent(item, `${key}.${i}`, out));
    else if (v && typeof v === "object") flattenHomeContent(v, key, out);
  }
  return out;
}

async function main() {
  if (SELFTEST) selftest();

  const dictUrl = pathToFileURL(path.join(ROOT, "src/lib/i18n/dictionary.js")).href;
  const glossUrl = pathToFileURL(path.join(ROOT, "src/lib/i18n/glossary.js")).href;
  const homeUrl = pathToFileURL(path.join(ROOT, "src/lib/content/homeContent.js")).href;
  const therapyUrl = pathToFileURL(path.join(ROOT, "src/lib/data/immuneTherapies.js")).href;
  const cancerUrl = pathToFileURL(path.join(ROOT, "src/lib/data/immuneCancerDetails.js")).href;
  const { DICTIONARY } = await import(dictUrl);
  const { GLOSSARY } = await import(glossUrl);
  const { HOME_CONTENT } = await import(homeUrl);
  const { IMMUNE_THERAPIES } = await import(therapyUrl);
  const { CANCER_DETAILS, CANCER_FAQ, POST_SURGICAL_CARE, ITCRN_FRAMEWORK } = await import(cancerUrl);

  // 홈 문구는 사전 파일이 아니라 homeContent.js 에 있어서 그동안 검사 «밖»이었다.
  // 가장 많이 보는 화면인데 러시아어가 카자흐 자리에 그대로 있는 것도 못 잡고 있었다.
  const home = flattenHomeContent(HOME_CONTENT, "home", {});
  // 암종 상세(5축·FAQ·치료 카드)도 같은 그물에 넣는다 — 2026-09-05 독립 리뷰: check:cancer-i18n 은 «비었나»만 보고
  // 이 검사는 이 파일들을 아예 안 읽어서, 첫 번역 묶음에서 숫자가 빠진 언어(카자흐어 「8MHz」)가 CI 초록으로 지나갔다.
  // 잎 판정은 홈과 같다(ko 나 ru 가 문자열인 객체).
  const extra = {
    ...flattenHomeContent(IMMUNE_THERAPIES, "therapy", {}),
    ...flattenHomeContent(CANCER_DETAILS, "cancer", {}),
    ...flattenHomeContent(CANCER_FAQ, "cancerFaq", {}),
    ...flattenHomeContent(POST_SURGICAL_CARE, "postSurgical", {}),
    ...flattenHomeContent(ITCRN_FRAMEWORK, "itcrn", {}),
  };
  const DICT = {};
  for (const lang of [SOURCE_LANG, ...TARGET_LANGS]) {
    DICT[lang] = { ...(DICTIONARY[lang] || {}) };
    for (const [k, byLang] of Object.entries({ ...home, ...extra })) {
      if (typeof byLang?.[lang] === "string") DICT[lang][k] = byLang[lang];
    }
  }

  // 용어집에 «쓸 말(use)»만 있고 «피할 말(avoid)»이 비어 있으면 그 항목은 검출이 «구조적으로» 안 된다.
  // 조용히 통과시키면 「용어집에 넣었으니 막힌다」고 착각하게 되므로 매번 눈에 보이게 알린다.
  const undetectable = GLOSSARY.filter(
    (e) => Object.keys(e.use || {}).length > 0 && Object.values(e.avoid || {}).every((a) => !a?.length),
  );
  if (undetectable.length) {
    console.log(
      `⚠️ 용어집 ${undetectable.length}건은 «피할 말»이 비어 있어 검출되지 않는다: ` +
        undetectable.map((e) => e.id).join(", "),
    );
  }

  const findings = [];
  const ko = DICT[SOURCE_LANG] || {};
  const ru = DICT.ru || {};

  for (const lang of TARGET_LANGS) {
    const dict = DICT[lang];
    if (!dict) continue;
    const gloss = GLOSSARY.filter((e) => e.use?.[lang] || (e.avoid?.[lang]?.length ?? 0) > 0);

    for (const [key, value] of Object.entries(dict)) {
      if (typeof value !== "string" || !value.trim()) continue;
      const src = ko[key];

      if (src) {
        // 자리표시문(전화·날짜 예시)은 «값이 곧 예시»라 언어마다 달라야 정상 — 사실 대조에서 뺀다.
        // (미번역·kz=ru 검출은 이미 빼고 있었는데 여기만 빠져 있어 정상 값이 high 로 잡혔다.)
        const skipFacts = UNIT_CONVERTED_KEYS.has(key) || PLACEHOLDER_KEYS.test(key);
        for (const lost of skipFacts ? [] : detectLostFacts(src, value)) {
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

      if (
        (lang === "ru" || lang === "kz") &&
        !PLACEHOLDER_KEYS.test(key) &&
        !PERSON_NAME_LATIN.test(value) &&
        detectUntranslatedLatin(value)
      ) {
        findings.push({
          kind: "untranslated", severity: "high", lang, key, detail: value,
          ko: src || "", value, hint: "키릴이 한 글자도 없다 — 번역이 안 된 채로 화면에 나간다.",
        });
      }

      if (
        lang === "kz" &&
        !PLACEHOLDER_KEYS.test(key) &&
        !PROPER_NOUN_KEYS.test(key) &&
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
  // 예외: 항목 유실(items-dropped)은 전 언어.
  // 「제안」 용어와 kz=ru 는 원어민 확정 전이므로 막지 않는다(막으면 아무도 안 본다).
  // 「목록 항목이 통째로 빠짐」은 환자 안전 안내(응급 증상·주의사항)에서 터지므로 언어를 가리지 않고 막는다.
  // 나머지 부류만 BLOCKING_LANGS(1차 타깃)로 좁힌다 — 첫날부터 전 언어를 막으면 아무도 초록불을 안 본다.
  const ALWAYS_BLOCKING_KINDS = new Set(["items-dropped"]);
  const blocking = findings.filter(
    (f) =>
      f.severity === "high" &&
      (STRICT_ALL || BLOCKING_LANGS.has(f.lang) || ALWAYS_BLOCKING_KINDS.has(f.kind)),
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
