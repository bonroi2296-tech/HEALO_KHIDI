import Link from "next/link";
import { localeAlternates, getRequestLocale, ogLocaleFields } from "@/lib/i18n/metadata";
import {
  Star,
  Shield,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle,
  Users,
  Award,
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
  title: "Plastic Surgery in Korea | Prices, Top Clinics & Guide",
  description:
    "Complete guide to plastic surgery in Korea. Compare prices, find verified clinics, and get a free personalized treatment plan. Rhinoplasty from $2,500.",
  keywords: [
    "plastic surgery Korea",
    "cosmetic surgery Korea",
    "rhinoplasty Korea",
    "double eyelid surgery Korea",
    "jaw surgery Korea",
    "facelift Korea",
    "Korean plastic surgery prices",
    "plastic surgery Seoul",
  ],
  openGraph: {
    title: "Plastic Surgery in Korea | Prices, Top Clinics & Guide | healwith",
    description:
      "Complete guide to plastic surgery in Korea. Compare prices, find verified clinics, and get a free personalized treatment plan.",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalSpecialty",
  name: "Plastic Surgery",
  description:
    "Comprehensive plastic and cosmetic surgery services in South Korea, including rhinoplasty, double eyelid surgery, facial contouring, and facelifts.",
  url: "https://healwith.co.kr/specialties/plastic-surgery",
  medicalSpecialty: "PlasticSurgery",
  availableService: [
    {
      "@type": "MedicalProcedure",
      name: "Rhinoplasty",
      description: "Nose reshaping surgery performed by board-certified surgeons in Korea",
    },
    {
      "@type": "MedicalProcedure",
      name: "Double Eyelid Surgery",
      description: "Blepharoplasty for natural-looking double eyelids",
    },
    {
      "@type": "MedicalProcedure",
      name: "Facial Contouring",
      description: "Jaw reduction and facial bone surgery for balanced facial proportions",
    },
    {
      "@type": "MedicalProcedure",
      name: "Facelift",
      description: "Anti-aging facial lift procedures using advanced techniques",
    },
  ],
};

const procedures = [
  {
    name: "Rhinoplasty",
    description:
      "Nose reshaping is one of the most sought-after procedures in Korea. Surgeons specialize in both structural and aesthetic refinements for natural results.",
    priceRange: "$2,500 – $6,000",
    highlights: ["Natural results", "Short recovery", "Advanced techniques"],
  },
  {
    name: "Double Eyelid Surgery",
    description:
      "Blepharoplasty is a highly refined procedure in Korea, with options ranging from non-incisional to full incisional techniques for lasting results.",
    priceRange: "$1,000 – $3,000",
    highlights: ["Minimal scarring", "Quick procedure", "Customizable"],
  },
  {
    name: "Facial Contouring (Jaw Surgery)",
    description:
      "Korea is widely recognized for facial bone surgery. Procedures include V-line jaw reduction, cheekbone reduction, and chin reshaping.",
    priceRange: "$5,000 – $12,000",
    highlights: ["Experienced surgeons", "3D planning", "Comprehensive care"],
  },
  {
    name: "Facelift",
    description:
      "Advanced facelift techniques in Korea focus on natural rejuvenation with minimal scarring, often combined with fat grafting for volume restoration.",
    priceRange: "$4,000 – $10,000",
    highlights: ["Natural rejuvenation", "Minimal scarring", "Long-lasting"],
  },
];

const whyKoreaStats = [
  {
    icon: Users,
    stat: "500,000+",
    label: "International patients annually",
  },
  {
    icon: Award,
    stat: "4,000+",
    label: "Licensed plastic surgery clinics",
  },
  {
    icon: Shield,
    stat: "Government-regulated",
    label: "Strict medical standards",
  },
  {
    icon: DollarSign,
    stat: "40–60%",
    label: "Lower than US/EU pricing",
  },
];

const steps = [
  {
    number: "01",
    title: "Submit Your Inquiry",
    description:
      "Tell us about the procedure you're considering. Share photos and goals — it's free and confidential.",
    icon: CheckCircle,
  },
  {
    number: "02",
    title: "Get Matched with Clinics",
    description:
      "We compare verified clinics and provide personalized quotes. No pressure, just clear information.",
    icon: Star,
  },
  {
    number: "03",
    title: "Travel & Receive Treatment",
    description:
      "We coordinate your appointments, accommodation support, and follow-up care throughout your journey.",
    icon: Clock,
  },
];

function PlasticSurgeryContent() {
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
              Your Guide to{" "}
              <span className="text-teal-700">Plastic Surgery</span> in Korea
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Korea is a global leader in cosmetic and reconstructive surgery.
              Compare verified clinics, transparent pricing, and get a free
              personalized treatment plan.
            </p>
            <Link
              href="/inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white font-semibold rounded-xl hover:bg-teal-800 transition-colors"
            >
              Get Your Free Treatment Plan
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* Why Korea */}
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-4">
              Why Choose Korea for Plastic Surgery?
            </h2>
            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-10">
              South Korea has one of the highest concentrations of plastic
              surgery expertise in the world, with advanced technology and
              competitive pricing.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {whyKoreaStats.map((item) => (
                <div
                  key={item.label}
                  className="bg-gray-50 rounded-xl p-4 md:p-6 text-center"
                >
                  <item.icon
                    className="mx-auto mb-3 text-teal-700"
                    size={28}
                  />
                  <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                    {item.stat}
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Procedures */}
        <section className="bg-gray-50 px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
              Popular Plastic Surgery Procedures
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {procedures.map((proc) => (
                <div
                  key={proc.name}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {proc.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {proc.description}
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign size={16} className="text-teal-700" />
                    <span className="text-sm font-semibold text-teal-700">
                      {proc.priceRange}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {proc.highlights.map((h) => (
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
              * Prices are approximate and vary by clinic, procedure complexity,
              and individual needs. Individual consultation required.
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
              Ready to Explore Your Options?
            </h2>
            <p className="text-teal-100 mb-8 max-w-xl mx-auto">
              Get a free, personalized treatment plan from verified Korean
              clinics. No obligation, no hidden fees.
            </p>
            <Link
              href="/inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-700 font-semibold rounded-xl hover:bg-teal-50 transition-colors"
            >
              Get Your Free Treatment Plan
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
              clinic, procedure complexity, and individual patient needs.
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

export default function PlasticSurgeryPage() {
  return <PlasticSurgeryContent />;
}
