/**
 * `/app` 한 장이 «기기를 보고 어디로 보낼지» 정하는 규칙.
 *
 * 왜 이렇게 만드나:
 *   에이전시·환자·인쇄물에 뿌리는 주소를 **하나로 고정**하기 위해서다. 지금은 스토어 등록이
 *   안 끝나서 「홈 화면에 추가」로 보내지만, 등록이 끝나면 환경변수(env)에 스토어 주소만
 *   채우면 그날부터 스토어로 간다. **이미 뿌린 링크·자료는 한 글자도 안 고친다.**
 *
 * 환경변수:
 *   NEXT_PUBLIC_PLAY_STORE_URL  — 구글 Play 주소 (비어 있으면 웹앱 설치 안내)
 *   NEXT_PUBLIC_APP_STORE_URL   — 애플 App Store 주소 (비어 있으면 웹앱 설치 안내)
 */

export type Platform = "android" | "ios" | "desktop";

export type InstallTarget =
  | { kind: "store"; platform: "android" | "ios"; url: string }
  | { kind: "guide"; platform: Platform };

/**
 * 아이패드는 iPadOS 13+ 부터 자신을 «맥»이라고 말한다(사파리 데스크톱 모드가 기본).
 * 그래서 UA 만으로는 못 가르고 «터치 지점 개수»를 같이 봐야 한다 — 맥은 0, 아이패드는 5.
 */
export function detectPlatform(ua: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh|mac os x/i.test(ua) && maxTouchPoints > 1) return "ios"; // iPadOS
  return "desktop";
}

export function pickInstallTarget(
  ua: string,
  stores: { play?: string | null; appStore?: string | null },
  maxTouchPoints = 0
): InstallTarget {
  const platform = detectPlatform(ua, maxTouchPoints);
  const play = stores.play?.trim();
  const appStore = stores.appStore?.trim();

  if (platform === "android" && play) return { kind: "store", platform, url: play };
  if (platform === "ios" && appStore) return { kind: "store", platform, url: appStore };
  return { kind: "guide", platform };
}
