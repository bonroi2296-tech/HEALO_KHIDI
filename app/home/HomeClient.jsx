"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HeroSection,
  CardListSection,
  PersonalConciergeCTA,
} from "../../src/components.jsx";
import { Leaf, ArrowRight } from "lucide-react";
import { supabaseClient } from "../../src/lib/data/supabaseClient";
import { mapHospitalRow, mapTreatmentRow } from "../../src/lib/mapper";
import { getLocationColumn, getCurrentLangCode } from "../../src/lib/language";
import { getLangCodeFromCookie, t } from "../../src/lib/i18n";

export default function HomeClient() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [featuredTreatments, setFeaturedTreatments] = useState([]);
  const [partnerHospitals, setPartnerHospitals] = useState([]);
  const [otherHospitals, setOtherHospitals] = useState([]);
  const [siteConfig, setSiteConfig] = useState({ logo: "", hero: "" });
  const [treatmentsError, setTreatmentsError] = useState(null);
  const [hospitalsError, setHospitalsError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isDev = process.env.NODE_ENV !== "production";
  const [langCode, setLangCode] = useState("en");
  useEffect(() => {
    setLangCode(getLangCodeFromCookie());
  }, []);

  useEffect(() => {
    const fetchFeatured = async () => {
      const perfStart = performance.now();
      const marks = {};

      try {
        setIsLoading(true);
        const locCol = getLocationColumn();

        const HOSPITAL_PUBLIC_COLS = `id,slug,name,location_en,location_kr,address_detail,description,tags,rating,reviews_count,images,thumbnail_image,gallery_images,latitude,longitude,operating_hours,doctor_profile,amenities,supported_languages,specialties,medical_equipment,certifications,insurance_accepted,insurance_details,annual_surgery_count,establishment_date,doctor_count,external_ratings,is_published,display_order,created_at,i18n,is_partner`;
        const TREATMENT_PUBLIC_COLS = `id,slug,name,description,full_description,hospital_id,price_min,price_max,tags,images,benefits,i18n`;

        marks.fetchStart = performance.now();

        const [settingsResult, treatmentsResult, hospitalsResult] = await Promise.all([
          supabaseClient.from("site_settings").select("logo_url,hero_background_url").single(),
          supabaseClient
            .from("treatments")
            .select(`${TREATMENT_PUBLIC_COLS}, hospitals(slug, name, location:${locCol}, location_kr, location_en, i18n)`)
            .eq("is_published", true)
            .order("display_order", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(4),
          supabaseClient
            .from("hospitals")
            .select(`${HOSPITAL_PUBLIC_COLS}, location:${locCol}`)
            .eq("is_published", true)
            .order("display_order", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(12),
        ]);

        marks.fetchEnd = performance.now();

        if (settingsResult.data) {
          setSiteConfig({
            logo: settingsResult.data.logo_url,
            hero: settingsResult.data.hero_background_url,
          });
        }

        if (treatmentsResult.error) {
          console.error("[HomeClient] Treatments fetch error:", treatmentsResult.error);
          setTreatmentsError(treatmentsResult.error);
        } else {
          setTreatmentsError(null);
          if (treatmentsResult.data) {
            const lang = getCurrentLangCode();
            const mapped = treatmentsResult.data.map((r) => mapTreatmentRow(r, lang)).filter(Boolean);
            setFeaturedTreatments(mapped);
            marks.treatmentsRendered = performance.now();
          }
        }

        if (hospitalsResult.error) {
          console.error("[HomeClient] Hospitals fetch error:", hospitalsResult.error);
          setHospitalsError(hospitalsResult.error);
        } else {
          setHospitalsError(null);
          if (hospitalsResult.data) {
            const hLang = getCurrentLangCode();
            const mapped = hospitalsResult.data.map((r) => mapHospitalRow(r, hLang)).filter(Boolean);
            setPartnerHospitals(mapped.filter((h) => h.is_partner));
            setOtherHospitals(mapped.filter((h) => !h.is_partner));
            marks.hospitalsRendered = performance.now();
          }
        }

        const perfEnd = performance.now();

        if (isDev) {
          console.log("🚀 [Performance] Home Page Load:", {
            fetchMs: (marks.fetchEnd - marks.fetchStart).toFixed(0),
            totalMs: (perfEnd - perfStart).toFixed(0),
          });
        }
      } catch (error) {
        console.error("[HomeClient] Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <>
      <HeroSection
        setView={() =>
          router.push(
            searchTerm.trim()
              ? `/search?q=${encodeURIComponent(searchTerm.trim())}`
              : "/treatments"
          )
        }
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        siteConfig={siteConfig}
      />

      {isLoading ? (
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-2xl h-56"></div>
              ))}
            </div>
          </div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-2xl h-56"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <CardListSection
              title={t("home.signatureCollection", langCode)}
              items={featuredTreatments}
              onCardClick={(id) => {
                const item = featuredTreatments.find((entry) => entry.id === id);
                const slugOrId = item?.slug || item?.id || id;
                router.push(`/treatments/${slugOrId}`);
              }}
              type="treatment"
            />
            {isDev && (
              <div className="max-w-6xl mx-auto px-4 mt-2">
                {featuredTreatments.length === 0 && !treatmentsError && (
                  <p className="text-xs text-gray-500">No treatments loaded</p>
                )}
                {treatmentsError && (
                  <p className="text-xs text-red-500">Error: {treatmentsError.message}</p>
                )}
              </div>
            )}
          </div>

          {partnerHospitals.length > 0 && (
            <CardListSection
              title={t("home.partnerHospitals", langCode)}
              items={partnerHospitals}
              onCardClick={(id) => {
                const item = partnerHospitals.find((entry) => entry.id === id);
                const slugOrId = item?.slug || item?.id || id;
                router.push(`/hospitals/${slugOrId}`);
              }}
              type="hospital"
              showPartnerBadge
            />
          )}

          {otherHospitals.length > 0 && (
            <CardListSection
              title={t("home.otherHospitals", langCode)}
              items={otherHospitals}
              onCardClick={(id) => {
                const item = otherHospitals.find((entry) => entry.id === id);
                const slugOrId = item?.slug || item?.id || id;
                router.push(`/hospitals/${slugOrId}`);
              }}
              type="hospital"
            />
          )}
          {isDev && (
            <div className="max-w-6xl mx-auto px-4 mt-2">
              {partnerHospitals.length === 0 && otherHospitals.length === 0 && !hospitalsError && (
                <p className="text-xs text-gray-500">No hospitals loaded</p>
              )}
              {hospitalsError && (
                <p className="text-xs text-red-500">Error: {hospitalsError.message}</p>
              )}
            </div>
          )}

          <section className="max-w-6xl mx-auto px-4 mt-8 md:mt-12">
            <div
              onClick={() => router.push("/specialties/korean-medicine")}
              className="rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition group"
            >
              <div className="flex items-center gap-4 text-white">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Leaf size={24} className="text-emerald-200" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold">
                    {t("home.koreanMedicine", langCode)}
                  </h3>
                  <p className="text-white/70 text-sm mt-0.5">
                    {t("home.koreanMedicineDesc", langCode)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white font-bold text-sm bg-white/15 px-5 py-2.5 rounded-full group-hover:bg-white/25 transition shrink-0">
                {t("km.viewAll", langCode)} <ArrowRight size={16} />
              </div>
            </div>
          </section>

          <div className="mt-4 md:mt-10">
            <PersonalConciergeCTA onClick={() => router.push("/inquiry")} />
          </div>
        </>
      )}
    </>
  );
}
