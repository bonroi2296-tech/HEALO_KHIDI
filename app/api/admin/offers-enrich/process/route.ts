/**
 * POST /api/admin/offers-enrich/process
 * Body: { job_id: string } | empty (process one queued job)
 * Worker: crawl + evidence + LLM batch → job.result, status done/error
 */

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { crawlHospitalWebsite, normalizeWebsiteUrl } from "../../../../../src/lib/hospitalOffers/crawlPipeline";
import { programCandidateRanking } from "../../../../../src/lib/hospitalOffers/programCandidateRanking";
import { extractRepresentativeCandidates } from "../../../../../src/lib/hospitalOffers/representativeCandidates";
import { filterCandidatesByMedicalProcedure } from "../../../../../src/lib/hospitalOffers/isMedicalProcedure";
import { buildPriceIndexFromTables, matchPrice } from "../../../../../src/lib/hospitalOffers/priceIndex";
import { collectEvidenceChunks } from "../../../../../src/lib/hospitalOffers/evidenceCollector";
import { buildOffersFromEvidenceBatch } from "../../../../../src/lib/hospitalOffers/evidenceBatchSummarizer";
export const runtime = "nodejs";
export const maxDuration = 120;

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
      .from("hospital_offer_enrich_jobs")
      .select("id")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    jobId = queued?.id ?? null;
  }

  if (!jobId) {
    return Response.json({ ok: true, processed: false, message: "no_queued_job" });
  }

  const { data: job, error: jobErr } = await supabaseAdmin
    .from("hospital_offer_enrich_jobs")
    .select("id, hospital_id, status, payload")
    .eq("id", jobId)
    .single();

  if (jobErr || !job || job.status !== "queued") {
    return Response.json({ ok: true, processed: false, job_id: jobId });
  }

  await supabaseAdmin
    .from("hospital_offer_enrich_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  const hospitalId = job.hospital_id as string;
  const { data: hospital } = await supabaseAdmin
    .from("hospitals")
    .select("id, name, website")
    .eq("id", hospitalId)
    .single();

  if (!hospital?.website) {
    await supabaseAdmin
      .from("hospital_offer_enrich_jobs")
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
      .from("hospital_offer_enrich_jobs")
      .update({
        status: "error",
        error: "invalid_website",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return Response.json({ ok: true, processed: true, job_id: jobId, status: "error" });
  }

  try {
    const crawl = await crawlHospitalWebsite(website, { usePlaywright: false });
    if (!crawl.pages?.length) {
      await supabaseAdmin
        .from("hospital_offer_enrich_jobs")
        .update({
          status: "done",
          result: { offers: [] },
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return Response.json({ ok: true, processed: true, job_id: jobId, status: "done" });
    }

    const programRankResult = programCandidateRanking(crawl.pages);
    const candidates = extractRepresentativeCandidates(programRankResult.topPages, hospital.name ?? undefined);
    const filterResult = await filterCandidatesByMedicalProcedure(candidates);
    const { kept: medicalKept } = filterResult;
    if (medicalKept.length < 2) {
      await supabaseAdmin
        .from("hospital_offer_enrich_jobs")
        .update({
          status: "done",
          result: { offers: [] },
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return Response.json({ ok: true, processed: true, job_id: jobId, status: "done" });
    }

    const priceIndex = buildPriceIndexFromTables(crawl.pages);
    const topCandidates = medicalKept.slice(0, 10);
    const candidatesWithEvidence = topCandidates.map((c) => {
      const chunks = collectEvidenceChunks(crawl.pages!, c.name, { hospitalId });
      const priceResult = matchPrice(c.name, priceIndex);
      return {
        name: c.name,
        chunks,
        price_min: priceResult.price_min ?? undefined,
        price_max: priceResult.price_max ?? undefined,
        currency: priceResult.currency ?? undefined,
        price_note: priceResult.price_note ?? undefined,
      };
    });

    const batchResult = await buildOffersFromEvidenceBatch(
      hospital.name ?? "",
      candidatesWithEvidence
    );

    await supabaseAdmin
      .from("hospital_offer_enrich_jobs")
      .update({
        status: "done",
        result: { offers: batchResult.offers },
        error: batchResult.timeout ? "llm_timeout" : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return Response.json({
      ok: true,
      processed: true,
      job_id: jobId,
      status: "done",
      offers_count: batchResult.offers.length,
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("hospital_offer_enrich_jobs")
      .update({
        status: "error",
        error: errMsg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return Response.json({ ok: true, processed: true, job_id: jobId, status: "error" });
  }
}
