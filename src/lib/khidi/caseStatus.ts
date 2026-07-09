/**
 * 케이스(환자 유치) 진행 상황 단계 — 단일 정의
 * 코디가 설정하고, 환자·에이전시가 확인. 카자흐 에이전시 요구(병원 응답 느림 → 단계 가시성).
 *
 * 2026-07-09 재설계: 기존 9단계(문의접수→사전상담→병원검토→일정조율→비자준비→입국치료→
 * 사후관리→완료, +보류)를 6단계(+보류)로 압축하고, 각 대단계 아래 "이 케이스에서 실제로 뭐가
 * 있었는지"를 자유롭게 체크하는 하위단계(substep)를 뒀다. 이유: 원장님 소견(자문, case_opinions)과
 * 공식 병원 배정·회신(hospital_leads)이 예전엔 같은 "병원 치료가능 검토 중" 한 단계에 뭉뚱그려져
 * 헷갈렸음(2026-07-09 실사례) — 대단계는 "누가 봐도 같은 뜻"인 사건 단위로 굵게 나누고, 케이스마다
 * 다른 디테일(자문했는지/공식 회신 기다리는지/환자가 결정 중인지)은 하위단계로 흡수해 유연하게 둔다.
 * PO 결정: KHIDI KPI 트리거(outcomeForCaseStatus)가 참조하는 treatment/follow_up/completed
 * 3개 키 이름은 그대로 유지 — 그 함수·전환 대시보드는 이번 재설계와 무관, 손대지 않는다.
 */

export const CASE_STATUS_STEPS = [
  { key: "intake", ko: "문의·의뢰 접수", order: 1 },
  { key: "consultation", ko: "상담·검토 진행", order: 2 },
  { key: "preparation", ko: "일정·비자 준비", order: 3 },
  { key: "treatment", ko: "입국·치료 중", order: 4 },
  { key: "follow_up", ko: "사후관리 중", order: 5 },
  { key: "completed", ko: "완료", order: 6 },
  { key: "on_hold", ko: "보류", order: 99 },
] as const;

export type CaseStatusKey = (typeof CASE_STATUS_STEPS)[number]["key"];

/**
 * 단계 라벨 다국어 — 환자·해외 에이전시/의료기관 포털에서 각 언어로 표시.
 * 활성 6개 언어(ko·en·ru·kz·zh·ja). 코디/어드민 화면은 ko 유지(caseStatusLabel).
 */
export const CASE_STATUS_LABELS: Record<string, Record<string, string>> = {
  intake:       { ko: "문의·의뢰 접수",   en: "Inquiry received",     ru: "Заявка получена",              kz: "Сұраныс қабылданды",       zh: "已收到咨询",     ja: "お問い合わせ受付" },
  consultation: { ko: "상담·검토 진행",   en: "Consultation review",  ru: "Консультация и рассмотрение",  kz: "Кеңес пен қарау",           zh: "咨询与评估中",   ja: "相談・検討中" },
  preparation:  { ko: "일정·비자 준비",   en: "Scheduling & visa",    ru: "Согласование сроков и визы",   kz: "Кесте мен виза дайындығы",  zh: "日程与签证准备", ja: "日程・ビザ準備" },
  treatment:    { ko: "입국·치료 중",     en: "Arrival & treatment",  ru: "Прибытие и лечение",           kz: "Келу және емдеу",           zh: "入境治疗中",     ja: "入国・治療中" },
  follow_up:    { ko: "사후관리 중",      en: "Follow-up care",       ru: "Послелечебное наблюдение",     kz: "Кейінгі бақылау",           zh: "后续护理中",     ja: "経過観察中" },
  completed:    { ko: "완료",             en: "Completed",            ru: "Завершено",                    kz: "Аяқталды",                  zh: "已完成",         ja: "完了" },
  on_hold:      { ko: "보류",             en: "On hold",              ru: "Приостановлено",               kz: "Кейінге қалдырылды",        zh: "暂缓",           ja: "保留" },
};

/** 미설정 라벨 다국어 */
const UNSET_LABEL: Record<string, string> = {
  ko: "미설정", en: "Not set", ru: "Не задано", kz: "Орнатылмаған", zh: "未设置", ja: "未設定",
};

export const CASE_STATUS_KEYS: string[] = CASE_STATUS_STEPS.map((s) => s.key);

/**
 * 구단계(2026-07-09 이전 9단계) → 신단계 별칭. `case_status_history`는 무제약 text라
 * 과거 행이 예전 키(예: "pre_consult")를 그대로 담고 있을 수 있음 — 라벨 조회 시 이 표로
 * 신단계로 치환해서 과거 타임라인도 안 깨지게 한다. 실제 `inquiries.case_status` 값은
 * 마이그레이션(20260709_case_status_compress.sql)에서 이미 신단계로 백필됨.
 */
const OLD_KEY_ALIASES: Record<string, CaseStatusKey> = {
  received: "intake",
  pre_consult: "consultation",
  hospital_review: "consultation",
  scheduling: "preparation",
  visa_prep: "preparation",
};

function resolveKey(key: string): string {
  return OLD_KEY_ALIASES[key] || key;
}

export function caseStatusLabel(key?: string | null): string {
  if (!key) return "미설정";
  const resolved = resolveKey(key);
  return CASE_STATUS_STEPS.find((s) => s.key === resolved)?.ko || key;
}

/** 언어별 단계 라벨 (포털용). 없는 언어는 en→ko 순으로 폴백. */
export function caseStatusLabelL(key?: string | null, lang = "en"): string {
  if (!key) return UNSET_LABEL[lang] || UNSET_LABEL.en;
  const row = CASE_STATUS_LABELS[resolveKey(key)];
  if (!row) return key;
  return row[lang] || row.en || row.ko || key;
}

