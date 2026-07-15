/**
 * Crawl Job Items API
 *
 * GET  /api/admin/crawl/jobs/[id]/items → list items (filterable)
 * POST /api/admin/crawl/jobs/[id]/items → batch review (approve/reject/skip)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { approveItems, rejectItems, skipItems } from "@/lib/crawl/job-review";

// ─── GET: list items ────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { id: jobId } = await params;
  const url = new URL(request.url);

  const status = url.searchParams.get("status");
  const reviewed = url.searchParams.get("reviewed");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Number(url.searchParams.get("offset")) || 0;
  const search = url.searchParams.get("search");
  const region = url.searchParams.get("region");
  const type = url.searchParams.get("type");
  const specialty = url.searchParams.get("specialty");


  // For large datasets: select minimal columns, use planned count to avoid timeout
  let query = supabaseAdmin
    .from("crawl_raw_items")
    // 실컬럼은 title(name 없음) — 응답 키는 name 으로 유지하려 alias(name:title). 완성도 감사 2026-07-15.
    .select("id,name:title,data,status,source_unique_id,change_diff,review_action", { count: "planned" })
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (reviewed === "true") query = query.not("review_action", "is", null);
  if (reviewed === "false") query = query.is("review_action", null);
  if (search) query = query.ilike("title", `%${search}%`);
  if (region) query = query.filter("data->>addr", "ilike", `%${region}%`);
  if (type) query = query.filter("data->>clCdNm", "eq", type);
  if (specialty) query = query.filter("data->>dgsbjtCdNm", "ilike", `%${specialty}%`);

  const { data, count, error } = await query;

  if (error) {
    console.error("[crawl items API] query error:", error.code, error.message, error.details, error.hint);
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
  }

  // Get distinct filter values for this job (for filter dropdowns)
  let filterOptions: any = undefined;
  if (url.searchParams.get("withFilters") === "true") {
    try {
      // Sample a small set to extract distinct filter values (keep small to avoid timeout)
      const { data: sampleItems, error: sampleErr } = await supabaseAdmin
        .from("crawl_raw_items")
        .select("data")
        .eq("job_id", jobId)
        .eq("status", status || "new")
        .limit(100);

      if (!sampleErr && sampleItems) {
        const types = new Set<string>();
        const regions = new Set<string>();
        for (const item of sampleItems) {
          const d = (item as any).data || {};
          if (d.clCdNm) types.add(d.clCdNm);
          if (d.addr) {
            const addrStr = String(d.addr);
            const match = addrStr.match(/^(\S+?[시도])\s/) || addrStr.match(/^(\S+?[시군구])\s/);
            if (match) regions.add(match[1]);
          }
        }
        filterOptions = {
          types: [...types].sort(),
          regions: [...regions].sort(),
        };
      } else {
        filterOptions = { types: [], regions: [] };
      }
    } catch {
      filterOptions = { types: [], regions: [] };
    }
  }

  return NextResponse.json({
    ok: true,
    items: data || [],
    total: count || 0,
    ...(filterOptions ? { filterOptions } : {}),
  });
}

// ─── POST: batch review ─────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  await params; // consume params

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { action, item_ids } = body;

  if (!action || !Array.isArray(item_ids) || item_ids.length === 0) {
    return NextResponse.json(
      { ok: false, error: "action and item_ids[] required" },
      { status: 400 },
    );
  }

  try {
    if (action === "approve") {
      const result = await approveItems(item_ids);
      return NextResponse.json({ ok: true, ...result });
    } else if (action === "reject") {
      const count = await rejectItems(item_ids);
      return NextResponse.json({ ok: true, rejected: count });
    } else if (action === "skip") {
      const count = await skipItems(item_ids);
      return NextResponse.json({ ok: true, skipped: count });
    } else {
      return NextResponse.json({ ok: false, error: "Invalid action. Use: approve, reject, skip" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[crawl items API] review error:", err);
    return NextResponse.json({ ok: false, error: "review_failed" }, { status: 500 });
  }
}
