"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Leaf, ShieldCheck, Sparkles, Globe, ChevronDown, MapPin,
  Star, ArrowRight, Building2, MessageCircle, Award, Microscope
} from "lucide-react";
import { supabaseClient } from "@/lib/data/supabaseClient";
import { mapHospitalRow, mapTreatmentRow } from "@/lib/mapper";
import { getCurrentLangCode } from "@/lib/language";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";
import { localeHref } from "@/lib/i18n/config";

export default function KoreanMedicineClient() {
  const router = useRouter();
  const langCode = useLang(); // 서버가 URL 언어로 렌더(SEO). 쿠키 폴링 대신 LangContext.
  const [hospitals, setHospitals] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [openFaqIdx, setOpenFaqIdx] = useState(-1);

  useEffect(() => {
    const fetchData = async () => {
      const lang = getCurrentLangCode();

      const [hospRes, treatRes] = await Promise.all([
        supabaseClient
          .from("hospitals")
          .select(`*`)
          .eq("is_published", true)
          .contains("tags", ["Korean Medicine"])
          .order("display_order", { ascending: true, nullsFirst: false })
          .limit(6),
        supabaseClient
          .from("treatments")
          .select(`id,slug,name,description,hospital_id,price_min,price_max,tags,images,benefits,i18n, hospitals(slug, name, location_kr, location_en, i18n)`)
          .eq("is_published", true)
          .contains("tags", ["Korean Medicine"])
          .order("display_order", { ascending: true, nullsFirst: false })
          .limit(8),
      ]);

      if (hospRes.data) setHospitals(hospRes.data.map(r => mapHospitalRow(r, lang)).filter(Boolean));
      if (treatRes.data) setTreatments(treatRes.data.map(r => mapTreatmentRow(r, lang)).filter(Boolean));
    };
    fetchData();
  }, []);

  // FAQ 5문답 — 사전(km.faq.*) 6개 언어. 예전엔 영어 문자열이 여기 박혀 있어 러시아어·카자흐어 화면에서도
  // 질문·답이 영어로 떴다(2026-09-06 실측: /ru/specialties/korean-medicine 의 영어 줄 6개 중 5개가 이 FAQ).
  // (check:content [빈라벨] 규칙이 `const x = [` 로 시작하는 배열을 넓게 잡으므로 번호 목록은 따로 둔다)
  const FAQ_IDS = [1, 2, 3, 4, 5];
  const faq = FAQ_IDS.map((i) => ({ q: t(`km.faq.q${i}`, langCode), a: t(`km.faq.a${i}`, langCode) }));

  const diffs = [
    { icon: ShieldCheck, key: "km.diff.regulated", descKey: "km.diff.regulatedDesc" },
    { icon: Sparkles, key: "km.diff.unique", descKey: "km.diff.uniqueDesc" },
    { icon: Microscope, key: "km.diff.modern", descKey: "km.diff.modernDesc" },
  ];

  const formatPrice = (item) => {
    if (!item.priceMin && !item.priceMax) return null;
    const fmt = (v) => `₩${(v / 10000).toFixed(0)}만`;
    if (item.priceMin && item.priceMax) return `${fmt(item.priceMin)} - ${fmt(item.priceMax)}`;
    return item.priceMin ? `${fmt(item.priceMin)}~` : `~${fmt(item.priceMax)}`;
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-emerald-800 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-teal-300/20 blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="flex items-center gap-2 text-emerald-200 text-sm font-semibold mb-4">
            <Leaf size={16} />
            <span className="uppercase tracking-wider">Korean Traditional Medicine</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-2">
            {t("km.hero.title", langCode)}{" "}
            <span className="text-emerald-300">{t("km.hero.highlight", langCode)}</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mt-4 leading-relaxed">
            {t("km.hero.subtitle", langCode)}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => router.push(localeHref("/inquiry", langCode))}
              className="bg-white text-emerald-800 font-bold px-6 py-3 rounded-full hover:bg-emerald-50 transition shadow-lg flex items-center gap-2"
            >
              <MessageCircle size={18} /> {t("km.cta", langCode)}
            </button>
            <button
              onClick={() => router.push("/treatments?tag=Korean+Medicine")}
              className="border-2 border-white/30 text-white font-bold px-6 py-3 rounded-full hover:bg-white/10 transition flex items-center gap-2"
            >
              {t("km.viewAll", langCode)} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* What is Korean Medicine */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">
          {t("km.section.whatIs", langCode)}
        </h2>
        <p className="text-gray-600 leading-relaxed max-w-3xl mb-10">
          {t("km.section.whatIsDesc", langCode)}
        </p>

        <h3 className="text-xl font-bold text-gray-900 mb-6">
          {t("km.section.whyKorea", langCode)}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {diffs.map((d, i) => {
            const Icon = d.icon;
            return (
              <div key={i} className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
                  <Icon size={20} className="text-emerald-700" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{t(d.key, langCode)}</h4>
                <p className="text-sm text-gray-600">{t(d.descKey, langCode)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Partner Hospitals */}
      {hospitals.length > 0 && (
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-8">
              {t("km.section.hospitals", langCode)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {hospitals.map((h) => (
                <div
                  key={h.id}
                  onClick={() => router.push(`/hospitals/${h.slug || h.id}`)}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-emerald-200 transition cursor-pointer group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <Building2 size={20} className="text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition line-clamp-2 text-sm">{h.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate">{h.location}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-3 mb-3">{h.description}</p>
                  {h.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {h.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Treatment Programs */}
      {treatments.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-8">
            {t("km.section.treatments", langCode)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {treatments.map((item) => {
              const price = formatPrice(item);
              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/treatments/${item.slug || item.id}`)}
                  className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-emerald-200 transition cursor-pointer group flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-[clamp(24px,2.5vw,32px)] font-bold text-gray-900 group-hover:text-emerald-700 transition mb-1">{item.title}</h3>
                      {item.hospitalName && (
                        <p className="text-xs text-gray-500">{item.hospitalName}</p>
                      )}
                    </div>
                    {price && (
                      <span className="text-emerald-700 font-bold text-sm whitespace-nowrap">{price}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.desc}</p>
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {item.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => router.push("/treatments?tag=Korean+Medicine")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white font-bold rounded-full hover:bg-emerald-700 transition"
            >
              {t("km.viewAll", langCode)} <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-8">
            {t("km.section.faq", langCode)}
          </h2>
          <div className="divide-y divide-gray-200 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {faq.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaqIdx(openFaqIdx === i ? -1 : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left group"
                >
                  <span className="text-sm font-semibold text-gray-900 pr-4">{item.q}</span>
                  <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openFaqIdx === i ? "rotate-180" : ""}`} />
                </button>
                {openFaqIdx === i && (
                  <p className="text-sm text-gray-600 leading-relaxed px-5 pb-4 -mt-1">{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 p-6 md:p-10 text-center text-white">
          <Leaf size={32} className="mx-auto mb-4 text-emerald-200" />
          <h2 className="text-xl md:text-3xl font-extrabold mb-3">{t("km.cta", langCode)}</h2>
          <p className="text-white/80 max-w-xl mx-auto mb-6">
            {t("km.hero.subtitle", langCode)}
          </p>
          <button
            onClick={() => router.push(localeHref("/inquiry", langCode))}
            className="bg-white text-emerald-800 font-bold px-8 py-3.5 rounded-full hover:bg-emerald-50 transition shadow-lg inline-flex items-center gap-2"
          >
            <MessageCircle size={18} /> {t("km.cta", langCode)}
          </button>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: "Korean Traditional Medicine at healwith",
            description: "Experience Korea's unique traditional medicine — herbal formulas, acupuncture, and holistic healing programs for international patients.",
            url: "https://healwith.co.kr/specialties/korean-medicine",
            medicalSpecialty: "Traditional Korean Medicine",
            availableService: treatments.map((tr) => ({
              "@type": "MedicalProcedure",
              name: tr.title,
              description: tr.desc,
            })),
          }),
        }}
      />
    </div>
  );
}
