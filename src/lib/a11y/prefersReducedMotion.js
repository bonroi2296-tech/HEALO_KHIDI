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

/**
 * 폰(좁은 화면)에서만 화면을 맨 위로 올린다.
 *
 * 왜 여기 있나: 목록↔상세를 한 칸으로 전환하는 화면들이 전부 같은 세 줄을 베껴 쓰고 있었고,
 * 그 안의 「1024px」가 화면마다 따로 박혀 있어 CSS 의 `lg:` 와 어긋날 수 있었다
 * (2026-08-28 독립 리뷰 지적). 기준선을 한 곳에만 둔다.
 *
 * @param {number} [breakpoint=1024] Tailwind `lg` 기준선.
 */
export function scrollToTopOnNarrow(breakpoint = 1024) {
  if (typeof window === "undefined") return;
  if (window.innerWidth >= breakpoint) return;
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
}
