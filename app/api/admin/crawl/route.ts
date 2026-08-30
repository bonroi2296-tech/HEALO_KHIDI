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
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import {
  initCrawlSources,
  getCrawlSource,
  getCrawlSourceManifest,
} from "@/lib/crawl";
import type { CrawlHospitalRow } from "@/lib/crawl";

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
  } catch {
    return NextResponse.json(
      { ok: false, error: "crawl_error" },
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
      const { data: slugMatch, error: slugErr } = await supabaseAdmin
        .from("hospitals")
        .select("id")
        .eq("slug", slug)
        .limit(1);

      // 중복 조회가 실패하면 "중복 없음"이 아니다 — 확인 못 한 채 넣으면 병원이 두 번 생긴다.
      // 배치라 전체를 세우지 않고 이 건만 건너뛴다(다음 실행에서 재시도됨).
      if (slugErr) {
        console.error("[admin/crawl] slug lookup error:", slugErr.message);
        results.push({ name: item.name, success: false, reason: "lookup_failed", slug });
        continue;
      }
      if (slugMatch?.length) {
        results.push({ name: item.name, success: false, reason: "duplicate_slug", slug });
        continue;
      }

      // Check duplicate by name + address
      const { data: nameMatch, error: nameErr } = await supabaseAdmin
        .from("hospitals")
        .select("id")
        .eq("name", item.name)
        .limit(1);

      if (nameErr) {
        console.error("[admin/crawl] name lookup error:", nameErr.message);
        results.push({ name: item.name, success: false, reason: "lookup_failed" });
        continue;
      }
      if (nameMatch?.length) {
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
        // 보안 핵심 규칙 ①: 응답에 DB 오류 원문(insertErr.message) 노출 금지 → 코드형만, 원문은 서버 로그로.
        console.error("[admin/crawl] insert error:", item.name, insertErr.message);
        results.push({ name: item.name, success: false, reason: "insert_failed" });
      } else {
        successCount++;
        results.push({ name: item.name, success: true, slug });
      }
    } catch (err: any) {
      console.error("[admin/crawl] unexpected error:", item.name, err?.message || err);
      results.push({ name: item.name, success: false, reason: "unexpected_error" });
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
