// 암종 상세 콘텐츠(제목·소개·합병증·통계·FAQ·칩) 6개 언어 완성 검사.
// "영어 화면 한국어 누출"(e2e i18n-no-korean-leak)과 짝 — 이건 "번역이 실제 다 채워졌나"를 본다.
// (누출 검사는 en 폴백이 한글을 가리면 통과해버리므로, 완성 여부는 별도로 강제해야 함.)
import { CANCER_DETAILS, CANCER_FAQ, POST_SURGICAL_CARE, ITCRN_FRAMEWORK } from "../src/lib/data/immuneCancerDetails.js";
import { IMMUNE_THERAPIES } from "../src/lib/data/immuneTherapies.js";
import { IMMUNE_HOSPITAL } from "../src/lib/data/immuneHospitalInfo.js";

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

// ── 치료법 카드(immuneTherapies.js) — 암종 상세 페이지 카드가 name·description·evidence 를 그린다(name 은 ITCRN 쪽) ─
// 왜 (2026-09-05): 5축 잎을 다 채우고도 같은 페이지의 «카드 설명»은 kz·zh·ja 19개·ru 10개가 비어
//   영어로 조용히 폴백되고 있었다(검사 밖이라 아무도 몰랐다). 채우면서 검사에 넣는다 — 천장 0.
//   mechanism·indications·menuOptions 는 화면이 안 그리므로 검사하지 않는다(그리게 되면 여기에 추가).
//   ⚠️ 값은 AI 번역이라 코디 검수 전엔 「제안」 — 이 검사는 «비었는지»만 본다.
for (const [id, t] of Object.entries(IMMUNE_THERAPIES)) {
  // name 도 본다 — 오늘은 5축 태그가 19개 전부를 참조해 위 ITCRN 검사가 잡지만, ITCRN 에 안 매인 새 치료법이 생기면 카드 이름이
  // 조용히 영어로 나간다(독립 리뷰 2026-09-05). 중복 보고는 무해하다.
  checkLocalized(`THERAPY.${id}.name`, t.name);
  checkLocalized(`THERAPY.${id}.description`, t.description);
  if (t.evidence) checkLocalized(`THERAPY.${id}.evidence`, t.evidence);
}

// ── 면력 병원 페이지(immuneHospitalInfo.js) — /hospitals/immune 의 본문 전부 ─────────────────────────
// 왜 (2026-09-05 실측): 잎 183개 중 ru 170·kz/zh/ja 177개가 비어 러시아어 페이지의 본문 3/4 가 영어였다(핵심 시장 페이지).
//   채우면서 «잎 전부»를 검사에 넣는다 — 화면이 안 그리는 잎(centers·process 등)도 채웠으니 예외 없이 본다.
//   ⚠️ 값은 AI 번역이라 코디 검수 전엔 「제안」 — 이 검사는 «비었는지»만 본다.
(function walkHospital(node, prefix) {
  if (!node || typeof node !== "object") return;
  if (LANGS.some((l) => typeof node[l] === "string")) return checkLocalized(`HOSPITAL.${prefix}`, node);
  for (const [k, v] of Object.entries(node)) walkHospital(v, prefix ? `${prefix}.${k}` : k);
})(IMMUNE_HOSPITAL, "");

for (const [key, care] of Object.entries(POST_SURGICAL_CARE)) {
  checkLocalized(`POST_SURGICAL_CARE.${key}.title`, care.title);
}

for (const [slug, faqs] of Object.entries(CANCER_FAQ)) {
  faqs.forEach((f, i) => {
    checkLocalized(`FAQ.${slug}[${i}].q`, f.q);
    checkLocalized(`FAQ.${slug}[${i}].a`, f.a);
  });
}

