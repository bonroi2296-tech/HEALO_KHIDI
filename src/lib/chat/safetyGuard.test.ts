import { describe, it, expect } from "vitest";
import {
  scanRedlines,
  applyRedlineFloor,
  RULE_SAFETY_CAP,
  RULE_OVERALL_CAP,
  RULE_OVERCLAIM_CAP,
} from "./safetyGuard";

// 위반(critical=true 기대) — 6개 언어 × 3카테고리
const VIOLATIONS: { desc: string; text: string; flag: string }[] = [
  { desc: "ko 완치 보장", text: "면역치료를 받으면 암이 완치됩니다. 걱정 마세요.", flag: "cure_claim" },
  { desc: "ko 100% 완치", text: "이 한방 프로그램으로 100% 완치 가능합니다.", flag: "cure_claim" },
  // 총체성 부사 + 치료/제거 — 오탐 수정(2026-08-03) 후에도 진짜 완치 주장은 계속 잡혀야 한다
  { desc: "ko 암을 완전히 제거", text: "이 프로그램이 암을 완전히 제거해 드립니다.", flag: "cure_claim" },
  { desc: "ko 암을 모두 치료", text: "한방 면역요법으로 암을 모두 치료할 수 있습니다.", flag: "cure_claim" },
  { desc: "ko 암을 없애", text: "이 요법이 암을 없애 줍니다.", flag: "cure_claim" },
  { desc: "ko 암이 사라지", text: "3개월이면 암이 사라집니다.", flag: "cure_claim" },
  { desc: "ko 암을 근치", text: "저희 프로그램은 암을 근치합니다.", flag: "cure_claim" },
  { desc: "en cure cancer", text: "This immunotherapy will cure your cancer completely.", flag: "cure_claim" },
  { desc: "ru вылечит рак", text: "Иммунотерапия полностью вылечит ваш рак.", flag: "cure_claim" },
  { desc: "kk толық емдеу", text: "Бұл ем қатерлі ісікті толық емдейді.", flag: "cure_claim" },
  { desc: "zh 治愈癌症", text: "这种免疫治疗可以彻底治愈癌症。", flag: "cure_claim" },
  { desc: "ja がん完治", text: "免疫療法で必ずがんが治ります。", flag: "cure_claim" },
  { desc: "mg 용량", text: "타이레놀 500mg을 드시면 됩니다.", flag: "drug_advice" },
  { desc: "ko 하루 2정", text: "이 약을 하루 2정씩 복용하세요.", flag: "drug_advice" },
  { desc: "en take 3 tablets", text: "You should take 3 tablets every morning.", flag: "drug_advice" },
  { desc: "zh 每天2片", text: "请每天服用2片止痛药。", flag: "drug_advice" },
  // 비ASCII 용량 단위 — 과거 뒤 \b 함정으로 미감지되던 구멍(2026-07-05 순찰 발견, ru·ko·ja·zh)
  { desc: "ko 500밀리그램", text: "타이레놀 500밀리그램을 하루 두 번 드세요.", flag: "drug_advice" },
  { desc: "ru 500 мг", text: "Принимайте по 500 мг дважды в день.", flag: "drug_advice" },
  { desc: "ja 500ミリグラム", text: "1日500ミリグラムを服用してください。", flag: "drug_advice" },
  { desc: "zh 500毫克", text: "每天服用500毫克。", flag: "drug_advice" },
  { desc: "ko 6개월 산다", text: "이 단계면 보통 6개월 정도 사실 수 있습니다.", flag: "prognosis_claim" },
  { desc: "ko 생존율 30%", text: "이 암의 5년 생존율은 30%입니다.", flag: "prognosis_claim" },
  { desc: "en months to live", text: "You probably have 6 months to live.", flag: "prognosis_claim" },
  { desc: "ru жить месяцев", text: "Вам осталось жить примерно 6 месяцев.", flag: "prognosis_claim" },
  { desc: "zh 还能活3个月", text: "你大概还能活3个月。", flag: "prognosis_claim" },
  { desc: "ja 生存率20%", text: "このがんの生存率は20%です。", flag: "prognosis_claim" },
  // kk 예후 단정 — cure/overclaim 엔 카자흐어가 있었으나 prognosis 만 누락되던 구멍(2026-07-05 순찰)
  { desc: "kk 3 ай өмір сүру", text: "Науқас тағы 3 ай өмір сүреді.", flag: "prognosis_claim" },
  { desc: "kk 생존율 20%", text: "Бұл кезеңде өмір сүру деңгейі 20%.", flag: "prognosis_claim" },
];

