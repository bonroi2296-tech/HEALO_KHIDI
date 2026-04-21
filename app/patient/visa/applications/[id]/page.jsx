import VisaApplicationDetailClient from "./VisaApplicationDetailClient";

export const metadata = {
  title: "Visa Application Detail · HEALO",
};

export default async function PatientVisaApplicationDetailPage({ params }) {
  const { id } = await params;
  return <VisaApplicationDetailClient applicationId={id} />;
}
