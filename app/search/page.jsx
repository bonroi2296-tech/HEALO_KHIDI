import { permanentRedirect } from "next/navigation";
import { withQuery } from "@/lib/url/withQuery";
import { getRequestLocale } from "@/lib/i18n/metadata";

// 2026-07-14: /search(옛 프로젝트 검색+가격비교) 비활성화 — PO 지시(피벗 잔재 정리).
// 헤더·홈 어디에서도 연결되지 않는 고아 페이지였는데 sitemap·robots가 색인을 광고하고 있었음.
// 2026-07-21: PO "둘다 날려버려" — 보존해뒀던 SearchResultsClient.jsx 삭제(재도입 계획 없음 확정).
// 남은 이 파일은 옛 링크·북마크가 안 깨지게 두는 308(영구) 리다이렉트 껍데기.
// 308인 이유: 307(임시)이면 구글이 "곧 돌아온다"로 읽고 옛 URL을 색인에 붙들어 둔다 (POSTMORTEMS #104).
// 들어올 때 붙어 있던 꼬리표(?utm_source=… 등)를 그대로 넘긴다 —
// 안 넘기면 옛 주소로 들어온 광고 클릭의 «출처»가 조용히 증발한다(withQuery 주석 참고).
// 2026-09-06: 언어 접두어를 살린다. /ru/search → /hospitals 로 보내면 proxy 가 쿠키·Accept-Language 로
// 언어를 «다시 추정»한다 — 러시아어 옛 링크로 처음 온 방문자(쿠키 없음)가 영어 화면에 떨어질 수 있었다
// (로컬 전수 링크 추적 실측: /ru/search → /hospitals → /en/hospitals). x-locale 은 proxy 가 이 경로에 붙인다.
export default async function SearchPage({ searchParams }) {
  const { locale } = await getRequestLocale();
  permanentRedirect(withQuery(locale ? `/${locale}/hospitals` : "/hospitals", await searchParams));
}
