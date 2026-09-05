import Link from "next/link";
import { localeAlternates, getRequestLocale, ogLocaleFields } from "@/lib/i18n/metadata";
import {
  Star,
  Shield,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Syringe,
} from "lucide-react";

// ⚠️ 이 화면은 «색인 제외»다(baseMeta.robots = noindex, 2026-06-17 PO 결정 — 암환자 컨시어지
//    피벗과 안 맞는 옛 미용 도메인). 그러면 canonical·hreflang 을 «내보내면 안 된다» —
//    noindex 와 canonical 을 같이 선언하는 건 구글이 명시적으로 피하라는 조합이고,
//    hreflang 은 「이 주소들도 색인해 달라」는 신호라 noindex 와 정면으로 어긋난다.
//    2026-08-31 실측: 세 화면이 noindex 인데 canonical 을 같이 내보내고 있었다.
//    (옛 주석: "hreflang 은 경로 방식(/ru/...)으로만 맞는다" — 맞는 말이지만 그건 «색인되는»
//     화면 얘기였다. 여기서는 애초에 안 내보내는 게 맞다.)
// og:url 은 남긴다 — 색인 신호가 아니라 «공유했을 때 어느 주소로 가나»일 뿐이다.
export async function generateMetadata() {
  const alt = await localeAlternates();
  const { locale } = await getRequestLocale();
  return {
    ...baseMeta,
    alternates: null,
    openGraph: { ...baseMeta.openGraph, ...(alt ? { url: alt.canonical } : {}), ...ogLocaleFields(locale) },
  };
}

