import SymptomsClient from "./SymptomsClient";

export const metadata = {
  title: "증상 기록",
  description: "Log and track your symptoms for follow-up care.",
  robots: { index: false, follow: false },
};

export default function SymptomsPage() {
  return <SymptomsClient />;
}
