import { redirect } from "next/navigation";

// 2026-05: /stories(후기) 비활성화 — 메뉴/검색 노출 안 함.
// StoriesClient.jsx 및 storiesData 코드는 보존(향후 재활성화 대비), 라우트만 홈으로 리다이렉트.
export default function StoriesPage() {
  redirect("/");
}
