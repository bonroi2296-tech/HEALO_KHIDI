import { cookies } from "next/headers";
import MedicalDisclaimerClient from "./MedicalDisclaimerClient";
import MedicalDisclaimerClientLegacy from "./MedicalDisclaimerClientLegacy";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Medical Disclaimer | healwith",
  description:
    "Important medical information notice — healwith is not a substitute for professional medical diagnosis, treatment, or prescription.",
};

export default async function MedicalDisclaimerPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  return mode === "legacy" ? <MedicalDisclaimerClientLegacy /> : <MedicalDisclaimerClient />;
}
