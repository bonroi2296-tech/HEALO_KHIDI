import { cookies } from "next/headers";
import RebookingClient from "./RebookingClient";
import RebookingPremium from "./RebookingPremium";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Rebooking Management",
  description:
    "Manage auto-recommended follow-up appointments. View symptom-triggered, follow-up-based, and doctor-recommended rebooking suggestions.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/patient/rebooking" },
};

export default async function PatientRebookingPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  if (mode === "legacy") {
    return (
      <PageShell current="" noHero>
        <RebookingClient />
      </PageShell>
    );
  }
  return <RebookingPremium />;
}
