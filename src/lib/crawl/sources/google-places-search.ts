import type { CrawlSource, CrawlSearchParams, CrawlResult, CrawlHospitalRow, FieldMeta } from "../types";
import { SPECIALTY_GROUPS, getSearchKeywordsForGroups } from "../specialty-groups";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// 17개 시도 중심 좌표 — 가나다순
const REGIONS: Record<string, { label: string; lat: number; lng: number }> = {
  gangwon:   { label: "강원", lat: 37.8228, lng: 128.1555 },
  gyeonggi:  { label: "경기", lat: 37.2750, lng: 127.0094 },
  gyeongnam: { label: "경남", lat: 35.2380, lng: 128.6924 },
  gyeongbuk: { label: "경북", lat: 36.5760, lng: 128.5056 },
  gwangju:   { label: "광주", lat: 35.1595, lng: 126.8526 },
  daegu:     { label: "대구", lat: 35.8714, lng: 128.6014 },
  daejeon:   { label: "대전", lat: 36.3504, lng: 127.3845 },
  busan:     { label: "부산", lat: 35.1796, lng: 129.0756 },
  seoul:     { label: "서울", lat: 37.5665, lng: 126.9780 },
  sejong:    { label: "세종", lat: 36.4800, lng: 127.2590 },
  ulsan:     { label: "울산", lat: 35.5384, lng: 129.3114 },
  incheon:   { label: "인천", lat: 37.4563, lng: 126.7052 },
  jeonnam:   { label: "전남", lat: 34.8161, lng: 126.4629 },
  jeonbuk:   { label: "전북", lat: 35.8203, lng: 127.1089 },
  jeju:      { label: "제주", lat: 33.4996, lng: 126.5312 },
  chungnam:  { label: "충남", lat: 36.6588, lng: 126.6728 },
  chungbuk:  { label: "충북", lat: 36.6357, lng: 127.4913 },
};

// 진료과목은 공통 그룹 사용

const FIELDS: FieldMeta[] = [
  { key: "name",         label: "병원명",       description: "displayName — Google 등록 업체명",            category: "basic",    defaultOn: true },
  { key: "location_kr",  label: "주소",         description: "formattedAddress — 전체 주소",                category: "location", defaultOn: true },
  { key: "shortAddr",    label: "짧은 주소",    description: "shortFormattedAddress — 축약 주소",           category: "location", defaultOn: false },
  { key: "latitude",     label: "위도",         description: "location.latitude",                           category: "location", defaultOn: true },
  { key: "longitude",    label: "경도",         description: "location.longitude",                          category: "location", defaultOn: true },
  { key: "phone",        label: "전화번호",     description: "internationalPhoneNumber / nationalPhoneNumber",category: "contact", defaultOn: true },
  { key: "website",      label: "웹사이트",     description: "websiteUri — 공식 웹사이트 URL",              category: "contact",  defaultOn: true },
  { key: "googleMapsUri",label: "구글맵 링크",  description: "googleMapsUri — Google Maps 상세 페이지",     category: "contact",  defaultOn: true },
  { key: "rating",       label: "평점",         description: "rating — Google 평점 (1.0~5.0)",              category: "rating",   defaultOn: true },
  { key: "reviewCount",  label: "리뷰 수",      description: "userRatingCount — 총 Google 리뷰 수",        category: "rating",   defaultOn: true },
  { key: "openingHours", label: "영업시간",     description: "regularOpeningHours — 요일별 운영시간",       category: "medical",  defaultOn: false },
  { key: "bizStatus",    label: "영업 상태",    description: "businessStatus — OPERATIONAL/CLOSED 등",      category: "extra",    defaultOn: false },
  { key: "photoCount",   label: "사진 수",      description: "photos — 등록된 사진 개수",                   category: "extra",    defaultOn: false },
  { key: "editSummary",  label: "편집자 요약",  description: "editorialSummary — Google 편집자가 작성한 요약",category: "extra",   defaultOn: false },
  { key: "placeId",      label: "Place ID",     description: "id — Google Place 고유 ID",                   category: "extra",    defaultOn: false },
  { key: "types",        label: "장소 유형",    description: "types — hospital, doctor, dentist 등",        category: "extra",    defaultOn: false },
];

const BASE_FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress", "places.shortFormattedAddress",
  "places.location", "places.internationalPhoneNumber", "places.nationalPhoneNumber",
  "places.websiteUri", "places.googleMapsUri", "places.rating", "places.userRatingCount",
  "places.regularOpeningHours", "places.businessStatus", "places.types",
  "places.photos", "places.editorialSummary",
];

