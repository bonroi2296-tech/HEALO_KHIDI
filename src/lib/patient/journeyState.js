/**
 * healwith 환자 여정(Journey) 상태 계산
 *
 * 환자 한 명의 여러 데이터(inquiry, consultation, followup 등)를 종합해
 * 현재 어느 단계에 있는지, 다음 할 일이 뭔지, 몇 일차인지 계산.
 *
 * 여정 단계 (7단계):
 *   1. inquiry     — 문의 접수 후 대기
 *   2. consultation — 상담 예정/진행
 *   3. proposal    — 병원 매칭/견적 검토
 *   4. visa        — 비자·서류 준비
 *   5. travel      — 입국·방한 준비
 *   6. treatment   — 치료 진행
 *   7. recovery    — 사후관리
 */

import { createSupabaseBrowserClient } from "../supabase/browser";
import { caseStatusToJourneyStage } from "../khidi/caseStatus";

export const JOURNEY_STAGES = [
  { id: "inquiry", order: 1, label: { en: "Inquiry", ko: "문의", ru: "Заявка", kz: "Өтінім", zh: "咨询", ja: "問い合わせ" } },
  { id: "consultation", order: 2, label: { en: "Consultation", ko: "상담", ru: "Консультация", kz: "Кеңес", zh: "咨询", ja: "相談" } },
  { id: "proposal", order: 3, label: { en: "Proposal", ko: "제안 검토", ru: "Предложение", kz: "Ұсыныс", zh: "方案", ja: "提案" } },
  { id: "visa", order: 4, label: { en: "Visa", ko: "비자", ru: "Виза", kz: "Виза", zh: "签证", ja: "ビザ" } },
  { id: "travel", order: 5, label: { en: "Travel", ko: "방한", ru: "Поездка", kz: "Сапар", zh: "旅程", ja: "渡航" } },
  { id: "treatment", order: 6, label: { en: "Treatment", ko: "치료", ru: "Лечение", kz: "Емдеу", zh: "治疗", ja: "治療" } },
  { id: "recovery", order: 7, label: { en: "Recovery", ko: "사후관리", ru: "Восстановление", kz: "Қалпына келу", zh: "康复", ja: "回復" } },
];

/**
 * 환자 전체 데이터 fetch — 로그인된 사용자 기준.
 *
 * ⚠️ 반드시 서버 API(/api/portal/journey) 경유. inquiries·consultation_sessions·
 * coordinator_responses·chat_threads·inquiry_events 는 RLS상 service_role 전용이라
 * 브라우저 client 직접조회는 항상 빈 데이터(=여정 화면이 통째로 비던 버그). 서버가 본인
 * inquiry 를 복호화-매칭해 묶어 돌려준다. 반환 shape 은 기존과 동일(아래 compute* 들이 그대로 사용).
 */
export async function fetchPatientJourney() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  try {
    const res = await fetch("/api/portal/journey", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.ok ? json.journey : null;
  } catch {
    return null;
  }
}

/**
 * 현재 여정 단계 판별
 * 규칙:
 * - followup_schedule 있음 → recovery
 * - consultation 중 completed 있고 treatment 플래그 → treatment
 * - consultation scheduled 있음 → consultation
 * - coordinator_response (final=true) 있고 visa 준비 중 → visa / travel
 * - coordinator_response 있음 → proposal
 * - inquiry 있음 → inquiry
 */
/**
 * 추가(EDGE-1, 2026-06-22): 코디/병원이 설정한 inquiry.case_status 도 단계에 반영한다.
 * 이벤트 기반 단계와 case_status 기반 단계 중 **더 진행된 쪽**을 택해(환자 진행이 뒤로
 * 가지 않게) 반환 → 코디가 case_status 만 올려도 환자/에이전시 여정바가 따라 움직인다.
 */
const STAGE_ORDER = (id) => JOURNEY_STAGES.find((s) => s.id === id)?.order || 1;

