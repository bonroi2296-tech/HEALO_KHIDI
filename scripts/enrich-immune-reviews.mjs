/**
 * 면력한방병원 지점 — 구글 리뷰/평점만 가져오기 (이미지·영업시간은 안 건드림)
 *
 * 대학병원과 동일하게 Google Places API(New) searchText로 리뷰를 받아
 * external_ratings.google_reviews + external_ratings.google 에만 저장.
 * 낮은 평점 제외는 화면 표시 단계(rating>=4)에서 처리됨.
 *
 * 사용:
 *   node scripts/enrich-immune-reviews.mjs            # dry-run (DB 안 씀, 미리보기)
 *   node scripts/enrich-immune-reviews.mjs --write    # 실제 DB 반영
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("Google API key 없음");
  process.exit(1);
}

const WRITE = process.argv.includes("--write");
const SLUGS = [
  "immunehospital-magok",
  "immunehospital-sinchon",
  "immunehospital-gwangmyeong",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchTextPlace(query, lat, lng) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.rating,places.userRatingCount,places.reviews",
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 400.0 } },
      languageCode: "ko",
      maxResultCount: 1,
    }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`${data.error.code}: ${data.error.message}`);
  }
  return data.places?.[0] || null;
}

function mapReviews(place) {
  return (place.reviews || []).map((r) => ({
    author: r.authorAttribution?.displayName || "",
    authorPhoto: r.authorAttribution?.photoUri || "",
    rating: r.rating || 0,
    text: r.originalText?.text || r.text?.text || "",
    lang: r.originalText?.languageCode || "ko",
    time: r.relativePublishTimeDescription || "",
    publishTime: r.publishTime || "",
  }));
}

async function main() {
  console.log(`=== 면력 지점 구글리뷰 가져오기 ${WRITE ? "(실제 DB 반영)" : "(DRY-RUN)"} ===\n`);

  const { data: hospitals, error } = await supabase
    .from("hospitals")
    .select("id,slug,name,latitude,longitude,external_ratings,thumbnail_image")
    .in("slug", SLUGS);
  if (error) { console.error("DB 조회 실패:", error.message); process.exit(1); }

  for (const h of hospitals) {
    process.stdout.write(`[${h.name}] 검색... `);
    try {
      // 1차: 정식명, 매칭 안되면 "면력한방병원"으로 재시도 (위치로 구분)
      let place = await searchTextPlace(h.name, h.latitude, h.longitude);
      if (!place || !(place.reviews?.length)) {
        await sleep(1000);
        const alt = await searchTextPlace("면력한방병원", h.latitude, h.longitude);
        if (alt && (alt.reviews?.length || !place)) place = alt;
      }
      if (!place) { console.log("NOT FOUND"); continue; }

      const reviews = mapReviews(place);
      const pass = reviews.filter((r) => r.rating >= 4).length;
      console.log(
        `매칭="${place.displayName?.text}" | 평점 ${place.rating ?? "N/A"} (${place.userRatingCount ?? 0}건) | 리뷰 ${reviews.length}개 (표시될 4★+ ${pass}개)`
      );
      reviews.forEach((r, i) =>
        console.log(`   ${i + 1}. ${r.rating}★ ${r.author} — ${(r.text || "").replace(/\n/g, " ").slice(0, 50)}…`)
      );

      if (WRITE && reviews.length) {
        const er = (h.external_ratings && typeof h.external_ratings === "object") ? h.external_ratings : {};
        const merged = {
          ...er,
          google: { rating: place.rating || null, count: place.userRatingCount || 0 },
          google_reviews: reviews,
        };
        // 이미지/영업시간 등 다른 컬럼은 절대 안 건드림 — external_ratings 만 업데이트
        const { error: upErr } = await supabase
          .from("hospitals")
          .update({ external_ratings: merged })
          .eq("id", h.id);
        console.log(upErr ? `   DB 에러: ${upErr.message}` : `   ✓ DB 저장됨 (이미지 미변경)`);
      }
    } catch (e) {
      console.log(`에러: ${e.message}`);
      if (String(e.message).startsWith("403") || String(e.message).startsWith("400")) {
        console.error("\n[중단] Places API 차단/미설정 — 키에 Places API(New)+결제 활성 필요.");
        break;
      }
    }
    await sleep(1200);
  }
  console.log("\n완료.");
}

main().catch(console.error);
