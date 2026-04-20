/**
 * Crawl Job Runner
 *
 * Orchestrates a full crawl job: auto-pagination, incremental detection,
 * closure detection, and progress tracking via Supabase.
 */

import { supabaseAdmin } from "../rag/supabaseAdmin";
import { getCrawlSource, initCrawlSources } from "./index";
import { getHiraCodesForGroups } from "./specialty-groups";
import type { CrawlHospitalRow } from "./types";

export interface CrawlJobParams {
  source_id: string;
  regions?: string[];
  specialties?: string[];
  fields?: string[];
  keyword?: string;
  mode?: "full" | "search";
}

interface JobStats {
  new: number;
  changed: number;
  unchanged: number;
  closed: number;
  errors: number;
}

const HIRA_BASE_URL = "http://apis.data.go.kr/B551182/hospInfoServicev2";
const HIRA_ROWS_PER_PAGE = 100;
const DELAY_MS = 350;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function isJobCancelled(jobId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("crawl_jobs")
    .select("status, error_message")
    .eq("id", jobId)
    .single();
  return data?.status === "failed" && data?.error_message === "USER_CANCELLED";
}

// ─── Main entry point ───────────────────────────────────

export async function runCrawlJob(jobId: string): Promise<void> {
  initCrawlSources();

  const { data: job, error: fetchErr } = await supabaseAdmin
    .from("crawl_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (fetchErr || !job) throw new Error("Job not found: " + jobId);
  if (job.status !== "pending") throw new Error("Job is not pending");

  await updateJob(jobId, {
    status: "running",
    started_at: new Date().toISOString(),
  });

  // Reset dedup set for this job
  jobSeenIds.clear();

  const params: CrawlJobParams = (job.params ?? {}) as unknown as CrawlJobParams;
  const stats: JobStats = { new: 0, changed: 0, unchanged: 0, closed: 0, errors: 0 };

  try {
    if (params.source_id === "hira") {
      await runHiraCrawl(jobId, params, stats);
    } else {
      await runGenericCrawl(jobId, params, stats);
    }

    // Closure detection
    await detectClosures(jobId, params.source_id, stats);

    await updateJob(jobId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      stats,
    });
  } catch (err: any) {
    if (err.message === "cancelled") {
      // Job was cancelled by user — status already set via API, just update stats
      await updateJob(jobId, {
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: "USER_CANCELLED",
        stats,
      });
    } else {
      await updateJob(jobId, {
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: err.message || "Unknown error",
        stats,
      });
    }
  }
}

// ─── HIRA-specific: auto-pagination across all combos ───

async function runHiraCrawl(
  jobId: string,
  params: CrawlJobParams,
  stats: JobStats,
) {
  const apiKey = process.env.HIRA_API_KEY || "";
  if (!apiKey) throw new Error("HIRA_API_KEY not set");

  const existingMap = await loadExistingHospitals("hira");

  const hasSpecificRegions = params.regions?.length && params.regions.length > 0;
  const hasSpecificSpecialties = params.specialties?.length && params.specialties.length > 0;

  if (!hasSpecificRegions && !hasSpecificSpecialties) {
    // Full crawl: no filters → just paginate ALL hospitals in one pass
    await runHiraFullCrawl(jobId, apiKey, existingMap, stats);
  } else {
    // Filtered crawl: iterate over selected combos
    const hiraCodes = hasSpecificSpecialties
      ? getHiraCodesForGroups(params.specialties!)
      : [];
    const regionKeys = hasSpecificRegions ? params.regions! : [null];

    if (hiraCodes.length === 0) {
      // Only region filter, no specialty → one pass per region
      await updateJob(jobId, { progress_total: regionKeys.length, progress_current: 0 });
      let done = 0;
      for (const regionKey of regionKeys) {
        if (done % 5 === 0 && await isJobCancelled(jobId)) throw new Error("cancelled");
        const regionCode = regionKey ? getHiraRegionCode(regionKey) : null;
        try {
          await crawlHiraCombo(jobId, apiKey, regionCode, null, existingMap, stats);
        } catch { stats.errors++; }
        done++;
        await updateJob(jobId, { progress_current: done, stats });
        await sleep(DELAY_MS);
      }
    } else {
      // Both region + specialty filters
      const totalCombos = regionKeys.length * hiraCodes.length;
      await updateJob(jobId, { progress_total: totalCombos, progress_current: 0 });
      let combosDone = 0;
      for (const regionKey of regionKeys) {
        const regionCode = regionKey ? getHiraRegionCode(regionKey) : null;
        for (const deptCode of hiraCodes) {
          if (combosDone % 10 === 0 && await isJobCancelled(jobId)) throw new Error("cancelled");
          try {
            await crawlHiraCombo(jobId, apiKey, regionCode, deptCode, existingMap, stats);
          } catch { stats.errors++; }
          combosDone++;
          if (combosDone % 5 === 0 || combosDone === totalCombos) {
            await updateJob(jobId, { progress_current: combosDone, stats });
          }
          await sleep(DELAY_MS);
        }
      }
    }
  }
}

