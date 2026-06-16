import VisaApplicationsClient from "./VisaApplicationsClient";

export const metadata = {
  title: "My Visa Applications · healwith",
  description: "비자 발급 신청 진행 상태를 확인하고 서류를 업로드하세요.",
};

export default function PatientVisaApplicationsPage() {
  return <VisaApplicationsClient />;
}
