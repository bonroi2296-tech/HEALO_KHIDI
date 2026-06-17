// 암종 상세 콘텐츠(제목·소개·합병증·통계·FAQ·칩) 6개 언어 완성 검사.
// "영어 화면 한국어 누출"(e2e i18n-no-korean-leak)과 짝 — 이건 "번역이 실제 다 채워졌나"를 본다.
// (누출 검사는 en 폴백이 한글을 가리면 통과해버리므로, 완성 여부는 별도로 강제해야 함.)
import { CANCER_DETAILS, CANCER_FAQ, POST_SURGICAL_CARE } from "../src/lib/data/immuneCancerDetails.js";

const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];
const problems = [];
const P = (m) => problems.push(m);

const isPlainObj = (v) => v && typeof v === "object" && !Array.isArray(v);

// 다국어 객체: 6개 언어 키가 모두 있고 비어있지 않아야 함.
function checkLocalized(label, v) {
  if (typeof v === "string") return P(`${label}: 한국어 평문(다국어 객체 아님) — "${v.slice(0, 30)}…"`);
  if (!isPlainObj(v)) return P(`${label}: 값이 비정상`);
  for (const lang of LANGS) {
    const x = v[lang];
    if (x === undefined || x === null || (typeof x === "string" && !x.trim())) {
      P(`${label}: '${lang}' 누락`);
    }
  }
}

// 칩(focusPrograms): {ko:[..], en:[..], ...} — 각 언어가 배열이어야.
function checkLocalizedArray(label, v) {
  if (Array.isArray(v) || typeof v === "string") return P(`${label}: 다국어 배열 객체 아님`);
  if (!isPlainObj(v)) return P(`${label}: 값이 비정상`);
  for (const lang of LANGS) {
    if (!Array.isArray(v[lang]) || v[lang].length === 0) P(`${label}: '${lang}' 배열 누락`);
  }
}

for (const [slug, c] of Object.entries(CANCER_DETAILS)) {
  checkLocalized(`${slug}.title`, c.title);
  checkLocalized(`${slug}.intro`, c.intro);
  if (c.focusPrograms) checkLocalizedArray(`${slug}.focusPrograms`, c.focusPrograms);
  if (Array.isArray(c.complications)) {
    c.complications.forEach((comp, i) => {
      checkLocalized(`${slug}.complications[${i}].name`, comp.name);
      checkLocalized(`${slug}.complications[${i}].desc`, comp.desc);
    });
  }
  if (c.stats?.survivalImprovement) checkLocalized(`${slug}.stats.survivalImprovement`, c.stats.survivalImprovement);
}

for (const [key, care] of Object.entries(POST_SURGICAL_CARE)) {
  checkLocalized(`POST_SURGICAL_CARE.${key}.title`, care.title);
}

for (const [slug, faqs] of Object.entries(CANCER_FAQ)) {
  faqs.forEach((f, i) => {
    checkLocalized(`FAQ.${slug}[${i}].q`, f.q);
    checkLocalized(`FAQ.${slug}[${i}].a`, f.a);
  });
}

if (problems.length) {
  console.error(`❌ 암종 콘텐츠 6개 언어 미완성 ${problems.length}건:\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("✅ 암종 콘텐츠 6개 언어 완성 (제목·소개·합병증·통계·FAQ·칩)");
