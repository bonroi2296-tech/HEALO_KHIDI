/**
 * healwith: 사용자에게 보내는 링크의 기준 주소 (단일 창구)
 *
 * ⚠️ **VERCEL_URL 을 폴백으로 쓰지 않는다.** 예전엔
 *   NEXT_PUBLIC_SITE_URL || (VERCEL_URL ? `https://${VERCEL_URL}` : "https://healwith.co.kr")
 * 였는데, 프로덕션에 NEXT_PUBLIC_SITE_URL 이 설정돼 있지 않아 **배포별 임시 주소**
 * (healo-khidi-xxxxx-bonrois-projects.vercel.app)가 실제 환자 메일에 나갔다
 * (2026-07-22 실측: 만족도 설문 메일 · 화상상담 리마인더 둘 다).
 *
 * 왜 치명적인가 — 우리 환자는 러시아·카자흐스탄에 있고, 받는 건 **의료 메일**이다.
 * 낯선 `.vercel.app` 도메인 링크는 피싱으로 보여 안 누른다. 화상상담 리마인더의 경우
 * 그 링크가 곧 진료 입장 경로다.
 *
 * 그래서 **정식 도메인이 기본값**이고, 명시적으로 지정했을 때만 그걸 쓴다.
 * (프리뷰에서 프리뷰 주소를 쓰고 싶으면 그 환경에 NEXT_PUBLIC_SITE_URL 을 넣으면 된다 —
 *  환경변수가 빠졌을 때 조용히 이상한 주소로 새는 쪽이 훨씬 위험하다.)
 */
export const CANONICAL_SITE_URL = "https://healwith.co.kr";

/** 끝의 슬래시를 제거한 기준 주소. 링크는 `${siteUrl()}/경로` 로 조립한다. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit && /^https?:\/\//.test(explicit)) {
    return explicit.replace(/\/+$/, "");
  }
  return CANONICAL_SITE_URL;
}
