/**
 * healwith: 「기계가 만든 시험 문의」 판정 — 한 곳에서만 정한다.
 *
 * 왜 (2026-08-25, PO 지시 「시험 문의도 정리해야 하지 않겠니」):
 *   실측 결과 시험 문의 185건 중 진짜 사람 손이 닿은 건 32건이고 나머지는 **기계가 찍어낸 것**이다.
 *   그리고 매일 밤 자동 검사가 계속 만든다(최근 일주일 7·7·7·10·17·32·19건). 한 번 치우는 것으로는
 *   한 달이면 원상복구되므로 «한 번 청소»와 «매일 청소»가 같은 규칙을 봐야 한다.
 *
 * 🛑 지우는 판정이라 «보수적»으로 짠다 — 애매하면 안 지운다.
 *   ① is_test = true 인 것만 (실환자 문의는 애초에 후보가 아니다)
 *   ② 기계가 만든 흔적이 «분명»할 때만: 시험 전용 도메인 · 시험 계정 주소 · AI 자가시험 승격분
 *   ③ KEEP 목록은 무슨 일이 있어도 제외 (자동 검사가 번호로 직접 여는 것 · 시연 견본 등)
 *
 * 사람이 손으로 넣은 점검 문의(admin@healwith.co.kr 등)는 **대상이 아니다** — PO 결정 2026-08-25.
 */

/** 무슨 일이 있어도 안 지우는 문의. 지우면 무엇이 깨지는지 함께 적는다. */
export const KEEP_INQUIRY_IDS: Record<number, string> = {
  17: "자동 검사가 /coordinator/inbox/17 을 직접 연다 (e2e/coordinator-request-info.spec.ts)",
  39: "PO 가 만든 만족도 설문 표본 — 설문 파이프가 실제로 관통된 유일한 기록",
  86: "애플 심사용 샘플 상담 케이스",
  216: "중간보고회 시연용 견본 (scripts/seed-demo-case.mjs)",
};

/** 자동 청소는 «지난 지 오래된 것»만 건드린다 — 오늘 돌린 검사 결과를 들여다볼 시간은 남겨 둔다. */
export const PURGE_AFTER_DAYS = 30;

/**
 * 시험 전용 주소(반송되는 도메인) + 시험 계정 주소. sendEmail 의 UNDELIVERABLE 과 같은 계열이되,
 * `example.com` 처럼 «점 뒤에 com 이 붙은» 형태까지 명시한다(끝자리만 보면 안 걸린다).
 */
const MACHINE_EMAIL = /@([\w-]+\.)*(invalid|localhost)$|@(test|example)\.(com|org|net)$/i;

export interface PurgeCandidate {
  id: number;
  isTest: boolean;
  /** 복호화된 이메일(없으면 빈 문자열) */
  email: string;
  source: string | null;
  createdAt: string;
}

/** 기계가 만든 시험 문의인가 (지워도 되는가). */
export function isMachineMadeTestInquiry(row: PurgeCandidate): boolean {
  if (!row.isTest) return false;
  if (row.id in KEEP_INQUIRY_IDS) return false;
  if (row.source === "ai_agent") return true; // AI 자가시험 대화가 3턴 넘어 문의로 승격된 것
  return MACHINE_EMAIL.test((row.email || "").trim());
}

/** 자동 청소 대상 (기계가 만든 것 + 만든 지 PURGE_AFTER_DAYS 초과). */
export function isPurgeableNow(row: PurgeCandidate, nowMs: number): boolean {
  if (!isMachineMadeTestInquiry(row)) return false;
  const created = Date.parse(row.createdAt);
  if (!Number.isFinite(created)) return false; // 시각을 못 읽으면 안 지운다
  return nowMs - created > PURGE_AFTER_DAYS * 86_400_000;
}

/**
 * 문의를 지울 때 «먼저» 비워야 하는 표들. 순서가 중요하다 —
 * inquiries 에 CASCADE 가 안 걸린 표(consultation_sessions·surveys·followup_schedules·
 * cancer_patient_intakes·normalized_inquiries)가 남아 있으면 삭제 자체가 거부된다.
 * (CASCADE 가 걸린 표도 명시해 둔다 — 규칙이 바뀌어도 이 목록만 보면 된다.)
 */
export const CHILD_TABLES_IN_ORDER = [
  "symptom_alerts",
  "symptom_reports",
  "progress_records",
  "followup_schedules",
  "case_status_history",
  "case_updates",
  "case_shared_documents",
  "case_opinions",
  "opinion_requests",
  "coordinator_responses",
  "inquiry_events",
  "admin_notification_logs",
  "cancer_patient_intakes",
  "hospital_leads",
] as const;
