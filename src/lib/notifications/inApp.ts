/**
 * healwith: In-app 알림 공통 헬퍼
 *
 * notifications 테이블에 INSERT 하는 단일 진입점.
 * Fail-safe: 실패해도 throw 하지 않음.
 */

import "server-only";
import { getSupabaseServerClient } from "@/lib/data/supabaseServerClient";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface SendInAppNotificationOptions {
  /** 수신자 auth.users.id */
  userId: string;
  /** 알림 타입 (symptom_alert / reminder / survey / system 등) */
  type: string;
  /** 제목 */
  title: string;
  /** 본문 */
  body: string;
  /** 클릭 시 이동 링크 (앱 내부 경로) */
  link?: string;
  /** 우선순위 */
  priority?: NotificationPriority;
  /** 추가 데이터 */
  payload?: Record<string, unknown>;
}

/**
 * notifications 테이블에 단건 INSERT
 * @returns inserted id 또는 null (실패 시)
 */
export async function sendInAppNotification(
  opts: SendInAppNotificationOptions
): Promise<string | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await (supabase as any)
      .from("notifications")
      .insert({
        user_id: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        link: opts.link ?? null,
        priority: opts.priority ?? "normal",
        payload: opts.payload ?? null,
      } as any)
      .select("id")
      .single();

    if (error) {
      console.warn("[inApp] notification insert 실패:", error.message);
      return null;
    }
    return (data as any)?.id ?? null;
  } catch (err: any) {
    console.warn("[inApp] notification insert 예외:", err.message);
    return null;
  }
}

/**
 * 여러 사용자에게 동시에 같은 알림 발송
 */
export async function broadcastInAppNotification(
  userIds: string[],
  opts: Omit<SendInAppNotificationOptions, "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.allSettled(
    userIds.map((uid) => sendInAppNotification({ ...opts, userId: uid }))
  );
}

/**
 * app_metadata.role 로 직원 user_id 조회. (역할은 profiles 가 아니라 auth.users 에 있음)
 * ponytail: listUsers 1페이지(perPage 1000)면 본 프로젝트 staff 수 충분. 1000 넘으면 페이지네이션.
 */
export async function getStaffIdsByRole(): Promise<{ admins: string[]; coordinators: string[] }> {
  try {
    const { supabaseAdmin } = await import("../rag/supabaseAdmin");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error || !data) return { admins: [], coordinators: [] };
    const admins: string[] = [];
    const coordinators: string[] = [];
    for (const u of data.users) {
      const role = (u.app_metadata as any)?.role;
      if (role === "admin") admins.push(u.id);
      else if (role === "coordinator") coordinators.push(u.id);
    }
    return { admins, coordinators };
  } catch {
    return { admins: [], coordinators: [] };
  }
}

/**
 * 파트너(국내병원·에이전시/의료기관) 담당자 user_id 조회.
 * 파트너는 app_metadata.role 이 아니라 매핑 테이블(hospital_users / agency_users)에 있음(auth 헬퍼와 동일).
 * is_active=true 만 대상(비활성 담당자에겐 알림 안 감). Fail-safe: 실패 시 빈 배열.
 */
export async function getHospitalUserIds(hospitalId: string): Promise<string[]> {
  try {
    const { supabaseAdmin } = await import("../rag/supabaseAdmin");
    const { data, error } = await (supabaseAdmin as any)
      .from("hospital_users")
      .select("user_id")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true);
    if (error || !data) return [];
    return data.map((r: any) => r.user_id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getAgencyUserIds(agencyId: string): Promise<string[]> {
  try {
    const { supabaseAdmin } = await import("../rag/supabaseAdmin");
    const { data, error } = await (supabaseAdmin as any)
      .from("agency_users")
      .select("user_id")
      .eq("agency_id", agencyId)
      .eq("is_active", true);
    if (error || !data) return [];
    return data.map((r: any) => r.user_id).filter(Boolean);
  } catch {
    return [];
  }
}

export interface HospitalNewLeadNotice {
  hospitalId: string;
  /** 비-PII 요약(예: "위암 · 카자흐스탄"). ⚠️ 환자 이름 등 PII 넣지 말 것(파트너 알림 본문). */
  summary?: string | null;
}

/**
 * 병원에 새 진료 의뢰(리드)가 배정됐을 때 그 병원 담당자에게 종(bell) 알림.
 * 종 UI는 이미 파트너 상단바(ClientShell PortalTopBar)에 렌더링 중 — 백엔드 INSERT만 하면 뜬다.
 * 링크는 병원 리드 목록(/hospital/leads — 상세 [id] 라우트 없음, 목록에서 열림).
 * Fail-safe: throw 안 함(리드 배정 자체에 영향 0).
 */
export async function notifyHospitalNewLead(notice: HospitalNewLeadNotice): Promise<void> {
  try {
    const userIds = await getHospitalUserIds(notice.hospitalId);
    if (userIds.length === 0) return;
    const body = notice.summary?.trim() || "새 진료 의뢰가 도착했습니다.";
    await broadcastInAppNotification(userIds, {
      type: "hospital_new_lead",
      title: "📥 새 진료 의뢰",
      body,
      priority: "high",
      link: "/hospital/leads",
    });
  } catch {
    /* fail-safe */
  }
}

export interface NewInquiryNotice {
  inquiryId: number;
  nationality?: string | null;
  treatmentType?: string | null;
  /** 출처 라벨 (예: "AI 핸드오프", "문의폼", "에이전시 의뢰") — 본문에 표시 */
  source?: string | null;
}

/**
 * 새 문의 접수 시 코디네이터 + 어드민에게 웹/앱 종(bell) 알림.
 * 역할별로 링크가 달라 따로 발송(코디→문의함, 어드민→문의 목록).
 * Fail-safe: 실패해도 throw 하지 않음(문의 접수 자체에 영향 0).
 */
export async function notifyStaffNewInquiry(notice: NewInquiryNotice): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    if (admins.length === 0 && coordinators.length === 0) return;
    const where = notice.nationality?.trim() || "국적미상";
    const what = notice.treatmentType?.trim() || "치료종류 미상";
    const src = notice.source ? `[${notice.source}] ` : "";
    const title = `📬 새 문의 #${notice.inquiryId}`;
    const body = `${src}${where} · ${what}`;
    await Promise.allSettled([
      broadcastInAppNotification(coordinators, {
        type: "new_inquiry", title, body, priority: "high",
        link: "/coordinator/inbox",
        payload: { inquiryId: notice.inquiryId },
      }),
      broadcastInAppNotification(admins, {
        type: "new_inquiry", title, body, priority: "high",
        // ⚠️ /admin/inquiries 는 목록 페이지만 존재(상세 [id] 라우트 없음) → 목록으로 링크.
        //    문의번호는 title(#N)에 있음. 이메일 알림(adminNotifier.ts)과 동일 정책(404 방지).
        link: "/admin/inquiries",
        payload: { inquiryId: notice.inquiryId },
      }),
    ]);
  } catch {
    /* fail-safe */
  }
}

