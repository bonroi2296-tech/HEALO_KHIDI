/**
 * POST /api/admin/offers-jobs/process
 * Body: { job_id?: string } | empty (process one queued job)
 * Worker: crawl → selectRepresentativePages → chunkPages → priceHints → summarizeOffersBatch → quality filter → job done
 */

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { crawlHospitalWebsite, normalizeWebsiteUrl } from "@/lib/hospitalOffers/crawlPipeline";
import { selectRepresentativePages } from "@/lib/hospitalOffers/selectRepresentativePages";
import { chunkPages, chunksToLlmText } from "@/lib/hospitalOffers/chunkPages";
import { buildPriceHintsFromPages } from "@/lib/hospitalOffers/priceHints";
import { summarizeOffersBatch } from "@/lib/hospitalOffers/summarizeOffersBatch";
import { filterOffersByQualityRules } from "@/lib/hospitalOffers/offerQualityFilter";

export const runtime = "nodejs";
export const maxDuration = 120;

async function updateProgress(jobId: string, progress: number, debug?: Record<string, unknown>) {
  // hospital_offer_jobs 스키마에 updated_at 컬럼이 없어 any 캐스트로 우회 —
  // 마이그레이션 시 updated_at 추가하거나 다른 컬럼 활용 필요.
  const payload: any = {
    progress,
    updated_at: new Date().toISOString(),
  };
  if (debug != null) payload.debug = debug;
  await supabaseAdmin.from("hospital_offer_jobs").update(payload).eq("id", jobId);
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  let jobId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    jobId = (body as { job_id?: string })?.job_id ?? null;
  } catch {
    // empty body ok
  }

  if (!jobId) {
    const { data: queued } = await supabaseAdmin
      .from("hospital_offer_jobs")
      .select("id")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    jobId = queued?.id ?? null;
  }

  if (!jobId) {
    return Response.json({ ok: true, processed: false, message: "no_queued_job" });
  }

  const { data: job, error: jobErr } = await supabaseAdmin
    .from("hospital_offer_jobs")
    .select("id, hospital_id, status")
    .eq("id", jobId)
    .single();

  if (jobErr || !job || job.status !== "queued") {
    return Response.json({ ok: true, processed: false, job_id: jobId });
  }

  await supabaseAdmin
    .from("hospital_offer_jobs")
    .update({ status: "running", progress: 5, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  const hospitalId = job.hospital_id as string;
  const { data: hospital } = await supabaseAdmin
    .from("hospitals")
    .select("id, name, website")
    .eq("id", hospitalId)
    .single();

  if (!hospital?.website) {
    await supabaseAdmin
      .from("hospital_offer_jobs")
      .update({
        status: "error",
        error: "no_website",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return Response.json({ ok: true, processed: true, job_id: jobId, status: "error" });
  }

  const website = normalizeWebsiteUrl((hospital.website || "").trim());
  if (!website) {
    await supabaseAdmin
      .from("hospital_offer_jobs")
      .update({
        status: "error",
        error: "invalid_website",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return Response.json({ ok: true, processed: true, job_id: jobId, status: "error" });
  }

  const debug: Record<string, unknown> = {};

  try {
    const crawl = await crawlHospitalWebsite(website, { usePlaywright: false });
    await updateProgress(jobId, 15, { crawl_pages: crawl.pages?.length ?? 0 });

    if (!crawl.pages?.length) {
      await supabaseAdmin
        .from("hospital_offer_jobs")
        .update({
          status: "done",
          progress: 100,
          result_offers: { offers: [] },
          debug: { selected_pages: [], chunks_count: 0, total_chars: 0, offers_count: 0 },
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return Response.json({ ok: true, processed: true, job_id: jobId, status: "done" });
    }

    const selected = selectRepresentativePages(crawl.pages, 5);
    debug.selected_pages = selected.slice(0, 5).map((s) => ({ url: s.url, score: s.score }));
    await updateProgress(jobId, 30, debug);

    const chunks = chunkPages(selected);
    const chunksText = chunksToLlmText(chunks);
    const totalChars = chunksText.length;
    debug.chunks_count = chunks.length;
    debug.total_chars = totalChars;

    const priceHints = buildPriceHintsFromPages(crawl.pages);
    await updateProgress(jobId, 50, debug);

    const summarizeResult = await summarizeOffersBatch({
      hospitalName: (hospital.name || "").trim(),
      chunksText,
      priceHints,
    });

    debug.llm_model = summarizeResult.llm_model;
    debug.llm_ms = summarizeResult.llm_ms;
    debug.llm_timeout = summarizeResult.llm_timeout ?? false;

    const filtered = filterOffersByQualityRules(summarizeResult.offers);
    debug.offers_count = filtered.kept.length;
    debug.dropped_by_rules_count = filtered.dropped_by_rules_count;
    debug.dropped_samples = filtered.dropped_samples;

    const finalOffers = filtered.kept.slice(0, 5);

    await supabaseAdmin
      .from("hospital_offer_jobs")
      .update({
        status: "done",
        progress: 100,
        result_offers: { offers: finalOffers },
        debug,
        error: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", jobId);

    return Response.json({
      ok: true,
      processed: true,
      job_id: jobId,
      status: "done",
      offers_count: finalOffers.length,
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("hospital_offer_jobs")
      .update({
        status: "error",
        error: errMsg.slice(0, 500),
        debug: { ...debug, error_message: errMsg.slice(0, 200) },
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return Response.json({ ok: true, processed: true, job_id: jobId, status: "error" });
  }
}
