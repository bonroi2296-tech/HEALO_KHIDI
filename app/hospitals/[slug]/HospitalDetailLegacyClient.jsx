"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronDown, MapPin, Star, Shield, Info, FileText, Globe, Stethoscope, Sparkles,
  GraduationCap, Award, ShieldCheck, Check, Building2, Image as ImageIcon, ArrowRight,
  MessageCircle, HelpCircle, CheckCircle2, Activity, Calendar, Users, ClipboardCheck,
  Clock, Coffee, Languages, Phone, ExternalLink, X
} from "lucide-react";
import { supabase } from "../../../src/supabase";
import { mapHospitalRow, mapTreatmentRow } from "../../../src/lib/mapper";
import { GoogleMapComponent } from "../../../src/components/GoogleMap";

import { getLangCodeFromCookie, t } from "../../../src/lib/i18n";
import { formatDate } from "../../../src/lib/i18n/format";
import { event } from "../../../src/lib/ga";

// 병원 이미지 폴더 규칙: /images/hospitals/<slug>/1~5.jpg (1=메인, 2~5=서브)
const PLACEHOLDER_IMG = "/images/hospitals/_coming-soon.svg?v=2";
// 사진 없는 칸은 한 번에 "이미지 준비 중" 플레이스홀더로 대체 (체인 없이 확실하게)
const handleImgError = (e) => {
  if (e.currentTarget.src.includes("_coming-soon")) return;
  e.currentTarget.onerror = null;
  e.currentTarget.src = PLACEHOLDER_IMG;
};