// Full HIRA crawl: no region/specialty filter, just paginate everything
async function runHiraFullCrawl(
  jobId: string,
  apiKey: string,
  existingMap: Map<string, { id: string; data: any }>,
  stats: JobStats,
) {
  // First call to get total count
  const countUrl = new URL(`${HIRA_BASE_URL}/getHospBasisList`);
  countUrl.searchParams.set("serviceKey", apiKey);
  countUrl.searchParams.set("_type", "json");
  countUrl.searchParams.set("numOfRows", "1");
  countUrl.searchParams.set("pageNo", "1");

  const countRes = await fetch(countUrl.toString());
  if (!countRes.ok) throw new Error(`HIRA API ${countRes.status}`);
  const countJson = await countRes.json();
  const totalCount = countJson?.response?.body?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / HIRA_ROWS_PER_PAGE);

  await updateJob(jobId, { progress_total: totalPages, progress_current: 0 });

  for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
    if (pageNo % 20 === 0 && await isJobCancelled(jobId)) throw new Error("cancelled");

    const url = new URL(`${HIRA_BASE_URL}/getHospBasisList`);
    url.searchParams.set("serviceKey", apiKey);
    url.searchParams.set("_type", "json");
    url.searchParams.set("numOfRows", String(HIRA_ROWS_PER_PAGE));
    url.searchParams.set("pageNo", String(pageNo));

    try {
      const res = await fetch(url.toString());
      if (!res.ok) { stats.errors++; continue; }
      const json = await res.json();
      const items = json?.response?.body?.items?.item;
      if (!items) continue;

      const list = Array.isArray(items) ? items : [items];
      const rawRows = list.map((item: any) => ({
        source_unique_id: item.ykiho || `hira-${item.yadmNm}-${item.addr}`,
        name: item.yadmNm || "",
        data: item,
      }));

      await classifyAndInsert(jobId, "hira", rawRows, existingMap, stats);
    } catch {
      stats.errors++;
    }

    if (pageNo % 10 === 0 || pageNo === totalPages) {
      await updateJob(jobId, { progress_current: pageNo, stats });
    }
    await sleep(DELAY_MS);
  }
}

