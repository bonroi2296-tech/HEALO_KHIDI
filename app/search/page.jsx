import { permanentRedirect } from "next/navigation";

// 2026-07-14: /search(옛 프로젝트 검색+가격비교) 비활성화 — PO 지시(피벗 잔재 정리).
// 헤더·홈 어디에서도 연결되지 않는 고아 페이지였는데 sitemap·robots가 색인을 광고하고 있었음.
// 2026-07-21: PO "둘다 날려버려" — 보존해뒀던 SearchResultsClient.jsx 삭제(재도입 계획 없음 확정).
// 남은 이 파일은 옛 링크·북마크가 안 깨지게 두는 308(영구) 리다이렉트 껍데기.
// 308인 이유: 307(임시)이면 구글이 "곧 돌아온다"로 읽고 옛 URL을 색인에 붙들어 둔다 (POSTMORTEMS #104).
export default function SearchPage() {
  permanentRedirect("/hospitals");
}