const GoogleReviewsList = ({ reviews, langCode }) => {
  const filtered = useMemo(() => {
    if (!reviews?.length) return [];
    return reviews
      .filter(r => r.rating >= 4 && r.text && !r._hidden)
      .sort((a, b) => (b.publishTime || '').localeCompare(a.publishTime || ''));
  }, [reviews]);

  const [translatedReviews, setTranslatedReviews] = useState(filtered);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (!filtered.length) return;
    setTranslatedReviews(filtered);
    if (!langCode || langCode === 'ko') return;

    let alive = true;
    const doTranslate = async () => {
      setTranslating(true);
      try {
        const texts = filtered.map(r => r.text);
        const res = await fetch('/api/translate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts, targetLang: langCode }),
        });
        const data = await res.json();
        if (data.ok && data.translations && alive) {
          setTranslatedReviews(filtered.map((r, i) => ({ ...r, text: data.translations[i] || r.text })));
        }
      } catch { /* keep originals */ }
      finally { if (alive) setTranslating(false); }
    };
    doTranslate();
    return () => { alive = false; };
  }, [filtered, langCode]);

  if (!translatedReviews.length) return null;

  return (
    <div>
      {translating && <p className="text-xs text-teal-500 animate-pulse mb-2">{t("status.translating", langCode) || "Translating..."}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {translatedReviews.map((review, idx) => (
          <div key={idx} className="p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {review.authorPhoto ? (
                  <img src={review.authorPhoto} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer"/>
                ) : (
                  <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">{review.author?.[0] || "G"}</div>
                )}
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{review.author}</p>
                  <p className="text-xs text-gray-400">{review.time}</p>
                </div>
              </div>
              <div className="flex text-yellow-400 gap-0.5">{[...Array(review.rating || 5)].map((_, i) => <Star key={i} size={11} fill="currentColor" />)}</div>
            </div>
            {review.text && <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">&ldquo;{review.text}&rdquo;</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export const HospitalDetailPage = ({ selectedId, setView, onTreatmentClick, initialData }) => {
  const isDev = process.env.NODE_ENV !== "production";
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = (value) => UUID_REGEX.test(String(value || ""));

  const [hospital, setHospital] = useState(initialData || null);
  const [hospitalTreatments, setHospitalTreatments] = useState([]);
  const [rawHospital, setRawHospital] = useState(null);
  const [rawTreatments, setRawTreatments] = useState([]);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [, setTreatmentsError] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [realReviews, setRealReviews] = useState([]);
  const [openFaqIdx, setOpenFaqIdx] = useState(-1);
  const [langCode, setLangCode] = useState("en");
  useEffect(() => {
    const update = () => setLangCode(prev => {
      const next = getLangCodeFromCookie();
      return prev !== next ? next : prev;
    });
    update();
    const id = setInterval(update, 1500);
    return () => clearInterval(id);
  }, []);

  // Re-map data when language changes (normal hospitals, without re-fetching)
  useEffect(() => {
    if (!rawHospital) return;
    try { setHospital(mapHospitalRow(rawHospital, langCode)); } catch {}
    try { setHospitalTreatments(rawTreatments.map(r => mapTreatmentRow(r, langCode)).filter(Boolean)); } catch {}
  }, [langCode, rawHospital, rawTreatments]);

  // Re-resolve i18n fields for partner hospitals (pre-loaded via initialData) when language changes
  useEffect(() => {
    if (!hospital?._i18n) return;
    const i = hospital._i18n;
    const l = (obj) => obj?.[langCode] || obj?.["en"] || obj?.["ko"] || "";
    const lArr = (obj) => {
      if (!obj) return [];
      const arr = obj[langCode] || obj["en"] || obj["ko"];
      return Array.isArray(arr) ? arr : [];
    };
    setHospital((prev) => ({
      ...prev,
      name: l(i.name),
      description: l(i.description),
      location: l(i.address),
      specialties: lArr(i.specialties),
      tags: [l(i.type)],
    }));
  }, [langCode, hospital?._i18n]);

  const normalizeImages = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string") {
      const t = raw.trim();
      if (t.startsWith("[") && t.endsWith("]")) {
        try {
          const parsed = JSON.parse(t);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch (e) {
          console.warn("Failed to parse image array:", e);
        }
      }
      if (t.startsWith("http")) return [t];
    }
    return [];
  };

  useEffect(() => {
    const run = async () => {
      if (initialData) return; // Skip fetch for partner hospitals with pre-loaded data
      if (!selectedId) return;
      setLoading(true);
      setHospital(null);
      setHospitalTreatments([]);
      setRawHospital(null);
      setRawTreatments([]);
      setError(null);

      try {
        let hQuery = supabase
          .from("hospitals")
          .select(`id,slug,name,location_kr,location_en,address_detail,website,description,images,thumbnail_image,gallery_images,tags,rating,reviews_count,doctor_profile,latitude,longitude,operating_hours,certifications,medical_equipment,insurance_accepted,insurance_details,annual_surgery_count,establishment_date,doctor_count,external_ratings,specialties,amenities,supported_languages,faq,i18n,is_partner`);

        hQuery = isUuid(selectedId)
          ? hQuery.eq("id", selectedId)
          : hQuery.eq("slug", selectedId);

        const { data: hRow, error: hErr } = await hQuery.maybeSingle();
        if (hErr) { console.error("[HospitalDetail] Hospital fetch error:", hErr); setError(hErr); setLoading(false); return; }
        if (!hRow) { setError(new Error(`Hospital not found for id: ${selectedId}`)); setLoading(false); return; }

        setRawHospital(hRow);
        let h;
        try { h = mapHospitalRow(hRow, langCode); }
        catch (e) { console.warn("mapHospitalRow failed, using raw:", e); h = hRow; }

        setHospital(h);
        event("view_hospital", { hospital_slug: h?.slug || null, lang: langCode });

        const { data: tRows, error: tErr } = await supabase
          .from("treatments")
          .select("id,slug,name,description,images,tags,price_min,hospital_id,i18n")
          .eq("hospital_id", hRow.id);

        if (tErr) { setTreatmentsError(tErr); setHospitalTreatments([]); }
        else {
          setTreatmentsError(null);
          setRawTreatments(tRows || []);
          let mapped = [];
          try { mapped = (tRows || []).map((r) => mapTreatmentRow(r, langCode)); }
          catch (_e) { mapped = tRows || []; }
          setHospitalTreatments(mapped);
        }
      } finally { setLoading(false); }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    let alive = true;
    const fetchReviews = async () => {
      const treatmentIds = hospitalTreatments.map((t) => t.id).filter(Boolean);
      if (treatmentIds.length === 0) return;
      setLoadingReviews(true);
      try {
        const { data: reviews, error: revErr } = await supabase
          .from("reviews")
          .select("id,created_at,user_name,country,rating,content,helpful_count,treatment_id")
          .in("treatment_id", treatmentIds)
          .order("created_at", { ascending: false });
        if (revErr) throw revErr;
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
  }, [hospitalTreatments]);

  const allGalleryImages = useMemo(() => {
    const isPartnerHospital = hospital?.is_partner ?? false;
    const slug = hospital?.slug || selectedId;
    // 파트너 병원: 폴더 규칙(/images/hospitals/<slug>/1~5.jpg) 5칸 고정.
    // 폴더에 사진을 넣으면 자동으로 채워지고, 없는 칸은 onError로 플레이스홀더 표시.
    if (isPartnerHospital && slug) {
      return [1, 2, 3, 4, 5].map((n) => `/images/hospitals/${slug}/${n}.jpg?v=2`);
    }
    const thumb = hospital?.thumbnail_image;
    const gallery = normalizeImages(hospital?.gallery_images);
    const legacyImages = normalizeImages(hospital?.images);
    return [...new Set([thumb, ...gallery, ...legacyImages].filter(Boolean))];
  }, [hospital?.is_partner, hospital?.slug, selectedId, hospital?.thumbnail_image, hospital?.gallery_images, hospital?.images]);

  const galleryImages = allGalleryImages.slice(0, 5);
  const [lightboxIdx, setLightboxIdx] = useState(-1);

  const [currentSlide, setCurrentSlide] = useState(0);
  useEffect(() => { setCurrentSlide(0); }, [hospital?.id]);
  useEffect(() => {
    if (galleryImages.length <= 1) return;
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % galleryImages.length), 3000);
    return () => clearInterval(timer);
  }, [galleryImages.length]);
  const nextSlide = (e) => { e?.stopPropagation(); setCurrentSlide((prev) => (prev + 1) % galleryImages.length); };
  const prevSlide = (e) => { e?.stopPropagation(); setCurrentSlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length); };

  const doctor = useMemo(() => hospital?.doctorProfile || hospital?.doctor_profile || null, [hospital]);
  const isPartner = hospital?.is_partner ?? false;

  const defaultFaq = [
    { question: "How do I get an estimate?", answer: "Submit an inquiry and we will help you compare itemized quotes." },
    { question: "Do you provide interpretation?", answer: "Concierge support may be available depending on the clinic and schedule." },
    { question: "Is my information safe?", answer: "We only share information with your consent for matching and coordination." },
  ];
  const faq = useMemo(() => {
    const dbFaq = hospital?.faq;
    if (Array.isArray(dbFaq) && dbFaq.length > 0) return dbFaq;
    return defaultFaq;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospital?.faq]);

  // Highlights: compact grid items
  const approxCount = (n) => {
    if (n >= 100) return '100+';
    if (n >= 50) return '50+';
    if (n >= 10) return '10+';
    if (n >= 5) return '5+';
    return `${n}`;
  };
  const highlights = useMemo(() => {
    const items = [];
    if (hospital?.doctor_count) items.push({ icon: Users, value: approxCount(hospital.doctor_count), label: t("detail.medicalProfessionals", langCode) });
    if (hospital?.annual_surgery_count) items.push({ icon: ClipboardCheck, value: hospital.annual_surgery_count.toLocaleString(), label: t("detail.annualProcedures", langCode) });
    if (hospital?.establishment_date) items.push({ icon: Calendar, value: `${new Date(hospital.establishment_date).getFullYear()}`, label: t("detail.established", langCode) });
    if (hospital?.insurance_accepted) items.push({ icon: ShieldCheck, value: t("detail.yes", langCode), label: t("detail.insuranceAccepted", langCode) });
    const hours = hospital?.operating_hours;
    if (hours?.mon_fri) items.push({ icon: Clock, value: hours.mon_fri, label: t("hours.monFri", langCode), highlight: 'weekday' });
    if (hours?.sat) {
      const isClosed = hours.sat === '휴무일' || hours.sat === '휴무' || hours.sat.toLowerCase() === 'closed';
      items.push({ icon: Clock, value: isClosed ? t("hours.closed", langCode) : hours.sat, label: t("hours.saturday", langCode), highlight: isClosed ? 'closed' : 'weekend' });
    }
    const sun = hours?.sun || hours?.sun_holidays || hours?.sun_holiday;
    if (sun) {
      const isClosed = sun === '휴무일' || sun === '휴무' || sun.toLowerCase() === 'closed';
      items.push({ icon: Clock, value: isClosed ? t("hours.closed", langCode) : sun, label: t("hours.sunday", langCode), highlight: isClosed ? 'closed' : 'weekend' });
    } else if (hours?.mon_fri || hours?.sat) {
      items.push({ icon: Clock, value: t("hours.closed", langCode), label: t("hours.sunday", langCode), highlight: 'closed' });
    }
    return items;
  }, [hospital, langCode]);

  // Offerings: merge specialties, languages, amenities, equipment, certifications
  const offerings = useMemo(() => {
    const items = [];
    hospital?.specialties?.forEach((s) => items.push({ icon: Stethoscope, label: s }));
    hospital?.supported_languages?.forEach((l) => items.push({ icon: Languages, label: l }));
    hospital?.amenities?.forEach((a) => items.push({ icon: Coffee, label: a }));
    hospital?.medical_equipment?.forEach((e) => items.push({ icon: Activity, label: e }));
    hospital?.certifications?.forEach((c) => items.push({ icon: Award, label: `${c.type?.replace(/_/g, " ")} — ${c.issuer}` }));
    return items;
  }, [hospital]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500 font-bold">{t("status.loadingHospital", langCode)}</div>;
  }
  if (error || !hospital) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="text-teal-700 font-extrabold text-lg mb-2">{t("status.hospitalNotFound", langCode)}</div>
        {error && isDev && <div className="text-red-500 text-xs mb-2 max-w-md">{error.message || JSON.stringify(error)}</div>}
        <button onClick={() => setView?.("list_hospital")} className="px-5 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700 mt-4">{t("btn.backToHospitals", langCode)}</button>
      </div>
    );
  }

  const RatingBadge = () => {
    if (!hospital?.rating || hospital.rating <= 0) return <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-teal-100">New</span>;
    return (
      <span className="flex items-center gap-1.5">
        <Star size={16} className="text-yellow-400 fill-yellow-400" />
        <span className="font-semibold text-gray-900">{hospital.rating}</span>
        {hospital.ratingCount > 0 && <span className="text-gray-500 text-sm">({hospital.ratingCount})</span>}
      </span>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-32 lg:pb-24 animate-in fade-in slide-in-from-bottom-4">
      {/* Gallery */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {galleryImages.length === 0 ? (
          <div className="w-full aspect-[16/7] bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400">
            <ImageIcon size={48} className="mb-2" /><p className="font-bold text-sm">{t("detail.noImages", langCode)}</p>
          </div>
        ) : galleryImages.length === 1 ? (
          <div className="w-full aspect-[16/7] relative overflow-hidden rounded-2xl bg-gray-100">
            <img src={galleryImages[0]} onError={handleImgError} className="w-full h-full object-cover" alt={hospital?.name || "Hospital"} />
          </div>
        ) : (
          <>
            <div className="md:hidden w-full aspect-[4/3] relative group overflow-hidden rounded-2xl bg-gray-100">
              {galleryImages.map((img, index) => (
                <div key={index} className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentSlide ? "opacity-100" : "opacity-0"}`}>
                  <img src={img} onError={handleImgError} className="w-full h-full object-cover" alt={`${hospital?.name || "Hospital"} ${index + 1}`} />
                </div>
              ))}
              <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full backdrop-blur-sm transition z-20"><ChevronLeft size={20} /></button>
              <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full backdrop-blur-sm transition z-20"><ArrowRight size={20} /></button>
              <div className="absolute bottom-3 right-3 z-20">
                <div className="bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <ImageIcon size={10} /> {currentSlide + 1}/{galleryImages.length}
                </div>
              </div>
            </div>
            <div className="hidden md:flex flex-row gap-2 h-[420px]">
              <div className={`${galleryImages.length >= 2 ? "w-1/2" : "w-full"} h-full relative group cursor-pointer overflow-hidden rounded-xl`} onClick={() => setLightboxIdx(0)}>
                <img src={galleryImages[0]} onError={handleImgError} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={hospital?.name || "Hospital"} referrerPolicy="no-referrer" />
              </div>
              {galleryImages.length >= 2 && (
                <div className="w-1/2 h-full grid grid-cols-2 grid-rows-2 gap-2">
                  {galleryImages.slice(1, 5).map((img, idx) => {
                    const isLast = idx === Math.min(galleryImages.length - 2, 3);
                    const remaining = allGalleryImages.length - 5;
                    return (
                      <div key={idx} className="relative overflow-hidden cursor-pointer group rounded-xl" onClick={() => setLightboxIdx(idx + 1)}>
                        <img src={img} onError={handleImgError} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" alt={`${hospital?.name || "Hospital"} ${idx + 2}`} referrerPolicy="no-referrer" />
                        {isLast && remaining > 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">+{remaining}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx >= 0 && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-10" onClick={() => setLightboxIdx(-1)}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Thumbnail strip */}
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b overflow-x-auto shrink-0">
              {allGalleryImages.map((img, i) => (
                <button key={i} onClick={() => setLightboxIdx(i)} className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition ${i === lightboxIdx ? 'border-teal-500 ring-1 ring-teal-300' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <img src={img} onError={handleImgError} className="w-full h-full object-cover" alt={hospital?.name || "Hospital"} referrerPolicy="no-referrer" />
                </button>
              ))}
              <button onClick={() => setLightboxIdx(-1)} className="shrink-0 ml-auto text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
            </div>
            {/* Main image */}
            <div className="relative flex-1 min-h-0 bg-gray-900 flex items-center justify-center">
              <button onClick={() => setLightboxIdx((lightboxIdx - 1 + allGalleryImages.length) % allGalleryImages.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-full backdrop-blur-sm transition z-10"><ChevronLeft size={22} /></button>
              <img src={allGalleryImages[lightboxIdx]} onError={handleImgError} className="max-w-full max-h-[60vh] object-contain" alt={hospital?.name || "Hospital"} referrerPolicy="no-referrer" />
              <button onClick={() => setLightboxIdx((lightboxIdx + 1) % allGalleryImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-full backdrop-blur-sm transition z-10"><ArrowRight size={22} /></button>
            </div>
            <div className="px-4 py-2 bg-gray-50 text-center text-xs text-gray-500 border-t shrink-0">
              {lightboxIdx + 1} / {allGalleryImages.length}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => setView("list_hospital")} className="flex items-center text-sm text-gray-500 mb-6 hover:text-teal-600">
          <ChevronLeft size={16} /> {t("detail.backToHospitals", langCode)}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* ─── LEFT COLUMN ─── */}
          <div className="lg:col-span-2">

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {hospital?.tags?.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">{tag}</span>
                ))}
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border flex items-center gap-1 ${isPartner ? "bg-teal-600 text-white border-teal-600" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {isPartner ? <ShieldCheck size={11} /> : <Info size={11} />}
                  {isPartner ? t("badge.verified", langCode) : t("detail.publicInfo", langCode)}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{hospital?.name}</h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span className="flex items-start gap-1">
                  <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                  <span>{hospital?.location ? `${hospital.location}${hospital.address_detail ? `, ${hospital.address_detail}` : ""}` : "—"}</span>
                </span>
                <span className="hidden sm:block text-gray-300">·</span>
                <RatingBadge />
              </div>
              {(hospital?.external_ratings?.phone || hospital?.external_ratings?.website) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1.5">
                  {hospital.external_ratings.phone && (
                    <a href={`tel:${hospital.external_ratings.phone}`} className="flex items-center gap-1 hover:text-teal-600 transition">
                      <Phone size={14} className="text-gray-400" />
                      <span>{hospital.external_ratings.phone}</span>
                    </a>
                  )}
                  {hospital.external_ratings.website && (
                    <a href={hospital.external_ratings.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-teal-600 transition">
                      <ExternalLink size={14} className="text-gray-400" />
                      <span className="truncate max-w-[200px]">{t("detail.website", langCode)}</span>
                    </a>
                  )}
                  {hospital.external_ratings.google_maps_url && (
                    <a href={hospital.external_ratings.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-teal-600 transition">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{t("detail.googleMaps", langCode)}</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Medical Director */}
            {doctor && (doctor.name || doctor.title || doctor.image) && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{t("detail.medicalDirector", langCode)}</h2>
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-blue-100">{t("detail.boardCertified", langCode)}</span>
                </div>
                <div className="flex flex-col md:flex-row gap-5">
                  {doctor.image && (
                    <div className="shrink-0">
                      <div className="w-24 h-24 mx-auto md:mx-0 rounded-full p-0.5 border-2 border-teal-100 relative">
                        <img src={doctor.image} className="w-full h-full object-cover rounded-full" alt="Doctor" />
                        <div className="absolute bottom-0 right-0 bg-teal-600 text-white p-1 rounded-full border-2 border-white"><Check size={10} strokeWidth={4} /></div>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-base font-bold text-gray-900">{doctor.name}</h3>
                    {doctor.title && <p className="text-teal-600 text-sm mb-3">{doctor.title}</p>}
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                      {doctor.school && <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100"><GraduationCap size={13} className="text-gray-400" /> {doctor.school}</span>}
                      {doctor.years && <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100"><Award size={13} className="text-gray-400" /> {doctor.years} {t("detail.experience", langCode)}</span>}
                    </div>
                    {Array.isArray(doctor.specialties) && doctor.specialties.length > 0 && (
                      <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                        {doctor.specialties.map((spec, i) => <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded">#{spec}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* About */}
            <section className="border-t border-gray-200 pt-8 pb-2">
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t("detail.about", langCode)}</h2>
              <p className="text-gray-600 leading-relaxed">{hospital?.description}</p>
            </section>

            {/* Highlights Grid */}
            {(highlights.length > 0 || hospital?.website) && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t("detail.hospitalInformation", langCode)}</h2>
                {hospital?.website && (
                  <a
                    href={hospital.website.startsWith("http") ? hospital.website : `https://${hospital.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 hover:underline mb-4"
                  >
                    <Globe size={14} />
                    {hospital.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    <ExternalLink size={12} />
                  </a>
                )}
                {highlights.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {highlights.map((h, idx) => {
                    const Icon = h.icon;
                    const labelColor = h.highlight === 'closed' ? 'text-red-400' : h.highlight === 'weekend' ? 'text-blue-500' : 'text-gray-500';
                    return (
                      <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50">
                        <Icon size={16} className="text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-gray-900">{h.value}</p>
                          <p className={`text-[11px] font-medium ${labelColor}`}>{h.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </section>
            )}

            {/* What this hospital offers */}
            {offerings.length > 0 && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t("detail.offers", langCode)}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {offerings.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3 py-1">
                        <Icon size={18} className="text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Location Map */}
            {hospital?.latitude && hospital?.longitude && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t("detail.location", langCode)}</h2>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <div className="h-[280px]">
                    <GoogleMapComponent location={hospital?.location} hospitalName={hospital?.name} latitude={hospital?.latitude} longitude={hospital?.longitude} />
                  </div>
                </div>
                <p className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
                  <MapPin size={14} className="text-gray-400 shrink-0" />
                  {hospital.location}{hospital.address_detail ? `, ${hospital.address_detail}` : ""}
                </p>
              </section>
            )}

            {/* Signature Programs — 비활성화 (PO 요청, 코드 보존). 다시 켜려면 false 제거 */}
            {false && hospitalTreatments.length > 0 && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t("detail.signaturePrograms", langCode)}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hospitalTreatments.map((item) => {
                    const thumb = normalizeImages(item.images)?.[0] || item.logo;
                    return (
                      <div key={item.id} onClick={() => onTreatmentClick?.(item.slug || item.id)} className="flex bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:border-teal-200 transition cursor-pointer group">
                        {thumb ? (
                          <div className="w-28 h-20 bg-gray-200 shrink-0">
                            <img src={thumb} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt="img" />
                          </div>
                        ) : (
                          <div className="w-28 h-20 bg-gray-100 shrink-0 flex items-center justify-center"><ImageIcon size={20} className="text-gray-300" /></div>
                        )}
                        <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm group-hover:text-teal-600 line-clamp-1 mb-0.5">{item.title || item.name}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1 mb-1">{item.desc || item.description}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-teal-600 font-bold text-sm">{item.price || item.price_min || ""}</p>
                            <ArrowRight size={13} className="text-gray-300 group-hover:text-teal-500 transition" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Patient Reviews */}
            <section className="border-t border-gray-200 pt-8 pb-2">
              {(() => {
                const gReviews = (hospital?.external_ratings?.google_reviews || []).filter(r => r.rating >= 4 && r.text && !r._hidden);
                const allDisplayed = [...realReviews, ...gReviews];
                const avgRating = allDisplayed.length > 0
                  ? (allDisplayed.reduce((a, r) => a + (r.rating || 5), 0) / allDisplayed.length).toFixed(1)
                  : null;
                return (
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-gray-900">{t("detail.reviews", langCode)}</h2>
                    {avgRating ? (
                      <span className="bg-yellow-50 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-yellow-100">
                        {avgRating}/5.0 ({allDisplayed.length})
                      </span>
                    ) : (
                      <span className="bg-teal-50 text-teal-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-teal-100">New</span>
                    )}
                  </div>
                );
              })()}

              {loadingReviews ? (
                <div className="text-center py-8 text-gray-400 text-sm animate-pulse">Loading reviews...</div>
              ) : (
                <>
                  {realReviews.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {realReviews.slice(0, 4).map((review) => (
                        <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center text-teal-600 font-bold text-xs uppercase">{review.user_name?.[0] || "U"}</div>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{review.user_name} <span className="text-[10px] text-gray-400 uppercase">{review.country}</span></p>
                                <p className="text-xs text-gray-400">{review.created_at ? formatDate(review.created_at, "en") : ""}</p>
                              </div>
                            </div>
                            <div className="flex text-yellow-400 gap-0.5">{[...Array(review.rating || 5)].map((_, i) => <Star key={i} size={11} fill="currentColor" />)}</div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">&ldquo;{review.content}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <GoogleReviewsList reviews={hospital?.external_ratings?.google_reviews || []} langCode={langCode} />
                  {realReviews.length === 0 && !(hospital?.external_ratings?.google_reviews || []).some(r => r.rating >= 4 && r.text && !r._hidden) && (
                    <div className="text-center py-8 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                      <MessageCircle size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm font-medium">{t("review.empty", langCode)}</p>
                      <p className="text-xs text-gray-400 mt-1">{t("review.beFirst", langCode)}</p>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* FAQ — Accordion */}
            <section className="border-t border-gray-200 pt-8 pb-2">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t("detail.faq", langCode)}</h2>
              <div className="divide-y divide-gray-200">
                {faq.map((item, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setOpenFaqIdx(openFaqIdx === i ? -1 : i)}
                      className="w-full flex items-center justify-between py-4 text-left group"
                    >
                      <span className="text-sm font-semibold text-gray-900 pr-4">{item.question}</span>
                      <ChevronDown size={18} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openFaqIdx === i ? "rotate-180" : ""}`} />
                    </button>
                    {openFaqIdx === i && (
                      <p className="text-sm text-gray-600 leading-relaxed pb-4 -mt-1">{item.answer}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ─── RIGHT SIDEBAR ─── */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-4">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-base mb-1">{t("sidebar.makeInquiry", langCode)}</h3>
                <p className="text-xs text-gray-400 mb-5">{t("sidebar.directResponse", langCode)}</p>
                <button onClick={() => setView("inquiry")} className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl hover:bg-teal-700 transition flex items-center justify-center gap-2">
                  <MessageCircle size={18} /> {isPartner ? t("sidebar.contactVia", langCode) : t("sidebar.inquireAboutHospital", langCode)}
                </button>
                <div className="mt-4 bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-2"><ShieldCheck size={14} className="text-teal-600" /> {t("sidebar.whyContact", langCode)}</p>
                  <ul className="space-y-1.5 text-[11px] text-gray-600">
                    <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-teal-600 mt-0.5 shrink-0" />{t("sidebar.compareOptions", langCode)}</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-teal-600 mt-0.5 shrink-0" />{t("sidebar.coordinatorSupport", langCode)}</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-teal-600 mt-0.5 shrink-0" />{t("sidebar.consentSharing", langCode)}</li>
                  </ul>
                </div>
              </div>

              {!isPartner && (
                <div className="rounded-2xl p-4 border bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-2.5">
                    <Info size={18} className="shrink-0 mt-0.5 text-amber-600" />
                    <p className="text-xs text-gray-700 leading-snug">
                      {t("sidebar.nonPartnerNotice", langCode)}
                    </p>
                  </div>
                </div>
              )}

              <div className={`rounded-2xl p-4 border ${isPartner ? "bg-teal-50 border-teal-100" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-start gap-2.5 mb-3">
                  <Shield size={18} className={`shrink-0 mt-0.5 ${isPartner ? "text-teal-700" : "text-gray-500"}`} />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{t("sidebar.trustTitle", langCode)}</h4>
                    <p className="text-xs text-gray-600 leading-snug mt-0.5">
                      {isPartner
                        ? t("sidebar.partnerDesc", langCode)
                        : t("sidebar.nonPartnerDesc", langCode)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5 text-[11px]">
                  {[
                    { icon: <ShieldCheck size={14} />, text: t("sidebar.consentBased", langCode) },
                    { icon: <FileText size={14} />, text: t("sidebar.clearScope", langCode) },
                    { icon: <Globe size={14} />, text: t("sidebar.internationalSupport", langCode) },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <span className={isPartner ? "text-teal-600" : "text-amber-600"}>{item.icon}</span>
                      <span className="text-gray-700">{item.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-3 pt-3 border-t border-black/5 leading-snug">
                  {t("sidebar.disclaimer", langCode)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{hospital?.name}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {!hospital?.rating || hospital.rating <= 0 ? (
                <span className="text-teal-600 font-medium">New</span>
              ) : (
                <>
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-gray-700">{hospital.rating}</span>
                  {hospital.ratingCount > 0 && <span className="text-gray-400">({hospital.ratingCount})</span>}
                </>
              )}
            </div>
          </div>
          <button onClick={() => setView("inquiry")} className="bg-teal-600 text-white font-bold py-3 px-5 rounded-xl hover:bg-teal-700 transition shrink-0 flex items-center gap-2 text-sm">
            <MessageCircle size={16} /> {t("sidebar.makeInquiry", langCode)}
          </button>
        </div>
      </div>
    </div>
  );
};