export function caseStatusOrder(key?: string | null): number {
  if (!key) return 0;
  return CASE_STATUS_STEPS.find((s) => s.key === resolveKey(key))?.order || 0;
}

/**
 * 대단계 안에서 케이스별로 실제 있었던 일을 자유롭게 체크하는 하위단계 제안 목록.
 * 순서·필수 여부 강제 없음 — 코디가 이 중 골라 토글하거나 자유 텍스트로 새로 추가 가능
 * (`inquiries.case_substeps` jsonb 배열에 `{key,label,done_at,done_by}`로 저장).
 * 목록에 없는 substep.key 가 저장돼 있으면(코디가 자유 추가한 것) 화면은 저장된 label을
 * 그대로 보여주면 된다 — 이 SUGGESTIONS는 "제안"일 뿐 검증 스키마가 아니다.
 */
export const SUBSTEP_SUGGESTIONS: Record<string, { key: string; label: Record<string, string> }[]> = {
  intake: [],
  consultation: [
    { key: "opinion_review", label: { ko: "상담/소견 진행", en: "Consultation / opinion in progress", ru: "Консультация / заключение в процессе", kz: "Кеңес / қорытынды үдерісте", zh: "咨询/意见进行中", ja: "相談・意見交換中" } },
    { key: "hospital_reply_pending", label: { ko: "병원 정식 회신 대기", en: "Awaiting hospital's formal reply", ru: "Ожидание официального ответа больницы", kz: "Ауруханадан ресми жауап күту", zh: "等待医院正式回复", ja: "病院からの正式回答待ち" } },
    { key: "patient_decision", label: { ko: "환자·에이전시 결정", en: "Patient/agency deciding", ru: "Пациент/агентство принимает решение", kz: "Пациент/агенттік шешім қабылдауда", zh: "患者/代理方决策中", ja: "患者・代理店が判断中" } },
  ],
  preparation: [
    { key: "scheduling", label: { ko: "일정·견적 조율", en: "Scheduling & quote", ru: "Согласование сроков и сметы", kz: "Кесте мен бағаны келісу", zh: "安排日程与报价", ja: "日程・見積調整" } },
    { key: "visa_prep", label: { ko: "비자·예약 준비", en: "Visa & booking prep", ru: "Подготовка визы и брони", kz: "Виза мен брондау дайындығы", zh: "签证与预约准备", ja: "ビザ・予約準備" } },
  ],
  treatment: [],
  follow_up: [],
  completed: [],
};

/**
 * 대단계별 "지금 누구 차례인지" — 코디/에이전시 화면에 동일한 문구로 표시해서,
 * 같은 단어(라벨)가 보는 사람에 따라 다르게 읽히는 문제를 "담당자 표시"로 따로 분리해 해소.
 */
const CASE_STATUS_NEXT_ACTOR: Record<string, Record<string, string>> = {
  intake:       { ko: "코디네이터", en: "Coordinator", ru: "Координатор", kz: "Координатор", zh: "协调员", ja: "コーディネーター" },
  consultation: { ko: "코디·병원·환자·에이전시", en: "Coordinator / hospital / patient / agency", ru: "Координатор / больница / пациент / агентство", kz: "Координатор / аурухана / пациент / агенттік", zh: "协调员/医院/患者/代理方", ja: "コーディネーター・病院・患者・代理店" },
  preparation:  { ko: "코디·환자·에이전시", en: "Coordinator / patient / agency", ru: "Координатор / пациент / агентство", kz: "Координатор / пациент / агенттік", zh: "协调员/患者/代理方", ja: "コーディネーター・患者・代理店" },
  treatment:    { ko: "병원·환자", en: "Hospital / patient", ru: "Больница / пациент", kz: "Аурухана / пациент", zh: "医院/患者", ja: "病院・患者" },
  follow_up:    { ko: "코디네이터", en: "Coordinator", ru: "Координатор", kz: "Координатор", zh: "协调员", ja: "コーディネーター" },
  completed:    { ko: "-", en: "-", ru: "-", kz: "-", zh: "-", ja: "-" },
  on_hold:      { ko: "-", en: "-", ru: "-", kz: "-", zh: "-", ja: "-" },
};

/** 단계별 "다음 행동은 누구 차례인지" 한 줄 — 코디/에이전시 화면 공용(동일 문구). */
export function caseStatusNextActorL(key?: string | null, lang = "en"): string {
  if (!key) return "";
  const row = CASE_STATUS_NEXT_ACTOR[resolveKey(key)];
  if (!row) return "";
  return row[lang] || row.en || row.ko || "";
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
  intake: "inquiry",
  consultation: "consultation",
  preparation: "visa",
  treatment: "treatment",
  follow_up: "recovery",
  completed: "recovery",
};

export function caseStatusToJourneyStage(
  caseStatus?: string | null
): string | null {
  if (!caseStatus) return null;
  return CASE_STATUS_TO_JOURNEY_STAGE[resolveKey(caseStatus)] || null;
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
 *   - 그 이전(intake·consultation·preparation)·보류(on_hold) 는 아직 유치 확정 아님 → null
 * ⚠️ 2026-07-09 재설계로 대단계 키가 바뀌었지만 이 3개 키 이름은 그대로 유지됨(PO 결정,
 * KPI 트리거는 이번 작업 범위 밖). (POSTMORTEM #17 의 미해결 잔여위험 #19: 코디가
 * case_status 만 올리고 outcome 을 안 박아 유치가 누락되던 구멍. 병원 'converted' 자동집계와
 * 대칭. 호출부는 outcome IS NULL 가드로 코디가 이미 정한 결정은 덮지 않는다.)
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
