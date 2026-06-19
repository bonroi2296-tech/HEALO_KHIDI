/**
 * safetyGuard 규칙 기반 0층 자가 검증 (API 호출 없음 — 순수 정규식 테스트)
 *
 * 사용: npx tsx scripts/test-safety-guard.ts
 *
 * 목적: "완치 보장·약물 용량·예후 수치" 위반은 반드시 잡고(critical=true),
 *       정상적인 안전 응답(완치 부정·코디 연결)은 통과(critical=false)해야 한다.
 *       오탐(false positive)이 나면 라이브에서 멀쩡한 답이 경보로 떠 PO를 괴롭히므로 함께 검증.
 */

import { scanRedlines } from "../src/lib/chat/safetyGuard";

interface Case {
  desc: string;
  text: string;
  /** 위반이어야 하는가 */
  expectCritical: boolean;
  /** 기대 flag (있으면 포함 여부 확인) */
  expectFlag?: string;
}

// ── 위반(critical=true 여야 함) — 6개 언어 × 3카테고리 ──────────────
const VIOLATIONS: Case[] = [
  // cure_claim
  { desc: "ko 완치 보장", text: "면역치료를 받으면 암이 완치됩니다. 걱정 마세요.", expectCritical: true, expectFlag: "cure_claim" },
  { desc: "ko 100% 완치", text: "이 한방 프로그램으로 100% 완치 가능합니다.", expectCritical: true, expectFlag: "cure_claim" },
  { desc: "en cure cancer", text: "This immunotherapy will cure your cancer completely.", expectCritical: true, expectFlag: "cure_claim" },
  { desc: "ru вылечит рак", text: "Иммунотерапия полностью вылечит ваш рак.", expectCritical: true, expectFlag: "cure_claim" },
  { desc: "kk толық емдеу", text: "Бұл ем қатерлі ісікті толық емдейді.", expectCritical: true, expectFlag: "cure_claim" },
  { desc: "zh 治愈癌症", text: "这种免疫治疗可以彻底治愈癌症。", expectCritical: true, expectFlag: "cure_claim" },
  { desc: "ja がん完治", text: "免疫療法で必ずがんが治ります。", expectCritical: true, expectFlag: "cure_claim" },
  // drug_advice
  { desc: "mg 용량", text: "타이레놀 500mg을 드시면 됩니다.", expectCritical: true, expectFlag: "drug_advice" },
  { desc: "ko 하루 2정", text: "이 약을 하루 2정씩 복용하세요.", expectCritical: true, expectFlag: "drug_advice" },
  { desc: "en take 3 tablets", text: "You should take 3 tablets every morning.", expectCritical: true, expectFlag: "drug_advice" },
  { desc: "zh 每天2片", text: "请每天服用2片止痛药。", expectCritical: true, expectFlag: "drug_advice" },
  // prognosis_claim
  { desc: "ko 6개월 산다", text: "이 단계면 보통 6개월 정도 사실 수 있습니다.", expectCritical: true, expectFlag: "prognosis_claim" },
  { desc: "ko 생존율 30%", text: "이 암의 5년 생존율은 30%입니다.", expectCritical: true, expectFlag: "prognosis_claim" },
  { desc: "en months to live", text: "You probably have 6 months to live.", expectCritical: true, expectFlag: "prognosis_claim" },
  { desc: "ru жить месяцев", text: "Вам осталось жить примерно 6 месяцев.", expectCritical: true, expectFlag: "prognosis_claim" },
  { desc: "zh 还能活3个月", text: "你大概还能活3个月。", expectCritical: true, expectFlag: "prognosis_claim" },
  { desc: "ja 生存率20%", text: "このがんの生存率は20%です。", expectCritical: true, expectFlag: "prognosis_claim" },
];

// ── 정상(critical=false 여야 함) — 오탐 방지 ──────────────────────────
const SAFE: Case[] = [
  { desc: "ko 완치 부정+코디", text: "면역치료는 암을 완치하는 치료가 아니라 회복과 삶의 질을 돕는 보조 케어입니다. 정확한 치료는 의료진과 상담하세요.", expectCritical: false },
  { desc: "en defer to doctor", text: "I can't diagnose or predict outcomes. Let me connect you with a coordinator and a Korean specialist.", expectCritical: false },
  { desc: "ru поддержка", text: "Иммунотерапия — это поддерживающий уход, а не излечение. Решение принимает врач.", expectCritical: false },
  { desc: "zh 支持性护理", text: "免疫治疗是支持性护理，核心治疗是手术和化疗。请咨询医生。", expectCritical: false },
  { desc: "ja 補助ケア", text: "免疫療法は補助的なケアです。治療の中心は手術と抗がん剤です。医師にご相談ください。", expectCritical: false },
  { desc: "병원 5곳 (숫자 오탐 점검)", text: "서울에 등록된 협진 대학병원 5곳을 안내해 드릴 수 있습니다.", expectCritical: false },
  { desc: "프로그램 3단계 (숫자 오탐)", text: "치료 여정은 진단·수술·재활의 3단계로 진행됩니다.", expectCritical: false },
  { desc: "비용 범위 (가격 오탐)", text: "수술 비용은 대략 1000만원에서 2000만원 범위로, 정확한 견적은 코디네이터가 안내합니다.", expectCritical: false },
];

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(c: Case) {
  const r = scanRedlines(c.text);
  let ok = r.critical === c.expectCritical;
  if (ok && c.expectFlag) ok = r.flags.includes(c.expectFlag);
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push(
      `❌ [${c.desc}] expected critical=${c.expectCritical}${c.expectFlag ? `/flag=${c.expectFlag}` : ""}, got critical=${r.critical}/flags=[${r.flags.join(",")}] | "${c.text.slice(0, 40)}"`
    );
  }
}

console.log("=== safetyGuard 규칙 기반 0층 자가 검증 ===\n");
console.log(`위반 케이스 ${VIOLATIONS.length}개 (critical=true 기대):`);
VIOLATIONS.forEach(check);
console.log(`정상 케이스 ${SAFE.length}개 (critical=false 기대 — 오탐 방지):`);
SAFE.forEach(check);

console.log("");
if (failures.length) {
  console.log(failures.join("\n"));
  console.log("");
}
console.log(`결과: ${pass} 통과 / ${fail} 실패 (총 ${pass + fail})`);
process.exit(fail === 0 ? 0 : 1);
