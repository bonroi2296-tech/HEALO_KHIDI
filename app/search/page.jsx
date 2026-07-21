import { permanentRedirect } from "next/navigation";

// 2026-07-14: /search(옛 프로젝트 검색+가격비교) 비활성화 — PO 지시(피벗 잔재 정리).
// 헤더·홈 어디에서도 연결되지 않는 고아 페이지였는데 sitemap·robots가 색인을 광고하고 있었음.
// SearchResultsClient.jsx 코드는 보존(향후 검색 재도입 대비), 라우트만 병원 목록으로 리다이렉트.
// (/stories 비활성화와 동일 패턴 — 하드 삭제 아님, 되돌리려면 이 파일만 원복.)
export default function SearchPage() {
  permanentRedirect("/hospitals");
}
