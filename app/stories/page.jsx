import { permanentRedirect } from "next/navigation";

// 2026-05: /stories(후기) 비활성화 — 메뉴/검색 노출 안 함.
// 2026-07-21: PO "둘다 날려버려" — 보존해뒀던 StoriesClient.jsx·storiesData.js 삭제(재활성화 계획 없음 확정).
// 남은 이 파일은 옛 링크·북마크가 안 깨지게 두는 308(영구) 리다이렉트 껍데기.
// 308인 이유: 307(임시)이면 구글이 "곧 돌아온다"로 읽고 옛 URL을 색인에 붙들어 둔다 (POSTMORTEMS #104).
export default function StoriesPage() {
  permanentRedirect("/");
}
