/**
 * Hospital Data Crawling API
 *
 * GET  /api/admin/crawl           → source manifest (소스 목록 + 지역/과목 옵션)
 * POST /api/admin/crawl           → search (외부 소스 검색)
 *   body: { source, region, specialty, keyword, limit, page }
 * PUT  /api/admin/crawl           → import selected items into DB
 *   body: { items: CrawlHospitalRow[] }
 */

export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../src/lib/auth/requireAdminAuth";
import {
  initCrawlSources,
  getCrawlSource,
  getCrawlSourceManifest,
} from "../../../../src/lib/crawl";
import type { CrawlHospitalRow } from "../../../../src/lib/crawl";

initCrawlSources();

// ─── GET: manifest ──────────────────────────────────────
export async function GET(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  return NextResponse.json({ ok: true, sources: getCrawlSourceManifest() });
}

// ─── POST: search ───────────────────────────────────────
export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { source: sourceId, regions, specialties, keyword, limit, page,
          region, specialty, fields } = body;

  if (!sourceId) {
    return NextResponse.json({ ok: false, error: "source_required" }, { status: 400 });
  }

  const source = getCrawlSource(sourceId);
  if (!source) {
    return NextResponse.json({ ok: false, error: "unknown_source" }, { status: 400 });
  }
  if (!source.isAvailable()) {
    return NextResponse.json(
      { ok: false, error: "source_unavailable", detail: `Missing: ${source.requiredEnvKeys.join(", ")}` },
      { status: 400 },
    );
  }

  const resolvedRegions = Array.isArray(regions) ? regions : region ? [region] : undefined;
  const resolvedSpecialties = Array.isArray(specialties) ? specialties : specialty ? [specialty] : undefined;

  try {
    const result = await source.search({
      regions: resolvedRegions,
      specialties: resolvedSpecialties,
      keyword, limit, page,
      fields: Array.isArray(fields) ? fields : undefined,
    });

    // Deduplicate against existing DB entries
    if (result.items.length > 0) {
      const names = result.items.map((i) => i.name);
      const { data: existing } = await supabaseAdmin
        .from("hospitals")
        .select("name, location_kr, slug")
        .in("name", names);

      const existingSet = new Set(
        (existing || []).map((e: any) => `${e.name}::${(e.location_kr || "").slice(0, 20)}`)
      );

      for (const item of result.items) {
        const key = `${item.name}::${(item.location_kr || "").slice(0, 20)}`;
        (item as any)._existsInDB = existingSet.has(key);
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "crawl_error", detail: err.message },
      { status: 502 },
    );
  }
}

// ─── PUT: import selected items ─────────────────────────
export async function PUT(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const items: CrawlHospitalRow[] = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "no_items" }, { status: 400 });
  }

  const results: any[] = [];
  let successCount = 0;

  for (const item of items) {
    try {
      const slug = generateSlug(item.name);

      // Check duplicate by slug
      const { data: existing } = await supabaseAdmin
        .from("hospitals")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        results.push({ name: item.name, success: false, reason: "duplicate_slug", slug });
        continue;
      }

      // Check duplicate by name + address
      const { data: nameMatch } = await supabaseAdmin
        .from("hospitals")
        .select("id")
        .eq("name", item.name)
        .maybeSingle();

      if (nameMatch) {
        results.push({ name: item.name, success: false, reason: "duplicate_name" });
        continue;
      }

      const hospitalData: any = {
        name: item.name,
        slug,
        location_kr: item.location_kr,
        location_en: item.location_en,
        description: item.description,
        latitude: item.latitude,
        longitude: item.longitude,
        tags: item.tags || [],
        specialties: item.specialties || [],
        doctor_count: item.doctor_count,
        images: [],
        supported_languages: ["한국어"],
        amenities: [],
        medical_equipment: [],
        certifications: [],
        insurance_accepted: false,
        is_published: false,
        is_partner: false,
      };

      if (item.phone) {
        hospitalData.description = `${hospitalData.description || ""} | Tel: ${item.phone}`.replace(/^\s*\|\s*/, "");
      }
      if (item.website) {
        hospitalData.description = `${hospitalData.description || ""} | ${item.website}`.replace(/^\s*\|\s*/, "");
      }

      const { error: insertErr } = await supabaseAdmin.from("hospitals").insert(hospitalData);

      if (insertErr) {
        results.push({ name: item.name, success: false, reason: insertErr.message });
      } else {
        successCount++;
        results.push({ name: item.name, success: true, slug });
      }
    } catch (err: any) {
      results.push({ name: item.name, success: false, reason: err.message });
    }
  }

  return NextResponse.json({
    ok: true,
    imported: successCount,
    failed: items.length - successCount,
    total: items.length,
    results,
  });
}

function generateSlug(name: string): string {
  const korToRom: Record<string, string> = {
    "강남": "gangnam", "청담": "cheongdam", "압구정": "apgujeong",
    "성형": "plastic", "피부": "dermatology", "병원": "hospital",
    "의원": "clinic", "클리닉": "clinic", "외과": "surgery", "과": "",
    "서울": "seoul", "부산": "busan", "제주": "jeju",
    "면역": "immune", "한방": "hanbang",
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
