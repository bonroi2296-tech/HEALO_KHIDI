import { Suspense } from "react";
import SearchResultsClient from "./SearchResultsClient";

export const metadata = {
  title: "Search Treatments & Hospitals | healwith Korea",
  description:
    "Search cancer treatments and hospitals across Korea. Compare specialties, prices, and reviews to find the best medical care for international patients.",
  keywords: ["Korea hospital search", "cancer treatment search Korea", "medical tourism Korea comparison"],
  openGraph: {
    title: "Search Treatments & Hospitals | healwith Korea",
    description: "Find and compare cancer treatments and hospitals in Korea. Full concierge support for international patients.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Search Treatments & Hospitals | healwith Korea",
    description: "Search and compare cancer treatments and hospitals in Korea for international patients.",
  },
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResultsClient />
    </Suspense>
  );
}