// ── 5축(ITCRN) 제목·설명 — 「동결」 방식 ─────────────────────────────
// 왜 여기 있나 (2026-08-28, 음성 대조로 발각):
//   이 검사는 CANCER_DETAILS·POST_SURGICAL_CARE·CANCER_FAQ 만 봤다. 그런데 암 상세 페이지의
//   «실질 본문»은 5축 아코디언(ITCRN_FRAMEWORK 의 title·desc)이다 — 코드 주석이 직접 그렇게 적어뒀고
//   (app/treatments/[slug]/CancerDetailClient.jsx), 접혀 있어도 HTML 에 상시 노출된다.
//   그 5축이 검사 밖에 있어서 «빈 언어»가 있어도 CI 는 계속 초록불이었다.
//   화면 쪽 l() 은 obj[lang] || obj.en || obj.ko 로 폴백하므로 «안 깨지고 영어로 조용히 바뀐다»
//   = 사람이 그 페이지를 그 언어로 열어보기 전엔 아무도 모른다. 우리 1위 사고 부류(조용한 실패)다.
//
// 왜 즉시 차단이 아니라 동결인가: 오늘 기준 빈 칸이 38개다. 지금 바로 빨간불로 만들면 본판이 잠긴다.
//   번역(특히 ru·kz = 핵심 시장)은 의료 용어라 검수가 필요해 이 검사가 대신 지어낼 수 없다.
//   그래서 «오늘 숫자를 천장으로» 못 박는다 — 더 나빠지는 것만 막고, 줄면 천장을 같이 내리게 강제한다.
//   ⚠️ 번역이 들어오면 BASELINE 을 반드시 같이 낮춰라(안 낮추면 이 검사가 다시 장식이 된다).
// 2026-09-05: 38 → 0. 제목·설명 빈 칸 38개를 채우고, 한국어뿐이던 잎 24개(근거·요법 태그·항암 지원)도
//   {ko,en,ru,kz,zh,ja} 로 바꿨다 → 이제 «잎 전부»를 검사한다(문자열 잎이 남아 있으면 그것도 빈 칸으로 센다).
//   ⚠️ 번역은 AI 가 했고 코디네이터 검수 전엔 「제안」이다 — 값을 고쳐도 이 검사는 «비었는지»만 본다.
const ITCRN_BASELINE = 0;
const itcrnMissing = [];
const missingLangs = (label, val) => {
  if (!isPlainObj(val)) {
    itcrnMissing.push(`${label}: 언어별 객체가 아니다(${typeof val}) → 화면은 빈 칸`);
    return;
  }
  for (const lang of LANGS) {
    const x = val[lang];
    if (x === undefined || x === null || (typeof x === "string" && !x.trim())) {
      itcrnMissing.push(`${label}: '${lang}' 없음 → 화면은 en 으로 폴백`);
    }
  }
};
for (const [axis, v] of Object.entries(ITCRN_FRAMEWORK ?? {})) {
  for (const [field, val] of Object.entries(v ?? {})) {
    if (Array.isArray(val)) val.forEach((item, i) => missingLangs(`ITCRN_FRAMEWORK.${axis}.${field}[${i}]`, item));
    else missingLangs(`ITCRN_FRAMEWORK.${axis}.${field}`, val);
  }
}
if (itcrnMissing.length > ITCRN_BASELINE) {
  console.error(
    `❌ 5축(ITCRN) 제목·설명의 빈 언어가 늘었다: ${itcrnMissing.length}칸 (천장 ${ITCRN_BASELINE}칸)\n`,
  );
  for (const m of itcrnMissing) console.error("  - " + m);
  console.error("\n→ 암 상세 페이지의 실질 본문이다. 빈 칸은 조용히 영어로 바뀌어 나간다.");
  process.exit(1);
}
if (itcrnMissing.length < ITCRN_BASELINE) {
  console.error(
    `❌ 5축(ITCRN) 빈 칸이 ${itcrnMissing.length}칸으로 줄었다 — 이 파일의 ITCRN_BASELINE 을 ${itcrnMissing.length} 로 같이 낮춰라.`,
  );
  console.error("   (천장을 안 내리면 다음 번 퇴행을 못 잡는다.)");
  process.exit(1);
}

if (problems.length) {
  console.error(`❌ 암종 콘텐츠 6개 언어 미완성 ${problems.length}건:\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("✅ 암종 콘텐츠 6개 언어 완성 (제목·소개·합병증·통계·FAQ·칩 + 치료법 카드 description·evidence + 면력 병원 페이지 잎 전부)");
console.log(
  `⚠️  5축(ITCRN) 잎(제목·설명·근거·태그·항암지원) 빈 칸 ${itcrnMissing.length}칸 — 천장 0(늘면 차단). 값은 AI 번역이라 코디 검수 전엔 「제안」이다.`,
);
