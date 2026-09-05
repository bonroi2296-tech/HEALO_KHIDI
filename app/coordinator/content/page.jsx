import ContentEditorClient from "./ContentEditorClient";

// 검색 기반 편집기 — 데이터는 클라이언트가 /api/coordinator/content 로 로드.
// 접근은 코디 레이아웃(공용 문지기 PortalGate)이 게이트, 쓰기는 API 가 권한 확인.
export const dynamic = "force-dynamic";

export default function ContentEditorPage() {
  return <ContentEditorClient />;
}
