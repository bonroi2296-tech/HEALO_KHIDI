import { cookies } from "next/headers";
import SymptomsClient from "./SymptomsClient";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "../../../src/lib/designMode";

export const metadata = {
  title: "증상 기록",
  description: "Log and track your symptoms for follow-up care.",
  robots: { index: false, follow: false },
};

export default async function SymptomsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  if (mode === "legacy") return <SymptomsClient />;
  return (
    <PageShell current="" noHero>
      <SymptomsClient />
    </PageShell>
  );
}
