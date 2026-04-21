import PatientConsultationsClient from "./PatientConsultationsClient";

export const metadata = {
  title: "원격협진 이력 | HEALO",
  description: "나의 원격 상담 예약 및 기록",
  robots: { index: false, follow: false },
};

export default function PatientConsultationsPage() {
  return <PatientConsultationsClient />;
}
