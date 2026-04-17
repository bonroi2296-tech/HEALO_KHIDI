/**
 * Cron Crawl Endpoint
 *
 * GET /api/cron/crawl → triggered daily by Vercel Cron
 *
 * Reads schedule config from DB and runs only when it's time.
 * Protected by CRON_SECRET header.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { runCrawlJob } from "../../../../src/lib/crawl/job-runner";
import { initCrawlSources } from "../../../../src/lib/crawl";
import { SPECIALTY_GROUPS } from "../../../../src/lib/crawl/specialty-groups";

initCrawlSources();

function shouldRunNow(schedule: any): boolean {
  if (!schedule?.enabled) return false;

  // KST = UTC+9
  const now = new Date();
  const kstHour = (now.getUTCHours() + 9) % 24;
  const kstDay = now.getUTCDay();
  if ((now.getUTCHours() + 9) >= 24) {
    // Day rolled over in KST
  }

  const targetDay = schedule.dayOfWeek ?? 0;
  const targetHour = schedule.hour ?? 3;

  // Only run within the target hour window
  if (kstHour !== targetHour) return false;

  const lastRun = schedule.last_auto_run ? new Date(schedule.last_auto_run) : null;
  if (!lastRun) return true;

  const diffMs = now.getTime() - lastRun.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Minimum interval based on frequency
  const minDays: Record<string, number> = {
    weekly: 6,
    biweekly: 13,
    monthly: 28,
    quarterly: 85,
  };

  const minInterval = minDays[schedule.frequency] || 28;
  if (diffDays < minInterval) return false;

  // For weekly/biweekly, also check day of week
  if (schedule.frequency === "weekly" || schedule.frequency === "biweekly") {
    const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    if (kstDate.getUTCDay() !== targetDay) return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  assertSupabaseEnv();

  const { data: configRow } = await supabaseAdmin
    .from("crawl_jobs")
    .select("params")
    .eq("source_id", "__schedule__")
    .limit(1)
    .maybeSingle();

  const schedule = configRow?.params;

  if (!shouldRunNow(schedule)) {
    return NextResponse.json({
      ok: true,
      message: "Not scheduled to run yet",
      schedule,
    });
  }

  const { data: runningJobs } = await supabaseAdmin
    .from("crawl_jobs")
    .select("id")
    .eq("status", "running")
    .limit(1);

  if (runningJobs && runningJobs.length > 0) {
    return NextResponse.json({
      ok: false,
      message: "A crawl job is already running",
      running_job_id: runningJobs[0].id,
    });
  }

  const sources = schedule?.sources || ["hira"];

  const regionKeys = [
    "gangwon", "gyeonggi", "gyeongnam", "gyeongbuk", "gwangju",
    "daegu", "daejeon", "busan", "seoul", "sejong",
    "ulsan", "incheon", "jeonnam", "jeonbuk", "jeju",
    "chungnam", "chungbuk",
  ];
  const specialtyKeys = SPECIALTY_GROUPS.map((g) => g.key);

  const sourceId = sources[0] || "hira";

  const params = {
    source_id: sourceId,
    regions: regionKeys,
    specialties: specialtyKeys,
    fields: [],
    keyword: "",
    mode: "full",
  };

  const { data: job, error: insertErr } = await supabaseAdmin
    .from("crawl_jobs")
    .insert({ source_id: sourceId, params, status: "pending" })
    .select("id")
    .single();

  if (insertErr || !job) {
    console.error("[cron/crawl] insert error:", insertErr?.message);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  // Update last_auto_run
  if (configRow) {
    await supabaseAdmin
      .from("crawl_jobs")
      .update({ params: { ...schedule, last_auto_run: new Date().toISOString() } })
      .eq("source_id", "__schedule__")
      .catch(() => {});
  }

  runCrawlJob(job.id).catch((err) => {
    console.error("[Cron CrawlJob] Failed:", job.id, err.message);
  });

  return NextResponse.json({
    ok: true,
    message: "Crawl job started",
    job_id: job.id,
    source: sourceId,
  });
}
