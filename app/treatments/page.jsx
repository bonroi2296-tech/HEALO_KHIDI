import { Suspense } from "react";
import PaginatedListClient from "../list/PaginatedListClient";

export const metadata = {
  title: "Treatments — Compare Top Medical Procedures in Korea",
  description: "Browse all HEALO treatments — Korean Medicine, plastic surgery, dermatology & more. Compare prices, reviews, and hospitals across Korea.",
  keywords: ["Korea treatments", "Korean Medicine", "plastic surgery Korea", "medical tourism treatments", "韩国治疗", "韓国施術"],
  alternates: { canonical: "/treatments" },
  openGraph: {
    title: "All Treatments | HEALO Korea",
    description: "Compare top medical treatments and Korean Medicine programs in Korea.",
    type: "website",
  },
};

export default function TreatmentsPage() {
  return (
    <Suspense>
      <PaginatedListClient
        type="treatment"
        title="All Treatments"
        withCta
      />
    </Suspense>
  );
}
