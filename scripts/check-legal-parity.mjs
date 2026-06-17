// 법률 문서(약관·개인정보방침) 6개 언어 정합성 검사.
// ponytail: 기계로 잡는 부류 = 구조 어긋남·스텁 잔재·핵심사실 누락·옛 브랜드.
// 번역 "품질"은 사람/변호사 몫 — 여기선 안 봄.
import { getTermsOfService } from "../src/lib/legal/termsOfService.js";
import { getPrivacyPolicy } from "../src/lib/legal/privacyPolicy.js";

const LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];
const problems = [];
const P = (m) => problems.push(m);

// 모든 언어에 반드시 같은 형태로 들어가야 하는 핵심 사실(언어 불문 동일 토큰)
const INVARIANTS = ["A-2026-01-02-06761", "463-35-00902", "admin@healwith.co.kr"];
// 절대 남아있으면 안 되는 옛 브랜드/스텁 신호
const FORBIDDEN = [/healo\.com/i, /contact@healo/i, /\bHEALO\b/, /TODO/i, /번역\s*대기/, /pending translation/i, /\[\[/, /XXX/];

// 두 문서 형태를 {id,title,body[]} 리스트로 정규화.
// terms = doc.sections[], privacy = 키별 {title,body[]} 평면 객체.
function sectionsOf(doc) {
  if (Array.isArray(doc.sections)) {
    return doc.sections.map((s) => ({ id: s.id, title: s.title, body: s.body }));
  }
  return Object.entries(doc)
    .filter(([, v]) => v && typeof v === "object" && Array.isArray(v.body))
    .map(([id, v]) => ({ id, title: v.title, body: v.body }));
}

function checkDoc(name, getter) {
  const docs = Object.fromEntries(LANGS.map((l) => [l, sectionsOf(getter(l))]));
  const koIds = docs.ko.map((s) => s.id);

  for (const lang of LANGS) {
    const secs = docs[lang];
    if (!secs) { P(`${name}/${lang}: 언어 누락`); continue; }
    const ids = secs.map((s) => s.id);

    // 1) 섹션 id 집합·순서 일치
    if (ids.join(",") !== koIds.join(",")) {
      P(`${name}/${lang}: 섹션 구조 불일치\n    ko=${koIds.join(",")}\n    ${lang}=${ids.join(",")}`);
    }

    for (const s of secs) {
      const koSec = docs.ko.find((k) => k.id === s.id);
      // 2) body 줄 수 일치(번역 누락/잘림 탐지)
      if (koSec && s.body.length !== koSec.body.length) {
        P(`${name}/${lang} [${s.id}]: body 줄수 ${s.body.length} ≠ ko ${koSec.body.length}`);
      }
      // 3) 빈 제목/본문
      if (!s.title || !s.title.trim()) P(`${name}/${lang} [${s.id}]: 제목 비어있음`);

      const text = `${s.title}\n${s.body.join("\n")}`;
      // 4) 금지 토큰(옛 브랜드/스텁)
      for (const re of FORBIDDEN) {
        if (re.test(text)) P(`${name}/${lang} [${s.id}]: 금지 토큰 ${re} 발견`);
      }
    }

    // 5) 핵심 사실이 문서 어딘가에 존재
    const whole = secs.map((s) => s.body.join("\n")).join("\n");
    for (const inv of INVARIANTS) {
      if (!whole.includes(inv)) P(`${name}/${lang}: 핵심사실 누락 "${inv}"`);
    }
  }
}

checkDoc("terms", getTermsOfService);
checkDoc("privacy", getPrivacyPolicy);

if (problems.length) {
  console.error(`❌ 법률 문서 정합성 문제 ${problems.length}건:\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("✅ 법률 문서 6개 언어 정합성 통과 (구조·핵심사실·브랜드)");
