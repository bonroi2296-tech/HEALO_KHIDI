import { NextRequest } from "next/server";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import { supabaseAdmin } from "../../../../../src/lib/rag/supabaseAdmin";

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "jobs") {
    const { data, error } = await supabaseAdmin
      .from("auto_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    return Response.json({ ok: true, data });
  }

  if (type === "events") {
    const { data, error } = await supabaseAdmin
      .from("auto_job_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    return Response.json({ ok: true, data });
  }

  if (type === "candidates") {
    const { data, error } = await supabaseAdmin
      .from("playbook_patterns")
      .select("id, user_intent, auto_score, auto_status, last_evaluated_at, quality_gate")
      .eq("auto_status", "candidate")
      .eq("is_active", true)
      .order("auto_score", { ascending: true })
      .limit(20);
    if (error) return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    return Response.json({ ok: true, data });
  }

  if (type === "ab_testing") {
    const { data, error } = await supabaseAdmin
      .from("playbook_patterns")
      .select("id, user_intent, auto_status, ab_bucket, traffic_split, auto_parent_id, auto_version, last_auto_action_at")
      .eq("auto_status", "ab_testing")
      .order("last_auto_action_at", { ascending: false })
      .limit(20);
    if (error) return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    return Response.json({ ok: true, data });
  }

  return Response.json({ ok: false, error: "type must be one of: jobs, events, candidates, ab_testing" }, { status: 400 });
}
