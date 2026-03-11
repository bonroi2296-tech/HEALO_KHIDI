/**
 * Google Places API로 병원 데이터 보강 (이미지, 평점, 운영시간)
 *
 * 사전 조건:
 *   .env.local에 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 설정
 *   Google Cloud Console에서 Places API 활성화
 *
 * 사용법:
 *   node scripts/enrich-google-places.cjs --input output/hira-import-...-translated-clean-20260223.json
 *   node scripts/enrich-google-places.cjs --input ... --regions seoul,busan,jeju
 *   node scripts/enrich-google-places.cjs --input ... --specialties "Plastic Surgery,Dermatology"
 *   node scripts/enrich-google-places.cjs --input ... --max 300
 *   node scripts/enrich-google-places.cjs --input ... --resume
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const cliKeyIdx = process.argv.indexOf("--maps-key");
const MAPS_KEY = (cliKeyIdx !== -1 ? process.argv[cliKeyIdx + 1] : null) || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!MAPS_KEY) {
  console.error("Google Maps API 키가 필요합니다:");
  console.error("  --maps-key <KEY>  또는  .env.local의 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  process.exit(1);
}

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const REQUEST_DELAY_MS = 250;
const MAX_PHOTOS = 3;
const MAX_RETRIES = 2;

const REGION_KEYWORDS = {
  seoul: ["Seoul", "서울"],
  busan: ["Busan", "부산"],
  jeju: ["Jeju", "제주"],
  daegu: ["Daegu", "대구"],
  incheon: ["Incheon", "인천"],
  gwangju: ["Gwangju", "광주"],
  daejeon: ["Daejeon", "대전"],
  gyeonggi: ["Gyeonggi", "경기"],
};

// ============================================================
// CLI
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { input: null, regions: null, specialties: null, max: 500, resume: false, minDoctors: 0 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) opts.input = args[++i];
    else if (args[i] === "--regions" && args[i + 1]) opts.regions = args[++i].split(",").map((s) => s.trim().toLowerCase());
    else if (args[i] === "--specialties" && args[i + 1]) opts.specialties = args[++i].split(",").map((s) => s.trim());
    else if (args[i] === "--max" && args[i + 1]) opts.max = parseInt(args[++i], 10);
    else if (args[i] === "--min-doctors" && args[i + 1]) opts.minDoctors = parseInt(args[++i], 10);
    else if (args[i] === "--resume") opts.resume = true;
  }
  if (!opts.input) {
    console.error("사용법: node scripts/enrich-google-places.cjs --input <파일경로> [--regions seoul,busan] [--specialties 'Plastic Surgery'] [--max 300] [--resume]");
    process.exit(1);
  }
  return opts;
}

// ============================================================
// Utils
// ============================================================

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let apiCalls = 0;

async function fetchJson(url) {
  apiCalls++;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ============================================================
// Hospital Filtering
// ============================================================

function filterHospitals(hospitals, opts) {
  let filtered = hospitals;

  if (opts.regions) {
    filtered = filtered.filter((h) => {
      const loc = (h.location_en || h.location_kr || "").toLowerCase();
      const tags = (h.tags || []).map((t) => t.toLowerCase());
      return opts.regions.some((region) => {
        const keywords = REGION_KEYWORDS[region] || [region];
        return keywords.some(
          (kw) => loc.includes(kw.toLowerCase()) || tags.some((t) => t.includes(kw.toLowerCase()))
        );
      });
    });
  }

  if (opts.specialties) {
    const specLower = opts.specialties.map((s) => s.toLowerCase());
    filtered = filtered.filter((h) => {
      const hSpecs = (h.specialties || []).map((s) => s.toLowerCase());
      const hTags = (h.tags || []).map((t) => t.toLowerCase());
      return specLower.some((s) => hSpecs.some((hs) => hs.includes(s)) || hTags.some((t) => t.includes(s)));
    });
  }

  if (opts.minDoctors > 0) {
    filtered = filtered.filter((h) => (h.doctor_count || 0) >= opts.minDoctors);
  }

  filtered.sort((a, b) => (b.doctor_count || 0) - (a.doctor_count || 0));

  return filtered.slice(0, opts.max);
}

// ============================================================
// Google Places API
// ============================================================

async function findPlace(name, address) {
  const query = `${name} ${address}`.trim();
  const url = `${PLACES_BASE}/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${MAPS_KEY}`;

  const data = await fetchJson(url);
  if (data.status !== "OK" || !data.candidates?.length) return null;
  return data.candidates[0];
}

async function getPlaceDetails(placeId) {
  const fields = "name,formatted_address,photos,rating,user_ratings_total,opening_hours,types,website,url";
  const url = `${PLACES_BASE}/details/json?place_id=${placeId}&fields=${fields}&language=en&key=${MAPS_KEY}`;

  const data = await fetchJson(url);
  if (data.status !== "OK" || !data.result) return null;
  return data.result;
}

async function getPhotoUrl(photoReference, maxWidth = 800) {
  const url = `${PLACES_BASE}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${MAPS_KEY}`;

  try {
    const res = await fetch(url, { redirect: "follow" });
    return res.url;
  } catch {
    return null;
  }
}

// ============================================================
// Enrichment
// ============================================================

async function enrichHospital(hospital) {
  const searchName = hospital._original_kr?.name || hospital.name;
  const searchAddr = hospital.location_kr || hospital.location_en || "";

  const place = await findPlace(searchName, searchAddr);
  if (!place) return { ...hospital, _places_status: "not_found" };

  await sleep(REQUEST_DELAY_MS);

  const details = await getPlaceDetails(place.place_id);
  if (!details) return { ...hospital, _places_status: "no_details" };

  const enriched = { ...hospital };

  if (details.photos?.length > 0) {
    const photoRefs = details.photos.slice(0, MAX_PHOTOS);
    const urls = [];
    for (const photo of photoRefs) {
      await sleep(100);
      const url = await getPhotoUrl(photo.photo_reference);
      if (url) urls.push(url);
    }
    if (urls.length > 0) {
      enriched.images = urls;
      enriched.thumbnail_image = urls[0];
      enriched.gallery_images = urls;
    }
  }

  if (details.rating) {
    enriched.external_ratings = {
      ...(enriched.external_ratings || {}),
      google: {
        rating: details.rating,
        count: details.user_ratings_total || 0,
      },
    };
  }

  if (details.opening_hours?.weekday_text) {
    const hours = parseOpeningHours(details.opening_hours.weekday_text);
    if (hours) enriched.operating_hours = hours;
  }

  const amenities = [...(enriched.amenities || [])];
  if (details.types) {
    if (details.types.includes("parking")) amenities.push("Parking");
    if (details.types.includes("wheelchair_accessible_entrance")) amenities.push("Wheelchair Accessible");
  }
  if (amenities.length > 0) {
    enriched.amenities = [...new Set(amenities)];
  }

  enriched._places_status = "enriched";
  enriched._google_place_id = place.place_id;

  return enriched;
}

function parseOpeningHours(weekdayText) {
  if (!weekdayText || weekdayText.length === 0) return null;

  const monFri = [];
  let sat = null;
  let sun = null;

  for (const line of weekdayText) {
    const lower = line.toLowerCase();
    if (lower.includes("saturday")) {
      sat = line.replace(/^saturday:\s*/i, "").trim();
    } else if (lower.includes("sunday")) {
      sun = line.replace(/^sunday:\s*/i, "").trim();
    } else {
      const time = line.replace(/^\w+:\s*/i, "").trim();
      if (!monFri.includes(time)) monFri.push(time);
    }
  }

  const result = {};
  if (monFri.length > 0) result.mon_fri = monFri[0];
  if (sat) result.sat = sat;
  if (sun) result.sun = sun;

  return Object.keys(result).length > 0 ? result : null;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  const inputPath = path.resolve(opts.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`파일을 찾을 수 없습니다: ${inputPath}`);
    process.exit(1);
  }

  console.log("=== Google Places 데이터 보강 ===\n");

  const allData = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  console.log(`입력: ${allData.length}건`);

  const targets = filterHospitals(allData, opts);
  console.log(`보강 대상: ${targets.length}건 (필터: regions=${opts.regions || "all"}, specialties=${opts.specialties || "all"}, max=${opts.max})\n`);

  if (targets.length === 0) {
    console.log("보강 대상이 없습니다. 필터 조건을 확인해주세요.");
    return;
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const checkpointPath = path.join(outputDir, `places-checkpoint-${dateStr}.json`);
  const targetNames = new Set(targets.map((h) => h.name));

  let processedSet = new Set();
  let enrichedResults = new Map();

  if (opts.resume && fs.existsSync(checkpointPath)) {
    const cp = JSON.parse(fs.readFileSync(checkpointPath, "utf-8"));
    processedSet = new Set(cp.processed || []);
    for (const item of cp.results || []) {
      enrichedResults.set(item.name, item);
    }
    console.log(`체크포인트 복구: ${processedSet.size}건 이미 처리됨\n`);
  }

  let enriched = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < targets.length; i++) {
    const h = targets[i];

    if (processedSet.has(h.name)) {
      continue;
    }

    const progress = `[${i + 1}/${targets.length}]`;
    process.stdout.write(`${progress} "${h.name}" 검색 중...`);

    try {
      const result = await enrichHospital(h);
      enrichedResults.set(h.name, result);
      processedSet.add(h.name);

      if (result._places_status === "enriched") {
        enriched++;
        const photoCount = result.images?.length || 0;
        const rating = result.external_ratings?.google?.rating || "-";
        process.stdout.write(` 사진 ${photoCount}장, 평점 ${rating}\n`);
      } else {
        notFound++;
        process.stdout.write(` 미발견\n`);
      }
    } catch (err) {
      errors++;
      processedSet.add(h.name);
      enrichedResults.set(h.name, { ...h, _places_status: "error" });
      process.stdout.write(` 오류: ${err.message.slice(0, 80)}\n`);
    }

    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(
        checkpointPath,
        JSON.stringify({
          processed: [...processedSet],
          results: [...enrichedResults.values()],
        }),
        "utf-8"
      );
    }

    await sleep(REQUEST_DELAY_MS);
  }

  fs.writeFileSync(
    checkpointPath,
    JSON.stringify({ processed: [...processedSet], results: [...enrichedResults.values()] }),
    "utf-8"
  );

  const finalData = allData.map((h) => {
    const enrichedVersion = enrichedResults.get(h.name);
    if (enrichedVersion) {
      const { _places_status, _google_place_id, _original_kr, ...clean } = enrichedVersion;
      return clean;
    }
    const { _original_kr, ...clean } = h;
    return clean;
  });

  const baseName = path.basename(opts.input, ".json");
  const outputPath = path.join(outputDir, `${baseName}-enriched-${dateStr}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2), "utf-8");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n=== 결과 ===");
  console.log(`보강 성공: ${enriched}/${targets.length}건`);
  console.log(`미발견: ${notFound}건`);
  console.log(`오류: ${errors}건`);
  console.log(`API 호출: ${apiCalls}회`);
  console.log(`소요 시간: ${elapsed}초`);
  console.log(`출력 파일: ${outputPath}`);
  console.log(`\n다음 단계: /admin/import 에서 이 JSON 파일을 업로드하세요.`);
}

main().catch((err) => {
  console.error("\n치명적 오류:", err);
  process.exit(1);
});
