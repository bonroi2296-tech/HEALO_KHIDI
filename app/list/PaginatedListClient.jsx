"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, X, Search } from "lucide-react";
import { supabaseClient } from "@/lib/data/supabaseClient";
import { mapHospitalRow, mapTreatmentRow } from "@/lib/mapper";
import { getCurrentLangCode } from "@/lib/language";
import { getLangCodeFromCookie, t } from "@/lib/i18n";
import { CardListSection, PersonalConciergeCTA } from "@/components.jsx";

const TAG_CHIPS = {
  treatment: [
    { label: "Korean Medicine", value: "Korean Medicine" },
    { label: "Plastic Surgery", value: "Plastic Surgery" },
    { label: "Dermatology", value: "Dermatology" },
    { label: "Dental", value: "Dental" },
    { label: "Wellness", value: "Wellness" },
    { label: "Fertility", value: "Fertility" },
    { label: "Anti-Aging", value: "Anti-Aging" },
  ],
  hospital: [
    { label: "Korean Medicine", value: "Korean Medicine" },
    { label: "Plastic Surgery", value: "Plastic Surgery" },
    { label: "Dermatology", value: "Dermatology" },
    { label: "Seoul", value: "Seoul" },
    { label: "Immune Therapy", value: "Immune Therapy" },
    { label: "Women's Health", value: "Women's Health" },
  ],
};

