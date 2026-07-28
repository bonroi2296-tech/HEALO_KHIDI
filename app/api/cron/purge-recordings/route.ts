/**
 * healwith: 상담 녹화 보관기간 만료분 파기 (cron)
 *
 * GET /api/cron/purge-recordings
 * - 매일 1회 호출. `expires_at` 지난 녹화의 **파일을 실제로 지우고** 대장을 deleted 로 바꾼다.
 * - Authorization: Bearer {CRON_SECRET} 필수
 *
 * 왜 스위치와 무관하게 항상 도는가: 녹화 기능을 나중에 껐더라도 **이미 저장된 파일은 남는다.**
 *   파기는 «기능이 켜져 있는 동안만» 하는 일이 아니라 «보관기간이 끝나면 반드시» 하는 일이다.
 *   (녹화가 한 번도 안 켜졌으면 대상 0건으로 조용히 끝난다.)
 *
 * 실패해도 대장은 안 건드린다 — 파일이 남아 있는데 «지웠음»으로 표시하면 그게 더 위험하다.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { RECORDING_BUCKET } from "@/lib/consultation/recording";

const MAX_PER_RUN = 200; // 한 번에 너무 많이 지우다 함수 시간 초과로 반쯤 끝나는 것 방지

function verifyCronSecret(header: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const { data: rows, error } = await supabaseAdmin
      .from("consultation_recordings")
      .select("id, file_path")
      .eq("status", "stopped")
      .lt("expires_at", new Date().toISOString())
      .limit(MAX_PER_RUN);

    if (error) {
      console.error("[cron/purge-recordings] query failed:", error.message);
      return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    let purged = 0;
    let failed = 0;

    for (const row of rows || []) {
      if (row.file_path) {
        const { error: rmError } = await supabaseAdmin.storage
          .from(RECORDING_BUCKET)
          .remove([row.file_path]);
        if (rmError) {
          // 파일이 안 지워졌으면 대장도 그대로 둔다 → 다음 실행에서 다시 시도한다.
          console.error(`[cron/purge-recordings] remove failed ${row.id}:`, rmError.message);
          failed += 1;
          continue;
        }
      }
      const { error: updError } = await supabaseAdmin
        .from("consultation_recordings")
        .update({ status: "deleted", file_path: null })
        .eq("id", row.id);
      if (updError) {
        console.error(`[cron/purge-recordings] mark failed ${row.id}:`, updError.message);
        failed += 1;
        continue;
      }
      purged += 1;
    }

    console.log(`[cron/purge-recordings] purged=${purged} failed=${failed}`);
    return Response.json({ ok: true, purged, failed });
  } catch (e: any) {
    console.error("[cron/purge-recordings] Error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
