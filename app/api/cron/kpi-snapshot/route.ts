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
import { verifyCronSecret } from "@/lib/security/cronAuth";

export async function GET(request: NextRequest) {
  // ── CRON_SECRET 검증 (상수시간) ───────────────────────────
  if (!verifyCronSecret(request.headers.get("authorization"))) {
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

    // ── 데드맨 점검(#35 S1): "있어야 할 신호가 없음"을 능동 알림 ──
    // KPI 스냅샷이 며칠째 안 갱신(cron 멈춤) · 완료 상담은 있는데 설문 0건(K-03 측정불능)을
    // 조용한 0이 아니라 알림으로 띄운다. best-effort — 실패해도 cron 본 결과에 영향 없음.
    try {
      const { evaluateDeadman } = await import("@/lib/alerts/deadman");
      const { alertDeadman } = await import("@/lib/alerts/operationalAlerts");
      const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

      const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

      const [snap, sessions, surveys] = await Promise.all([
        (supabaseAdmin as any)
          .from("kpi_snapshots")
          .select("snapshot_date")
          .order("snapshot_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabaseAdmin as any)
          .from("consultation_sessions")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("ended_at", since),
        (supabaseAdmin as any)
          .from("surveys")
          .select("id", { count: "exact", head: true })
          .gte("sent_at", since),
      ]);

      const deadman = evaluateDeadman({
        todayKst: kstToday,
        latestSnapshotDate: snap?.data?.snapshot_date ?? null,
        completedSessions: sessions?.count ?? 0,
        surveysSent: surveys?.count ?? 0,
      });
      if (deadman.length > 0) {
        console.warn(
          `[cron/kpi-snapshot] deadman ${deadman.length}건:`,
          deadman.map((d) => d.key)
        );
        await alertDeadman(deadman);
      }
    } catch (e) {
      console.error("[cron/kpi-snapshot] deadman 점검 실패(무시):", (e as Error).message);
    }

    // ── 실적 오염 감사(로그인 계정 경로) ──────────────────────
    // is_test=false 로 실적에 잡혀 있으나 '접수 계정(auth.users.email)'이 테스트 도메인인 문의를
    // 매일 훑어 경고한다. 감지기(detectInquiryIsTest.accountEmail)는 사전 차단, 이 감사는 사후 그물
    // (새 insert 호출부가 accountEmail 을 빠뜨리거나 접수 후 계정이 테스트로 바뀌는 경우 대비).
    // #37 등 '의도적 예외'는 env TEST_POLLUTION_AUDIT_IGNORE(콤마구분 id)로 제외해 매일 오탐 방지.
    // best-effort — 실패해도 cron 본 결과에 영향 없음.
    try {
      const { findTestPollutedInquiryIds, resolveTestDomains } = await import("@/lib/khidi/testData");
      const { alertTestDataPollution } = await import("@/lib/alerts/operationalAlerts");
      const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

      // 로그인 접수만 계정이 있음(게스트는 user_id=null) → 스캔 대상이 작다. 안전 상한.
      const SCAN_CAP = 1000;
      const { data: suspects } = await (supabaseAdmin as any)
        .from("inquiries")
        .select("id, user_id")
        .eq("is_test", false)
        .not("user_id", "is", null)
        .limit(SCAN_CAP);

      const list: Array<{ id: number; user_id: string }> = suspects || [];
      if (list.length === SCAN_CAP) {
        console.warn(`[cron/kpi-snapshot] 오염감사 스캔 상한(${SCAN_CAP}) 도달 — 일부 미검사 가능`);
      }

      // 계정 이메일 해석: 같은 계정이 여러 문의를 낼 수 있어 user_id 중복 제거 후 조회.
      const uniqUserIds = Array.from(new Set(list.map((r) => r.user_id)));
      const emailByUser = new Map<string, string | null>();
      for (const uid of uniqUserIds) {
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
          emailByUser.set(uid, u?.user?.email ?? null);
        } catch {
          emailByUser.set(uid, null);
        }
      }

      const rows = list.map((r) => ({ id: r.id, accountEmail: emailByUser.get(r.user_id) ?? null }));
      const ignore = new Set(
        (process.env.TEST_POLLUTION_AUDIT_IGNORE || "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      );
      const polluted = findTestPollutedInquiryIds(rows, resolveTestDomains()).filter((id) => !ignore.has(id));

      if (polluted.length > 0) {
        console.warn(`[cron/kpi-snapshot] 실적 오염 의심 ${polluted.length}건:`, polluted.slice(0, 20));
        await alertTestDataPollution(polluted, "kpi-snapshot 일일감사");
      }
    } catch (e) {
      console.error("[cron/kpi-snapshot] 오염 감사 실패(무시):", (e as Error).message);
    }

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
