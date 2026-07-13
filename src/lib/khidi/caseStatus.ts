/**
 * 케이스(환자 유치) 진행 상황 단계 — 단일 정의
 * 코디가 설정하고, 환자·에이전시가 확인. 카자흐 에이전시 요구(병원 응답 느림 → 단계 가시성).
 *
 * 2026-07-09 9단계→6단계(+보류) 압축: "병원 치료가능 검토 중" 한 단계 안에 원장님 비공식
 * 자문과 공식 병원 배정·회신이 뒤섞여 코디/에이전시가 같은 단어를 다르게 읽던 문제를 해소.
 * 케이스별 디테일은 inquiries.case_substeps(자유 체크리스트, jsonb)가 흡수한다.
 * DB CHECK 제약(inquiries_case_status_chk)도 이 6+on_hold 키로 맞춰져 있다 — 여기서 키를
 * 추가/변경하면 그쪽 마이그레이션도 같이 맞출 것.
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
 * 구 9단계 → 신 6단계 별칭 — 압축 전 case_status_history 원문(received·pre_consult·
 * hospital_review·scheduling·visa_prep)이 과거 이력에 그대로 남아있어, 라벨·순서 조회 시
 * 자동으로 신단계로 치환한다. **지우면 과거 타임라인이 깨진다.**
 */
export const OLD_KEY_ALIASES: Record<string, CaseStatusKey> = {
  received: "intake",
  pre_consult: "consultation",
  hospital_review: "consultation",
  scheduling: "preparation",
  visa_prep: "preparation",
};

function resolveKey(key?: string | null): string | null {
  if (!key) return null;
  return OLD_KEY_ALIASES[key] || key;
}

/**
 * 단계 라벨 다국어 — 환자·해외 에이전시/의료기관 포털에서 각 언어로 표시.
 * 활성 6개 언어(ko·en·ru·kz·zh·ja). 코디/어드민 화면은 ko 유지(caseStatusLabel).
 */
export const CASE_STATUS_LABELS: Record<string, Record<string, string>> = {
  intake:       { ko: "문의·의뢰 접수",   en: "Inquiry received",         ru: "Заявка принята",              kz: "Өтінім қабылданды",        zh: "已受理咨询",     ja: "お問い合わせ受付" },
  consultation: { ko: "상담·검토 진행",   en: "Consultation & review",    ru: "Консультация и рассмотрение", kz: "Кеңес және қарау",          zh: "咨询与评估中",   ja: "相談・検討中" },
  preparation:  { ko: "일정·비자 준비",   en: "Scheduling & visa prep",   ru: "Подготовка визы и графика",   kz: "Кесте мен виза дайындығы", zh: "日程与签证准备", ja: "日程・ビザ準備" },
  treatment:    { ko: "입국·치료 중",     en: "Arrival & treatment",      ru: "Прибытие и лечение",          kz: "Келу және емдеу",           zh: "入境治疗中",     ja: "入国・治療中" },
  follow_up:    { ko: "사후관리 중",      en: "Follow-up care",           ru: "Послелечебное наблюдение",    kz: "Кейінгі бақылау",           zh: "后续护理中",     ja: "経過観察中" },
  completed:    { ko: "완료",            en: "Completed",                ru: "Завершено",                   kz: "Аяқталды",                  zh: "已完成",         ja: "完了" },
  on_hold:      { ko: "보류",            en: "On hold",                  ru: "Приостановлено",              kz: "Кейінге қалдырылды",        zh: "暂缓",           ja: "保留" },
};

/** 미설정 라벨 다국어 */
const UNSET_LABEL: Record<string, string> = {
  ko: "미설정", en: "Not set", ru: "Не задано", kz: "Орнатылмаған", zh: "未设置", ja: "未設定",
};

export const CASE_STATUS_KEYS: string[] = CASE_STATUS_STEPS.map((s) => s.key);

export function caseStatusLabel(key?: string | null): string {
  if (!key) return "미설정";
  const resolved = resolveKey(key);
  return CASE_STATUS_STEPS.find((s) => s.key === resolved)?.ko || key;
}

/** 언어별 단계 라벨 (포털용). 없는 언어는 en→ko 순으로 폴백. */
export function caseStatusLabelL(key?: string | null, lang = "en"): string {
  if (!key) return UNSET_LABEL[lang] || UNSET_LABEL.en;
  const row = CASE_STATUS_LABELS[resolveKey(key) as string];
  if (!row) return key;
  return row[lang] || row.en || row.ko || key;
}

export function caseStatusOrder(key?: string | null): number {
  if (!key) return 0;
  const resolved = resolveKey(key);
  return CASE_STATUS_STEPS.find((s) => s.key === resolved)?.order || 0;
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
  return CASE_STATUS_TO_JOURNEY_STAGE[resolveKey(caseStatus) as string] || null;
}

/**
 * 단계별 지연 기준일 — 이 일수를 넘기면 코디 인박스에 「N일째 정체」 배지.
 * 목적: 파이프라인에서 조용히 죽는 케이스 감지(유치 K-01 누수 방지, 2026-07-13).
 * treatment/follow_up 은 원래 오래 걸리는 단계라 제외, completed/on_hold 도 제외.
 * 기준일은 운영하며 조정 가능한 초기값(PO 미확정) — 여기 한 곳만 고치면 됨.
 */
export const CASE_STATUS_DELAY_DAYS: Record<string, number> = {
  intake: 3,
  consultation: 7,
  preparation: 14,
};

/**
 * 지연 일수 계산 — 기준일 초과 시 경과 일수를, 아니면 null.
 * case_status 미설정 문의는 intake 로 간주(접수 후 방치가 가장 흔한 누수 지점).
 * 앵커는 case_status_updated_at, 없으면 호출부가 created_at 을 넘긴다.
 */
export function caseDelayDays(
  caseStatus: string | null | undefined,
  anchorIso: string | null | undefined,
  now: Date = new Date()
): number | null {
  const resolved = resolveKey(caseStatus) || "intake";
  const threshold = CASE_STATUS_DELAY_DAYS[resolved];
  if (!threshold || !anchorIso) return null;
  const anchorMs = new Date(anchorIso).getTime();
  if (!Number.isFinite(anchorMs)) return null;
  const days = Math.floor((now.getTime() - anchorMs) / 86400000);
  return days >= threshold ? days : null;
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
 *   - 그 이전(intake…preparation)·보류(on_hold) 는 아직 유치 확정 아님 → null
 * (POSTMORTEM #17 의 미해결 잔여위험 #19: 코디가 case_status 만 올리고 outcome 을 안 박아
 *  유치가 누락되던 구멍. 병원 'converted' 자동집계와 대칭. 호출부는 outcome IS NULL 가드로
 *  코디가 이미 정한 결정은 덮지 않는다.)
 *
 * treatment/follow_up/completed 키는 9→6단계 압축 전후로 이름이 그대로라 압축과 무관하게 동작.
 */
export function outcomeForCaseStatus(
  caseStatus?: string | null
): "admitted" | null {
  const resolved = resolveKey(caseStatus);
  return resolved === "treatment" || resolved === "follow_up" || resolved === "completed"
    ? "admitted"
    : null;
}
