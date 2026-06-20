/**
 * healwith KHIDI KPI 일별 스냅샷 Cron
 *
 * GET /api/cron/kpi-snapshot
 *
 * 매일 자정 KST 이후 외부 스케줄러(Vercel Cron / GitHub Actions) 호출
 * 어제 날짜 KPI 계산 → kpi_snapshots upsert
 *
 * 보안: Authorization: Bearer <CRON_SECRET> 헤더 필수
 *
 * vercel.json 예시:
 * {
 *   "crons": [{ "path": "/api/cron/kpi-snapshot", "schedule": "5 15 * * *" }]
 * }
 * (UTC 15:05 = KST 00:05)
 */

export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { upsertRecentSnapshots } from "@/lib/khidi/kpi";

export async function GET(request: NextRequest) {
  // ── CRON_SECRET 검증 ──────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/kpi-snapshot] CRON_SECRET 환경변수 미설정");
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (token !== cronSecret) {
    console.warn("[cron/kpi-snapshot] Unauthorized cron access");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // ── 날짜 파라미터 (기본: 어제 KST) ─────────────────────
  const { searchParams } = new URL(request.url);
  let targetDate = searchParams.get("date"); // YYYY-MM-DD override (테스트용)

  if (!targetDate) {
    // KST 어제 날짜
    const now = new Date();
    // KST = UTC+9 → now + 9h → 어제
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const yesterday = new Date(kstNow);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    targetDate = yesterday.toISOString().slice(0, 10);
  }

  // YYYY-MM-DD 형식 검증
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json(
      { ok: false, error: "invalid_date", detail: "date 형식: YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // 백필 윈도우(기본 7일): Vercel cron 은 최선노력이라 가끔 하루를 거른다
  // (실측: 06-16·06-19 누락). 매번 최근 며칠을 다시 메워 빈 칸을 자동 복구한다.
  // ?days= 로 조정(테스트·수동 대량 백필), 1~60 범위로 클램프.
  const daysRaw = Number(searchParams.get("days") ?? "7");
  const backfillDays =
    Number.isFinite(daysRaw) && daysRaw >= 1 && daysRaw <= 60
      ? Math.floor(daysRaw)
      : 7;

  try {
    console.log(
      `[cron/kpi-snapshot] Computing snapshots ending ${targetDate} (${backfillDays}d window)`
    );
    const results = await upsertRecentSnapshots(targetDate, backfillDays);
    const failed = results.filter((r) => !r.ok).map((r) => r.date);
    const primary = results.find((r) => r.date === targetDate);

    // 주 대상일(어제) 실패는 가시화(500)해 cron 재시도·알림을 유도.
    // 과거 백필 날짜 실패는 다음 실행에서 또 메우므로 로그만 남기고 200 유지.
    if (primary && !primary.ok) {
      console.error(`[cron/kpi-snapshot] primary ${targetDate} 실패`);
      return NextResponse.json(
        { ok: false, error: "internal_error", date: targetDate },
        { status: 500 }
      );
    }

    console.log(
      `[cron/kpi-snapshot] Done: ${targetDate} (${results.length - failed.length}/${results.length} ok)`
    );
    return NextResponse.json({
      ok: true,
      date: targetDate,
      backfilled: results.length,
      failed,
    });
  } catch (err) {
    console.error("[cron/kpi-snapshot] error:", (err as Error).message);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
