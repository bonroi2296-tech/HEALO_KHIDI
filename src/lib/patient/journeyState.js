/**
 * HEALO 환자 여정(Journey) 상태 계산
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
 * 환자 전체 데이터 fetch
 * 로그인된 사용자 기준.
 */
export async function fetchPatientJourney() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const userId = session.user.id;
  const userEmail = session.user.email;

  // 1. 가장 최근 inquiry (이메일 매칭으로 찾기)
  const { data: inquiriesRaw } = await supabase
    .from("inquiries")
    .select("*")
    .or(`email.eq.${userEmail}`)
    .order("created_at", { ascending: false })
    .limit(1);
  const inquiry = inquiriesRaw?.[0] || null;

  // user_id 기준으로도 찾을 수 있게
  let patientUserId = userId;
  if (!inquiry) {
    // inquiry 없으면 cancer_patient_intakes 쪽에서 user_id 직접 연결된 것도 찾기
  }

  const inquiryId = inquiry?.id;

  // 병렬 fetch
  const [
    intakesRes,
    consultationsRes,
    coordResponsesRes,
    followupRes,
    symptomsRes,
    threadsRes,
    eventsRes,
  ] = await Promise.all([
    inquiryId
      ? supabase.from("cancer_patient_intakes").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false }).limit(1)
      : Promise.resolve({ data: [] }),
    supabase
      .from("consultation_sessions")
      .select("*")
      .eq("patient_user_id", patientUserId)
      .order("scheduled_at", { ascending: true }),
    inquiryId
      ? supabase.from("coordinator_responses").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("followup_schedules")
      .select("*")
      .eq("patient_user_id", patientUserId)
      .order("created_at", { ascending: false })
      .limit(1),
    inquiryId
      ? supabase.from("symptom_reports").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false }).limit(60)
      : Promise.resolve({ data: [] }),
    supabase
      .from("chat_threads")
      .select("*, chat_messages(count)")
      .eq("user_id", patientUserId)
      .order("updated_at", { ascending: false }),
    inquiryId
      ? supabase.from("inquiry_events").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false }).limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    user: { id: userId, email: userEmail },
    inquiry,
    intake: intakesRes.data?.[0] || null,
    consultations: consultationsRes.data || [],
    coordinatorResponses: coordResponsesRes.data || [],
    followup: followupRes.data?.[0] || null,
    symptoms: symptomsRes.data || [],
    threads: threadsRes.data || [],
    events: eventsRes.data || [],
  };
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
export function computeCurrentStage(data) {
  if (!data) return "inquiry";

  const { consultations, coordinatorResponses, followup, inquiry, events } = data;

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
  const hasAnyProposal = coordinatorResponses?.length > 0;
  const hasScheduledConsultation = consultations?.some((c) =>
    ["scheduled", "in_progress"].includes(c.status)
  );
  const hasCompletedConsultation = consultations?.some((c) => c.status === "completed");

  if (hasFinalProposal) return "visa";
  if (hasAnyProposal || hasCompletedConsultation) return "proposal";
  if (hasScheduledConsultation) return "consultation";
  if (inquiry) return "inquiry";

  return "inquiry";
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

  // 새 제안
  const newProposals = coordinatorResponses?.filter(
    (r) => r.status === "sent" && !r.is_final
  );
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
