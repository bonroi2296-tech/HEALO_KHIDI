import { cookies } from "next/headers";
import PatientChatClient from "./PatientChatClient";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "AI Health Consultation",
  description: "Chat with HEALO AI for medical tourism guidance.",
  robots: { index: false, follow: false },
};

export default async function PatientChatPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  if (mode === "legacy") return <PatientChatClient />;
  return (
    <PageShell current="" noHero>
      <PatientChatClient />
    </PageShell>
  );
}
