import { Suspense } from "react";
import SearchResultsClient from "./SearchResultsClient";

export const metadata = {
  title: "Search — HEALO Korea",
  description:
    "Search treatments and hospitals across Korea. Compare prices, reviews, and specialties.",
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResultsClient />
    </Suspense>
  );
}
