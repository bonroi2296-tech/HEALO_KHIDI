/**
 * Google Places Enrichment Script
 *
 * Fetches images, opening_hours, rating, phone, website for hospitals
 * using Google Places API (Nearby Search + Place Details).
 *
 * Usage:
 *   node scripts/enrich-google-places.mjs                    # enrich all selected (no thumbnail)
 *   node scripts/enrich-google-places.mjs --limit=10         # limit to 10
 *   node scripts/enrich-google-places.mjs --slug=samsung-medical-center-4  # single hospital
 *   node scripts/enrich-google-places.mjs --dry-run          # preview only
 *   node scripts/enrich-google-places.mjs --tag=상급종합      # filter by tag
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is required");
  process.exit(1);
}

const CHECKPOINT_FILE = "./output/enrich-checkpoint.json";
const DELAY_MS = 1200;

function parseArgs() {
  const args = {};
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--limit=")) args.limit = parseInt(a.split("=")[1]);
    else if (a.startsWith("--slug=")) args.slug = a.split("=")[1];
    else if (a.startsWith("--tag=")) args.tag = a.split("=")[1];
    else if (a === "--force") args.force = true;
  }
  return args;
}

function loadCheckpoint() {
  try {
    if (existsSync(CHECKPOINT_FILE)) return JSON.parse(readFileSync(CHECKPOINT_FILE, "utf8"));
  } catch {}
  return { done: [] };
}

function saveCheckpoint(cp) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Google Places API (New) calls ---

async function searchTextPlace(name, lat, lng) {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const body = {
    textQuery: name,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 500.0,
      },
    },
    languageCode: "ko",
    maxResultCount: 1,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.photos,places.currentOpeningHours,places.regularOpeningHours,places.rating,places.userRatingCount,places.reviews,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.error) {
    console.log(`\n  [API ERROR] ${data.error.code}: ${data.error.message}`);
    if (data.error.code === 403 || data.error.code === 400) {
      throw new Error(`API_BLOCKED: ${data.error.message}`);
    }
    return null;
  }

  return data.places?.[0] || null;
}

function getPhotoUrl(photoName, maxWidth = 800) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`;
}

// --- Data mapping ---

function mapOpeningHours(oh) {
  const wt = oh?.weekdayDescriptions;
  if (!wt?.length) return null;

  const result = {};
  const dayMap = {
    "월요일": "monday", "화요일": "tuesday", "수요일": "wednesday",
    "목요일": "thursday", "금요일": "friday", "토요일": "saturday", "일요일": "sunday"
  };

  for (const line of wt) {
    const [dayKo, ...timeParts] = line.split(": ");
    const time = timeParts.join(": ");
    const dayEn = dayMap[dayKo?.trim()] || dayKo?.toLowerCase();
    result[dayEn] = time || "Closed";
  }

  if (result.monday && result.monday !== "휴무일") result.mon_fri = result.monday;
  if (result.saturday) result.sat = result.saturday;

  return result;
}

function buildDbUpdate(place) {
  const update = {};

  // Photos (New API: place.photos[].name)
  if (place.photos?.length) {
    const photoUrls = place.photos.slice(0, 10).map((p) =>
      getPhotoUrl(p.name, 800)
    );
    update.thumbnail_image = photoUrls[0];
    update.gallery_images = photoUrls.slice(1);
  }

  // Opening hours (New API: regularOpeningHours)
  const oh = place.regularOpeningHours || place.currentOpeningHours;
  if (oh) {
    const mapped = mapOpeningHours(oh);
    if (mapped) update.operating_hours = mapped;
  }

  // Rating + Reviews
  if (place.rating) {
    update.external_ratings = {
      google: {
        rating: place.rating,
        count: place.userRatingCount || 0,
      },
    };
  }
  if (place.reviews?.length) {
    if (!update.external_ratings) update.external_ratings = {};
    update.external_ratings.google_reviews = place.reviews.map(r => ({
      author: r.authorAttribution?.displayName || '',
      authorPhoto: r.authorAttribution?.photoUri || '',
      rating: r.rating || 0,
      text: r.originalText?.text || r.text?.text || '',
      lang: r.originalText?.languageCode || 'ko',
      time: r.relativePublishTimeDescription || '',
      publishTime: r.publishTime || '',
    }));
  }

  // Phone & website stored in external_ratings alongside google rating
  if (place.nationalPhoneNumber || place.websiteUri) {
    if (!update.external_ratings) update.external_ratings = {};
    if (place.nationalPhoneNumber) update.external_ratings.phone = place.nationalPhoneNumber;
    if (place.internationalPhoneNumber) update.external_ratings.phone_intl = place.internationalPhoneNumber;
    if (place.websiteUri) update.external_ratings.website = place.websiteUri;
    if (place.googleMapsUri) update.external_ratings.google_maps_url = place.googleMapsUri;
  }

  return update;
}

// --- Main ---

async function main() {
  const args = parseArgs();
  const checkpoint = loadCheckpoint();

  console.log("=== Google Places Enrichment ===\n");
  if (args.dryRun) console.log("[DRY RUN MODE - no DB updates]\n");

  // Build query
  let query = supabase
    .from("hospitals")
    .select("id,slug,name,latitude,longitude,thumbnail_image,tags")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (args.slug) {
    query = query.eq("slug", args.slug);
  }
  // Otherwise fetch all hospitals with coords that haven't been enriched

  const { data: hospitals, error } = await query;
  if (error) {
    console.error("DB query failed:", error.message);
    process.exit(1);
  }

  let targets = hospitals || [];
  console.log(`DB returned ${targets.length} hospitals with coords`);
  if (targets.length > 0) {
    console.log(`First: ${targets[0].name} (${targets[0].slug}), tags: ${JSON.stringify(targets[0].tags)}`);
  }

  // Filter by tag if specified
  if (args.tag) {
    targets = targets.filter((h) => (h.tags || []).some((t) => t.includes(args.tag)));
  }

  // Skip already processed (--force to override)
  if (!args.force) {
    targets = targets.filter((h) => !checkpoint.done.includes(h.slug));
  }

  // Apply limit
  if (args.limit) targets = targets.slice(0, args.limit);

  console.log(`Targets: ${targets.length} hospitals\n`);

  let success = 0;
  let failed = 0;
  let noMatch = 0;

  for (let i = 0; i < targets.length; i++) {
    const h = targets[i];
    const progress = `[${i + 1}/${targets.length}]`;

    process.stdout.write(`${progress} ${h.name} (${h.slug})... `);

    try {
      // Single call: Text Search returns full details
      const place = await searchTextPlace(h.name, h.latitude, h.longitude);
      if (!place) {
        console.log("NOT FOUND");
        noMatch++;
        await sleep(DELAY_MS);
        continue;
      }

      // Build update from place data
      const update = buildDbUpdate(place);
      const fieldCount = Object.keys(update).length;

      if (fieldCount === 0) {
        console.log("NO DATA");
        noMatch++;
      } else if (args.dryRun) {
        console.log(`PREVIEW: ${fieldCount} fields (photos: ${(update.gallery_images?.length || 0) + (update.thumbnail_image ? 1 : 0)}, rating: ${place.rating || 'N/A'})`);
        success++;
      } else {
        const { error: updateErr } = await supabase
          .from("hospitals")
          .update(update)
          .eq("id", h.id);

        if (updateErr) {
          console.log(`DB ERROR: ${updateErr.message}`);
          failed++;
        } else {
          console.log(`OK (${fieldCount} fields, rating: ${place.rating || 'N/A'}, photos: ${(update.gallery_images?.length || 0) + (update.thumbnail_image ? 1 : 0)})`);
          success++;
          checkpoint.done.push(h.slug);
          saveCheckpoint(checkpoint);
        }
      }
    } catch (e) {
      if (e.message?.startsWith("API_BLOCKED")) {
        console.error(`\n\n[FATAL] Google Places API is blocked. Enable billing at https://console.cloud.google.com/project/_/billing/enable\n`);
        break;
      }
      console.log(`ERROR: ${e.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  No match: ${noMatch}`);
  console.log(`  Total processed: ${checkpoint.done.length}`);
}

main().catch(console.error);
