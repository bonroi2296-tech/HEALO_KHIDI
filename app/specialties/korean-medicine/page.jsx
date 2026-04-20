import { cookies } from "next/headers";
import KoreanMedicineClient from "./KoreanMedicineClient";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "../../../src/lib/designMode";

export const metadata = {
  title: "Korean Traditional Medicine | HEALO",
  description:
    "Experience Korea's unique traditional medicine — herbal formulas, acupuncture, and holistic healing. Compare top Korean Medicine hospitals and treatment programs.",
  keywords: [
    "Korean Medicine",
    "Korean Traditional Medicine",
    "한방",
    "韩方治疗",
    "韓方病院",
    "韓国漢方治療",
    "acupuncture Korea",
    "herbal medicine Korea",
  ],
  alternates: { canonical: "/specialties/korean-medicine" },
  openGraph: {
    title: "Korean Traditional Medicine — Only in Korea | HEALO",
    description:
      "Discover Korea's 1,000-year medical tradition. Immune therapy, postpartum care, fertility support & more.",
    type: "website",
  },
};

export default async function KoreanMedicinePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  if (mode === "legacy") {
    return <KoreanMedicineClient />;
  }
  return (
    <PageShell current="treatments" noHero>
      <KoreanMedicineClient />
    </PageShell>
  );
}
