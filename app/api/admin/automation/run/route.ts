import { NextRequest } from "next/server";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { supabaseAdmin } from "../../../../../src/lib/rag/supabaseAdmin";
import { runDailyEval } from "../../../../../src/lib/automation/playbookDailyEval";
import { runAutoImprove } from "../../../../../src/lib/automation/playbookAutoImprove";
import { runAbFinalize } from "../../../../../src/lib/automation/playbookAbFinalize";

const JOB_TYPES = ["daily_eval", "auto_improve", "ab_finalize"] as const;
type JobType = (typeof JOB_TYPES)[number];

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const job = searchParams.get("job") as JobType | null;

  if (!job || !JOB_TYPES.includes(job)) {
    return Response.json({ ok: false, error: `job must be one of: ${JOB_TYPES.join(", ")}` }, { status: 400 });
  }

  const { data: running } = await supabaseAdmin
    .from("auto_jobs")
    .select("id")
    .eq("job_type", job)
    .eq("status", "running")
    .limit(1);

  if (running && running.length > 0) {
    return Response.json({ ok: false, error: `Job '${job}' is already running (id: ${running[0].id})` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: jobRow, error: jobErr } = await supabaseAdmin
    .from("auto_jobs")
    .insert({ job_type: job, status: "running", started_at: now })
    .select("id")
    .single();

  if (jobErr || !jobRow) {
    console.error("[admin/automation/run] job create failed:", jobErr);
    return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  const jobId = jobRow.id;

  try {
    let stats: Record<string, any> = {};

    if (job === "daily_eval") {
      stats = await runDailyEval(jobId);
    } else if (job === "auto_improve") {
      stats = await runAutoImprove(jobId);
    } else if (job === "ab_finalize") {
      stats = await runAbFinalize(jobId);
    }

    await supabaseAdmin
      .from("auto_jobs")
      .update({ status: "done", finished_at: new Date().toISOString(), stats })
      .eq("id", jobId);

    return Response.json({ ok: true, job_id: jobId, job_type: job, stats });
  } catch (err: any) {
    await supabaseAdmin
      .from("auto_jobs")
      .update({ status: "failed", finished_at: new Date().toISOString(), error: err.message })
      .eq("id", jobId);

    console.error("[admin/automation/run] job failed:", err);
    return Response.json({ ok: false, error: "job_failed", job_id: jobId }, { status: 500 });
  }
}
