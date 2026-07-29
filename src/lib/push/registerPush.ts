/**
 * healwith: 네이티브 푸시 등록 (클라이언트 전용)
 *
 * 네이티브 앱(Capacitor)에서만 동작. 웹(브라우저)에선 즉시 no-op.
 * 권한 요청 → FCM 토큰 수신 → /api/push/register 로 전송.
 *
 * @capacitor/* 는 동적 import → 웹 번들/SSR 에 영향 없음.
 */
"use client";

let registered = false;

export async function registerPushNotifications(): Promise<void> {
  if (registered) return;
  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return; // 웹이면 종료
  registered = true;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return;

  // 알림을 «눌렀을 때» 해당 화면으로 이동 (2026-07-28 추가).
  // 이게 없어서 알림을 눌러도 홈만 열렸다. 보낼 때 `data.route` 에 담아 보낸 주소를 쓴다
  // (서버 쪽: src/lib/notifications/pushBridge.ts — 알림에 원래 있던 link 를 그대로 실어 보낸다).
  // 이 앱은 라이브 로드라 «앱 = 웹» 이므로 그 주소로 옮기기만 하면 된다.
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const route = (action?.notification?.data as Record<string, string> | undefined)?.route;
    // 외부로 새지 않게 «우리 사이트 안 경로»만 허용 (`//evil.com`·`/\evil.com` 차단).
    if (
      typeof route === "string" &&
      route.startsWith("/") &&
      !route.startsWith("//") &&
      !route.startsWith("/\\")
    ) {
      window.location.assign(route);
    }
  });

  // 토큰 수신 → 서버 등록
  PushNotifications.addListener("registration", async (token) => {
    try {
      await fetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
      });
    } catch {
      /* 네트워크 실패는 다음 실행에서 재시도 */
    }
  });

  await PushNotifications.register();
}
