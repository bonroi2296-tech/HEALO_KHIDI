"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronDown,
  MapPin, Star, Shield, Check, Image as ImageIcon, ArrowRight, Sparkles,
  ShieldCheck, CheckCircle2, MessageCircle, ThumbsUp, Map, UserCheck,
  Clock, FileText, Globe, Activity, AlertTriangle, Syringe, BarChart3
} from "lucide-react";
import { supabaseClient as supabase } from "@/lib/data/supabaseClient";
import { ReviewModal } from "@/components/Modals";
import { normalizeImages } from "@/lib/mapper";
import { localize, localizeArray, localizeLocation, getCurrentLangCode } from "@/lib/language";
import { GoogleMapComponent } from "@/components/GoogleMap";
import { formatDate, formatPriceRange } from "@/lib/i18n/format";
import { getLangCodeFromCookie, t } from "@/lib/i18n";
import { event } from "@/lib/ga";

export const TreatmentDetailPage = ({
  selectedId,
  setView,
  setInquiryMode,
  onHospitalClick,
  onTreatmentClick,
}) => {
  const id = selectedId;
  const isDev = process.env.NODE_ENV !== "production";

  const [treatment, setTreatment] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [rawTreatmentData, setRawTreatmentData] = useState(null);
  const [rawHospitalData, setRawHospitalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [, setTreatmentError] = useState(null);
  const [, setHospitalError] = useState(null);
  const [, setRelatedError] = useState(null);
  const [realReviews, setRealReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [relatedTreatments, setRelatedTreatments] = useState([]);
  const [similarTreatments, setSimilarTreatments] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [langCode, setLangCode] = useState("en");
  useEffect(() => {
    const update = () => setLangCode(prev => {
      const next = getLangCodeFromCookie();
      return prev !== next ? next : prev;
    });
    update();
    const timer = setInterval(update, 1500);
    return () => clearInterval(timer);
  }, []);

  // Helper: build treatment view object from raw DB row
  const buildTreatmentView = (tRow, lang) => {
    const thumb = tRow.thumbnail_image;
    const gallery = normalizeImages(tRow.gallery_images);
    const legacyImgs = normalizeImages(tRow.images);
    const legacyThumb = normalizeImages(tRow.thumbnail);
    const imgsWithThumbFallback = [thumb, ...gallery, ...legacyImgs, ...legacyThumb].filter(Boolean);
    return {
      id: tRow.id, slug: tRow.slug || null,
      title: localize(tRow, "name", lang) || tRow.name || "",
      name: localize(tRow, "name", lang) || tRow.name || "",
      desc: localize(tRow, "description", lang) || tRow.description || "",
      fullDescription: localize(tRow, "full_description", lang) || tRow.full_description || "",
      benefits: Array.isArray(tRow.benefits) ? tRow.benefits : [],
      tags: localizeArray(tRow, "tags", lang),
      images: imgsWithThumbFallback, thumbnail: tRow.thumbnail || null,
      hospitalId: tRow.hospital_id,
      price: formatPriceRange(tRow.price_min, tRow.price_max, "en"),
      price_min: tRow.price_min, price_max: tRow.price_max,
      recovery_time_min: tRow.recovery_time_min, recovery_time_max: tRow.recovery_time_max,
      recovery_process: tRow.recovery_process,
      side_effects: Array.isArray(tRow.side_effects) ? tRow.side_effects : [],
      side_effects_detail: tRow.side_effects_detail,
      precautions: Array.isArray(tRow.precautions) ? tRow.precautions : [],
      anesthesia_type: tRow.anesthesia_type,
      surgery_duration_min: tRow.surgery_duration_min, surgery_duration_max: tRow.surgery_duration_max,
      required_equipment: Array.isArray(tRow.required_equipment) ? tRow.required_equipment : [],
      insurance_coverage: tRow.insurance_coverage,
      insurance_coverage_detail: tRow.insurance_coverage_detail,
      annual_procedure_count: tRow.annual_procedure_count,
      success_rate: tRow.success_rate,
      similar_treatments: Array.isArray(tRow.similar_treatments) ? tRow.similar_treatments : [],
      comparison_data: tRow.comparison_data || null,
      before_after_images: Array.isArray(tRow.before_after_images) ? tRow.before_after_images : [],
      price_includes: Array.isArray(tRow.price_includes) ? tRow.price_includes : [],
    };
  };

  const buildHospitalView = (hRow, lang) => {
    const hThumb = hRow.thumbnail_image;
    const hGallery = normalizeImages(hRow.gallery_images);
    const hLegacyImgs = normalizeImages(hRow.images);
    const hLegacyThumb = normalizeImages(hRow.thumbnail);
    const hImgsFinal = [hThumb, ...hGallery, ...hLegacyImgs, ...hLegacyThumb].filter(Boolean);
    return {
      id: hRow.id, slug: hRow.slug || null,
      name: localize(hRow, "name", lang) || hRow.name || "",
      location: localizeLocation(hRow, lang) || hRow.location_en || "",
      address_detail: hRow.address_detail || "",
      description: localize(hRow, "description", lang) || hRow.description || "",
      tags: localizeArray(hRow, "tags", lang),
      rating: hRow.rating ?? null, reviews_count: hRow.reviews_count ?? null,
      images: hImgsFinal, thumbnail: hRow.thumbnail || null,
      latitude: hRow.latitude || null, longitude: hRow.longitude || null,
      operating_hours: hRow.operating_hours || null,
    };
  };

  // Re-map data when language changes (without re-fetching)
  useEffect(() => {
    if (!rawTreatmentData) return;
    setTreatment(buildTreatmentView(rawTreatmentData, langCode));
    if (rawHospitalData) setHospital(buildHospitalView(rawHospitalData, langCode));
  }, [langCode]);

  const getAddressText = (h) => {
    const locationText = (h?.location || "").trim();
    const detailText = (h?.address_detail || "").trim();
    if (locationText) return locationText;
    if (detailText) return detailText;
    return isDev ? "— (address missing)" : "";
  };

  const getOperatingHoursRows = (hours) => {
    const data = hours && typeof hours === "object" ? hours : {};
    return [
      { label: t("hours.monFri", langCode), time: data.mon_fri || "" },
      { label: t("hours.saturday", langCode), time: data.sat || "" },
      { label: t("hours.sunday", langCode), time: data.sun || data.sun_holidays || data.sun_holiday || "" },
    ];
  };

  const goBackToTreatments = () => {
    if (setView) setView("list_treatment");
    else window.history.back();
  };

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = (value) => UUID_REGEX.test(String(value || ""));

  useEffect(() => {
    let alive = true;
    const fetchTreatmentAndHospital = async () => {
      if (!id) return;
      setLoading(true); setLoadError(null); setTreatmentError(null); setHospitalError(null);
      setTreatment(null); setHospital(null);

      try {
        let tQuery = supabase
          .from("treatments")
          .select("id,name,slug,description,full_description,benefits,tags,images,price_min,price_max,hospital_id,duration,recovery_time,risks,preparation,currency,i18n");
        tQuery = isUuid(id) ? tQuery.eq("id", id) : tQuery.eq("slug", id);
        const { data: tRow, error: tErr } = await tQuery.single();
        if (tErr) { if (isDev) console.error("[TreatmentDetail] Treatment fetch error:", tErr); setTreatmentError(tErr); throw tErr; }
        if (!tRow) throw new Error("Treatment not found");

        setRawTreatmentData(tRow);
        const currentLang = langCode;
        const tView = buildTreatmentView(tRow, currentLang);

        if (!alive) return;
        setTreatment(tView);
        event("view_treatment", { treatment_slug: tRow.slug || null, lang: currentLang });

        if (tView.hospitalId) {
          const { data: hRow, error: hErr } = await supabase
            .from("hospitals")
            .select(`id,slug,name,location_kr,location_en,address_detail,description,images,thumbnail,thumbnail_image,gallery_images,tags,rating,reviews_count,latitude,longitude,operating_hours,i18n`)
            .eq("id", tView.hospitalId).single();
          if (hErr) { setHospitalError(hErr); throw hErr; }

          setRawHospitalData(hRow);
          const h = buildHospitalView(hRow, currentLang);
          if (!alive) return;
          setHospital(h);
        }
      } catch (err) {
        console.error("[TreatmentDetail] fetch failed:", err);
        if (!alive) return;
        setLoadError(err);
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchTreatmentAndHospital();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let alive = true;
    const fetchReviews = async () => {
      if (!treatment?.id) return;
      setLoadingReviews(true);
      try {
        const { data: reviews, error } = await supabase
          .from("reviews")
          .select("id,created_at,user_name,country,rating,content,helpful_count,treatment_id")
          .eq("treatment_id", treatment.id).order("created_at", { ascending: false });
        if (error) throw error;
        if (!alive) return;
        setRealReviews(reviews || []);
      } catch {
        if (!alive) return;
        setRealReviews([]);
      } finally {
        if (alive) setLoadingReviews(false);
      }
    };
    fetchReviews();
    return () => { alive = false; };
  }, [treatment?.id]);

  useEffect(() => {
    let alive = true;
    const fetchRelated = async () => {
      if (!treatment?.hospitalId || !treatment?.id) return;
      try {
        setRelatedError(null);
        const { data: rows, error } = await supabase
          .from("treatments")
          .select("id,slug,name,price_min,price_max,images,hospital_id")
          .eq("hospital_id", treatment.hospitalId).neq("id", treatment.id).limit(4);
        if (error) { setRelatedError(error); throw error; }
        const rLang = getCurrentLangCode();
        const mapped = (rows || []).map((r) => ({
          id: r.id, slug: r.slug || null,
          name: localize(r, "name", rLang) || r.name || "",
          price: formatPriceRange(r.price_min, r.price_max, "en"),
          images: normalizeImages(r.images), thumbnail: r.thumbnail || null, hospitalId: r.hospital_id,
        }));
        if (!alive) return;
        setRelatedTreatments(mapped);
      } catch {
        if (!alive) return;
        setRelatedTreatments([]);
      }
    };
    fetchRelated();
    return () => { alive = false; };
  }, [treatment?.hospitalId, treatment?.id]);

  useEffect(() => {
    let alive = true;
    const fetchSimilar = async () => {
      const ids = treatment?.similar_treatments;
      if (!Array.isArray(ids) || ids.length === 0) { setSimilarTreatments([]); return; }
      try {
        const { data: rows, error } = await supabase
          .from("treatments")
          .select("id,slug,name,price_min,price_max,images,recovery_time,hospitals(name)")
          .in("id", ids).limit(4);
        if (error) throw error;
        if (!alive) return;
        const sLang = getCurrentLangCode();
        setSimilarTreatments((rows || []).map((r) => ({
          id: r.id, slug: r.slug || null,
          name: localize(r, "name", sLang) || r.name || "",
          price: formatPriceRange(r.price_min, r.price_max, "en"),
          recovery: r.recovery_time || null,
          hospitalName: (r.hospitals ? localize(r.hospitals, "name", sLang) : "") || r.hospitals?.name || "",
          image: normalizeImages(r.images)?.[0] || null,
        })));
      } catch {
        if (!alive) return;
        setSimilarTreatments([]);
      }
    };
    fetchSimilar();
    return () => { alive = false; };
  }, [treatment?.similar_treatments]);

  const galleryImages = useMemo(() => {
    const allImages = (treatment?.images || []).filter(Boolean);
    return allImages.length > 0 ? allImages.slice(0, 5) : [];
  }, [treatment?.images]);

  useEffect(() => { setCurrentSlide(0); }, [galleryImages.length, id]);

  const nextSlide = (e) => { e?.stopPropagation(); setCurrentSlide((prev) => (prev + 1) % galleryImages.length); };
  const prevSlide = (e) => { e?.stopPropagation(); setCurrentSlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length); };

  const averageRating = realReviews.length > 0
    ? (realReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / realReviews.length).toFixed(1)
    : null;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-teal-700 font-bold">{t("status.loadingTreatment", langCode)}</div>;

  if (!treatment || loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-teal-700 font-extrabold text-lg mb-2">{t("status.treatmentNotFound", langCode)}</div>
        {loadError && isDev && <div className="text-red-500 text-xs mb-2 max-w-md">{loadError?.message || JSON.stringify(loadError)}</div>}
        <button onClick={goBackToTreatments} className="px-5 py-3 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-800 mt-4">{t("btn.backToTreatments", langCode)}</button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-32 lg:pb-24 animate-in fade-in slide-in-from-bottom-4">
      {/* Gallery */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {galleryImages.length === 0 ? (
          <div className="w-full aspect-[16/7] bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-500">
            <ImageIcon size={48} className="mb-2" /><p className="font-bold text-sm">No Images Available</p>
          </div>
        ) : galleryImages.length === 1 ? (
          <div className="w-full aspect-[16/7] relative overflow-hidden rounded-2xl bg-gray-100">
            <img src={galleryImages[0]} className="w-full h-full object-cover" alt="Main" />
          </div>
        ) : (
          <>
            <div className="md:hidden w-full aspect-[4/3] relative group overflow-hidden rounded-2xl bg-gray-100">
              <img src={galleryImages[currentSlide]} className="w-full h-full object-cover" alt="Main" />
              <button onClick={prevSlide} aria-label="Previous" className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full backdrop-blur-sm transition z-20"><ChevronLeft size={20} /></button>
              <button onClick={nextSlide} aria-label="Next" className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full backdrop-blur-sm transition z-20"><ArrowRight size={20} /></button>
              <div className="absolute bottom-3 right-3 z-20">
                <div className="bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"><ImageIcon size={10} /> {currentSlide + 1}/{galleryImages.length}</div>
              </div>
            </div>
            <div className="hidden md:flex flex-row gap-2 h-[420px]">
              <div className={`${galleryImages.length >= 2 ? "w-1/2" : "w-full"} h-full relative group cursor-pointer overflow-hidden rounded-xl`}>
                <img src={galleryImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Main" />
              </div>
              {galleryImages.length >= 2 && (
                <div className="w-1/2 h-full grid grid-cols-2 grid-rows-2 gap-2">
                  {galleryImages.slice(1, 5).map((img, idx) => (
                    <div key={idx} className="relative overflow-hidden cursor-pointer group rounded-xl">
                      <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt={`Detail ${idx + 1}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={goBackToTreatments} className="flex items-center text-sm text-gray-500 mb-6 hover:text-teal-700">
          <ChevronLeft size={16} /> {t("btn.backToTreatments", langCode)}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── LEFT COLUMN ─── */}
          <div className="lg:col-span-2">

            {/* Header */}
            <div className="mb-6">
              <div className="flex gap-2 mb-2 flex-wrap">
                {(treatment.tags || []).map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">{tag}</span>
                ))}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{treatment.title}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {t("detail.providedByLabel", langCode)}
                <span onClick={() => onHospitalClick?.(hospital?.slug || treatment.hospitalId)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { if (e.key === " ") e.preventDefault(); onHospitalClick?.(hospital?.slug || treatment.hospitalId); } }} className="font-semibold text-teal-700 underline cursor-pointer hover:text-teal-800 ml-0.5 focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {hospital?.name || "Hospital"}
                </span>
                <Shield size={13} className="text-teal-700 fill-teal-500" />
              </div>
            </div>

            {/* Overview */}
            <section className="border-t border-gray-200 pt-8 pb-2">
              <h3 className="text-lg font-bold text-gray-900 mb-3">{t("detail.treatmentOverview", langCode)}</h3>
              <p className="text-gray-600 leading-relaxed mb-5 whitespace-pre-wrap">{treatment.fullDescription || treatment.desc}</p>
              {treatment.benefits?.length > 0 && (
                <div className="space-y-2.5">
                  {treatment.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="mt-0.5 bg-teal-50 rounded-full p-1 shrink-0"><Check size={12} className="text-teal-700 stroke-[3]" /></div>
                      <span className="text-gray-700 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Before/After Gallery */}
            {treatment.before_after_images?.length > 0 && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t("detail.beforeAfter", langCode)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {treatment.before_after_images.map((pair, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="grid grid-cols-2">
                        <div className="relative aspect-square bg-gray-100">
                          <img src={pair.before} className="w-full h-full object-cover" alt={`Before ${idx + 1}`} />
                          <span className="absolute top-2 left-2 bg-gray-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">BEFORE</span>
                        </div>
                        <div className="relative aspect-square bg-gray-100">
                          <img src={pair.after} className="w-full h-full object-cover" alt={`After ${idx + 1}`} />
                          <span className="absolute top-2 left-2 bg-teal-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">AFTER</span>
                        </div>
                      </div>
                      {pair.caption && <p className="px-4 py-2.5 text-xs text-gray-600 text-center border-t border-gray-100">{pair.caption}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Procedure Details + Recovery */}
            {(treatment.surgery_duration_min || treatment.anesthesia_type || treatment.recovery_time_min || treatment.recovery_time_max || treatment.recovery_process) && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t("detail.procedureRecovery", langCode)}</h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                  {(treatment.surgery_duration_min || treatment.surgery_duration_max) && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <Syringe size={18} className="text-gray-500 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">{t("detail.duration", langCode)}</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {treatment.surgery_duration_min && treatment.surgery_duration_max
                            ? `${treatment.surgery_duration_min}-${treatment.surgery_duration_max} min`
                            : treatment.surgery_duration_min ? `${treatment.surgery_duration_min}+ min` : `${treatment.surgery_duration_max} min`}
                        </p>
                      </div>
                    </div>
                  )}
                  {treatment.anesthesia_type && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <Activity size={18} className="text-gray-500 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">{t("detail.anesthesia", langCode)}</p>
                        <p className="text-sm font-semibold text-gray-900">{treatment.anesthesia_type}</p>
                      </div>
                    </div>
                  )}
                  {(treatment.recovery_time_min || treatment.recovery_time_max) && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50">
                      <Clock size={18} className="text-teal-700 shrink-0" />
                      <div>
                        <p className="text-xs text-teal-700">{t("detail.recovery", langCode)}</p>
                        <p className="text-sm font-semibold text-teal-800">
                          {treatment.recovery_time_min && treatment.recovery_time_max
                            ? `${treatment.recovery_time_min}-${treatment.recovery_time_max} days`
                            : treatment.recovery_time_min ? `${treatment.recovery_time_min}+ days` : `${treatment.recovery_time_max} days`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {treatment.recovery_process && typeof treatment.recovery_process === "object" && (
                  <div className="space-y-3">
                    {Object.entries(treatment.recovery_process).map(([key, value], idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs">{idx + 1}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm capitalize">{key.replace(/_/g, " ")}</p>
                          <p className="text-sm text-gray-600 mt-0.5">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {treatment.required_equipment?.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Equipment Used</p>
                    <div className="flex flex-wrap gap-2">
                      {treatment.required_equipment.map((eq, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-lg border border-gray-100">{eq}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Side Effects & Precautions */}
            {(treatment.side_effects?.length > 0 || treatment.precautions?.length > 0) && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t("detail.sideEffectsTitle", langCode)}</h3>
                {treatment.side_effects?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5"><AlertTriangle size={15} className="text-amber-500" /> {t("detail.possibleSideEffects", langCode)}</p>
                    <ul className="space-y-1.5">
                      {treatment.side_effects.map((effect, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-amber-500 mt-0.5">•</span>{effect}</li>
                      ))}
                    </ul>
                    {treatment.side_effects_detail && <p className="text-xs text-gray-500 mt-3 p-3 bg-amber-50 rounded-lg">{treatment.side_effects_detail}</p>}
                  </div>
                )}
                {treatment.precautions?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5"><ShieldCheck size={15} className="text-teal-700" /> {t("detail.precautions", langCode)}</p>
                    <ul className="space-y-1.5">
                      {treatment.precautions.map((precaution, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700"><CheckCircle2 size={14} className="text-teal-700 mt-0.5 shrink-0" />{precaution}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Insurance + Statistics */}
            {(treatment.insurance_coverage || treatment.annual_procedure_count || treatment.success_rate) && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {treatment.annual_procedure_count && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <BarChart3 size={18} className="text-gray-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{treatment.annual_procedure_count.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{t("detail.annualProcedures", langCode)}</p>
                      </div>
                    </div>
                  )}
                  {treatment.success_rate && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <CheckCircle2 size={18} className="text-teal-700 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{treatment.success_rate}%</p>
                        <p className="text-xs text-gray-500">{t("detail.successRate", langCode)}</p>
                      </div>
                    </div>
                  )}
                  {treatment.insurance_coverage && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
                      <ShieldCheck size={18} className="text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{t("detail.insurance", langCode)}</p>
                        <p className="text-xs text-green-600">{t("detail.mayApply", langCode)}</p>
                      </div>
                    </div>
                  )}
                </div>
                {treatment.insurance_coverage_detail && (
                  <p className="text-xs text-gray-600 mt-3 p-3 bg-blue-50 rounded-lg">{treatment.insurance_coverage_detail}</p>
                )}
              </section>
            )}

            {/* Reviews */}
            <section className="border-t border-gray-200 pt-8 pb-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900">{t("detail.verifiedReviews", langCode)}</h3>
                  {realReviews.length > 0 ? (
                    <span className="bg-yellow-50 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-yellow-100">{averageRating}/5.0</span>
                  ) : (
                    <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-teal-100">New</span>
                  )}
                </div>
                {realReviews.length > 0 && (
                  <span onClick={() => setIsReviewModalOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { if (e.key === " ") e.preventDefault(); setIsReviewModalOpen(true); } }} className="text-teal-700 text-sm font-semibold cursor-pointer hover:underline focus:outline-none focus:ring-2 focus:ring-teal-400">View All ({realReviews.length})</span>
                )}
              </div>

              {loadingReviews ? (
                <div className="text-center py-8 text-gray-500 text-sm animate-pulse">{t("detail.checkingReviews", langCode)}</div>
              ) : realReviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {realReviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="p-4 bg-gray-50 rounded-xl flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs uppercase">{review.user_name?.[0] || "U"}</div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm line-clamp-1">{review.user_name} <span className="text-[10px] text-gray-500 uppercase">{review.country}</span></p>
                            <p className="text-xs text-gray-500">{review.created_at ? formatDate(review.created_at, "en") : ""}</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400 gap-0.5">{[...Array(review.rating || 5)].map((_, i) => <Star key={i} size={11} fill="currentColor" />)}</div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-4">&ldquo;{review.content}&rdquo;</p>
                      <div className="mt-auto flex items-center gap-1 text-xs text-gray-500"><ThumbsUp size={11} /> {t("detail.helpful", langCode)} ({review.helpful_count || 0})</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                  <MessageCircle size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm font-medium">{t("detail.noReviews", langCode)}</p>
                  <p className="text-xs text-gray-500 mt-1">{t("detail.beFirstReview", langCode)}</p>
                </div>
              )}
            </section>

            {/* Hospital Overview */}
            <section className="border-t border-gray-200 pt-8 pb-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t("detail.hospitalOverview", langCode)}</h3>
              <div className="flex flex-col md:flex-row rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5 md:w-1/2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{hospital?.name || "Hospital"}</h4>
                    <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-2">
                      <MapPin size={13} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{getAddressText(hospital)}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">{hospital?.description || "—"}</p>
                    <button onClick={() => onHospitalClick?.(hospital?.slug || treatment.hospitalId)} className="text-teal-700 font-semibold text-xs hover:underline flex items-center gap-1">
                      {t("detail.viewHospitalDetails", langCode)} <ArrowRight size={12} />
                    </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-900 mb-2">{t("detail.operatingHours", langCode)}</p>
                    <div className="space-y-1 text-xs">
                      {getOperatingHoursRows(hospital?.operating_hours).map((row) => (
                        <div key={row.label} className="flex justify-between">
                          <span className="text-gray-600">{row.label}:</span>
                          <span className="text-gray-500">{row.time || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-100 md:w-1/2 min-h-[200px] overflow-hidden">
                  <GoogleMapComponent location={hospital?.location} hospitalName={hospital?.name} latitude={hospital?.latitude} longitude={hospital?.longitude} />
                </div>
              </div>
            </section>

            {/* Similar Treatments */}
            {similarTreatments.length > 0 && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t("detail.compareSimilar", langCode)}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {similarTreatments.map((item) => (
                    <div key={item.id} onClick={() => onTreatmentClick?.(item.slug || item.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { if (e.key === " ") e.preventDefault(); onTreatmentClick?.(item.slug || item.id); } }} className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-teal-200 transition cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-400">
                      {item.image && <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0"><img src={item.image} className="w-full h-full object-cover" alt={item.name} /></div>}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 group-hover:text-teal-700 line-clamp-1">{item.name}</h4>
                        {item.hospitalName && <p className="text-xs text-gray-500 mt-0.5">{item.hospitalName}</p>}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-teal-700 font-bold text-sm">{item.price}</span>
                          {item.recovery && <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> {item.recovery}</span>}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-teal-700 transition shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Related treatments */}
            {relatedTreatments.length > 0 && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t("detail.moreFrom", langCode)} {hospital?.name || ""}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {relatedTreatments.map((item) => {
                    const thumb = normalizeImages(item.images)?.[0] || null;
                    return (
                      <div key={item.id} onClick={() => onTreatmentClick?.(item.slug || item.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { if (e.key === " ") e.preventDefault(); onTreatmentClick?.(item.slug || item.id); } }} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition cursor-pointer group flex flex-col focus:outline-none focus:ring-2 focus:ring-teal-400">
                        {thumb ? (
                          <div className="aspect-[4/3] bg-gray-200 overflow-hidden">
                            <img src={thumb} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={item.name} />
                          </div>
                        ) : (
                          <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center"><ImageIcon size={24} className="text-gray-300" /></div>
                        )}
                        <div className="p-3 flex flex-col flex-1">
                          <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1 group-hover:text-teal-700">{item.name}</h4>
                          <p className="text-teal-700 font-bold text-sm mt-auto">{item.price}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ─── RIGHT SIDEBAR ─── */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t("detail.estimatedPrice", langCode)}</p>
                <div className="text-2xl font-bold text-teal-700 mb-5">{treatment.price}</div>

                {treatment.price_includes?.length > 0 && (
                  <div className="mb-4 text-left">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t("detail.includes", langCode)}</p>
                    <ul className="space-y-1.5">
                      {treatment.price_includes.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-gray-700"><CheckCircle2 size={12} className="text-teal-700 shrink-0" />{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2.5">
                  <button onClick={() => { setInquiryMode?.("select"); setView?.("inquiry"); }} className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
                    <MessageCircle size={18} /> {t("detail.contactViahealwith", langCode)}
                  </button>
                  <button onClick={() => onHospitalClick?.(hospital?.slug || treatment.hospitalId)} className="w-full bg-white border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition">
                    {t("detail.viewHospitalProfile", langCode)}
                  </button>
                </div>

                {/* healwith Benefits */}
                <div className="mt-5 text-left bg-teal-50/80 rounded-xl p-4 border border-teal-100">
                  <p className="text-xs font-semibold text-teal-800 mb-2.5 uppercase tracking-wide flex items-center gap-1"><ShieldCheck size={13} /> {t("detail.healoGuarantee", langCode)}</p>
                  <ul className="space-y-2">
                    {[
                      { icon: <CheckCircle2 size={12} />, title: t("detail.freeComparisonQuote", langCode), desc: t("detail.compareTop3", langCode) },
                      { icon: <Shield size={12} />, title: t("offer.fullConcierge", langCode), desc: t("offer.fullConciergeDesc", langCode) },
                      { icon: <Clock size={12} />, title: t("offer.fastResponse", langCode), desc: t("offer.fastResponseDesc", langCode) },
                    ].map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className="bg-white p-1 rounded-full text-teal-700 mt-0.5">{b.icon}</div>
                        <div>
                          <span className="text-xs font-semibold text-gray-800 block">{b.title}</span>
                          <span className="text-[10px] text-gray-500">{b.desc}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Trust */}
                <div className="mt-5 pt-5 border-t border-gray-100 text-left">
                  <p className="text-xs font-semibold text-gray-900 mb-3">{t("sidebar.trustTitle", langCode)}</p>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { icon: <ShieldCheck size={13} />, text: t("sidebar.consentBased", langCode) },
                      { icon: <Shield size={13} />, text: t("sidebar.clearScope", langCode) },
                      { icon: <CheckCircle2 size={13} />, text: t("sidebar.internationalSupport", langCode) },
                      { icon: <FileText size={13} />, text: t("sidebar.consentBased", langCode) },
                      { icon: <Globe size={13} />, text: t("sidebar.internationalSupport", langCode) },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-gray-600">
                        <span className="text-teal-700">{item.icon}</span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Price Includes + Benefits */}
        <div className="lg:hidden mt-6 mb-4 space-y-3">
          {treatment.price_includes?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t("detail.includes", langCode)}</p>
              <ul className="space-y-1.5">
                {treatment.price_includes.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-gray-700"><CheckCircle2 size={12} className="text-teal-700 shrink-0" />{item}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="bg-teal-50/80 rounded-xl p-4 border border-teal-100">
            <p className="text-xs font-semibold text-teal-800 mb-2 uppercase tracking-wide flex items-center gap-1"><ShieldCheck size={13} /> {t("detail.healoGuarantee", langCode)}</p>
            <ul className="space-y-2">
              {[
                { icon: <CheckCircle2 size={12} />, title: t("detail.freeComparisonQuote", langCode) },
                { icon: <Shield size={12} />, title: t("offer.fullConcierge", langCode) },
                { icon: <Clock size={12} />, title: t("offer.fastResponse", langCode) },
              ].map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="bg-white p-1 rounded-full text-teal-700">{b.icon}</div>
                  <span className="text-xs font-semibold text-gray-800">{b.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto px-4 py-3">
          <div className="min-w-0">
            <p className="font-bold text-teal-700 text-lg">{treatment.price}</p>
            <p className="text-xs text-gray-500 truncate">{treatment.title}</p>
          </div>
          <button onClick={() => { setInquiryMode?.("select"); setView?.("inquiry"); }} className="bg-teal-700 text-white font-bold py-3 px-5 rounded-xl hover:bg-teal-800 transition shrink-0 flex items-center gap-2 text-sm">
            <MessageCircle size={16} /> {t("detail.contactViahealwith", langCode)}
          </button>
        </div>
      </div>

      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} reviews={realReviews} />
    </div>
  );
};
