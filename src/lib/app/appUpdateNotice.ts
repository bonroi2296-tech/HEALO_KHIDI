/**
 * 「앱을 업데이트해 주세요」 안내를 띄울지 판정한다.
 *
 * 왜 필요한가 (2026-08-28 사고):
 *   이 앱은 웹을 그대로 띄우는 구조(라이브로드)라 **웹 배포가 앱 업데이트보다 항상 먼저 나간다.**
 *   그 사이 구간에 있는 사람은 「새 웹 코드 + 그 기능이 없는 옛 앱」 조합이 되는데,
 *   그때 화면은 그냥 «고장난 앱»으로 보인다. 실제로 그날 애플 로그인이 눌리는 즉시 죽었다.
 *   → 각 기능에는 옛 앱에서도 죽지 않는 길(폴백)을 두고, **여기서는 그와 별개로
 *     「업데이트하면 제대로 된다」는 사실을 사용자에게 알려 준다.**
 *
 * 🛑 **막지 않는다. 안내만 한다** (PO 결정 2026-08-28).
 *   암환자 상담 서비스라 앱을 못 쓰게 막는 쪽이 훨씬 위험하다: 숫자를 잘못 적으면 전원이
 *   들어오지 못한다. 띠는 닫을 수 있고, 닫아도 앱은 그대로 쓸 수 있어야 한다.
 *
 * ⚠️ **이미 깔려 있는 옛 앱은 이 장치로도 못 잡는다.** 판 번호를 알려주는 기능 자체가
 *   그 앱에 없기 때문이다(판 번호를 못 읽으면 «안내하지 않는다»로 처리한다 — 넘겨짚어
 *   멀쩡한 사람에게 띠를 띄우는 것이 더 나쁘다). 효과는 다음 판부터 생긴다.
 */

/**
 * 「이 판 아래면 안내한다」는 기준. **새 앱을 낼 때 여기 숫자를 같이 올린다.**
 * 값은 스토어에 올리는 빌드 번호(iOS `CURRENT_PROJECT_VERSION`, 안드로이드 `versionCode`).
 *
 * ⚠️ 올리는 시점 = «그 판이 스토어에 실제로 깔린 뒤». 심사 중인 번호를 미리 넣으면
 *    아무도 받을 수 없는 판을 요구하게 되어 모두에게 띠가 뜬다.
 */
export const MIN_APP_BUILD: Record<"ios" | "android", number> = {
  ios: 4,
  android: 10,
};

export const STORE_URL: Record<"ios" | "android", string> = {
  ios: "https://apps.apple.com/app/id6794978794",
  android: "https://play.google.com/store/apps/details?id=kr.co.healwith.app",
};

/** 안내가 필요한가. 판단 근거가 없으면 «필요 없음»으로 답한다(거짓 경보 금지). */
export function needsUpdate(
  platform: string | null | undefined,
  build: string | number | null | undefined,
  minimums: Record<string, number> = MIN_APP_BUILD
): boolean {
  if (platform !== "ios" && platform !== "android") return false;
  const min = minimums[platform];
  if (!min) return false;
  const current = Number.parseInt(String(build ?? ""), 10);
  if (!Number.isFinite(current)) return false; // 판 번호를 못 읽으면 안내하지 않는다
  return current < min;
}

/**
 * 지금 앱의 플랫폼·빌드 번호를 읽는다. 앱이 아니거나 읽을 수 없으면 null.
 * (판 번호를 알려주는 부품이 없는 옛 앱에서는 여기서 조용히 null 이 된다.)
 */
export async function readAppBuild(): Promise<{ platform: string; build: string } | null> {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();
  if (platform !== "ios" && platform !== "android") return null;
  try {
    const { App } = await import("@capacitor/app");
    const info = await App.getInfo();
    return { platform, build: String(info?.build ?? "") };
  } catch {
    return null;
  }
}
