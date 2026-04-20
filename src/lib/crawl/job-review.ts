/**
 * Crawl Job Review Actions
 *
 * Handles approving/rejecting crawl items and syncing to hospitals table.
 */

import { supabaseAdmin } from "../rag/supabaseAdmin";

export async function approveItems(itemIds: string[]): Promise<{
  approved: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let approved = 0;

  for (const itemId of itemIds) {
    const { data: item, error } = await supabaseAdmin
      .from("crawl_raw_items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (error || !item) {
      errors.push(`Item ${itemId}: not found`);
      continue;
    }

    if (item.review_action === "approved") {
      continue; // already approved
    }

    try {
      if (item.status === "new") {
        await approveNewItem(item);
      } else if (item.status === "changed") {
        await approveChangedItem(item);
      } else if (item.status === "closed") {
        await approveClosedItem(item);
      }

      await supabaseAdmin
        .from("crawl_raw_items")
        .update({ review_action: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", itemId);

      approved++;
    } catch (err: any) {
      errors.push(`Item ${itemId} (${(item as any).name || "unknown"}): ${err.message}`);
    }
  }

  return { approved, errors };
}

export async function rejectItems(itemIds: string[]): Promise<number> {
  const { count } = await supabaseAdmin
    .from("crawl_raw_items")
    .update({ review_action: "rejected", reviewed_at: new Date().toISOString() })
    .in("id", itemIds)
    .select("id");

  return count || 0;
}

export async function skipItems(itemIds: string[]): Promise<number> {
  const { count } = await supabaseAdmin
    .from("crawl_raw_items")
    .update({ review_action: "skipped", reviewed_at: new Date().toISOString() })
    .in("id", itemIds)
    .select("id");

  return count || 0;
}

// ─── Internal approve logic ─────────────────────────────

async function approveNewItem(item: any) {
  const d = item.data || {};

  const slug = generateSlug(d.yadmNm || d.name || item.name);

  // Check for duplicate slug
  const { data: existing } = await supabaseAdmin
    .from("hospitals")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  const finalSlug = existing ? slug + "-" + Math.random().toString(36).slice(2, 6) : slug;

  const hospitalData: Record<string, any> = {
    name: d.yadmNm || d.name || item.name,
    slug: finalSlug,
    location_kr: d.addr || d.location_kr || null,
    latitude: d.YPos ? Number(d.YPos) : d.latitude || null,
    longitude: d.XPos ? Number(d.XPos) : d.longitude || null,
    phone: d.telno || d.phone || null,
    website: d.hospUrl || d.website || null,
    doctor_count: d.drTotCnt ? Number(d.drTotCnt) : d.doctor_count || null,
    specialties: d.specialties || [],
    tags: d.tags || [d.clCdNm, d.dgsbjtCdNm].filter(Boolean),
    description: null,
    images: [],
    gallery_images: [],
    supported_languages: ["한국어"],
    amenities: [],
    medical_equipment: [],
    certifications: [],
    insurance_accepted: false,
    is_published: false,
    is_partner: false,
    is_active: true,
    data_source: item.source_id,
    source_unique_id: item.source_unique_id,
    last_crawled_at: new Date().toISOString(),
    establishment_date: d.estbDd ? formatDate(d.estbDd) : null,
  };

  const { error } = await supabaseAdmin.from("hospitals").insert(hospitalData);
  if (error) {
    console.error("[job-review] Insert hospital failed:", error.message, error.details, error.hint);
    throw new Error(error.message);
  }
}

async function approveChangedItem(item: any) {
  if (!item.hospital_id) throw new Error("No hospital_id for changed item");

  const d = item.data || {};
  const updates: Record<string, any> = {
    last_crawled_at: new Date().toISOString(),
  };

  const diff = item.change_diff || {};
  if (diff.addr) updates.location_kr = d.addr;
  if (diff.telno) updates.phone = d.telno;
  if (diff.hospUrl) updates.website = d.hospUrl;
  if (diff.drTotCnt) updates.doctor_count = Number(d.drTotCnt) || null;
  if (diff.yadmNm) updates.name = d.yadmNm;

  // Ensure source tracking
  updates.data_source = item.source_id;
  updates.source_unique_id = item.source_unique_id;

  const { error } = await supabaseAdmin
    .from("hospitals")
    .update(updates)
    .eq("id", item.hospital_id);

  if (error) throw new Error(error.message);
}

async function approveClosedItem(item: any) {
  if (!item.hospital_id) throw new Error("No hospital_id for closed item");

  const { error } = await supabaseAdmin
    .from("hospitals")
    .update({ is_active: false })
    .eq("id", item.hospital_id);

  if (error) throw new Error(error.message);
}

// ─── Utilities ──────────────────────────────────────────

function formatDate(yyyymmdd: string): string | null {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function generateSlug(name: string): string {
  const korToRom: Record<string, string> = {
    "강남": "gangnam", "청담": "cheongdam", "압구정": "apgujeong",
    "성형": "plastic", "피부": "dermatology", "병원": "hospital",
    "의원": "clinic", "클리닉": "clinic", "외과": "surgery", "과": "",
    "서울": "seoul", "부산": "busan", "제주": "jeju",
    "대구": "daegu", "인천": "incheon", "광주": "gwangju",
    "대전": "daejeon", "울산": "ulsan", "세종": "sejong",
    "경기": "gyeonggi", "치과": "dental", "한의원": "korean-med",
    "내과": "internal", "안과": "eye", "이비인후과": "ent",
    "정형외과": "ortho", "산부인과": "obgyn", "소아": "pedi",
  };

  let slug = name.toLowerCase();
  for (const [kor, rom] of Object.entries(korToRom)) {
    slug = slug.replace(new RegExp(kor, "g"), rom);
  }

  slug = slug
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug || slug.length < 3) {
    slug = "hospital-" + Math.random().toString(36).substring(2, 10);
  }

  return slug.substring(0, 50);
}
