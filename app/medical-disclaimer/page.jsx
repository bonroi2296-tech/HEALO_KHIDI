import MedicalDisclaimerClient from "./MedicalDisclaimerClient";
import MedicalDisclaimerClientLegacy from "./MedicalDisclaimerClientLegacy";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Medical Disclaimer | HEALO",
  description:
    "Important medical information notice — HEALO is not a substitute for professional medical diagnosis, treatment, or prescription.",
  alternates: { canonical: "/medical-disclaimer" },
};

export default function MedicalDisclaimerPage() {
  const mode = getServerDesignMode();
  return mode === "legacy" ? <MedicalDisclaimerClientLegacy /> : <MedicalDisclaimerClient />;
}