export function computeCurrentStage(data) {
  if (!data) return "inquiry";

  const { consultations, coordinatorResponses, followup, inquiry, events } = data;

  // 1) 기존 이벤트/상담/제안 기반 단계 계산
  const eventStage = (() => {
    if (followup) return "recovery";

    const anyTreatmentEvent = events?.some((e) =>
      ["treatment_started", "hospitalized", "surgery_completed"].includes(e.event_type)
    );
    if (anyTreatmentEvent) return "treatment";

    const anyTravelEvent = events?.some((e) =>
      ["arrived_in_korea", "visa_issued"].includes(e.event_type)
    );
    if (anyTravelEvent) return "travel";

    const visaInProgress = events?.some((e) =>
      ["visa_started", "visa_documents_requested"].includes(e.event_type)
    );
    if (visaInProgress) return "visa";

    const hasFinalProposal = coordinatorResponses?.some((r) => r.is_final);
    // 환자에게 실제로 «보인» 제안만 센다 (2026-08-30) — draft 계열(auto_range·내부 초안)은
    // 아직 보낸 제안이 아니라서 단순 length>0 이면 환자 몰래 여정이 proposal 로 전진했다.
    // status 어휘는 costEstimateJourney.ts 매핑 기준. status 없는 옛 모양은 is_final 로만 판정.
    const hasAnyProposal = coordinatorResponses?.some(
      (r) => ["sent", "accepted", "rejected", "expired"].includes(r.status) || r.is_final
    );
    const hasScheduledConsultation = consultations?.some((c) =>
      ["scheduled", "in_progress"].includes(c.status)
    );
    const hasCompletedConsultation = consultations?.some((c) => c.status === "completed");

    if (hasFinalProposal) return "visa";
    if (hasAnyProposal || hasCompletedConsultation) return "proposal";
    if (hasScheduledConsultation) return "consultation";
    return "inquiry";
  })();

  // 2) 코디/병원이 설정한 case_status 기반 단계 — 더 진행된 쪽 선택(후퇴 방지)
  const caseStage = caseStatusToJourneyStage(inquiry?.case_status);
  if (caseStage && STAGE_ORDER(caseStage) > STAGE_ORDER(eventStage)) {
    return caseStage;
  }
  return eventStage;
}

/**
 * 단계 완료 여부 (통과한 단계들)
 */
export function computeStageProgress(data) {
  const current = computeCurrentStage(data);
  const currentOrder = JOURNEY_STAGES.find((s) => s.id === current)?.order || 1;

  return JOURNEY_STAGES.map((s) => ({
    ...s,
    status: s.order < currentOrder ? "done" : s.order === currentOrder ? "active" : "upcoming",
  }));
}

/**
 * 다음 할 일 목록 계산
 */
