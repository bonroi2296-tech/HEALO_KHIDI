import MedicalDisclaimerClient from "./MedicalDisclaimerClient";

export const metadata = {
  title: "Medical Disclaimer | HEALO",
  description:
    "Important medical information notice — HEALO is not a substitute for professional medical diagnosis, treatment, or prescription.",
  alternates: { canonical: "/medical-disclaimer" },
};

export default function MedicalDisclaimerPage() {
  return <MedicalDisclaimerClient />;
}
