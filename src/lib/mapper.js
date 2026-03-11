// src/lib/mapper.js

import { formatPriceRange } from "./i18n/format";
import { localize, localizeArray, localizeLocation } from "./language";

// 1. 이미지 데이터 정규화 (무조건 유효한 URL 배열로 반환)
export const normalizeImages = (raw) => {
  if (!raw) return [];
  
  if (Array.isArray(raw)) return raw.filter(Boolean);

  if (typeof raw === "string") {
    const t = raw.trim();
    
    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {
          console.error("Image parse error:", e);
      }
    }
    
    if (t.startsWith("http")) return [t];
  }
  
  return [];
};

// 2. 병원 데이터 변환 (DB -> UI 표준, 다국어 지원)
// 표시되는 리뷰(필터된 Google 리뷰 + HEALO 리뷰) 기준으로 평점 산출
const resolveRating = (h) => {
  const ext = h.external_ratings;
  const googleReviews = Array.isArray(ext?.google_reviews) ? ext.google_reviews : [];
  const filtered = googleReviews.filter(r => r.rating >= 4 && r.text && !r._hidden);
  const healoCount = h.reviews_count || 0;
  const healoRating = h.rating || 0;

  const allRatings = [];
  if (healoCount > 0 && healoRating > 0) {
    for (let i = 0; i < healoCount; i++) allRatings.push(healoRating);
  }
  filtered.forEach(r => allRatings.push(r.rating));

  if (allRatings.length === 0) return { rating: 0, count: 0 };
  const avg = (allRatings.reduce((a, b) => a + b, 0) / allRatings.length);
  return { rating: parseFloat(avg.toFixed(1)), count: allRatings.length };
};

export const mapHospitalRow = (h, lang) => {
  if (!h) return null;
  const resolved = resolveRating(h);

  return {
    id: h.id,
    slug: h.slug ?? null,
    name: localize(h, 'name', lang),
    location: localizeLocation(h, lang),
    address_detail: h.address_detail ?? '',
    description: localize(h, 'description', lang),
    tags: localizeArray(h, 'tags', lang),
    specialties: localizeArray(h, 'specialties', lang),
    rating: resolved.rating,
    ratingCount: resolved.count,
    reviewsCount: h.reviews_count ?? 0,
    images: normalizeImages(h.images),
    thumbnail_image: h.thumbnail_image ?? null,
    gallery_images: Array.isArray(h.gallery_images) ? h.gallery_images : [],
    latitude: h.latitude ?? null,
    longitude: h.longitude ?? null,
    operating_hours: h.operating_hours ?? null,
    doctorProfile: h.doctor_profile || null,
    amenities: Array.isArray(h.amenities) ? h.amenities : [],
    supported_languages: Array.isArray(h.supported_languages) ? h.supported_languages : [],
    medical_equipment: Array.isArray(h.medical_equipment) ? h.medical_equipment : [],
    certifications: Array.isArray(h.certifications) ? h.certifications : [],
    insurance_accepted: h.insurance_accepted ?? false,
    insurance_details: h.insurance_details ?? null,
    annual_surgery_count: h.annual_surgery_count ?? null,
    establishment_date: h.establishment_date ?? null,
    doctor_count: h.doctor_count ?? null,
    external_ratings: h.external_ratings ?? null,
    is_partner: h.is_partner ?? false,
    faq: Array.isArray(h.faq) ? h.faq : [],
    i18n: h.i18n ?? {},
  };
};

// 3. 시술 데이터 변환 (DB -> UI 표준, 다국어 지원)
export const mapTreatmentRow = (t, lang) => {
  if (!t) return null;

  return {
    id: t.id,
    slug: t.slug ?? null,
    title: localize(t, 'name', lang),
    desc: localize(t, 'description', lang),
    fullDescription: t.full_description,
    hospitalId: t.hospital_id,
    price: formatPriceRange(t.price_min, t.price_max, "en"),
    tags: localizeArray(t, 'tags', lang),
    images: normalizeImages(t.images),
    benefits: Array.isArray(t.benefits) ? t.benefits : [],
    
    hospitalName: t.hospitals ? localize(t.hospitals, 'name', lang) || t.hospitals?.name || "Partner Hospital" : "Partner Hospital",
    hospitalSlug: t.hospitals?.slug || null,
    hospitalLocation: t.hospitals
      ? localizeLocation(t.hospitals, lang) || "Seoul, Korea"
      : "Seoul, Korea",
    i18n: t.i18n ?? {},
  };
};
