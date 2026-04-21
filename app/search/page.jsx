import { Suspense } from "react";
import { cookies } from "next/headers";
import SearchResultsClient from "./SearchResultsClient";
import PageShell from "../../components/healo/PageShell";
import { getServerDesignMode } from "../../src/lib/designMode";

export const metadata = {
  title: "Search Treatments & Hospitals | HEALO Korea",
  description:
    "Search cancer treatments and hospitals across Korea. Compare specialties, prices, and reviews to find the best medical care for international patients.",
  keywords: ["Korea hospital search", "cancer treatment search Korea", "medical tourism Korea comparison"],
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search Treatments & Hospitals | HEALO Korea",
    description: "Find and compare cancer treatments and hospitals in Korea. Full concierge support for international patients.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Search Treatments & Hospitals | HEALO Korea",
    description: "Search and compare cancer treatments and hospitals in Korea for international patients.",
  },
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
