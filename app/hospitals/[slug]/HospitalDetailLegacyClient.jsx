"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, MapPin, Star, Shield, Info, FileText, Globe, Stethoscope, Sparkles,
  GraduationCap, Award, ShieldCheck, Check, Building2, Image as ImageIcon, ArrowRight,
  MessageCircle, HelpCircle, CheckCircle2, Activity, Calendar, Users, ClipboardCheck,
  Clock, Coffee, Languages, Phone, ExternalLink, X
} from "lucide-react";
import { supabaseClient as supabase } from "@/lib/data/supabaseClient";
import { mapHospitalRow, mapTreatmentRow } from "@/lib/mapper";
import { resolveHospitalFaq } from "@/lib/data/hospitalDefaultFaq";
import { GoogleMapComponent } from "@/components/GoogleMap";

import { t, LANG_OPTIONS } from "@/lib/i18n";
import { useLang } from "@/lib/i18n/LangContext";
import { formatDate } from "@/lib/i18n/format";
import { event, GA_EVENTS } from "@/lib/ga";

// 병원 이미지 폴더 규칙: /images/hospitals/<slug>/1~5.jpg (1=메인, 2~5=서브)
const PLACEHOLDER_IMG = "/images/hospitals/_coming-soon.svg?v=3";
// 사진 없는 칸은 한 번에 "이미지 준비 중" 플레이스홀더로 대체 (체인 없이 확실하게)
const handleImgError = (e) => {
  if (e.currentTarget.src.includes("_coming-soon")) return;
  e.currentTarget.onerror = null;
  e.currentTarget.src = PLACEHOLDER_IMG;
};

