import CoordinatorInboxDetailClient from "./CoordinatorInboxDetailClient";

export const metadata = {
  title: "문의 상세 · Coordinator · healwith",
};

export default async function CoordinatorInboxDetailPage({ params }) {
  const { id } = await params;
  return <CoordinatorInboxDetailClient inquiryId={id} />;
}
