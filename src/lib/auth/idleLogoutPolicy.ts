/**
 * 무활동 자동 로그아웃 — 「어디서 돌리고 얼마나 기다릴지」를 한 곳에서 정한다.
 *
 * 2026-08-04 PO 결정: **기기로 가른다.**
 *  - 스토어 앱(내 폰에 깐 앱) → **자동 로그아웃 없음.**
 *      ①개인 폰은 잠금화면·지문이 이미 같은 역할을 한다
 *      ②폰은 화면을 읽기만 하면 손이 안 닿아 「무활동」으로 오판된다
 *      ③앱은 알림 확인·전화 받기만 해도 뒤로 갔다 오는데, 그 시간이 무활동으로 쌓여
 *        복귀하는 순간 끊겼다.
 *  - PC·폰 브라우저 → **30분(28분에 경고).** 공용 PC 는 자리를 비운 사이 남이 화면을
 *      볼 수 있어 유지한다. 직전 값 10분은 근거 문서가 0건이었고, 코디가 환자 서류를
 *      읽는 중에 끊겼다.
 *  - 환자 화면(`/patient`) → 예전부터 제외(환자가 콘텐츠 읽는 중 끊기지 않게).
 */

export const IDLE_LIMIT_MS = 30 * 60 * 1000;
export const IDLE_WARNING_MS = 28 * 60 * 1000;

export interface IdleLogoutContext {
  isPortalPage: boolean;
  pathname: string;
  hasSession: boolean;
  isNativeApp: boolean;
}

/** 이 화면에서 무활동 자동 로그아웃을 돌려야 하는가. */
export function shouldRunIdleLogout(ctx: IdleLogoutContext): boolean {
  if (!ctx.hasSession) return false;
  if (!ctx.isPortalPage) return false;
  if (ctx.pathname.startsWith("/patient")) return false;
  if (ctx.isNativeApp) return false;
  return true;
}
