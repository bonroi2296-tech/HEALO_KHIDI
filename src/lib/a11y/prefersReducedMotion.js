/**
 * healwith: 「움직임 줄이기」를 켠 사용자인가?
 *
 * 왜 자바스크립트에도 필요한가 (2026-08-04):
 *   CSS 쪽은 src/index.css 의 `@media (prefers-reduced-motion: reduce)` 한 블록이 전 화면을 덮는다.
 *   그런데 **자바스크립트가 직접 시키는 움직임은 CSS 로 못 끈다.** 대표가
 *   `scrollIntoView({ behavior: "smooth" })` — 옵션으로 «부드럽게»를 박아 넣은 것이라
 *   CSS 의 `scroll-behavior: auto !important` 가 이기지 못한다.
 *   우리 화면에선 채팅·메시지함이 새 글이 올 때마다 «스르륵» 내려가는데, 이게 전정장애·
 *   항암 중 구역감이 있는 사용자에겐 정확히 피해야 할 움직임이다.
 *
 * 쓰는 법:
 *   el.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" })
 *
 * 서버(SSR)에서는 window 가 없다 → 「줄이기 아님」으로 본다(기본 동작 유지).
 */

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

/** scrollIntoView·scrollTo 의 behavior 값. 줄이기를 켰으면 즉시 이동("auto"). */
export function scrollBehavior() {
  return prefersReducedMotion() ? "auto" : "smooth";
}
