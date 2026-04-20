import { cookies } from "next/headers";
import DocumentsClient from "./DocumentsClient";
import DocumentsPremium from "./DocumentsPremium";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "../../../src/lib/designMode";

export const metadata = {
  title: "의료 문서 관리",
  description: "Upload and manage your medical documents for consultation.",
  robots: { index: false, follow: false },
};

export default async function DocumentsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  if (mode === "legacy") {
    return (
      <PageShell current="" noHero>
        <DocumentsClient />
      </PageShell>
    );
  }
  return <DocumentsPremium />;
}