async function crawlHiraCombo(
  jobId: string,
  apiKey: string,
  regionCode: string | null,
  deptCode: string | null,
  existingMap: Map<string, { id: string; data: any }>,
  stats: JobStats,
) {
  let pageNo = 1;
  let totalPages = 1;

  while (pageNo <= totalPages) {
    const apiParams: Record<string, string | number> = {
      numOfRows: HIRA_ROWS_PER_PAGE,
      pageNo,
    };
    if (deptCode) apiParams.dgsbjtCd = deptCode;
    if (regionCode) apiParams.sidoCd = regionCode;

    const url = new URL(`${HIRA_BASE_URL}/getHospBasisList`);
    url.searchParams.set("serviceKey", apiKey);
    url.searchParams.set("_type", "json");
    for (const [k, v] of Object.entries(apiParams)) {
      url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HIRA API ${res.status}`);

    const json = await res.json();
    const body = json?.response?.body;
    if (!body) break;

    const totalCount = body.totalCount || 0;
    totalPages = Math.ceil(totalCount / HIRA_ROWS_PER_PAGE);

    const rawItems = body.items?.item;
    if (!rawItems) break;
    const list = Array.isArray(rawItems) ? rawItems : [rawItems];

    const rawRows: Array<{
      source_unique_id: string;
      name: string;
      data: Record<string, any>;
    }> = [];

    for (const item of list) {
      const ykiho = item.ykiho;
      if (!ykiho) continue;

      rawRows.push({
        source_unique_id: ykiho,
        name: (item.yadmNm || "").trim(),
        data: item,
      });
    }

    // Batch classify and insert
    await classifyAndInsert(jobId, "hira", rawRows, existingMap, stats);

    pageNo++;
    if (pageNo <= totalPages) await sleep(DELAY_MS);
  }
}

// ─── Generic crawl (Google/Kakao/Naver): use existing search() ───

async function runGenericCrawl(
  jobId: string,
  params: CrawlJobParams,
  stats: JobStats,
) {
  const source = getCrawlSource(params.source_id);
  if (!source) throw new Error("Unknown source: " + params.source_id);
  if (!source.isAvailable()) throw new Error("Source unavailable");

  await updateJob(jobId, { progress_total: 1, progress_current: 0 });

  const existingMap = await loadExistingHospitals(params.source_id);

  const result = await source.search({
    regions: params.regions,
    specialties: params.specialties,
    fields: params.fields,
    keyword: params.keyword,
    limit: 100,
  });

  const rawRows = result.items.map((item) => ({
    source_unique_id: item._meta?.ykiho || item._meta?.placeId || item._meta?.kakaoId || item._dedupeKey,
    name: item.name,
    data: itemToData(item),
  }));

  await classifyAndInsert(jobId, params.source_id, rawRows, existingMap, stats);
  await updateJob(jobId, { progress_current: 1, stats });
}

function itemToData(item: CrawlHospitalRow): Record<string, any> {
  return {
    name: item.name,
    location_kr: item.location_kr,
    latitude: item.latitude,
    longitude: item.longitude,
    phone: item.phone,
    website: item.website,
    specialties: item.specialties,
    tags: item.tags,
    doctor_count: item.doctor_count,
    description: item.description,
    ...item._meta,
  };
}

// ─── Classify items: new / changed / unchanged ──────────

// Track already-seen IDs within the same job to prevent cross-specialty duplicates
const jobSeenIds = new Set<string>();

async function classifyAndInsert(
  jobId: string,
  sourceId: string,
  rows: Array<{ source_unique_id: string; name: string; data: Record<string, any> }>,
  existingMap: Map<string, { id: string; data: any }>,
  stats: JobStats,
) {
  const insertBatch: any[] = [];

  for (const row of rows) {
    // Skip if already processed in this job (same hospital, different specialty query)
    if (jobSeenIds.has(row.source_unique_id)) {
      stats.unchanged++;
      continue;
    }
    jobSeenIds.add(row.source_unique_id);

    const existing = existingMap.get(row.source_unique_id);

    if (!existing) {
      const nameKey = `name:${row.name}`;
      const byName = existingMap.get(nameKey);

      if (byName) {
        const diff = computeDiff(byName.data, row.data);
        if (Object.keys(diff).length > 0) {
          insertBatch.push({
            job_id: jobId,
            source_id: sourceId,
            source_unique_id: row.source_unique_id,
            name: row.name,
            data: row.data,
            status: "changed",
            hospital_id: byName.id,
            change_diff: diff,
          });
          stats.changed++;
        } else {
          stats.unchanged++;
          await touchLastCrawled(byName.id);
        }
      } else {
        insertBatch.push({
          job_id: jobId,
          source_id: sourceId,
          source_unique_id: row.source_unique_id,
          name: row.name,
          data: row.data,
          status: "new",
        });
        stats.new++;
      }
    } else {
      const diff = computeDiff(existing.data, row.data);
      if (Object.keys(diff).length > 0) {
        insertBatch.push({
          job_id: jobId,
          source_id: sourceId,
          source_unique_id: row.source_unique_id,
          name: row.name,
          data: row.data,
          status: "changed",
          hospital_id: existing.id,
          change_diff: diff,
        });
        stats.changed++;
      } else {
        stats.unchanged++;
        await touchLastCrawled(existing.id);
      }
    }
  }

  // Batch insert staging rows (max 500 at a time)
  for (let i = 0; i < insertBatch.length; i += 500) {
    const chunk = insertBatch.slice(i, i + 500);
    await supabaseAdmin.from("crawl_raw_items").insert(chunk);
  }
}

function computeDiff(
  oldData: Record<string, any>,
  newData: Record<string, any>,
): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};
  const compareKeys = ["name", "addr", "telno", "hospUrl", "drTotCnt", "clCdNm"];

  for (const key of compareKeys) {
    const oldVal = oldData?.[key] ?? null;
    const newVal = newData?.[key] ?? null;
    if (String(oldVal) !== String(newVal) && newVal !== null) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }
  return diff;
}

async function touchLastCrawled(hospitalId: string) {
  await supabaseAdmin
    .from("hospitals")
    .update({ last_crawled_at: new Date().toISOString() })
    .eq("id", hospitalId);
}

// ─── Closure detection ──────────────────────────────────

async function detectClosures(
  jobId: string,
  sourceId: string,
  stats: JobStats,
) {
  // Get all hospital IDs for this source
  const { data: sourceHospitals } = await supabaseAdmin
    .from("hospitals")
    .select("id, name, source_unique_id")
    .eq("data_source", sourceId)
    .eq("is_active", true);

  if (!sourceHospitals || sourceHospitals.length === 0) return;

  // Get all source_unique_ids found in this job
  const { data: foundItems } = await supabaseAdmin
    .from("crawl_raw_items")
    .select("source_unique_id")
    .eq("job_id", jobId);

  const foundSet = new Set((foundItems || []).map((i: any) => i.source_unique_id));

  // Also add unchanged items (they weren't inserted but were seen)
  // We track unchanged via last_crawled_at, so check recently touched
  const { data: recentlyTouched } = await supabaseAdmin
    .from("hospitals")
    .select("source_unique_id")
    .eq("data_source", sourceId)
    .gte("last_crawled_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  for (const h of recentlyTouched || []) {
    if (h.source_unique_id) foundSet.add(h.source_unique_id);
  }

  const closedBatch: any[] = [];
  for (const h of sourceHospitals) {
    if (h.source_unique_id && !foundSet.has(h.source_unique_id)) {
      closedBatch.push({
        job_id: jobId,
        source_id: sourceId,
        source_unique_id: h.source_unique_id || `name:${h.name}`,
        name: h.name,
        data: {},
        status: "closed",
        hospital_id: h.id,
      });
      stats.closed++;
    }
  }

  for (let i = 0; i < closedBatch.length; i += 500) {
    const chunk = closedBatch.slice(i, i + 500);
    await supabaseAdmin.from("crawl_raw_items").insert(chunk);
  }
}

// ─── Helpers ────────────────────────────────────────────

async function loadExistingHospitals(sourceId: string) {
  const map = new Map<string, { id: string; data: any }>();

  // Load by data_source + source_unique_id
  const { data: bySource } = await supabaseAdmin
    .from("hospitals")
    .select("id, name, source_unique_id, location_kr, phone, doctor_count")
    .eq("data_source", sourceId)
    .eq("is_active", true);

  for (const h of bySource || []) {
    if (h.source_unique_id) {
      map.set(h.source_unique_id, {
        id: h.id,
        data: { name: h.name, addr: h.location_kr, telno: h.phone, drTotCnt: h.doctor_count },
      });
    }
    map.set(`name:${h.name}`, {
      id: h.id,
      data: { name: h.name, addr: h.location_kr, telno: h.phone, drTotCnt: h.doctor_count },
    });
  }

  // Also load hospitals without data_source (legacy imports) by name
  const { data: legacy } = await supabaseAdmin
    .from("hospitals")
    .select("id, name, location_kr, phone, doctor_count")
    .is("data_source", null)
    .eq("is_active", true);

  for (const h of legacy || []) {
    if (!map.has(`name:${h.name}`)) {
      map.set(`name:${h.name}`, {
        id: h.id,
        data: { name: h.name, addr: h.location_kr, telno: h.phone, drTotCnt: h.doctor_count },
      });
    }
  }

  return map;
}

async function updateJob(jobId: string, updates: Record<string, any>) {
  await supabaseAdmin.from("crawl_jobs").update(updates).eq("id", jobId);
}

function getHiraRegionCode(key: string): string | null {
  const codes: Record<string, string> = {
    gangwon: "320000", gyeonggi: "310000", gyeongnam: "380000",
    gyeongbuk: "370000", gwangju: "240000", daegu: "230000",
    daejeon: "250000", busan: "210000", seoul: "110000",
    sejong: "410000", ulsan: "260000", incheon: "220000",
    jeonnam: "360000", jeonbuk: "350000", jeju: "390000",
    chungnam: "340000", chungbuk: "330000",
  };
  return codes[key] || null;
}
