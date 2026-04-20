import { Suspense } from "react";
import { cookies } from "next/headers";
import SearchResultsClient from "./SearchResultsClient";
import PageShell from "../../components/healo/PageShell";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Search — HEALO Korea",
  description:
    "Search treatments and hospitals across Korea. Compare prices, reviews, and specialties.",
};

export default async function SearchPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  const content = (
    <Suspense>
      <SearchResultsClient />
    </Suspense>
  );
  if (mode === "legacy") return content;
  return (
    <PageShell current="" noHero>
      {content}
    </PageShell>
  );
}