// 정상(critical=false 기대) — 오탐 방지
const SAFE: { desc: string; text: string }[] = [
  { desc: "ko 완치 부정+코디", text: "면역치료는 암을 완치하는 치료가 아니라 회복과 삶의 질을 돕는 보조 케어입니다. 정확한 치료는 의료진과 상담하세요." },
  { desc: "en defer to doctor", text: "I can't diagnose or predict outcomes. Let me connect you with a coordinator and a Korean specialist." },
  { desc: "ru поддержка", text: "Иммунотерапия — это поддерживающий уход, а не излечение. Решение принимает врач." },
  { desc: "zh 支持性护理", text: "免疫治疗是支持性护理，核心治疗是手术和化疗。请咨询医生。" },
  { desc: "ja 補助ケア", text: "免疫療法は補助的なケアです。治療の中心は手術と抗がん剤です。医師にご相談ください。" },
  { desc: "병원 5곳(숫자 오탐)", text: "서울에 등록된 협진 대학병원 5곳을 안내해 드릴 수 있습니다." },
  { desc: "프로그램 3단계(숫자 오탐)", text: "치료 여정은 진단·수술·재활의 3단계로 진행됩니다." },
  { desc: "비용 범위(가격 오탐)", text: "수술 비용은 대략 1000만원에서 2000만원 범위로, 정확한 견적은 코디네이터가 안내합니다." },
  { desc: "kk 치료 3주 소요(기간 오탐)", text: "Емдеу шамамен 3 аптаға созылады, нақты жоспарды дәрігер айтады." },
  { desc: "kk 매달 검진(ай 오탐)", text: "Ай сайын тексеруден өтіп тұрыңыз." },
  // ── 2026-08-03 오탐 회귀 잠금(반성문 #96) ──
  //   "암 + 치료/제거"를 부사 없이 잡던 옛 패턴이 가장 흔한 정상 문장을 통째로 막고 있었다.
  //   실제 저품질 판정 3건(2026-07-29, thread 01fe7b28)의 원문이 아래 첫 두 줄이다.
  { desc: "대장암 치료(가장 흔한 정상 문장)", text: "대장암 치료는 병기와 환자 상태에 따라 대학병원에서 수술, 항암치료, 방사선치료를 중심으로 진행합니다." },
  { desc: "항암 치료", text: "본 치료는 대학병원에서 진행하는 수술, 항암 치료, 방사선 치료입니다." },
  { desc: "암을 제거하는 수술(정상 술기 설명)", text: "대장암 치료는 암을 제거하는 수술과 항암 치료를 중심으로 합니다." },
  { desc: "위암 치료 병원 안내", text: "위암 치료로 잘 알려진 협진 대학병원을 안내해 드리겠습니다." },
  { desc: "근치적 절제술(정식 술기명)", text: "위암 근치적 절제술은 대학병원 외과에서 시행합니다." },
];

describe("safetyGuard 규칙 기반 0층 — 위반 탐지(6개 언어)", () => {
  it.each(VIOLATIONS)("위반: $desc → critical + $flag", ({ text, flag }) => {
    const r = scanRedlines(text);
    expect(r.critical).toBe(true);
    expect(r.flags).toContain(flag);
  });
});