export interface OpinionArrivedNotice {
  inquiryId: number;
  /** 소견 주신 분 표시명(명단 원장 또는 "그 외 의료진") */
  doctorName: string;
}

/**
 * 전문의 세컨드 오피니언(소견)이 케이스에 도착했을 때 코디네이터 + 어드민에게 종(bell) 알림.
 * 링크는 코디 인박스 상세(`/coordinator/inbox/[id]` — 실재 라우트)로. Fail-safe: throw 안 함.
 */
export async function notifyStaffOpinionArrived(notice: OpinionArrivedNotice): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    if (admins.length === 0 && coordinators.length === 0) return;
    const title = `🩺 전문의 소견 도착 #${notice.inquiryId}`;
    const body = `${notice.doctorName} 소견 제출`;
    const link = `/coordinator/inbox/${notice.inquiryId}`;
    await Promise.allSettled([
      broadcastInAppNotification(coordinators, {
        type: "opinion_arrived", title, body, priority: "high", link,
        payload: { inquiryId: notice.inquiryId },
      }),
      broadcastInAppNotification(admins, {
        type: "opinion_arrived", title, body, priority: "high", link,
        payload: { inquiryId: notice.inquiryId },
      }),
    ]);
  } catch {
    /* fail-safe */
  }
}

export interface ConsultationErrorStormNotice {
  consultationId: string;
  /** 최근 10분간 오류 비콘 수 */
  count: number;
}

/**
 * 화상상담방에서 연결 오류 비콘이 단시간에 폭증했을 때(회의 중 장애 신호) 직원 종(bell) 알림.
 * 안전망 ③(2026-07-15 PO 승인) — 사람이 화면을 지켜보지 않아도 진행 중 회의의 장애를 즉시 인지.
 * 링크는 해당 상담방(직원은 계정으로 바로 입장 가능 — 통합 링크 #576)으로.
 * 쿨다운(상담당 30분 1회)은 호출부(client-event 라우트)가 담당. Fail-safe: throw 안 함.
 */
export async function notifyStaffConsultationErrorStorm(
  notice: ConsultationErrorStormNotice
): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    if (admins.length === 0 && coordinators.length === 0) return;
    await broadcastInAppNotification([...admins, ...coordinators], {
      type: "consultation_error_storm",
      title: "📵 화상상담 연결 장애 의심",
      body: `최근 10분간 연결 오류 ${notice.count}건 — 참가자가 접속에 어려움을 겪고 있을 수 있어요.`,
      priority: "urgent",
      link: `/consultation/${notice.consultationId}`,
      payload: { consultationId: notice.consultationId, count: notice.count },
    });
  } catch {
    /* fail-safe */
  }
}

export interface ChatHandoffNotice {
  /** chat_threads.id */
  threadId: string;
  /** 에스컬레이션 사유 ("attachment_uploaded" 또는 핸드오프 reason) */
  reason?: string | null;
}

