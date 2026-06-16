import Link from "next/link";
import { cookies } from "next/headers";
import {
  Star,
  Shield,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle,
  Smile,
  HeartPulse,
} from "lucide-react";
import PageShell from "../../../components/healo/PageShell";
import { getServerDesignMode } from "@/lib/designMode";

export const metadata = {
  title: "Dental Treatment in Korea | Implants, Veneers & Prices | healwith",
  description:
    "Comprehensive guide to dental treatment in Korea. Dental implants, veneers, whitening, and orthodontics at competitive prices. Free consultation available.",
  keywords: [
    "dental treatment Korea",
    "dental implant Korea",
    "veneers Korea",
    "teeth whitening Korea",
    "orthodontics Korea",
    "dentist Seoul",
    "Korean dental clinic",
    "dental tourism Korea",
  ],
  openGraph: {
    title: "Dental Treatment in Korea | Implants, Veneers & Prices | healwith",
    description:
      "Comprehensive guide to dental treatment in Korea. Implants, veneers, whitening, and orthodontics at competitive prices.",
    type: "website",
    url: "https://khidi.healo.kr/specialties/dental",
  },
  alternates: {
    canonical: "/specialties/dental",
    languages: {
      en: "/specialties/dental?lang=en",
      ko: "/specialties/dental?lang=ko",
      ru: "/specialties/dental?lang=ru",
      kk: "/specialties/dental?lang=kz",
      zh: "/specialties/dental?lang=zh",
      ja: "/specialties/dental?lang=ja",
      'x-default': "/specialties/dental",
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalSpecialty",
  name: "Dentistry",
  description:
    "Comprehensive dental treatment services in South Korea, including dental implants, porcelain veneers, teeth whitening, and orthodontics.",
  url: "https://khidi.healo.kr/specialties/dental",
  medicalSpecialty: "Dentistry",
  availableService: [
    {
      "@type": "MedicalProcedure",
      name: "Dental Implants",
      description:
        "Premium dental implant placement using advanced guided surgery techniques",
    },
    {
      "@type": "MedicalProcedure",
      name: "Porcelain Veneers",
      description:
        "Custom-crafted porcelain veneers for a natural, lasting smile transformation",
    },
    {
      "@type": "MedicalProcedure",
      name: "Teeth Whitening",
      description:
        "Professional teeth whitening using safe, effective whitening systems",
    },
    {
      "@type": "MedicalProcedure",
      name: "Orthodontics",
      description:
        "Teeth alignment using braces, clear aligners, and lingual orthodontics",
    },
  ],
};

const treatments = [
  {
    name: "Dental Implants",
    description:
      "Korean dental clinics use premium implant systems with advanced guided surgery for precise placement. Full-arch solutions and same-day options are available at select clinics.",
    priceRange: "$800 – $2,500 per implant",
    highlights: ["Premium materials", "Guided surgery", "Long-lasting"],
  },
  {
    name: "Porcelain Veneers",
    description:
      "Custom-crafted veneers using digital smile design technology. Korean labs produce natural-looking, durable veneers with excellent color matching and minimal tooth preparation.",
    priceRange: "$300 – $800 per tooth",
    highlights: ["Digital design", "Natural look", "Minimal prep"],
  },
  {
    name: "Teeth Whitening",
    description:
      "Professional in-office whitening treatments using advanced systems that deliver noticeable results in a single visit with long-lasting brightness.",
    priceRange: "$200 – $500",
    highlights: ["Same-day results", "Safe process", "Lasting effect"],
  },
  {
    name: "Orthodontics",
    description:
      "Options include traditional braces, clear aligners, and lingual (hidden) braces. Korean orthodontists are experienced in complex cases and offer accelerated treatment plans.",
    priceRange: "$2,000 – $5,000",
    highlights: ["Multiple options", "Clear aligners", "Experienced care"],
  },
];

const whyKoreaPoints = [
  {
    icon: HeartPulse,
    title: "Advanced Technology",
    description:
      "Korean dental clinics invest heavily in digital imaging, CAD/CAM milling, and 3D printing for precise, efficient treatment.",
  },
  {
    icon: Smile,
    title: "Aesthetic Focus",
    description:
      "Korean dentistry emphasizes aesthetics alongside function, with expertise in smile design and cosmetic dental procedures.",
  },
  {
    icon: DollarSign,
    title: "Significant Savings",
    description:
      "Dental treatments in Korea cost 50–70% less than in the US, UK, or Australia without compromising on quality or materials.",
  },
  {
    icon: Shield,
    title: "Regulated & Safe",
    description:
      "All dental clinics are licensed by the Korean Ministry of Health and Welfare with strict hygiene and safety protocols.",
  },
];

const steps = [
  {
    number: "01",
    title: "Submit Your Inquiry",
    description:
      "Tell us about your dental needs. Share X-rays or photos if available — it's free and confidential.",
    icon: CheckCircle,
  },
  {
    number: "02",
    title: "Get Matched with Clinics",
    description:
      "We compare verified dental clinics and provide detailed treatment plans with transparent pricing.",
    icon: Star,
  },
  {
    number: "03",
    title: "Travel & Receive Treatment",
    description:
      "We coordinate your appointments, accommodation support, and follow-up care throughout your dental journey.",
    icon: Clock,
  },
];

function DentalContent() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-white">
        {/* Hero */}
        <section className="bg-gradient-to-b from-teal-50 to-white px-4 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-teal-700 bg-teal-100 rounded-full mb-4">
              Specialty Guide
            </span>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Your Guide to{" "}
              <span className="text-teal-600">Dental Treatment</span> in Korea
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Korea offers world-class dental care with advanced technology and
              significant cost savings. From implants to veneers, get quality
              treatment at a fraction of the price.
            </p>
            <Link
              href="/inquiry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
            >
              Get Your Free Treatment Plan
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* Why Korea */}
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
              Why Choose Korea for Dental Treatment?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {whyKoreaPoints.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 bg-gray-50 rounded-xl p-5"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">
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
              Popular Dental Treatments
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
                    <DollarSign size={16} className="text-teal-600" />
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
              * Prices are approximate and vary by clinic, materials used, and
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
                  <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-4">
                    <step.icon size={22} />
                  </div>
                  <div className="text-xs font-semibold text-teal-600 mb-1">
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
        <section className="bg-teal-600 px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to Start Your Dental Journey?
            </h2>
            <p className="text-teal-100 mb-8 max-w-xl mx-auto">
              Get a free, personalized treatment plan from verified Korean
              dental clinics. No obligation, no hidden fees.
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
              clinic, materials, and individual patient needs. Individual
              consultation is required before any dental procedure. healwith
              connects patients with clinics but does not provide dental
              services directly.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

export default async function DentalPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ck = await cookies();
  const mode = getServerDesignMode({ searchParams: sp, cookies: ck });
  if (mode === "legacy") return <DentalContent />;
  return (
    <PageShell current="treatments" noHero>
      <DentalContent />
    </PageShell>
  );
}
