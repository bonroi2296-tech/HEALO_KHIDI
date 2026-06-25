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
 * 역할별로 링크가 달라 따로 발송(코디→문의함, 어드민→문의 상세).
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
        link: `/admin/inquiries/${notice.inquiryId}`,
        payload: { inquiryId: notice.inquiryId },
      }),
    ]);
  } catch {
    /* fail-safe */
  }
}
