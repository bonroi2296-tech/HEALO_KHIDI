/**
 * healwith: 앱내 알림 → 폰 알림 다리
 *
 * 왜 이 파일이 있나 (2026-07-28):
 *   알림 체계(`notifications` 테이블 + `sendInAppNotification`)와 폰 알림 발송기(`push/fcm.ts`)가
 *   **둘 다 완성돼 있었는데 서로 연결돼 있지 않았다.** `fcm.ts` 를 부르는 곳은 테스트용 API 하나뿐이라,
 *   사용자는 알림 권한만 허락하고 평생 아무것도 못 받았다.
 *   → 사건 목록을 새로 만들지 않고 **`sendInAppNotification` 한 곳에 이 다리를 얹는다.**
 *      그러면 이미 정의된 모든 알림(상담 예약·리마인드·의견서 도착·견적 발행 …)이 자동으로 켜진다.
 *
 * 무엇을 폰까지 보내나 — **새 분류를 만들지 않는다.**
 *   알림에는 이미 `priority` 가 있다. 새 목록을 만들면 사건이 늘 때마다 갱신해야 하고 반드시 빠뜨린다.
 *   - urgent / high  → 폰 알림 보냄
 *   - normal / low   → 앱 안 종 아이콘만
 */

import "server-only";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import type { NotificationPriority } from "./inApp";
// 판단 규칙(무엇을 보낼까 / 지금 보낼까)은 순수 함수라 별도 파일 → 테스트 대상.
import { isQuietHour, shouldPush, ignoresQuietHours } from "./pushPolicy";

async function getUserLang(userId: string): Promise<string | null> {
  try {
    const { data } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("language_preference")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as any)?.language_preference ?? null;
  } catch {
    return null;
  }
}

export interface PushBridgeInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  priority?: NotificationPriority;
  notificationId?: string | null;
}

/**
 * 앱내 알림 1건을 폰 알림으로도 내보낸다.
 * **절대 throw 하지 않는다** — 폰 알림이 실패해도 앱내 알림은 이미 저장됐다.
 */
export async function bridgeToPush(input: PushBridgeInput): Promise<void> {
  try {
    if (!shouldPush(input.priority)) return;

    // urgent(상담 곧 시작 등)는 시간 상관없이 즉시.
    if (!ignoresQuietHours(input.priority)) {
      const lang = await getUserLang(input.userId);
      if (isQuietHour(Date.now(), lang)) {
        // ponytail: 조용 시간엔 «미루지 않고 건너뛴다». 앱 안 종 아이콘에는 그대로 남으므로
        // 아침에 앱을 열면 보인다. 진짜 «아침에 다시 쏘기»가 필요해지면 대기열 테이블을 만들 것
        // (지금 만들면 테이블 + 정기작업 + 중복방지까지 딸려온다 — 필요해진 뒤에).
        console.log(`[pushBridge] 조용 시간이라 폰 알림 건너뜀 (user=${input.userId} type=${input.type})`);
        return;
      }
    }

    const { sendPushToUser } = await import("@/lib/push/fcm");
    await sendPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      data: {
        // 앱이 알림을 누르면 이 주소로 이동한다(registerPush.ts 의 탭 처리).
        // 알림에 이미 있던 `link` 를 그대로 쓴다 — 새 설계 불필요.
        route: input.link || "/",
        type: input.type,
        ...(input.notificationId ? { notification_id: input.notificationId } : {}),
      },
    });
  } catch (err: any) {
    console.warn("[pushBridge] 폰 알림 실패(무시):", err?.message);
  }
}
