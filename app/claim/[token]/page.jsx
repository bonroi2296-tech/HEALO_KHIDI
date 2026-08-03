import ClaimClient from "./ClaimClient";

// 비공개 링크(개인화 토큰) — 검색 색인 금지.
export const metadata = {
  title: "진행 상황 — healwith",
  robots: { index: false, follow: false },
};

export default async function ClaimPage({ params }) {
  const { token } = await params;
  return <ClaimClient token={token} />;
}
