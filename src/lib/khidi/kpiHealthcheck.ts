import "server-only";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptMaybe } from "@/lib/security/encryptionV2";

/**
 * KHIDI 데드맨 스위치 — KPI 일일 집계(kpi-snapshot cron)가 멈췄는지 감지.
 *
 * 왜: kpi_snapshots 가 8/27 중간평가 점수(유치/사전상담/사후관리)의 자동 집계원.
 * cron 이 조용히 죽으면(키 만료·Vercel 이슈·코드 에러) 평가일까지 아무도 모를 수 있음.
 *
 * 동작: kpi_snapshots 최신 날짜가 2일 이상 지났으면 Sentry 경보(= PO 이메일 도달).
 * 호출은 kpi-snapshot 과 "다른 시간대"의 cron 에서 → kpi-snapshot 트리거 자체가 죽어도 감지됨.
 * 절대 throw 하지 않음(호출한 cron 본업에 영향 0).
 */
export async function alertIfKpiStale(): Promise<{ stale: boolean; latest: string | null }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("kpi_snapshots")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latest: string | null = (data as any)?.snapshot_date ?? null;

    // UTC 기준 2일 전보다 오래됐거나 아예 없으면 "집계 누락"으로 판단(1일 유예 → 오탐 방지)
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 2);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const stale = !!error || !latest || latest < cutoffStr;

    if (stale) {
      const msg =
        `[KHIDI 경보] KPI 일일 집계 누락 의심 — kpi_snapshots 최신=${latest ?? "없음"} ` +
        `(기준 <${cutoffStr}). /api/cron/kpi-snapshot 점검 필요. 8/27 중간평가 점수 집계에 직접 영향.`;
      console.error(msg, error?.message ? `dbError=${error.message}` : "");
      try {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureMessage(msg, "error");
      } catch {
        /* Sentry 미설정 시에도 콘솔 로그는 남음 */
      }
    }
    return { stale, latest };
  } catch (e: any) {
    // 헬스체크 자체 실패가 호출한 cron 본업을 막지 않도록 흡수
    console.error("[kpiHealthcheck] 실패:", e?.message);
    return { stale: false, latest: null };
  }
}

/**
 * 설문 발송 '침묵' 감지 — 사후관리 설문이 있어야 하는데 안 나가는 상태를 데이터로 잡는다.
 *
 * 왜: K-03(만족도) 설문은 과거 '아무도 안 만드는 신호'(consultation_sessions.completed=영구 0)에
 * 물려 조용히 0건이었다. 발송 메커니즘을 고치는 수정(#12·#13·#19·#70)들은 "표본 자체가 0"인
 * 상황을 못 본다 — 그래서 결과 데이터로 감지한다.
 *
 * 동작: 사후관리 진입(inquiries.followup_started_at) 8일↑(D+7 +1일 유예) 지난 비테스트
 * 케이스인데 1주차 설문(fu_week_1)이 없으면 Sentry 경보(= PO 이메일 도달). 절대 throw 안 함.
 */
export async function alertIfSurveysStale(): Promise<{ stale: boolean; overdue: number; noEmail: number }> {
  try {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 8); // D+7 + 1일 유예
    const cutoffStr = cutoff.toISOString();

    // ① 앵커 찍힌 지 8일↑ — 발송 루프가 "부분적으로" 죽은 경우.
    const { data: anchored, error: e1 } = await supabaseAdmin
      .from("inquiries")
      .select("id, email")
      .in("case_status", ["follow_up", "completed"])
      .not("is_test", "is", true)
      .not("followup_started_at", "is", null)
      .lte("followup_started_at", cutoffStr);
    if (e1) throw new Error(e1.message);

    // ② 앵커가 아예 없는데 사후관리 진입(case_status_updated_at) 후 8일↑ — stamp 이전에
    //    루프가 "전면" 죽은 경우. ①만 보면 전면 사망 시 모집단 0 → 감시자가 침묵한다(독립 리뷰 P-3).
    const { data: anchorless, error: e2 } = await supabaseAdmin
      .from("inquiries")
      .select("id, email")
      .in("case_status", ["follow_up", "completed"])
      .not("is_test", "is", true)
      .is("followup_started_at", null)
      .lte("case_status_updated_at", cutoffStr);
    if (e2) throw new Error(e2.message);

    const candidates = [...((anchored as any[]) || []), ...((anchorless as any[]) || [])];
    if (candidates.length === 0) return { stale: false, overdue: 0, noEmail: 0 };

    // 이메일이 없는 케이스(메신저 유입 등)는 "발송 로직이 죽은" 게 아니라 보낼 수단이 없는
    // 정상 상태 → 경보 모집단에서 제외. 안 그러면 매일 영구 오탐 경보가 된다(독립 리뷰 C-1).
    const withEmail = candidates.filter((c) => String(decryptMaybe(c.email) || "").includes("@"));
    const noEmail = candidates.length - withEmail.length;
    if (withEmail.length === 0) return { stale: false, overdue: 0, noEmail };

    const ids = withEmail.map((c) => c.id);
    // "행 존재"가 아니라 "실제 발송"(sent_at)으로 판정 — insert 후 crash 한 고아 pending 행은
    // 발송된 적 없다(독립 리뷰 P-2). 레거시(post_*) 설문이 나간 케이스는 fu_week_1 을 접으므로
    // (cadencePlan 폴딩) 그것도 충족으로 친다 — 아니면 접힌 케이스가 영구 오탐이 된다.
    const { data: sent, error: e3 } = await supabaseAdmin
      .from("surveys")
      .select("inquiry_id, survey_type")
      .in("inquiry_id", ids)
      .not("sent_at", "is", null);
    if (e3) throw new Error(e3.message);
    const sentIds = new Set(
      ((sent as any[]) || [])
        .filter((r) => r.survey_type === "fu_week_1" || !String(r.survey_type || "").startsWith("fu_"))
        .map((r: any) => r.inquiry_id)
    );
    const overdue = ids.filter((id) => !sentIds.has(id)).length;

    if (overdue > 0) {
      const msg =
        `[KHIDI 경보] 사후관리 설문 침묵 의심 — 사후관리 진입 8일↑ 비테스트 케이스 ${overdue}건에 ` +
        `1주차 설문(fu_week_1) 미발송. /api/cron/dispatch-surveys 점검 필요. K-03(만족도) 측정에 직접 영향.`;
      console.error(msg);
      try {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureMessage(msg, "error");
      } catch {
        /* Sentry 미설정 시에도 콘솔 로그는 남음 */
      }
    }
    return { stale: overdue > 0, overdue, noEmail };
  } catch (e: any) {
    console.error("[kpiHealthcheck] alertIfSurveysStale 실패:", e?.message);
    return { stale: false, overdue: 0, noEmail: 0 };
  }
}
