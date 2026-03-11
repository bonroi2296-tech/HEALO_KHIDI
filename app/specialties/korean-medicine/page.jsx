import KoreanMedicineClient from "./KoreanMedicineClient";

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

export default function KoreanMedicinePage() {
  return <KoreanMedicineClient />;
}
