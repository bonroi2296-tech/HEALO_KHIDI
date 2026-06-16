/**
 * healwith Design Mode — Feature flag
 *
 * 롤백 방법 (우선순위 순):
 * 1. URL 쿼리: ?design=legacy 또는 ?design=premium
 *    → 쿠키에 저장되어 다음 방문에도 유지됨
 * 2. 쿠키: healo_design=legacy
 * 3. Vercel 환경변수: NEXT_PUBLIC_DESIGN=legacy (전체 사용자 강제)
 * 4. 기본값: premium
 */

// 2026-04-21: LEGACY 를 기본값으로 전환. PREMIUM 은 ?design=premium 쿼리나
// 쿠키 수동 설정 시에만 노출 (UI 토글은 숨김 처리됨).
export const DEFAULT_MODE = "legacy";
// v2: 쿠키 이름 변경 → 예전 'healo_design=premium' 잔존 쿠키 무효화.
// 첫 방문은 무조건 LEGACY (DEFAULT_MODE), 토글로 변경 시 v2 쿠키 새로 세팅.
export const COOKIE_NAME = "healo_design_v2";

// UI 토글 노출 여부. false = 버튼 숨김, 코드는 유지.
// 다시 띄우려면 true 로 바꾸기만 하면 됨.
export const SHOW_DESIGN_TOGGLE = false;

/**
 * 서버/빌드 시 모드 결정.
 * page.jsx에서 searchParams와 cookies()를 받아 사용 권장.
 */
export function getServerDesignMode({ searchParams, cookies } = {}) {
  // 1. URL 쿼리 최우선
  const q = searchParams?.design?.toLowerCase?.();
  if (q === "legacy" || q === "premium") return q;

  // 2. 쿠키
  const cookieValue = cookies?.get?.(COOKIE_NAME)?.value?.toLowerCase?.();
  if (cookieValue === "legacy" || cookieValue === "premium") return cookieValue;

  // 3. 환경변수
  const env = process.env.NEXT_PUBLIC_DESIGN?.toLowerCase();
  if (env === "legacy") return "legacy";

  return DEFAULT_MODE;
}

/**
 * 클라이언트 모드.
 * URL 쿼리 > 쿠키 > env 순.
 */
export function getClientDesignMode() {
  if (typeof window === "undefined") {
    return getServerDesignMode();
  }
  try {
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get("design")?.toLowerCase();
    if (q === "legacy" || q === "premium") return q;

    // 쿠키 확인
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (m) {
      const v = decodeURIComponent(m[1]).toLowerCase();
      if (v === "legacy" || v === "premium") return v;
    }
  } catch {
    /* ignore */
  }
  const env = process.env.NEXT_PUBLIC_DESIGN?.toLowerCase();
  if (env === "legacy") return "legacy";
  return DEFAULT_MODE;
}

/**
 * 디자인 모드 설정 + 쿠키 저장 + 새로고침.
 * 쿠키는 1년 유효.
 */
export function setDesignMode(mode) {
  if (typeof window === "undefined") return;
  if (mode !== "legacy" && mode !== "premium") return;
  document.cookie = `${COOKIE_NAME}=${mode}; path=/; max-age=${60 * 60 * 24 * 365}`;
  // URL의 ?design= 쿼리 제거 (쿠키가 우선되도록)
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("design");
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export function toggleDesignMode() {
  const current = getClientDesignMode();
  setDesignMode(current === "premium" ? "legacy" : "premium");
}
