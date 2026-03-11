/**
 * Restore Korean names/data from HIRA import files
 * and switch HIRA hospitals to Korean base.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function loadHiraData() {
  const files = [
    "./output/hira-import-seoul-plastic-20260223.json",
  ];

  const allRecords = [];
  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(f, "utf8"));
      allRecords.push(...data);
    } catch (e) {
      console.log(`  Skipped ${f}: ${e.message}`);
    }
  }
  return allRecords;
}

function buildLocationKey(locationKr) {
  if (!locationKr) return null;
  return locationKr.replace(/\s+/g, "").replace(/,.*$/, "").slice(0, 30);
}

async function main() {
  console.log("=== Loading HIRA source data ===");
  const hiraRecords = loadHiraData();
  console.log(`  Loaded ${hiraRecords.length} HIRA records\n`);

  // Build lookup by Korean name
  const hiraByName = new Map();
  for (const r of hiraRecords) {
    if (r.name) hiraByName.set(r.name, r);
  }

  // Fetch all non-Immune Hospital hospitals
  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id,slug,name,description,tags,specialties,i18n,location_kr")
    .not("slug", "like", "immunehospital-%");

  console.log(`=== Processing ${hospitals?.length || 0} hospitals ===\n`);

  let updated = 0;
  let notFound = 0;

  for (const h of hospitals || []) {
    // Try to find the original HIRA record
    // Match by: i18n.en.name -> look up original Korean name
    // Or match by location_kr
    const enName = h.i18n?.en?.name || h.name;

    // Try to find by checking each HIRA record's translated name matches
    let hiraMatch = null;

    // Strategy 1: Check if location_kr matches
    if (h.location_kr) {
      const hKey = buildLocationKey(h.location_kr);
      for (const r of hiraRecords) {
        const rKey = buildLocationKey(r.location_kr);
        if (hKey && rKey && hKey === rKey) {
          hiraMatch = r;
          break;
        }
      }
    }

    // Strategy 2: Check i18n.ko.location matches
    if (!hiraMatch && h.i18n?.ko?.location) {
      const hKey = buildLocationKey(h.i18n.ko.location);
      for (const r of hiraRecords) {
        const rKey = buildLocationKey(r.location_kr);
        if (hKey && rKey && hKey === rKey) {
          hiraMatch = r;
          break;
        }
      }
    }

    if (!hiraMatch) {
      notFound++;
      continue;
    }

    // Build updated data
    const koName = hiraMatch.name;
    const koDesc = hiraMatch.description || "";
    const koTags = hiraMatch.tags || [];
    const koSpecialties = hiraMatch.specialties || [];

    const newI18n = { ...(h.i18n || {}) };

    // Ensure en has the current English data
    if (!newI18n.en) newI18n.en = {};
    if (!newI18n.en.name) newI18n.en.name = h.name;
    if (!newI18n.en.description && h.description) newI18n.en.description = h.description;
    if (!newI18n.en.tags && h.tags?.length) newI18n.en.tags = h.tags;
    if (!newI18n.en.specialties && h.specialties?.length) newI18n.en.specialties = h.specialties;

    // Set ko data
    newI18n.ko = {
      ...(newI18n.ko || {}),
      name: koName,
      description: koDesc,
      tags: koTags,
      specialties: koSpecialties,
    };

    const update = {
      name: koName,
      description: koDesc,
      tags: koTags,
      specialties: koSpecialties,
      i18n: newI18n,
    };

    const { error } = await supabase
      .from("hospitals")
      .update(update)
      .eq("id", h.id);

    if (error) {
      console.error(`  Error ${h.slug}: ${error.message}`);
    } else {
      updated++;
    }
  }

  console.log(`\n  Updated: ${updated}`);
  console.log(`  Not matched: ${notFound}`);
  console.log("\n=== Done ===");
}

main().catch(console.error);
