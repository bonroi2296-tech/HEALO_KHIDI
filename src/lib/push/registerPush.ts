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
// 마지막으로 받은 기기 토큰 — 로그인·로그아웃 때 «같은 토큰»을 다시 등록하는 데 쓴다.
let lastToken: string | null = null;
let platform = "";

/**
 * /api/push/register 요청 모양. (순수 함수 — 테스트 대상)
 *
 * 로그인 상태면 Bearer 를 싣는다 → 서버가 토큰을 그 사용자에 연결(user_id).
 * 로그아웃 상태면 헤더 없이 보낸다 → 서버가 user_id 를 null 로 **덮어쓴다**
 * (upsert onConflict: "token"). 기기를 같이 쓰는 경우 이전 사용자에게 알림이 새지 않는다.
 */
export function buildRegisterRequest(
  token: string,
  devicePlatform: string,
  accessToken?: string | null
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ token, platform: devicePlatform }),
  };
}

/** 알림 등록이 막힌 이유를 남긴다 — 조용히 실패하면 폰을 뜯어보기 전엔 알 수가 없다. */
function reportPushProblem(reason: string): void {
  console.warn("[push]", reason);
  import("@sentry/nextjs")
    .then((S) => S.captureMessage(`[push] ${reason} (${platform})`, "warning"))
    .catch(() => { /* 오류 수집기 없으면 콘솔까지만 */ });
}

async function postToken(token: string): Promise<void> {
  lastToken = token;
  try {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
    const { data } = await createSupabaseBrowserClient().auth.getSession();
    await fetch("/api/push/register", buildRegisterRequest(token, platform, data?.session?.access_token));
  } catch {
    /* 네트워크 실패는 다음 실행·다음 로그인에서 재시도 */
  }
}

export async function registerPushNotifications(): Promise<void> {
  if (registered) return;
  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return; // 웹이면 종료
  registered = true;
  platform = Capacitor.getPlatform();

  const { PushNotifications } = await import("@capacitor/push-notifications");

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") {
    // 조용한 실패를 없앤다 (2026-07-31): 「앱은 깔았는데 왜 알림이 안 오지」를 여태 볼 방법이
    // 없었다 — 기기 표가 비어 있어도 원인이 «권한 거부»인지 «등록 실패»인지 알 수 없었다.
    reportPushProblem(`권한 없음(${perm.receive})`);
    return;
  }

  // 토큰 발급 자체가 실패한 경우(FCM 설정·APNs 인증서 문제 등). 이것도 여태 조용했다.
  PushNotifications.addListener("registrationError", (err) => {
    reportPushProblem(`등록 실패: ${(err as { error?: string })?.error ?? "알 수 없음"}`);
  });

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
  PushNotifications.addListener("registration", (token) => {
    void postToken(token.value);
  });

  // 로그인/로그아웃하면 **같은 토큰을 다시 등록**한다 (2026-07-29 수리).
  // 이게 없어서 앱 실행당 한 번(대개 로그인 전)만 등록됐고, 토큰이 전부 «주인 없음»으로 쌓였다
  // → sendPushToUser() 가 늘 0건을 찾아 개인 알림이 구조적으로 불가능했다.
  // 이미 쌓인 주인 없는 토큰은 다음 로그인 때 이 경로가 덮어써서 저절로 채워진다(onConflict: "token").
  try {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
    createSupabaseBrowserClient().auth.onAuthStateChange((event) => {
      // INITIAL_SESSION·TOKEN_REFRESHED 는 주인이 안 바뀌므로 무시.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      if (lastToken) void postToken(lastToken);
    });
  } catch {
    /* supabase 로드 실패 → 익명 등록만 유지 */
  }

  await PushNotifications.register();
}
