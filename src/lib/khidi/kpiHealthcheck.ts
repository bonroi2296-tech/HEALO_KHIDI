import "server-only";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

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