export default function PaginatedListClient({ type, withCta = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTag = searchParams?.get("tag") || "";
  const initialSearch = searchParams?.get("q") || "";
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [itemsError, setItemsError] = useState(null);
  const [activeTag, setActiveTag] = useState(initialTag);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const ITEMS_PER_PAGE = 6;
  const isDev = process.env.NODE_ENV !== "production";
  const [lang, setLang] = useState("en");
  useEffect(() => {
    const update = () => {
      const newLang = getLangCodeFromCookie();
      setLang(prev => prev !== newLang ? newLang : prev);
    };
    update();
    const id = setInterval(update, 1500);
    return () => clearInterval(id);
  }, []);
  const localTitle = type === "treatment" ? t("list.treatments.title", lang) : t("list.hospitals.title", lang);

  const buildUrl = (path, params) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.tag) sp.set("tag", params.tag);
    const qs = sp.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const handleTagClick = (tag) => {
    const newTag = activeTag === tag ? "" : tag;
    setActiveTag(newTag);
    const path = type === "treatment" ? "/treatments" : "/hospitals";
    router.replace(buildUrl(path, { q: searchQuery, tag: newTag }), { scroll: false });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    const path = type === "treatment" ? "/treatments" : "/hospitals";
    router.replace(buildUrl(path, { tag: activeTag }), { scroll: false });
  };

  const fetchItems = useCallback(
    async (isLoadMore = false) => {
      if (!isLoadMore) setLoading(true);

      const from = isLoadMore ? (page + 1) * ITEMS_PER_PAGE : 0;
      const to = from + ITEMS_PER_PAGE - 1;
      const table = type === "treatment" ? "treatments" : "hospitals";
      const HOSPITAL_PUBLIC_COLS = `id,slug,name,location_en,location_kr,address_detail,description,tags,rating,reviews_count,images,thumbnail_image,gallery_images,latitude,longitude,operating_hours,doctor_profile,amenities,supported_languages,specialties,medical_equipment,certifications,insurance_accepted,insurance_details,annual_surgery_count,establishment_date,doctor_count,external_ratings,is_published,display_order,created_at,i18n,is_partner`;
      const TREATMENT_PUBLIC_COLS = `id,slug,name,description,full_description,hospital_id,price_min,price_max,tags,images,benefits,i18n`;

      try {
        let query = supabaseClient
          .from(table)
          .select(
            type === "treatment"
              ? `${TREATMENT_PUBLIC_COLS}, hospitals(slug, name, location_kr, location_en, i18n)`
              : HOSPITAL_PUBLIC_COLS
          )
          .eq("is_published", true)
          .order("display_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (activeTag) {
          query = query.contains("tags", [activeTag]);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.trim();
          query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,i18n->en->>name.ilike.%${q}%,i18n->en->>description.ilike.%${q}%`);
        }

        const { data, error } = await query;
        if (error) {
          console.error(`[PaginatedList ${type}] Fetch Error:`, error);
          setItemsError(error);
          throw error;
        }
        setItemsError(null);

        const lang = getCurrentLangCode();
        const mappedData = data
          .map((item) =>
            type === "treatment" ? mapTreatmentRow(item, lang) : mapHospitalRow(item, lang)
          )
          .filter(Boolean);

        if (isLoadMore) {
          setItems((prev) => [...prev, ...mappedData]);
          setPage((prev) => prev + 1);
        } else {
          setItems(mappedData);
          setPage(0);
        }

        setHasMore(data.length === ITEMS_PER_PAGE);
      } catch (err) {
        console.error(`[PaginatedList ${type}] Fetch Error:`, err);
        setItemsError(err);
      } finally {
        setLoading(false);
      }
    },
    [type, page, activeTag, searchQuery]
  );

  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    fetchItems(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, activeTag, searchQuery, lang]);

  const chips = TAG_CHIPS[type] || [];

  return (
    <>
      {/* Active Search Indicator */}
      {searchQuery && (
        <div className="max-w-6xl mx-auto px-4 mt-6 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">{t("search.resultsFor", lang) || "Results for"}</span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              &ldquo;{searchQuery}&rdquo;
              <button onClick={handleClearSearch} className="hover:text-teal-900 transition">
                <X size={14} />
              </button>
            </span>
          </div>
        </div>
      )}

      {/* Tag Filter Chips + Clear all */}
      {chips.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mt-6 mb-2">
          <div className="flex flex-wrap gap-2 items-center">
            {chips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => handleTagClick(chip.value)}
                className={`inline-flex items-center gap-1 px-3.5 py-2 sm:py-1.5 rounded-full text-sm font-semibold border transition-all min-h-[44px] sm:min-h-0 touch-target ${
                  activeTag === chip.value
                    ? "bg-teal-700 text-white border-teal-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700"
                }`}
              >
                {chip.label}
                {activeTag === chip.value && <X size={14} className="ml-0.5" />}
              </button>
            ))}
            {(activeTag || searchQuery) && (
              <button
                onClick={() => {
                  setActiveTag("");
                  setSearchQuery("");
                  const path = type === "treatment" ? "/treatments" : "/hospitals";
                  router.replace(path, { scroll: false });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700"
              >
                <X size={12} /> {t("common.clearAll", lang) || "Clear all"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state: no results */}
      {!loading && items.length === 0 && (
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-400 mb-4">
            <Search size={28} />
          </div>
          <p className="text-gray-600 font-semibold mb-1">
            {searchQuery || activeTag
              ? (t("list.noResults", lang) || "No results match your filters.")
              : (type === "treatment" ? (t("list.noTreatments", lang) || "No treatments yet.") : (t("list.noHospitals", lang) || "No hospitals yet."))}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {searchQuery || activeTag ? (t("list.tryDifferent", lang) || "Try a different search or clear filters.") : ""}
          </p>
          {(searchQuery || activeTag) && (
            <button
              onClick={() => {
                setActiveTag("");
                setSearchQuery("");
                const path = type === "treatment" ? "/treatments" : "/hospitals";
                router.replace(path, { scroll: false });
              }}
              className="px-5 py-2.5 bg-teal-700 text-white rounded-full font-bold text-sm hover:bg-teal-800 transition"
            >
              {t("common.clearAll", lang) || "Clear all"}
            </button>
          )}
        </div>
      )}

      {!loading && items.length > 0 && type === "hospital" ? (() => {
        const partnerItems = items.filter(item => item.is_partner);
        const otherItems = items.filter(item => !item.is_partner);
        const handleClick = (id) => {
          const item = items.find((entry) => entry.id === id);
          router.push(`/hospitals/${item?.slug || item?.id || id}`);
        };
        return (
          <>
            {partnerItems.length > 0 && (
              <CardListSection
                title={t("home.partnerHospitals", lang)}
                items={partnerItems}
                onCardClick={handleClick}
                type="hospital"
                showPartnerBadge
              />
            )}
            {otherItems.length > 0 && (
              <CardListSection
                title={t("home.otherHospitals", lang)}
                items={otherItems}
                onCardClick={handleClick}
                type="hospital"
                showPartnerBadge={false}
              />
            )}
          </>
        );
      })() : !loading && items.length > 0 ? (
      <CardListSection
        title={localTitle}
        items={items}
        onCardClick={(id) => {
          const item = items.find((entry) => entry.id === id);
          const slugOrId = item?.slug || item?.id || id;
          router.push(`/treatments/${slugOrId}`);
        }}
        type={type}
      />
      ) : null}
      {isDev && itemsError && (
        <div className="max-w-6xl mx-auto px-4 mt-2">
          <p className="text-xs text-red-500">Error: {itemsError.message}</p>
        </div>
      )}

      <div className="flex justify-center mt-8 mb-20 sm:mb-12 pb-safe-area">
        {loading && page === 0 ? (
          <div className="flex items-center gap-2 text-teal-700 font-bold">
            <Loader2 className="animate-spin" /> Loading...
          </div>
        ) : hasMore ? (
          <button
            onClick={() => fetchItems(true)}
            className="px-8 py-3.5 min-h-[48px] bg-white border border-gray-200 text-gray-600 rounded-full font-bold shadow-sm hover:bg-gray-50 hover:border-teal-500 hover:text-teal-700 transition"
          >
            {loading ? <Loader2 className="animate-spin" /> : `${t("common.loadMore", lang)} +`}
          </button>
        ) : null}
      </div>

      {withCta && (
        <div className="mt-4 md:mt-10">
          <PersonalConciergeCTA onClick={() => router.push("/inquiry")} />
        </div>
      )}
    </>
  );
}
