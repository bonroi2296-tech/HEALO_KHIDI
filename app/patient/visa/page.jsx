import VisaHubClient from "./VisaHubClient";

export const metadata = {
  title: "Medical Visa · healwith",
  description: "Medical visa status tracking and visa type guide.",
};

export default function PatientVisaPage() {
  return <VisaHubClient />;
}
