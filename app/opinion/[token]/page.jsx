import OpinionClient from "./OpinionClient";

// 비공개 링크 — 검색 색인 금지.
export const metadata = {
  title: "전문의 소견 요청 — healwith",
  robots: { index: false, follow: false },
};

export default async function OpinionPage({ params }) {
  const { token } = await params;
  return <OpinionClient token={token} />;
}