function mapPlace(place: any, fields: Set<string>): CrawlHospitalRow {
  const name = place.displayName?.text || "";
  const addr = place.formattedAddress || "";
  const phone = place.internationalPhoneNumber || place.nationalPhoneNumber || null;
  const website = place.websiteUri || null;
  const rating = place.rating || null;
  const reviewCount = place.userRatingCount || 0;

  const meta: Record<string, any> = {};
  if (fields.has("placeId"))      meta.placeId = place.id;
  if (fields.has("rating"))       meta.rating = rating;
  if (fields.has("reviewCount"))  meta.reviewCount = reviewCount;
  if (fields.has("bizStatus"))    meta.businessStatus = place.businessStatus;
  if (fields.has("types"))        meta.types = place.types;
  if (fields.has("googleMapsUri"))meta.googleMapsUri = place.googleMapsUri;
  if (fields.has("photoCount"))   meta.photoCount = place.photos?.length || 0;
  if (fields.has("editSummary"))  meta.editorialSummary = place.editorialSummary?.text || null;
  if (fields.has("shortAddr"))    meta.shortAddress = place.shortFormattedAddress || null;
  if (fields.has("openingHours")) {
    const oh = place.regularOpeningHours;
    meta.openingHours = oh?.weekdayDescriptions || null;
    meta.openNow = oh?.openNow ?? null;
  }

  return {
    name,
    location_kr: fields.has("location_kr") ? addr : null,
    location_en: addr,
    description: [addr, phone ? `Tel: ${phone}` : null, rating ? `Rating: ${rating} (${reviewCount})` : null].filter(Boolean).join(" | "),
    latitude: fields.has("latitude") ? (place.location?.latitude || null) : null,
    longitude: fields.has("longitude") ? (place.location?.longitude || null) : null,
    tags: ["hospital"],
    specialties: [],
    doctor_count: null,
    phone: fields.has("phone") ? phone : null,
    website: fields.has("website") ? website : null,
    _sourceId: "google_places",
    _dedupeKey: `google:${place.id || `${name}:${addr}`}`,
    _meta: meta,
  };
}

export const googlePlacesSearchSource: CrawlSource = {
  id: "google_places",
  name: "Google Places",
  description: "Google Maps 검색 — 주소, 전화, 평점, 리뷰수, 영업시간, 웹사이트, 구글맵링크",
  icon: "Globe",
  regions: Object.entries(REGIONS).map(([key, v]) => ({ key, label: v.label })),
  specialties: SPECIALTY_GROUPS.map((g) => ({ key: g.key, label: g.label })),
  fields: FIELDS,
  requiredEnvKeys: ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"],

  isAvailable() { return !!API_KEY; },

  async search(params: CrawlSearchParams): Promise<CrawlResult> {
    const regionKeys = params.regions?.length ? params.regions : ["seoul"];
    const groupKeys = params.specialties?.length ? params.specialties : ["plastic"];
    const searchKeywords = getSearchKeywordsForGroups(groupKeys);
    const keyword = params.keyword || "";
    const limit = Math.min(params.limit || 20, 20);
    const selectedFields = new Set(
      params.fields?.length ? params.fields : FIELDS.filter((f) => f.defaultOn).map((f) => f.key)
    );

    const dedupeMap = new Map<string, CrawlHospitalRow>();

    for (const rKey of regionKeys) {
      const region = REGIONS[rKey] || REGIONS.seoul;
      for (const specLabel of searchKeywords) {
        const textQuery = [keyword, specLabel, region.label].filter(Boolean).join(" ");

        try {
          const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": API_KEY,
              "X-Goog-FieldMask": BASE_FIELD_MASK.join(","),
            },
            body: JSON.stringify({
              textQuery,
              maxResultCount: limit,
              languageCode: "ko",
              locationBias: { circle: { center: { latitude: region.lat, longitude: region.lng }, radius: 5000 } },
            }),
          });
          if (!res.ok) continue;
          const data = await res.json();
          for (const place of data.places || []) {
            const mapped = mapPlace(place, selectedFields);
            if (!dedupeMap.has(mapped._dedupeKey)) dedupeMap.set(mapped._dedupeKey, mapped);
          }
        } catch {}
      }
    }

    const items = Array.from(dedupeMap.values());
    return { sourceId: "google_places", total: items.length, items, hasMore: false };
  },
};
