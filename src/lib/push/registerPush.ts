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
