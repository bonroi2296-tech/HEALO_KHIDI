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
