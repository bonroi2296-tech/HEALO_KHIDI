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
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { RECORDING_BUCKET } from "@/lib/consultation/recording";
import { verifyCronSecret } from "@/lib/security/cronAuth";
import { isPurgeableNow, PURGE_AFTER_DAYS } from "@/lib/maintenance/testInquiryPurge";
import { purgeInquiriesDeep } from "@/lib/maintenance/purgeInquiries";
import { decryptMaybe } from "@/lib/security/encryptionV2";

const MAX_PER_RUN = 200; // 한 번에 너무 많이 지우다 함수 시간 초과로 반쯤 끝나는 것 방지

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

    // ── 기계가 만든 시험 문의 자동 청소 (2026-08-25 신설) ─────────────────
    // 왜: 야간 자동 검사가 매일 문의를 찍어낸다(실측 하루 7~32건). 한 번 치우면
    //     한 달 만에 원상복구되므로 «매일 조금씩» 치운다. 판정 규칙은 일괄 정리
    //     스크립트와 «같은 함수»(testInquiryPurge)를 본다 — 갈라지면 한쪽만 고쳐진다.
    // 안전: is_test=true + 기계 흔적 + 만든 지 30일 초과 + KEEP 목록 제외. 사람이 손으로
    //     넣은 점검 문의는 대상이 아니다(PO 결정). 실환자 문의는 애초에 조회도 안 한다.
    let testInquiriesPurged = 0;
    let purgeWarningCount = 0; // 상세는 서버 로그에만 — 응답엔 개수만 (error.message 노출 금지 규칙)
    try {
      const { data: cand, error: candErr } = await supabaseAdmin
        .from("inquiries")
        .select("id, email, source, created_at, is_test")
        .eq("is_test", true)
        .lt("created_at", new Date(Date.now() - PURGE_AFTER_DAYS * 86_400_000).toISOString())
        // 오래된 것부터 — 정렬 없이 limit 만 걸면, 청소 불가 행(사람이 넣은 시험 문의·KEEP
        // 목록 등)이 200건을 넘는 날부터 매일 같은 창만 돌려받아 기계 문의가 영영 안 지워진다.
        .order("created_at", { ascending: true })
        .limit(MAX_PER_RUN);
      if (candErr) throw new Error(candErr.message);

      const now = Date.now();
      const ids = (cand || [])
        .filter((r: any) =>
          isPurgeableNow(
            {
              id: r.id,
              isTest: r.is_test === true,
              email: decryptMaybe(r.email) || "",
              source: r.source,
              createdAt: r.created_at,
            },
            now
          )
        )
        .map((r: any) => r.id);

      if (ids.length) {
        const res = await purgeInquiriesDeep(supabaseAdmin as any, ids);
        testInquiriesPurged = res.inquiries;
        purgeWarningCount += res.warnings.length;
        if (res.warnings.length) {
          console.error("[cron/purge-recordings] 시험문의 정리 경고:", res.warnings.join(" | "));
        }
        console.log(
          `[cron/purge-recordings] 시험문의 ${res.inquiries}건·대화 ${res.threads}건 정리`
        );
      }
    } catch (e: any) {
      // 녹화 파기 결과를 죽이지 않는다 — 다음 실행에서 다시 시도한다.
      purgeWarningCount += 1;
      console.error("[cron/purge-recordings] 시험문의 정리 실패:", e?.message);
    }

    console.log(`[cron/purge-recordings] purged=${purged} failed=${failed}`);
    return Response.json({ ok: true, purged, failed, testInquiriesPurged, purgeWarningCount });
  } catch (e: any) {
    console.error("[cron/purge-recordings] Error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