export function computeNextActions(data, lang = "en") {
  const actions = [];
  if (!data) return actions;

  const { consultations, coordinatorResponses, followup, symptoms, threads } = data;

  // 예정 상담
  const upcoming = consultations?.filter(
    (c) => c.status === "scheduled" && c.scheduled_at && new Date(c.scheduled_at) > new Date()
  );
  if (upcoming?.length > 0) {
    const next = upcoming[0];
    const daysUntil = Math.ceil(
      (new Date(next.scheduled_at) - new Date()) / (1000 * 60 * 60 * 24)
    );
    actions.push({
      id: `consult-${next.id}`,
      priority: "high",
      icon: "calendar",
      label:
        lang === "ko"
          ? `${daysUntil <= 0 ? "오늘" : `${daysUntil}일 후`}: 화상 상담`
          : `In ${daysUntil} days: Video consultation`,
      sub: next.scheduled_at,
      href: `/consultation/${next.id}`,
    });
  }

  // 읽지 않은 메시지
  const unreadThreads = threads?.filter((t) => t.status === "open");
  if (unreadThreads?.length > 0) {
    actions.push({
      id: "messages",
      priority: "medium",
      icon: "message",
      label: lang === "ko" ? `메시지 ${unreadThreads.length}건` : `${unreadThreads.length} messages`,
      href: "/patient/messages",
    });
  }

  // 새 제안 — 발송됐고 환자가 아직 수락/거절 안 한 것.
  // (예전 `sent && !is_final` 은 cost_estimates 매핑상 sent ⇒ is_final 이라 영원히 참일 수
  //  없는 죽은 조건이었다 — 2026-08-30. 어휘는 costEstimateJourney.ts 기준.)
  const newProposals = coordinatorResponses?.filter((r) => r.status === "sent");
  if (newProposals?.length > 0) {
    actions.push({
      id: "proposals",
      priority: "high",
      icon: "file",
      label: lang === "ko" ? `새 병원 제안 ${newProposals.length}건 검토` : `${newProposals.length} new proposals to review`,
      href: "/patient",
    });
  }

  // 최근 증상 미입력 (recovery 단계일 때)
  if (followup && symptoms?.length === 0) {
    actions.push({
      id: "symptoms-empty",
      priority: "medium",
      icon: "activity",
      label: lang === "ko" ? "이번 주 증상 기록이 없습니다" : "No symptoms logged this week",
      href: "/patient/symptoms",
    });
  }

  // 다음 팔로업
  if (followup?.next_action_at) {
    const daysUntil = Math.ceil(
      (new Date(followup.next_action_at) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil >= 0 && daysUntil <= 14) {
      actions.push({
        id: "followup-next",
        priority: daysUntil <= 3 ? "high" : "medium",
        icon: "calendar",
        label:
          lang === "ko"
            ? `${daysUntil === 0 ? "오늘" : `${daysUntil}일 후`}: 사후 관리 일정`
            : `In ${daysUntil} days: Follow-up scheduled`,
      });
    }
  }

  return actions;
}

/**
 * D-day 계산 (치료 시작일 기준)
 */
export function computeDayCount(data) {
  if (!data) return null;
  const startDate =
    data.followup?.treatment_completed_at ||
    data.consultations?.find((c) => c.status === "completed")?.ended_at ||
    data.inquiry?.created_at;
  if (!startDate) return null;
  const days = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
  return { days, startDate };
}

/**
 * 증상을 일별로 aggregate (차트용)
 */
export function aggregateSymptomsByDay(symptoms, maxDays = 30) {
  if (!symptoms?.length) return [];

  const byDay = new Map();
  symptoms.forEach((r) => {
    const day = r.created_at?.slice(0, 10);
    if (!day) return;
    const arr = r.symptoms?.items || r.symptoms || [];
    if (!Array.isArray(arr)) return;

    if (!byDay.has(day)) byDay.set(day, { date: day, count: 0, avgSeverity: 0, maxSeverity: 0, riskScore: 0 });

    const d = byDay.get(day);
    d.count += arr.length;
    const severities = arr.map((s) => Number(s.severity || 0)).filter((n) => n > 0);
    if (severities.length) {
      d.avgSeverity = (d.avgSeverity * (d.count - severities.length) + severities.reduce((a, b) => a + b, 0)) / d.count;
      d.maxSeverity = Math.max(d.maxSeverity, ...severities);
    }
    d.riskScore = Math.max(d.riskScore, Number(r.ai_risk_score || 0));
  });

  const sorted = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-maxDays);
}

/**
 * 알림 개수 (배지용)
 */
export function computeNotificationCount(data) {
  if (!data) return 0;
  let count = 0;

  // 새 코디네이터 제안
  count += (data.coordinatorResponses || []).filter((r) => r.status === "sent").length;

  // 오늘 내 상담
  const today = new Date().toISOString().slice(0, 10);
  count += (data.consultations || []).filter((c) => c.status === "scheduled" && c.scheduled_at?.slice(0, 10) === today).length;

  // 열린 스레드
  count += (data.threads || []).filter((t) => t.status === "open").length;

  return count;
}
