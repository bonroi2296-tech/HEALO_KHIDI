import CoordinatorInboxDetailClient from "./CoordinatorInboxDetailClient";

export const metadata = {
  title: "Inquiry Detail · Coordinator · healwith",
};

export default async function CoordinatorInboxDetailPage({ params }) {
  const { id } = await params;
  return <CoordinatorInboxDetailClient inquiryId={id} />;
}
