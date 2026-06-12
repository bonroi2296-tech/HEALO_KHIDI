/**
 * Cron Automation Endpoint
 *
 * GET /api/cron/automation → Vercel Cron으로 6시간마다 자동 실행
 *
 * 순차 실행: daily_eval → auto_improve → ab_finalize
 * CRON_SECRET 헤더로 인증.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { runDailyEval } from "@/lib/automation/playbookDailyEval";
import { runAutoImprove } from "@/lib/automation/playbookAutoImprove";
import { runAbFinalize } from "@/lib/automation/playbookAbFinalize";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const results: Record<string, any> = {};
  const errors: string[] = [];

  // --- Step 1: daily_eval ---
  try {
    const { data: jobRow } = await supabaseAdmin
      .from("auto_jobs")
      .insert({ job_type: "daily_eval", status: "running", started_at: now })
      .select("id")
      .single();

    if (jobRow) {
      const stats = await runDailyEval(jobRow.id);
      await supabaseAdmin
        .from("auto_jobs")
        .update({ status: "done", finished_at: new Date().toISOString(), stats })
        .eq("id", jobRow.id);
      results.daily_eval = stats;
    }
  } catch (err: any) {
    console.error("[cron/automation] daily_eval failed:", err.message);
    errors.push(`daily_eval: ${err.message}`);
  }

  // --- Step 2: auto_improve ---
  try {
    const { data: jobRow } = await supabaseAdmin
      .from("auto_jobs")
      .insert({ job_type: "auto_improve", status: "running", started_at: new Date().toISOString() })
      .select("id")
      .single();

    if (jobRow) {
      const stats = await runAutoImprove(jobRow.id);
      await supabaseAdmin
        .from("auto_jobs")
        .update({ status: "done", finished_at: new Date().toISOString(), stats })
        .eq("id", jobRow.id);
      results.auto_improve = stats;
    }
  } catch (err: any) {
    console.error("[cron/automation] auto_improve failed:", err.message);
    errors.push(`auto_improve: ${err.message}`);
  }

  // --- Step 3: ab_finalize ---
  try {
    const { data: jobRow } = await supabaseAdmin
      .from("auto_jobs")
      .insert({ job_type: "ab_finalize", status: "running", started_at: new Date().toISOString() })
      .select("id")
      .single();

    if (jobRow) {
      const stats = await runAbFinalize(jobRow.id);
      await supabaseAdmin
        .from("auto_jobs")
        .update({ status: "done", finished_at: new Date().toISOString(), stats })
        .eq("id", jobRow.id);
      results.ab_finalize = stats;
    }
  } catch (err: any) {
    console.error("[cron/automation] ab_finalize failed:", err.message);
    errors.push(`ab_finalize: ${err.message}`);
  }

  const ok = errors.length === 0;
  return Response.json({ ok, results, errors: errors.length > 0 ? errors : undefined }, { status: ok ? 200 : 207 });
}
