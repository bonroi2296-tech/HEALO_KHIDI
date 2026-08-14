import type { EnrichmentSource, EnrichmentResult, HospitalRow } from "../types";

const GOOGLE_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function searchTextPlace(name: string, lat: number, lng: number) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY!,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.photos",
        "places.currentOpeningHours",
        "places.regularOpeningHours",
        "places.rating",
        "places.userRatingCount",
        "places.reviews",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: name,
      locationBias: {
        circle: { center: { latitude: lat, longitude: lng }, radius: 500.0 },
      },
      languageCode: "ko",
      maxResultCount: 1,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || `API error: ${data.error.code}`);
  return data.places?.[0] || null;
}

function photoUrl(photoName: string, maxWidth = 800) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`;
}

const DAY_MAP: Record<string, string> = {
  "월요일": "monday", "화요일": "tuesday", "수요일": "wednesday",
  "목요일": "thursday", "금요일": "friday", "토요일": "saturday", "일요일": "sunday",
};

function mapOpeningHours(oh: any) {
  const wt = oh?.weekdayDescriptions;
  if (!wt?.length) return null;
  const result: Record<string, string> = {};
  for (const line of wt) {
    const [dayKo, ...timeParts] = line.split(": ");
    const time = timeParts.join(": ");
    const dayEn = DAY_MAP[dayKo?.trim()] || dayKo?.toLowerCase();
    result[dayEn] = time || "Closed";
  }
  if (result.monday && result.monday !== "휴무일") result.mon_fri = result.monday;
  if (result.saturday) result.sat = result.saturday;
  return result;
}

function buildUpdate(place: any, hospital: HospitalRow) {
  const update: Partial<HospitalRow> = {};
  const items: string[] = [];

  if (place.photos?.length) {
    const urls = place.photos.slice(0, 10).map((p: any) => photoUrl(p.name, 800));
    const existingThumb = hospital.thumbnail_image;
    const existingGallery = Array.isArray(hospital.gallery_images) ? hospital.gallery_images : [];
    const existingImages = Array.isArray(hospital.images) ? hospital.images : [];
    const allExisting = [existingThumb, ...existingGallery, ...existingImages].filter(Boolean) as string[];
    const merged = [...new Set([...allExisting, ...urls])];
    update.thumbnail_image = existingThumb || merged[0] || undefined;
    update.gallery_images = merged.filter((u) => u !== update.thumbnail_image);
    update.images = merged;
    items.push(`photos:${urls.length}`);
  }

  const oh = place.regularOpeningHours || place.currentOpeningHours;
  if (oh) {
    const mapped = mapOpeningHours(oh);
    if (mapped) { update.operating_hours = mapped; items.push("hours"); }
  }

  const ext: Record<string, any> = { ...(hospital.external_ratings || {}) };

  if (place.rating) {
    ext.google = { rating: place.rating, count: place.userRatingCount || 0 };
    items.push("rating");
  }

  if (place.reviews?.length) {
    ext.google_reviews = place.reviews.map((r: any) => ({
      author: r.authorAttribution?.displayName || "",
      authorPhoto: r.authorAttribution?.photoUri || "",
      rating: r.rating || 0,
      text: r.originalText?.text || r.text?.text || "",
      lang: r.originalText?.languageCode || "ko",
      time: r.relativePublishTimeDescription || "",
      publishTime: r.publishTime || "",
    }));
    items.push(`reviews:${place.reviews.length}`);
  }

  if (place.nationalPhoneNumber) ext.phone = place.nationalPhoneNumber;
  if (place.internationalPhoneNumber) ext.phone_intl = place.internationalPhoneNumber;
  if (place.websiteUri) ext.website = place.websiteUri;
  if (place.googleMapsUri) ext.google_maps_url = place.googleMapsUri;

  if (place.nationalPhoneNumber) items.push("phone");
  if (place.websiteUri) items.push("website");

  if (Object.keys(ext).length > 0) {
    update.external_ratings = ext;
  }

  return { update, items };
}

export const googlePlacesSource: EnrichmentSource = {
  id: "google",
  name: "Google Places",
  description: "사진, 평점, 리뷰, 운영시간, 전화번호, 웹사이트",
  icon: "MapPin",
  requiredEnvKeys: ["GOOGLE_PLACES_API_KEY"],

  isAvailable() {
    return !!GOOGLE_API_KEY;
  },

  async enrich(hospital: HospitalRow): Promise<EnrichmentResult> {
    const start = Date.now();

    if (!hospital.latitude || !hospital.longitude) {
      return {
        sourceId: "google",
        success: false,
        data: {},
        metadata: { itemsCollected: [], duration: Date.now() - start },
        error: "좌표 정보 없음",
      };
    }

    try {
      const place = await searchTextPlace(
        hospital.name,
        hospital.latitude,
        hospital.longitude,
      );

      if (!place) {
        return {
          sourceId: "google",
          success: false,
          data: {},
          metadata: { itemsCollected: [], duration: Date.now() - start },
          error: "Google에서 해당 병원을 찾을 수 없습니다",
        };
      }

      const { update, items } = buildUpdate(place, hospital);

      return {
        sourceId: "google",
        success: true,
        data: update,
        metadata: { itemsCollected: items, duration: Date.now() - start },
      };
    } catch (err: any) {
      return {
        sourceId: "google",
        success: false,
        data: {},
        metadata: { itemsCollected: [], duration: Date.now() - start },
        error: err.message,
      };
    }
  },
};
