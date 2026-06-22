/**
 * healwith: 침묵 환자 감지 cron (FR-16)
 *
 * GET /api/cron/detect-silent-patients
 * - 매일 자정 외부 스케줄러(Vercel Cron / cron-job.org)에서 호출
 * - 최근 3일 이상 증상 입력 없는 활성 환자 → silence_long 알림 생성
 * - Authorization: Bearer {CRON_SECRET} 필수
 *
 * ⚠️ 의료 면책: 감지 결과는 코디네이터 확인 요청이며, 의학적 진단이 아닙니다.
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { buildSilenceAlert, uniqueInquiryIds } from "@/lib/symptoms/silence";
import { saveAndNotifyAlerts } from "@/lib/symptoms/alertService";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

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

  const startTime = Date.now();
  let checked = 0;
  let detected = 0;

  try {
    // consultation_sessions 에서 최근 활성 환자(문의) 목록 조회
    // (치료 종료 후 30일 이내인 환자만 대상)
    // ⚠️ 실제 환자 연결고리는 inquiry_id 다. patient_id 는 전 행 null(미사용)이라
    //    예전엔 .not("patient_id",...) 로 걸러 항상 0건이었음(POSTMORTEMS #12/#13).
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: sessions, error: sessErr } = await supabaseAdmin
      .from("consultation_sessions")
      .select("inquiry_id, updated_at")
      .gte("updated_at", cutoff.toISOString())
      .not("inquiry_id", "is", null)
      .order("updated_at", { ascending: false });

    if (sessErr) {
      console.error("[cron/detect-silent] sessions 조회 실패:", sessErr.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    // 중복 문의 제거 (가장 최근 세션 기준)
    const inquiryIds = uniqueInquiryIds((sessions || []) as any[]);

    const alerts = [];

    for (const inquiryId of inquiryIds) {
      checked++;
      // 해당 문의의 가장 최근 증상 보고 조회 (symptom_reports 는 inquiry_id 로 묶임)
      const { data: latestReports } = await supabaseAdmin
        .from("symptom_reports")
        .select("created_at")
        .eq("inquiry_id" as any, inquiryId)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastEntryAt = latestReports?.[0]?.created_at
        ? new Date(latestReports[0].created_at)
        : null;

      // 이미 미해결 silence_long 알림이 있으면 중복 생성 방지
      const { data: existingAlert } = await (supabaseAdmin as any)
        .from("symptom_alerts")
        .select("id")
        .eq("inquiry_id", inquiryId)
        .eq("alert_type", "silence_long")
        .is("resolved_at", null)
        .limit(1);

      if (existingAlert && (existingAlert as any[]).length > 0) {
        continue; // 이미 미해결 알림 존재 — 중복 건너뜀
      }

      const alert = buildSilenceAlert({ inquiryId }, lastEntryAt, 3);
      if (alert) {
        (alerts as any[]).push(alert);
        detected++;
      }
    }

    if (alerts.length > 0) {
      await saveAndNotifyAlerts(alerts);
    }

    const elapsed = Date.now() - startTime;
    console.log(
      `[cron/detect-silent] checked=${checked}, detected=${detected}, elapsed=${elapsed}ms`
    );

    return Response.json({
      ok: true,
      checked,
      detected,
      elapsed_ms: elapsed,
    });
  } catch (e: any) {
    console.error("[cron/detect-silent] exception:", e.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
