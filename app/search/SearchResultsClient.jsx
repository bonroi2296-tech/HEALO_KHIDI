"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { supabaseClient } from "@/lib/data/supabaseClient";
import { mapHospitalRow, mapTreatmentRow } from "@/lib/mapper";
import { getCurrentLangCode } from "@/lib/language";
import { getLangCodeFromCookie, t } from "@/lib/i18n";

const HOSPITAL_PUBLIC_COLS = `id,slug,name,location_en,location_kr,address_detail,description,tags,rating,reviews_count,images,thumbnail_image,gallery_images,latitude,longitude,operating_hours,doctor_profile,amenities,supported_languages,specialties,medical_equipment,certifications,insurance_accepted,insurance_details,annual_surgery_count,establishment_date,doctor_count,external_ratings,is_published,display_order,created_at,i18n,is_partner`;
const TREATMENT_PUBLIC_COLS = `id,slug,name,description,full_description,hospital_id,price_min,price_max,tags,images,benefits,i18n`;

function ResultCard({ item, type, onClick }) {
  const imgSrc = item.thumbnail_image || item.images?.[0] || "";
  const isExternal = imgSrc.includes("googleapis.com");
  const label = type === "treatment" ? item.title : item.name;
  const sub =
    type === "treatment"
      ? item.hospital
      : item.location || item.location_en || "";
  const tags = item.tags?.slice(0, 3) || [];
  const price =
    type === "treatment" && (item.price_min || item.price_max)
      ? item.price_min && item.price_max
        ? `$${Number(item.price_min).toLocaleString()} – $${Number(item.price_max).toLocaleString()}`
        : item.price_min
          ? `$${Number(item.price_min).toLocaleString()}+`
          : `Up to $${Number(item.price_max).toLocaleString()}`
      : null;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-teal-400 transition-all duration-300 cursor-pointer flex flex-row h-[150px] md:h-[180px]"
    >
      <div className="w-36 md:w-48 relative bg-gray-100 overflow-hidden shrink-0">
        {imgSrc ? (
          isExternal ? (
            <img
              src={imgSrc}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500 absolute inset-0"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <Image
              src={imgSrc}
              alt={label}
              fill
              sizes="(max-width:768px) 144px, 192px"
              className="object-cover group-hover:scale-105 transition duration-500"
              loading="lazy"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Search size={32} />
          </div>
        )}
      </div>

      <div className="flex-1 p-4 md:p-5 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-bold text-gray-900 text-sm md:text-base truncate group-hover:text-teal-700 transition">
            {label}
          </h3>
          {sub && (
            <p className="text-xs md:text-sm text-gray-500 mt-0.5 truncate">
              {sub}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] md:text-xs font-semibold rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {price && (
          <p className="text-xs text-gray-400 mt-2">
            <span className="font-bold text-teal-700 text-sm">{price}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, count, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg md:text-xl font-extrabold text-gray-900">
          {title}
        </h2>
        <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {count}
        </span>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-sm font-semibold text-teal-600 hover:text-teal-800 transition flex items-center gap-1"
        >
          {actionLabel} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-row h-[150px] md:h-[180px] animate-pulse">
      <div className="w-36 md:w-48 bg-gray-200 shrink-0" />
      <div className="flex-1 p-4 md:p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 bg-gray-100 rounded-full w-16" />
          <div className="h-5 bg-gray-100 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

export default function SearchResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [treatments, setTreatments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    setLang(getLangCodeFromCookie());
  }, []);

  useEffect(() => {
    const q = searchParams?.get("q") || "";
    setQuery(q);
    setInputValue(q);
  }, [searchParams]);

  useEffect(() => {
    if (!query.trim()) {
      setTreatments([]);
      setHospitals([]);
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      const q = query.trim();

      try {
        const searchFilter = `name.ilike.%${q}%,description.ilike.%${q}%,i18n->en->>name.ilike.%${q}%,i18n->en->>description.ilike.%${q}%`;

        const [treatmentsResult, hospitalsResult] = await Promise.all([
          supabaseClient
            .from("treatments")
            .select(
              `${TREATMENT_PUBLIC_COLS}, hospitals(slug, name, location_kr, location_en, i18n)`
            )
            .eq("is_published", true)
            .or(searchFilter)
            .order("display_order", { ascending: true, nullsFirst: false })
            .limit(8),
          supabaseClient
            .from("hospitals")
            .select(HOSPITAL_PUBLIC_COLS)
            .eq("is_published", true)
            .or(searchFilter)
            .order("display_order", { ascending: true, nullsFirst: false })
            .limit(8),
        ]);

        const mapLang = getCurrentLangCode();

        setTreatments(
          treatmentsResult.data
            ? treatmentsResult.data
                .map((r) => mapTreatmentRow(r, mapLang))
                .filter(Boolean)
            : []
        );
        setHospitals(
          hospitalsResult.data
            ? hospitalsResult.data
                .map((r) => mapHospitalRow(r, mapLang))
                .filter(Boolean)
            : []
        );
      } catch (err) {
        console.error("[SearchResults] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`, {
        scroll: false,
      });
    }
  };

  const handleClear = () => {
    setInputValue("");
    router.push("/");
  };

  const totalResults = treatments.length + hospitals.length;

  return (
    <div className="min-h-[60vh]">
      {/* Search Header */}
      <div className="relative overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)" }} />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-10 pb-12 md:pt-14 md:pb-16">
          <div className="text-center mb-6">
            <h1 className="text-white text-xl md:text-2xl font-extrabold tracking-tight">
              {!loading && query && totalResults > 0 ? (
                <>
                  {t("search.resultsFor", lang)}{" "}
                  <span className="text-teal-200">&ldquo;{query}&rdquo;</span>
                </>
              ) : !loading && query && totalResults === 0 ? (
                <span className="text-teal-200">&ldquo;{query}&rdquo;</span>
              ) : (
                <span className="text-teal-100/70">{t("search.placeholder", lang)}</span>
              )}
            </h1>
            {!loading && query && totalResults > 0 && (
              <p className="text-teal-200/70 text-sm mt-1.5 font-medium">
                {t("search.resultsCount", lang).replace("{count}", totalResults)}
              </p>
            )}
          </div>

          <div className="bg-white/95 backdrop-blur-sm p-2 md:p-2.5 rounded-full shadow-2xl flex items-center border border-white/30 focus-within:ring-2 focus-within:ring-teal-300/50 transition">
            <Search className="text-teal-600 ml-3 md:ml-4 shrink-0" size={20} />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t("search.placeholder", lang)}
              className="flex-1 p-3 md:p-4 text-gray-800 placeholder-gray-400 outline-none bg-transparent text-sm md:text-lg min-w-0 font-medium"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              autoFocus
            />
            {inputValue && (
              <button
                onClick={handleClear}
                className="p-2 mr-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            )}
            <button
              onClick={handleSearch}
              className="bg-teal-600 text-white px-5 md:px-8 py-2.5 md:py-3.5 rounded-full font-bold text-sm md:text-base hover:bg-teal-700 transition shadow-lg shrink-0"
            >
              {t("search.button", lang)}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          <div>
            <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
          <div>
            <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
          {/* Treatments Section */}
          {treatments.length > 0 && (
            <section>
              <SectionHeader
                title={t("search.treatments", lang)}
                count={treatments.length}
                actionLabel={t("search.viewAllTreatments", lang)}
                onAction={() =>
                  router.push(
                    `/treatments?q=${encodeURIComponent(query)}`
                  )
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {treatments.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    type="treatment"
                    onClick={() =>
                      router.push(
                        `/treatments/${item.slug || item.id}`
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Hospitals Section */}
          {hospitals.length > 0 && (
            <section>
              <SectionHeader
                title={t("search.hospitals", lang)}
                count={hospitals.length}
                actionLabel={t("search.viewAllHospitals", lang)}
                onAction={() =>
                  router.push(
                    `/hospitals?q=${encodeURIComponent(query)}`
                  )
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hospitals.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    type="hospital"
                    onClick={() =>
                      router.push(
                        `/hospitals/${item.slug || item.id}`
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {query && totalResults === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
                <Search className="text-gray-300" size={36} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {t("search.noResults.title", lang)}
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {t("search.noResults.desc", lang)}
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => router.push("/treatments")}
                  className="px-6 py-3 bg-teal-600 text-white rounded-full font-bold text-sm hover:bg-teal-700 transition shadow-sm"
                >
                  {t("search.browseTreatments", lang)}
                </button>
                <button
                  onClick={() => router.push("/hospitals")}
                  className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-full font-bold text-sm hover:border-teal-400 hover:text-teal-600 transition"
                >
                  {t("search.browseHospitals", lang)}
                </button>
              </div>
            </div>
          )}

          {/* No query */}
          {!query && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-5">
                <Search className="text-teal-400" size={36} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {t("search.placeholder", lang)}
              </h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
