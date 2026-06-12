import { cookies } from "next/headers";
import MedicalDisclaimerClient from "./MedicalDisclaimerClient";
import MedicalDisclaimerClientLegacy from "./MedicalDisclaimerClientLegacy";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Medical Disclaimer | HEALO",
  description:
    "Important medical information notice — HEALO is not a substitute for professional medical diagnosis, treatment, or prescription.",
  alternates: { canonical: "/medical-disclaimer" },
};

export default async function MedicalDisclaimerPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <MedicalDisclaimerClientLegacy /> : <MedicalDisclaimerClient />;
}
