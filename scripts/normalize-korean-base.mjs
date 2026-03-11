/**
 * Normalize all hospital/treatment data to Korean base:
 * 1. Delete the old duplicate "immune-hospital"
 * 2. Swap name column with i18n.ko.name for HIRA hospitals
 *    (move current English name to i18n.en.name, set Korean as main name)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 1. Delete old duplicate "immune-hospital"
  console.log("=== Step 1: Delete old duplicate ===");
  const { data: oldHospital } = await supabase
    .from("hospitals")
    .select("id,name")
    .eq("slug", "immune-hospital")
    .maybeSingle();

  if (oldHospital) {
    // Delete linked treatments first
    const { data: linkedTreatments } = await supabase
      .from("treatments")
      .select("id")
      .eq("hospital_id", oldHospital.id);

    if (linkedTreatments?.length) {
      await supabase
        .from("treatments")
        .delete()
        .eq("hospital_id", oldHospital.id);
      console.log(`  Deleted ${linkedTreatments.length} linked treatments`);
    }

    await supabase.from("hospitals").delete().eq("id", oldHospital.id);
    console.log(`  Deleted: ${oldHospital.name} (${oldHospital.id})`);
  } else {
    console.log("  Not found, skipping");
  }

  // 2. Swap name/description for all hospitals with English base
  console.log("\n=== Step 2: Swap hospitals to Korean base ===");
  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id,slug,name,description,tags,specialties,i18n")
    .not("slug", "like", "immunehospital-%"); // skip already-fixed ones

  let updatedCount = 0;
  let skippedCount = 0;

  for (const h of hospitals || []) {
    const koName = h.i18n?.ko?.name;
    const koDesc = h.i18n?.ko?.description;

    if (!koName) {
      skippedCount++;
      continue;
    }

    // Current English name goes into i18n.en (if not already there)
    const newI18n = { ...(h.i18n || {}) };

    if (!newI18n.en) newI18n.en = {};
    if (!newI18n.en.name) newI18n.en.name = h.name;
    if (!newI18n.en.description && h.description) newI18n.en.description = h.description;
    if (!newI18n.en.tags && h.tags?.length) newI18n.en.tags = h.tags;
    if (!newI18n.en.specialties && h.specialties?.length) newI18n.en.specialties = h.specialties;

    const update = {
      name: koName,
      i18n: newI18n,
    };

    if (koDesc) update.description = koDesc;

    const koTags = h.i18n?.ko?.tags;
    if (Array.isArray(koTags) && koTags.length > 0) update.tags = koTags;

    const koSpecialties = h.i18n?.ko?.specialties;
    if (Array.isArray(koSpecialties) && koSpecialties.length > 0) update.specialties = koSpecialties;

    const { error } = await supabase
      .from("hospitals")
      .update(update)
      .eq("id", h.id);

    if (error) {
      console.error(`  Error ${h.slug}: ${error.message}`);
    } else {
      updatedCount++;
    }
  }

  console.log(`  Updated: ${updatedCount}, Skipped (no ko): ${skippedCount}`);

  // 3. Swap treatments to Korean base
  console.log("\n=== Step 3: Swap treatments to Korean base ===");
  const { data: treatments } = await supabase
    .from("treatments")
    .select("id,slug,name,description,tags,i18n");

  let tUpdated = 0;
  let tSkipped = 0;

  for (const t of treatments || []) {
    // Skip already-Korean-based ones (면력한방병원 treatments)
    if (/[\uAC00-\uD7AF]/.test(t.name || "")) {
      tSkipped++;
      continue;
    }

    const koName = t.i18n?.ko?.name;
    if (!koName) {
      tSkipped++;
      continue;
    }

    const newI18n = { ...(t.i18n || {}) };
    if (!newI18n.en) newI18n.en = {};
    if (!newI18n.en.name) newI18n.en.name = t.name;
    if (!newI18n.en.description && t.description) newI18n.en.description = t.description;
    if (!newI18n.en.tags && t.tags?.length) newI18n.en.tags = t.tags;

    const update = {
      name: koName,
      i18n: newI18n,
    };

    const koDesc = t.i18n?.ko?.description;
    if (koDesc) update.description = koDesc;

    const koTags = t.i18n?.ko?.tags;
    if (Array.isArray(koTags) && koTags.length > 0) update.tags = koTags;

    const { error } = await supabase
      .from("treatments")
      .update(update)
      .eq("id", t.id);

    if (error) {
      console.error(`  Error ${t.slug}: ${error.message}`);
    } else {
      tUpdated++;
    }
  }

  console.log(`  Updated: ${tUpdated}, Skipped: ${tSkipped}`);

  console.log("\n=== Done ===");
}

main().catch(console.error);
