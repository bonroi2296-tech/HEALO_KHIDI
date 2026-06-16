import CoordinatorVisaDetailClient from "./CoordinatorVisaDetailClient";

export const metadata = {
  title: "Visa Detail · Coordinator · healwith",
};

export default async function CoordinatorVisaDetailPage({ params }) {
  const { id } = await params;
  return <CoordinatorVisaDetailClient applicationId={id} />;
}