const baseMeta = {
  // 암환자 컨시어지 피벗과 안 맞아 검색 제외(2026-06-17 PO 결정). 코드·라우트는 보존.
  robots: { index: false, follow: false },
  title: "Dermatology & Skin Treatments in Korea",
  description:
    "Explore advanced dermatology and skin treatments in Korea. Laser therapy, Botox, fillers, and skin rejuvenation at competitive prices. Free consultation.",
  keywords: [
    "dermatology Korea",
    "skin treatment Korea",
    "laser treatment Korea",
    "Botox Korea",
    "filler Korea",
    "skin rejuvenation Korea",
    "Korean skincare clinic",
    "dermatologist Seoul",
  ],
  openGraph: {
    title: "Dermatology & Skin Treatments in Korea | healwith",
    description:
      "Explore advanced dermatology and skin treatments in Korea. Laser therapy, Botox, fillers, and rejuvenation at competitive prices.",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalSpecialty",
  name: "Dermatology",
  description:
    "Advanced dermatology and skin treatment services in South Korea, including laser therapy, Botox, dermal fillers, and skin rejuvenation programs.",
  url: "https://healwith.co.kr/specialties/dermatology",
  medicalSpecialty: "Dermatology",
  availableService: [
    {
      "@type": "MedicalProcedure",
      name: "Laser Skin Treatment",
      description:
        "Advanced laser treatments for pigmentation, acne scars, skin tightening, and rejuvenation",
    },
    {
      "@type": "MedicalProcedure",
      name: "Botox",
      description:
        "Botulinum toxin injections for wrinkle reduction and facial slimming",
    },
    {
      "@type": "MedicalProcedure",
      name: "Dermal Fillers",
      description:
        "Hyaluronic acid fillers for volume restoration and facial contouring",
    },
    {
      "@type": "MedicalProcedure",
      name: "Skin Rejuvenation Program",
      description:
        "Comprehensive skin rejuvenation combining multiple treatments for total skin renewal",
    },
  ],
};

const treatments = [
  {
    name: "Laser Skin Treatment",
    description:
      "Korea leads in laser dermatology with a wide range of options for pigmentation correction, acne scar removal, skin tightening, and overall rejuvenation.",
    priceRange: "$200 – $1,500 per session",
    highlights: ["Multiple laser types", "Minimal downtime", "Visible results"],
  },
  {
    name: "Botox",
    description:
      "Botulinum toxin treatments in Korea are known for precise, natural-looking results. Popular uses include wrinkle smoothing, jawline slimming, and sweat reduction.",
    priceRange: "$100 – $400 per area",
    highlights: ["Quick procedure", "No downtime", "Natural look"],
  },
  {
    name: "Dermal Fillers",
    description:
      "Korean dermatologists are experienced in filler techniques for under-eye hollows, nasolabial folds, lip enhancement, and chin augmentation using premium HA fillers.",
    priceRange: "$300 – $800 per syringe",
    highlights: ["Immediate results", "Premium products", "Customizable"],
  },
  {
    name: "Skin Rejuvenation Program",
    description:
      "Comprehensive programs combine peels, lasers, LED therapy, and topical treatments tailored to your skin type for total renewal over multiple sessions.",
    priceRange: "$500 – $3,000 per program",
    highlights: ["Personalized plan", "Multi-treatment", "Long-lasting"],
  },
];

const whyKoreaPoints = [
  {
    icon: Sparkles,
    title: "Innovation Leader",
    description:
      "Korea is at the forefront of skincare research with cutting-edge laser and injection technologies.",
  },
  {
    icon: Syringe,
    title: "Expert Practitioners",
    description:
      "Korean dermatologists undergo extensive training and perform high volumes of aesthetic procedures daily.",
  },
  {
    icon: DollarSign,
    title: "Competitive Pricing",
    description:
      "Treatments typically cost 50–70% less than in the US or Europe while maintaining high quality standards.",
  },
  {
    icon: Shield,
    title: "Safety Standards",
    description:
      "All clinics are regulated by the Korean Ministry of Health and use government-approved products.",
  },
];

const steps = [
  {
    number: "01",
    title: "Submit Your Inquiry",
    description:
      "Describe your skin concerns and goals. Share photos if possible — consultations are free and confidential.",
    icon: CheckCircle,
  },
  {
    number: "02",
    title: "Get Matched with Clinics",
    description:
      "We compare verified dermatology clinics and provide personalized treatment plans with transparent pricing.",
    icon: Star,
  },
  {
    number: "03",
    title: "Travel & Receive Treatment",
    description:
      "We help coordinate your schedule, accommodation support, and follow-up care for a smooth experience.",
    icon: Clock,
  },
];

function DermatologyContent() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-teal-50 px-4 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-teal-700 bg-teal-100 rounded-full mb-4">
              Specialty Guide
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Advanced{" "}
              <span className="text-teal-700">Dermatology & Skin Treatments</span>{" "}
              in Korea
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Korea is renowned for its skincare culture and advanced
              dermatological treatments. Get access to cutting-edge therapies at
              competitive prices.
            </p>
            <Link
              href="/inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white font-semibold rounded-xl hover:bg-teal-800 transition-colors"
            >
              Get Your Free Consultation
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* Why Korea */}
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
              Why Choose Korea for Dermatology?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {whyKoreaPoints.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 bg-gray-50 rounded-xl p-5"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-[clamp(24px,2.5vw,32px)] font-bold text-gray-900 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Treatments */}
        <section className="bg-gray-50 px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
              Popular Skin Treatments
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {treatments.map((t) => (
                <div
                  key={t.name}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {t.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">{t.description}</p>
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign size={16} className="text-teal-700" />
                    <span className="text-sm font-semibold text-teal-700">
                      {t.priceRange}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.highlights.map((h) => (
                      <span
                        key={h}
                        className="px-2 py-1 text-xs bg-teal-50 text-teal-700 rounded-full"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-6">
              * Prices are approximate and vary by clinic, treatment plan, and
              individual needs. Individual consultation required.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((step) => (
                <div key={step.number} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-4">
                    <step.icon size={22} />
                  </div>
                  <div className="text-xs font-semibold text-teal-700 mb-1">
                    STEP {step.number}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-teal-700 px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to Transform Your Skin?
            </h2>
            <p className="text-teal-100 mb-8 max-w-xl mx-auto">
              Get a free, personalized treatment plan from verified Korean
              dermatology clinics. No obligation, no hidden fees.
            </p>
            <Link
              href="/inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-700 font-semibold rounded-xl hover:bg-teal-50 transition-colors"
            >
              Get Your Free Consultation
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="px-4 py-8 border-t border-gray-100">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs text-gray-400 text-center">
              Disclaimer: The information on this page is for general
              informational purposes only and does not constitute medical
              advice. Prices are approximate and may vary depending on the
              clinic, treatment complexity, and individual patient needs.
              Individual consultation is required before any medical procedure.
              healwith connects patients with clinics but does not provide medical
              services directly.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

export default function DermatologyPage() {
  return <DermatologyContent />;
}
