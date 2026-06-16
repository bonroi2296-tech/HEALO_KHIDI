import VisaApplicationDetailClient from "./VisaApplicationDetailClient";

export const metadata = {
  title: "Visa Application Detail · healwith",
};

export default async function PatientVisaApplicationDetailPage({ params }) {
  const { id } = await params;
  return <VisaApplicationDetailClient applicationId={id} />;
}
