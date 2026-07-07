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
 * ⚠️ 수신자 = 어드민만. AI 챗 스레드 모니터(`/admin/chat`)가 `requireAdminAuth` 전용이고
 * 코디네이터는 아직 AI 챗 뷰가 없다(별도 과제 — KNOWN_ISSUES). 코디에게 보내봐야 열 화면이
 * 없어 오해만 부르므로, 실제로 처리할 수 있는 어드민에게만 보낸다.
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