// supported_languages 표시용 — DB에 코드("ko")와 영문명("Korean")이 섞여 있어 원어 표기로 통일
const EN_LANG_NAMES = { korean: "한국어", english: "English", chinese: "中文", japanese: "日本語", russian: "Русский", kazakh: "Қазақша", mongolian: "Монгол", vietnamese: "Tiếng Việt", arabic: "العربية" };
const languageLabel = (val) => {
  const raw = String(val || "").trim();
  const byCode = LANG_OPTIONS.find((o) => o.code === raw.toLowerCase());
  return byCode?.label || EN_LANG_NAMES[raw.toLowerCase()] || raw;
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
      {translating && <p className="text-xs text-teal-700 animate-pulse mb-2">{t("status.translating", langCode) || "Translating..."}</p>}
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
                  <p className="text-xs text-gray-500">{review.time}</p>
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
  const langCode = useLang();

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
      const str = raw.trim();
      if (str.startsWith("[") && str.endsWith("]")) {
        try {
          const parsed = JSON.parse(str);
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
      // 파트너 병원(정적 자료)만 조회를 건너뛴다 — 그쪽은 DB에 행이 없다.
      // DB 병원은 서버가 넘긴 초기자료로 첫 화면을 그린 «뒤에도» 조회를 돌려야
      // 치료 목록·리뷰·언어 재매핑이 살아 있다.
      if (initialData?._i18n) return;
      if (!selectedId) return;
      // 서버가 미리 그려준 화면이 있으면 지우지 않는다(지우면 로딩 문구로 깜빡인다).
      const hasSeed = Boolean(initialData);
      if (!hasSeed) {
        setLoading(true);
        setHospital(null);
      }
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
        event(GA_EVENTS.VIEW_HOSPITAL, { hospital_slug: h?.slug || null, lang: langCode });

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
      const treatmentIds = hospitalTreatments.map((tr) => tr.id).filter(Boolean);
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
      return [1, 2, 3, 4, 5].map((n) => `/images/hospitals/${slug}/${n}.jpg?v=3`);
    }
    const thumb = hospital?.thumbnail_image;
    const gallery = normalizeImages(hospital?.gallery_images);
    const legacyImages = normalizeImages(hospital?.images);
    return [...new Set([thumb, ...gallery, ...legacyImages].filter(Boolean))];
  }, [hospital?.is_partner, hospital?.slug, selectedId, hospital?.thumbnail_image, hospital?.gallery_images, hospital?.images]);

  const galleryImages = allGalleryImages.slice(0, 5);
  const [lightboxIdx, setLightboxIdx] = useState(-1);

  // 무한 루프 캐러셀 — 트랙 = [마지막 클론, ...실제 1..len, 첫 클론].
  // slidePos: 트랙 위치(1..len = 실제, 순간적으로 0/len+1 = 클론 위 → 도착 즉시 무전환 점프로 정규화).
  // 마지막 장에서 넘기면 1장이 옆에서 이어져 들어옴(PO 요청 2026-07-14).
  const slideCount = galleryImages.length;
  const [slidePos, setSlidePos] = useState(1);
  const [noAnim, setNoAnim] = useState(false);
  const currentSlide = slideCount > 0 ? (((slidePos - 1) % slideCount) + slideCount) % slideCount : 0;
  useEffect(() => { setSlidePos(1); }, [hospital?.id]);
  const stepSlide = (dir) => setSlidePos((p) => (p < 1 || p > slideCount ? p : p + dir)); // 클론 정규화 중 연타 보호
  const nextSlide = (e) => { e?.stopPropagation(); stepSlide(1); };
  const prevSlide = (e) => { e?.stopPropagation(); stepSlide(-1); };
  const onTrackTransitionEnd = (e) => {
    if (e.target !== e.currentTarget) return; // 자식 전환 무시
    if (slidePos === slideCount + 1) { setNoAnim(true); setSlidePos(1); }
    else if (slidePos === 0) { setNoAnim(true); setSlidePos(slideCount); }
  };
  useEffect(() => {
    if (!noAnim) return;
    // 무전환 점프가 그려진 다음 프레임에 애니메이션 복구 (더블 rAF = 페인트 보장)
    let id2;
    const id1 = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setNoAnim(false)); });
    return () => { cancelAnimationFrame(id1); if (id2) cancelAnimationFrame(id2); };
  }, [noAnim]);
  // 워치독: 전환이 중간에 끊겨 transitionend가 안 울려도(재터치 등) 400ms 내 클론 정규화 — 교착 방지
  useEffect(() => {
    if (slidePos !== 0 && slidePos !== slideCount + 1) return;
    const id = setTimeout(() => { setNoAnim(true); setSlidePos(slidePos === 0 ? slideCount : 1); }, 400);
    return () => clearTimeout(id);
  }, [slidePos, slideCount]);
  // 모바일 스와이프 — 손가락을 따라 트랙이 움직이다 놓으면 스냅(슬라이드 전환).
  // 세로 스크롤과 공존: 축이 세로로 잠기면 개입 안 함(touch-action: pan-y와 세트).
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchRef = useRef({ x: 0, y: 0, axis: null });
  const onCarouselTouchStart = (e) => {
    // 클론 위에서 새 터치가 시작되면(전환 중단으로 미정규화) 즉시 실제 장으로 점프 — 화면상 동일 프레임이라 무감
    if (slidePos === slideCount + 1) { setNoAnim(true); setSlidePos(1); }
    else if (slidePos === 0) { setNoAnim(true); setSlidePos(slideCount); }
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
  };
  const onCarouselTouchMove = (e) => {
    const touch = touchRef.current;
    const dx = e.touches[0].clientX - touch.x;
    const dy = e.touches[0].clientY - touch.y;
    if (!touch.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) touch.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (touch.axis !== "x") return;
    setIsDragging(true);
    setDragX(dx); // 루프라 끝이 없음 — 고무줄 저항 불필요, 양쪽 다 이웃(클론)이 보임
  };
  const onCarouselTouchEnd = (e) => {
    const touch = touchRef.current;
    if (touch.axis === "x") {
      const dx = e.changedTouches[0].clientX - touch.x;
      if (dx < -40) stepSlide(1);
      else if (dx > 40) stepSlide(-1);
    }
    touchRef.current = { x: 0, y: 0, axis: null };
    setDragX(0);
    setIsDragging(false);
  };
  // 터치가 시스템에 의해 끊길 때(팝업·탭 전환) 트랙이 어중간하게 멈추지 않게 원위치
  const onCarouselTouchCancel = () => { touchRef.current = { x: 0, y: 0, axis: null }; setDragX(0); setIsDragging(false); };
  useEffect(() => {
    if (slideCount <= 1 || isDragging) return;
    const timer = setInterval(() => stepSlide(1), 3000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stepSlide는 안정적(함수형 setState만 사용)
  }, [slideCount, isDragging]);

  const doctor = useMemo(() => hospital?.doctorProfile || hospital?.doctor_profile || null, [hospital]);
  const isPartner = hospital?.is_partner ?? false;

  // 기본 FAQ 는 src/lib/data/hospitalDefaultFaq.js 로 뺐다 — 서버가 만드는 구조화 표식과
  // «같은 소스»를 써야 화면과 표식이 어긋나지 않는다(어긋나면 구글이 리치결과를 안 준다).
  const faq = useMemo(
    () => resolveHospitalFaq(hospital?.faq, langCode),
    [hospital?.faq, langCode]
  );

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
    hospital?.supported_languages?.forEach((l) => items.push({ icon: Languages, label: languageLabel(l) }));
    hospital?.amenities?.forEach((a) => items.push({ icon: Coffee, label: a }));
    hospital?.medical_equipment?.forEach((e) => items.push({ icon: Activity, label: e }));
    hospital?.certifications?.forEach((c) => {
      // DB 컬럼은 text[](단순 문자열), 과거 코드는 {type, issuer} 객체 가정 → 둘 다 안전 처리
      const label = typeof c === "string" ? c : [c?.type?.replace(/_/g, " "), c?.issuer].filter(Boolean).join(" — ");
      if (label) items.push({ icon: Award, label });
    });
    return items;
  }, [hospital]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500 font-bold">{t("status.loadingHospital", langCode)}</div>;
  }
  // 서버가 넘긴 자료로 이미 화면을 그렸으면, 뒤이은 조회가 실패해도 「병원 없음」으로
  // 되돌리지 않는다(보여줄 게 있는데 없다고 말하면 안 된다).
  if (!hospital) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="text-teal-700 font-extrabold text-lg mb-2">{t("status.hospitalNotFound", langCode)}</div>
        {error && isDev && <div className="text-red-500 text-xs mb-2 max-w-md">{error.message || JSON.stringify(error)}</div>}
        <button onClick={() => setView?.("list_hospital")} className="px-5 py-3 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-800 mt-4">{t("btn.backToHospitals", langCode)}</button>
      </div>
    );
  }

  const RatingBadge = () => {
    if (!hospital?.rating || hospital.rating <= 0) return <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-teal-100">{t("detail.new", langCode)}</span>;
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
          <div className="w-full aspect-[16/7] bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-500">
            <ImageIcon size={48} className="mb-2" /><p className="font-bold text-sm">{t("detail.noImages", langCode)}</p>
          </div>
        ) : galleryImages.length === 1 ? (
          <div className="w-full aspect-[16/7] relative overflow-hidden rounded-2xl bg-gray-100">
            <img src={galleryImages[0]} onError={handleImgError} className="w-full h-full object-cover" alt={hospital?.name || "Hospital"} />
          </div>
        ) : (
          <>
            <div className="md:hidden w-full aspect-[4/3] relative group overflow-hidden rounded-2xl bg-gray-100 touch-pan-y" onTouchStart={onCarouselTouchStart} onTouchMove={onCarouselTouchMove} onTouchEnd={onCarouselTouchEnd} onTouchCancel={onCarouselTouchCancel}>
              <div
                className="flex h-full"
                style={{
                  transform: `translateX(calc(${-slidePos * 100}% + ${dragX}px))`,
                  transition: isDragging || noAnim ? "none" : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                onTransitionEnd={onTrackTransitionEnd}
              >
                {[galleryImages[slideCount - 1], ...galleryImages, galleryImages[0]].map((img, index) => (
                  <div key={index} className="w-full h-full shrink-0">
                    <img src={img} onError={handleImgError} className="w-full h-full object-cover" alt={`${hospital?.name || "Hospital"} ${index}`} draggable={false} />
                  </div>
                ))}
              </div>
              <button onClick={prevSlide} aria-label="Previous image" className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition duration-200 z-20 focus:outline-none focus:ring-2 focus:ring-teal-400"><ChevronLeft size={20} /></button>
              <button onClick={nextSlide} aria-label="Next image" className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition duration-200 z-20 focus:outline-none focus:ring-2 focus:ring-teal-400"><ChevronRight size={20} /></button>
              <div className="absolute bottom-3 right-3 z-20">
                <div className="bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <ImageIcon size={10} /> {currentSlide + 1}/{galleryImages.length}
                </div>
              </div>
            </div>
            <div className="hidden md:flex flex-row gap-2 h-[420px]">
              <div role="button" tabIndex={0} aria-label="View gallery" className={`${galleryImages.length >= 2 ? "w-1/2" : "w-full"} h-full relative group cursor-pointer overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400`} onClick={() => setLightboxIdx(0)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxIdx(0); } }}>
                <img src={galleryImages[0]} onError={handleImgError} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt={hospital?.name || "Hospital"} referrerPolicy="no-referrer" />
              </div>
              {galleryImages.length >= 2 && (
                <div className="w-1/2 h-full grid grid-cols-2 grid-rows-2 gap-2">
                  {galleryImages.slice(1, 5).map((img, idx) => {
                    const isLast = idx === Math.min(galleryImages.length - 2, 3);
                    const remaining = allGalleryImages.length - 5;
                    return (
                      <div key={idx} role="button" tabIndex={0} aria-label="View gallery" className="relative overflow-hidden cursor-pointer group rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400" onClick={() => setLightboxIdx(idx + 1)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxIdx(idx + 1); } }}>
                        <img src={img} onError={handleImgError} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt={`${hospital?.name || "Hospital"} ${idx + 2}`} referrerPolicy="no-referrer" />
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
          <div className="bg-white rounded-2xl overflow-hidden shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Thumbnail strip */}
            <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b overflow-x-auto shrink-0">
              {allGalleryImages.map((img, i) => (
                <button key={i} onClick={() => setLightboxIdx(i)} className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition ${i === lightboxIdx ? 'border-teal-500 ring-1 ring-teal-300' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <img src={img} onError={handleImgError} className="w-full h-full object-cover" alt={hospital?.name || "Hospital"} referrerPolicy="no-referrer" />
                </button>
              ))}
              <button onClick={() => setLightboxIdx(-1)} aria-label="Close" className="shrink-0 ml-auto text-gray-400 hover:text-gray-700 p-1 focus:outline-none focus:ring-2 focus:ring-teal-400"><X size={18} /></button>
            </div>
            {/* Main image */}
            <div className="relative flex-1 min-h-0 bg-gray-900 flex items-center justify-center">
              <button onClick={() => setLightboxIdx((lightboxIdx - 1 + allGalleryImages.length) % allGalleryImages.length)} aria-label="Previous image" className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition duration-200 z-10 focus:outline-none focus:ring-2 focus:ring-teal-400"><ChevronLeft size={22} /></button>
              <img src={allGalleryImages[lightboxIdx]} onError={handleImgError} className="max-w-full max-h-[60vh] object-contain" alt={hospital?.name || "Hospital"} referrerPolicy="no-referrer" />
              <button onClick={() => setLightboxIdx((lightboxIdx + 1) % allGalleryImages.length)} aria-label="Next image" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition duration-200 z-10 focus:outline-none focus:ring-2 focus:ring-teal-400"><ChevronRight size={22} /></button>
            </div>
            <div className="px-4 py-2 bg-gray-50 text-center text-xs text-gray-500 border-t shrink-0">
              {lightboxIdx + 1} / {allGalleryImages.length}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => setView("list_hospital")} className="flex items-center text-sm text-gray-500 mb-6 hover:text-teal-700">
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
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border flex items-center gap-1 ${isPartner ? "bg-teal-700 text-white border-teal-600" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
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
                    <a href={`tel:${hospital.external_ratings.phone}`} className="touch-link flex items-center gap-1 hover:text-teal-700 transition">
                      <Phone size={14} className="text-gray-400" />
                      <span>{hospital.external_ratings.phone}</span>
                    </a>
                  )}
                  {hospital.external_ratings.website && (
                    <a href={hospital.external_ratings.website} target="_blank" rel="noopener noreferrer" className="touch-link flex items-center gap-1 hover:text-teal-700 transition">
                      <ExternalLink size={14} className="text-gray-400" />
                      <span className="truncate max-w-[200px]">{t("detail.website", langCode)}</span>
                    </a>
                  )}
                  {hospital.external_ratings.google_maps_url && (
                    <a href={hospital.external_ratings.google_maps_url} target="_blank" rel="noopener noreferrer" className="touch-link flex items-center gap-1 hover:text-teal-700 transition">
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
                        <div className="absolute bottom-0 right-0 bg-teal-700 text-white p-1 rounded-full border-2 border-white"><Check size={10} strokeWidth={4} /></div>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-base font-bold text-gray-900">{doctor.name}</h3>
                    {doctor.title && <p className="text-teal-700 text-sm mb-3">{doctor.title}</p>}
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
                    className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-700 hover:underline mb-4"
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
            {/* eslint-disable-next-line no-constant-binary-expression -- 의도적 기능 토글(false 로 끔) */}
            {false && hospitalTreatments.length > 0 && (
              <section className="border-t border-gray-200 pt-8 pb-2">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t("detail.signaturePrograms", langCode)}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hospitalTreatments.map((item) => {
                    const thumb = normalizeImages(item.images)?.[0] || item.logo;
                    return (
                      <div key={item.id} role="button" tabIndex={0} onClick={() => onTreatmentClick?.(item.slug || item.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTreatmentClick?.(item.slug || item.id); } }} className="flex bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:border-teal-200 transition cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-400">
                        {thumb ? (
                          <div className="w-28 h-20 bg-gray-200 shrink-0">
                            <img src={thumb} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="img" />
                          </div>
                        ) : (
                          <div className="w-28 h-20 bg-gray-100 shrink-0 flex items-center justify-center"><ImageIcon size={20} className="text-gray-300" /></div>
                        )}
                        <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm group-hover:text-teal-700 line-clamp-1 mb-0.5">{item.title || item.name}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1 mb-1">{item.desc || item.description}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-teal-700 font-bold text-sm">{item.price || item.price_min || ""}</p>
                            <ArrowRight size={13} className="text-gray-300 group-hover:text-teal-700 transition" />
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
                      <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-teal-100">{t("detail.new", langCode)}</span>
                    )}
                  </div>
                );
              })()}

              {loadingReviews ? (
                <div className="text-center py-8 text-gray-500 text-sm animate-pulse">{t("detail.checkingReviews", langCode)}</div>
              ) : (
                <>
                  {realReviews.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {realReviews.slice(0, 4).map((review) => (
                        <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs uppercase">{review.user_name?.[0] || "U"}</div>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{review.user_name} <span className="text-[10px] text-gray-500 uppercase">{review.country}</span></p>
                                <p className="text-xs text-gray-500">{review.created_at ? formatDate(review.created_at, langCode) : ""}</p>
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
                      <p className="text-xs text-gray-500 mt-1">{t("review.beFirst", langCode)}</p>
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
                <p className="text-xs text-gray-500 mb-5">{t("sidebar.directResponse", langCode)}</p>
                <button onClick={() => setView("inquiry")} className="w-full bg-teal-700 text-white font-bold py-3.5 rounded-xl hover:bg-teal-800 transition flex items-center justify-center gap-2">
                  <MessageCircle size={18} /> {isPartner ? t("sidebar.contactVia", langCode) : t("sidebar.inquireAboutHospital", langCode)}
                </button>
                <div className="mt-4 bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-2"><ShieldCheck size={14} className="text-teal-700" /> {t("sidebar.whyContact", langCode)}</p>
                  <ul className="space-y-1.5 text-[11px] text-gray-600">
                    <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-teal-700 mt-0.5 shrink-0" />{t("sidebar.compareOptions", langCode)}</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-teal-700 mt-0.5 shrink-0" />{t("sidebar.coordinatorSupport", langCode)}</li>
                    <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-teal-700 mt-0.5 shrink-0" />{t("sidebar.consentSharing", langCode)}</li>
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
                      <span className={isPartner ? "text-teal-700" : "text-amber-600"}>{item.icon}</span>
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
      <div className="fixed bottom-[var(--cookie-banner-h,0px)] left-0 right-0 z-50 lg:hidden pb-safe-area bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto px-4 py-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{hospital?.name}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {!hospital?.rating || hospital.rating <= 0 ? (
                <span className="text-teal-700 font-medium">{t("detail.new", langCode)}</span>
              ) : (
                <>
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-gray-700">{hospital.rating}</span>
                  {hospital.ratingCount > 0 && <span className="text-gray-500">({hospital.ratingCount})</span>}
                </>
              )}
            </div>
          </div>
          <button onClick={() => setView("inquiry")} className="bg-teal-700 text-white font-bold py-3 px-5 rounded-xl hover:bg-teal-800 transition shrink-0 flex items-center gap-2 text-sm">
            <MessageCircle size={16} /> {t("sidebar.makeInquiry", langCode)}
          </button>
        </div>
      </div>
    </div>
  );
};
