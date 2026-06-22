/**
 * 케이스(환자 유치) 진행 상황 단계 — 단일 정의
 * 코디가 설정하고, 환자·에이전시가 확인. 카자흐 에이전시 요구(병원 응답 느림 → 단계 가시성).
 */

export const CASE_STATUS_STEPS = [
  { key: "received", ko: "문의 접수", order: 1 },
  { key: "pre_consult", ko: "사전상담 진행", order: 2 },
  { key: "hospital_review", ko: "병원 치료가능 검토 중", order: 3 },
  { key: "scheduling", ko: "치료 일정·견적 조율 중", order: 4 },
  { key: "visa_prep", ko: "비자·예약 준비", order: 5 },
  { key: "treatment", ko: "입국·치료 중", order: 6 },
  { key: "follow_up", ko: "사후관리 중", order: 7 },
  { key: "completed", ko: "완료", order: 8 },
  { key: "on_hold", ko: "보류", order: 99 },
] as const;

export type CaseStatusKey = (typeof CASE_STATUS_STEPS)[number]["key"];

/**
 * 단계 라벨 다국어 — 환자·해외 에이전시/의료기관 포털에서 각 언어로 표시.
 * 활성 6개 언어(ko·en·ru·kz·zh·ja). 코디/어드민 화면은 ko 유지(caseStatusLabel).
 */
export const CASE_STATUS_LABELS: Record<string, Record<string, string>> = {
  received:        { ko: "문의 접수",            en: "Inquiry received",       ru: "Заявка получена",            kz: "Сұраныс қабылданды",      zh: "已收到咨询",   ja: "お問い合わせ受付" },
  pre_consult:     { ko: "사전상담 진행",        en: "Pre-consultation",       ru: "Предварительная консультация", kz: "Алдын ала кеңес",       zh: "初步咨询中",   ja: "事前相談中" },
  hospital_review: { ko: "병원 치료가능 검토 중", en: "Hospital review",        ru: "Рассмотрение в больнице",    kz: "Аурухана қарауда",        zh: "医院评估中",   ja: "病院検討中" },
  scheduling:      { ko: "치료 일정·견적 조율 중", en: "Scheduling & quote",    ru: "Согласование сроков и сметы", kz: "Кесте мен бағаны келісу", zh: "安排日程与报价", ja: "日程・見積調整中" },
  visa_prep:       { ko: "비자·예약 준비",        en: "Visa & booking",         ru: "Подготовка визы и брони",    kz: "Виза мен брондау",        zh: "签证与预约准备", ja: "ビザ・予約準備" },
  treatment:       { ko: "입국·치료 중",          en: "Arrival & treatment",    ru: "Прибытие и лечение",         kz: "Келу және емдеу",         zh: "入境治疗中",   ja: "入国・治療中" },
  follow_up:       { ko: "사후관리 중",           en: "Follow-up care",         ru: "Послелечебное наблюдение",   kz: "Кейінгі бақылау",         zh: "后续护理中",   ja: "経過観察中" },
  completed:       { ko: "완료",                 en: "Completed",              ru: "Завершено",                  kz: "Аяқталды",                zh: "已完成",       ja: "完了" },
  on_hold:         { ko: "보류",                 en: "On hold",                ru: "Приостановлено",             kz: "Кейінге қалдырылды",      zh: "暂缓",         ja: "保留" },
};

/** 미설정 라벨 다국어 */
const UNSET_LABEL: Record<string, string> = {
  ko: "미설정", en: "Not set", ru: "Не задано", kz: "Орнатылмаған", zh: "未设置", ja: "未設定",
};

export const CASE_STATUS_KEYS: string[] = CASE_STATUS_STEPS.map((s) => s.key);

export function caseStatusLabel(key?: string | null): string {
  if (!key) return "미설정";
  return CASE_STATUS_STEPS.find((s) => s.key === key)?.ko || key;
}

/** 언어별 단계 라벨 (포털용). 없는 언어는 en→ko 순으로 폴백. */
export function caseStatusLabelL(key?: string | null, lang = "en"): string {
  if (!key) return UNSET_LABEL[lang] || UNSET_LABEL.en;
  const row = CASE_STATUS_LABELS[key];
  if (!row) return key;
  return row[lang] || row.en || row.ko || key;
}

export function caseStatusOrder(key?: string | null): number {
  if (!key) return 0;
  return CASE_STATUS_STEPS.find((s) => s.key === key)?.order || 0;
}

/**
 * 케이스 진행상황(case_status, 코디/병원이 설정) → 환자 여정바 단계(journey stage) 매핑.
 *
 * 환자 여정바(`src/lib/patient/journeyState.js`)는 원래 inquiry_events 만 보고 단계를 계산해,
 * 코디/병원이 case_status 를 올려도 환자/에이전시 화면이 정체됐다(EDGE-1, POSTMORTEM #18 반쪽금지).
 * 이 매핑으로 case_status 를 여정 단계에 반영한다. 여정 단계: inquiry·consultation·proposal·
 * visa·travel·treatment·recovery (journeyState.JOURNEY_STAGES).
 *
 * on_hold(보류)는 의도적으로 제외 — 보류는 단계를 전진/후퇴시키지 않고 기존 계산을 유지한다.
 */
export const CASE_STATUS_TO_JOURNEY_STAGE: Record<string, string> = {
  received: "inquiry",
  pre_consult: "consultation",
  hospital_review: "proposal",
  scheduling: "proposal",
  visa_prep: "visa",
  treatment: "treatment",
  follow_up: "recovery",
  completed: "recovery",
};

export function caseStatusToJourneyStage(
  caseStatus?: string | null
): string | null {
  if (!caseStatus) return null;
  return CASE_STATUS_TO_JOURNEY_STAGE[caseStatus] || null;
}

/**
 * 병원 리드 상태 → 유치 전환 점수판(KHIDI 평가)의 outcome 매핑.
 * 병원이 '치료 확정(converted)'하면 실제 유치 → outcome='admitted' 자동 집계.
 * 그 외(sent/viewed/replied/rejected)는 outcome 을 건드리지 않는다(null 반환).
 * (PO 결정 2026-06-21: 에이전시→병원 의뢰 경로 확정분이 유치 카운트에서 누락되던 구멍 차단.)
 */
export function outcomeForHospitalLeadStatus(
  leadStatus?: string | null
): "admitted" | null {
  return leadStatus === "converted" ? "admitted" : null;
}

/**
 * 케이스 진행상황(case_status) → 유치 전환 점수판(KHIDI 평가)의 outcome 매핑.
 * 코디가 케이스를 **실제 입국·치료 이후 단계**로 전진시키면 = 실제 유치 → outcome='admitted'.
 *   - treatment(입국·치료 중) / follow_up(사후관리 중) / completed(완료) → 'admitted'
 *   - 그 이전(received…visa_prep)·보류(on_hold) 는 아직 유치 확정 아님 → null
 * (POSTMORTEM #17 의 미해결 잔여위험 #19: 코디가 case_status 만 올리고 outcome 을 안 박아
 *  유치가 누락되던 구멍. 병원 'converted' 자동집계와 대칭. 호출부는 outcome IS NULL 가드로
 *  코디가 이미 정한 결정은 덮지 않는다.)
 */
export function outcomeForCaseStatus(
  caseStatus?: string | null
): "admitted" | null {
  return caseStatus === "treatment" ||
    caseStatus === "follow_up" ||
    caseStatus === "completed"
    ? "admitted"
    : null;
}