/**
 * AI 챗에서 환자가 사람(상담사) 연결을 요청(또는 자료 업로드로 자동 에스컬레이션)했을 때
 * 직원에게 웹/앱 종(bell) 알림.
 *
 * ⚠️ 수신자 = 어드민만. 진료의뢰 패킷 「검수완료/정정 발송」 쓰기 액션이 어드민(/admin/chat)
 * 전용이라서다. (코디 읽기전용 뷰 `/coordinator/chat`은 2026-07 생김 — 코디까지 종을 울릴지는
 * 별도 결정. 품질경고 알림(judge.ts)은 이미 role별 링크로 코디에게도 발송 중.)
 *
 * 호출부에서 thread metadata `hand_off_notified` 로 **스레드당 1회**만 울리도록 디듀프할 것
 * (자료를 여러 번 올려도 종이 도배되지 않게).
 * Fail-safe: 실패해도 throw 하지 않음.
 */
export async function notifyStaffChatHandoff(notice: ChatHandoffNotice): Promise<void> {
  try {
    const { admins } = await getStaffIdsByRole();
    if (admins.length === 0) return;
    const body = notice.reason === "attachment_uploaded" ? "자료 업로드 — 검토 필요" : "상담사 연결 요청";
    await broadcastInAppNotification(admins, {
      type: "chat_handoff",
      title: "🙋 AI 챗 상담 연결 요청",
      body,
      priority: "high",
      link: "/admin/chat",
      payload: { threadId: notice.threadId, reason: notice.reason ?? null },
    });
  } catch {
    /* fail-safe */
  }
}

export interface UnclosedConsultationsNotice {
  /** 예정시각이 하루 이상 지났는데 아직 'completed' 가 아닌 실상담 수 */
  count: number;
  /** 그중 가장 오래 방치된 건의 경과 일수 */
  oldestDays: number;
}

/**
 * 끝난 것으로 보이는데 「완료」 처리가 안 된 상담이 쌓였을 때 직원 종(bell) 알림.
 *
 * 왜 필요한가 (2026-07-20 실측으로 드러난 구멍):
 *   `completed` 는 KHIDI 성과지표 K-02(사전상담·사후관리 120건) 집계의 기준이고,
 *   설문 발송 cron 도 `status='completed'` 인 세션만 찾는다 → K-03(만족도 90점)의 입구다.
 *   그런데 LiveKit webhook 은 **의도적으로** status 를 자동 변경하지 않는다(실적 정직성 —
 *   방이 물리적으로 닫혔다고 상담이 성사된 건 아니므로 사람이 확인 후 누르게 한 설계).
 *   그 결과 아무도 버튼을 안 누르면 **지표가 조용히 0 에 고정된다.** 실제로 실상담 5건이
 *   전부 'scheduled' 로 남아 설문 0건이었다.
 *   → 자동 변경(정직성 훼손) 대신 **안 누른 사실을 시끄럽게 만드는 쪽**으로 푼다.
 *
 * 디듀프: **이미 안 읽은 같은 알림이 있는 직원에게는 다시 보내지 않는다.** 안 그러면 매일
 *   1건씩 쌓여, 종 목록이 15건만 보이는 탓에(NotificationBell) 2주면 종이 넛지로 가득 차
 *   정작 중요한 새 문의(new_inquiry) 알림을 밀어낸다. 방치가 길수록 도배되는 구조라
 *   "눌러야 멈춘다"는 의도는 유지하되 1인 1건으로 접는다. (독립 리뷰 지적, 2026-07-20)
 * Fail-safe: 실패해도 throw 하지 않음.
 */
export async function notifyStaffUnclosedConsultations(
  notice: UnclosedConsultationsNotice
): Promise<void> {
  try {
    const { admins, coordinators } = await getStaffIdsByRole();
    const staff = [...admins, ...coordinators];
    if (staff.length === 0) return;

    // 안 읽은 같은 타입 알림을 이미 가진 직원은 제외(종 도배 방지).
    const supabase = getSupabaseServerClient();
    const { data: existing, error } = await (supabase as any)
      .from("notifications")
      .select("user_id")
      .eq("type", "consultation_unclosed")
      .is("read_at", null)
      .in("user_id", staff);
    // 조회가 실패하면 디듀프를 포기하고 그냥 보낸다 — 도배보다 미발송이 더 나쁘다.
    if (error) console.warn("[inApp] unclosed 디듀프 조회 실패(그대로 발송):", error.message);
    const alreadyNotified = new Set(((existing as any[]) || []).map((r) => r.user_id));
    const targets = staff.filter((id) => !alreadyNotified.has(id));
    if (targets.length === 0) return;

    await broadcastInAppNotification(targets, {
      type: "consultation_unclosed",
      title: `⏰ 완료 처리 안 된 상담 ${notice.count}건`,
      body:
        `예정시각이 지났는데 「완료」를 누르지 않은 상담이 ${notice.count}건 있어요` +
        `(최장 ${notice.oldestDays}일 방치). 완료해야 사전상담·사후관리 실적으로 집계돼요. ` +
        `문의와 연결된 상담이면 만족도 설문도 함께 발송됩니다.`,
      priority: "high",
      link: "/admin/consultations",
      payload: { count: notice.count, oldestDays: notice.oldestDays },
    });
  } catch {
    /* fail-safe */
  }
}
