import { cookies } from "next/headers";
import PatientDashboardClient from "./PatientDashboardClient";
import PatientDashboardPremium from "./PatientDashboardPremium";
import PageShell from "../../components/healo/PageShell";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "내 진료 관리",
  description: "Patient dashboard for managing consultations, documents, and follow-ups.",
  robots: { index: false, follow: false },
};

export default async function PatientPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  if (mode === "legacy") {
    return (
      <PageShell current="" noHero>
        <PatientDashboardClient />
      </PageShell>
    );
  }
  return <PatientDashboardPremium />;
}
