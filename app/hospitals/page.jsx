import { Suspense } from "react";
import PaginatedListClient from "../list/PaginatedListClient";

export const metadata = {
  title: "Hospitals — Top Partner Clinics in Korea",
  description: "Browse HEALO partner hospitals and clinics across Korea. Korean Medicine, plastic surgery, dermatology, and more. Verified and reviewed for international patients.",
  keywords: ["Korea hospitals", "Korean Medicine hospital", "plastic surgery clinic Korea", "medical tourism Korea", "韩国医院", "韓国病院"],
  alternates: { canonical: "/hospitals" },
  openGraph: {
    title: "Partner Hospitals | HEALO Korea",
    description: "Explore verified Korean hospitals and clinics for international patients.",
    type: "website",
  },
};

export default function HospitalsPage() {
  return (
    <Suspense>
      <PaginatedListClient
        type="hospital"
        title="Partner Hospitals"
        withCta
      />
    </Suspense>
  );
}