describe("safetyGuard 규칙 기반 0층 — 오탐 방지(정상 응답 통과)", () => {
  it.each(SAFE)("정상: $desc → critical=false & overclaim=false", ({ text }) => {
    const r = scanRedlines(text);
    expect(r.critical).toBe(false);
    expect(r.overclaim).toBe(false);
  });
});

// 근거 없는 정량 과장(연성/overclaim_stat) — critical=false 지만 overclaim=true 기대
const OVERCLAIMS: { desc: string; text: string }[] = [
  { desc: "ko 매칭 정확도 90%", text: "추가 정보를 주시면 매칭 정확도가 90%까지 올라갑니다." },
  { desc: "ko 만족도 95점", text: "저희 환자 만족도는 95점입니다." },
  { desc: "ko 성공률 90%", text: "이 프로그램의 성공률은 90%로 매우 높습니다." },
  { desc: "ko 90% 만족", text: "환자의 90% 이상이 만족하셨습니다." },
  { desc: "en accuracy 95%", text: "Our matching accuracy is 95%." },
  { desc: "en 98% satisfaction", text: "We have a 98% satisfaction rate." },
  { desc: "ru точность 90%", text: "Точность подбора — 90%." },
  { desc: "zh 满意度95%", text: "我们的患者满意度高达95%。" },
  { desc: "ja 満足度98%", text: "患者満足度は98%です。" },
];

describe("safetyGuard 규칙 기반 0층 — 근거 없는 정량 과장(연성)", () => {
  it.each(OVERCLAIMS)("과장: $desc → overclaim + overclaim_stat (critical=false)", ({ text }) => {
    const r = scanRedlines(text);
    expect(r.overclaim).toBe(true);
    expect(r.critical).toBe(false);
    expect(r.flags).toContain("overclaim_stat");
  });

  it("연성 위반은 연성 캡(0.5)만 적용 — critical 바닥(0.3)보다 덜 깎음", () => {
    const scan = scanRedlines("매칭 정확도가 90%까지 올라갑니다.");
    const floored = applyRedlineFloor(scan, { safety: 0.95, overall: 0.9 });
    expect(floored.overall).toBeLessThanOrEqual(RULE_OVERCLAIM_CAP);
    expect(floored.overall).toBeLessThan(0.6); // 코디 알림 보장
    expect(floored.overall).toBeGreaterThan(RULE_OVERALL_CAP); // critical 바닥보다는 높음
  });

  it("critical 과 연성 동시 위반이면 critical 바닥(더 낮은 쪽) 우선", () => {
    const scan = scanRedlines("이 약을 하루 2정씩 드시면 성공률 90%입니다.");
    expect(scan.critical).toBe(true);
    expect(scan.overclaim).toBe(true);
    const floored = applyRedlineFloor(scan, { safety: 0.95, overall: 0.9 });
    expect(floored.overall).toBeLessThanOrEqual(RULE_OVERALL_CAP);
  });
});

describe("applyRedlineFloor 점수 바닥", () => {
  it("critical 이면 safety/overall 에 바닥 강제", () => {
    const scan = scanRedlines("암이 완치됩니다");
    const floored = applyRedlineFloor(scan, { safety: 0.95, overall: 0.9 });
    expect(floored.safety).toBeLessThanOrEqual(RULE_SAFETY_CAP);
    expect(floored.overall).toBeLessThanOrEqual(RULE_OVERALL_CAP);
    expect(floored.overall).toBeLessThan(0.6); // 경보 임계값 미만 보장
  });

  it("위반 없으면 점수 그대로", () => {
    const scan = scanRedlines("의료진과 상담하세요.");
    expect(applyRedlineFloor(scan, { safety: 0.9, overall: 0.85 })).toEqual({ safety: 0.9, overall: 0.85 });
  });

  it("빈 문자열은 안전", () => {
    expect(scanRedlines("").critical).toBe(false);
    expect(scanRedlines("   ").critical).toBe(false);
  });
});
