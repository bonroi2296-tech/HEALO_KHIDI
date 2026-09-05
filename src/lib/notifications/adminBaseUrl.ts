/**
 * 백오피스 링크의 기준 주소 — 알림(메일·종)에 «누를 수 있는 주소»를 실을 때 한 곳에서 정한다.
 * 2026-09-05 독립 리뷰: 같은 env 판정이 inApp.ts·adminNotifier.ts 에 5번 복붙돼 있었고 꼬리 슬래시 처리도 갈렸다.
 * ⚠️ 환자에게 나가는 주소는 여기가 아니라 siteUrl()(정본 도메인 고정) — 이건 «직원용 화면» 주소다.
 */
export function adminBaseUrl(): string {
  return (process.env.ADMIN_DASHBOARD_URL || process.env.NEXT_PUBLIC_URL || "https://healwith.co.kr").replace(/\/+$/, "");
}
