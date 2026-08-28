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

      // AI 챗 감시는 30일이 아니라 7일 창으로 본다 — 답변·채점은 매일 수십 건 나오므로
      // 30일이면 «어제 죽었어도» 옛 건수에 묻혀 경보가 안 뜬다(감시 지연 = 감시 부재).
      const sinceAi = new Date(Date.now() - 7 * 86_400_000).toISOString();

      const [snap, sessions, surveys, aiReplies, aiEvals, aiFlagged, aiAlerts, aiJudgeCalls] = await Promise.all([
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
          // 시험 상담을 빼고 센다 — 이 숫자는 「요즘 상담이 아예 안 도는 것 아닌가」를 감시하는
          // 무응답 경보(deadman)의 재료다. 시험분이 섞이면 실제로는 실적이 0인데도 경보가
          // 「돌고 있다」고 판정해 **조용히 입을 다문다**(2026-08-04 독립 리뷰 지적:
          // 이 파일은 아래 문의 감사에서 is_test 를 언급한다는 이유로 성과지표 정직성 검사를
          // 통과하고 있었지만, 정작 상담을 세는 이 질의는 안 걸러지고 있었다).
          .or("is_test.is.null,is_test.eq.false")
          .gte("ended_at", since),
        (supabaseAdmin as any)
          .from("surveys")
          .select("id", { count: "exact", head: true })
          .gte("sent_at", since),
        // ── AI 챗 파수꾼 3종 (2026-08-28) ──────────────────────────────
        // ①답변은 나가는데 채점 0 = 판사 죽음  ②표시는 붙는데 알림 0 = 통보 경로 죽음.
        // 둘 다 화면상 「정상」과 구별이 안 돼 사람 눈으로는 영영 안 보인다.
        (supabaseAdmin as any)
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("actor_type", "system")
          // ⚠️ 가로챈 턴(잡담·화제정정·마스터키)은 «빼고» 센다. 그 답변들은 모델을 안 거치므로
          //    판사도 안 돈다 — 같이 세면 「인사만 잔뜩 들어온 주」에 답변 많음 + 채점 0 이 되어
          //    판사가 멀쩡한데 critical 경보가 뜬다(오탐). 늑대소년은 감시를 죽인다(#112 근본원인 2).
          .is("metadata->>bypassed", null)
          .gte("created_at", sinceAi),
        (supabaseAdmin as any)
          .from("ai_response_evaluations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", sinceAi),
        (supabaseAdmin as any)
          .from("ai_response_evaluations")
          .select("id", { count: "exact", head: true })
          .neq("flags", "{}")
          .gte("created_at", sinceAi),
        (supabaseAdmin as any)
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("type", "ai_quality_alert")
          .gte("created_at", sinceAi),
        // ③판사를 «불렀는데» 채점이 안 남는다 = 조용한 실패.
        //    surface='judge' 는 라이브 채점만이다(자가시험은 'regression_judge' 로 따로 기록).
        (supabaseAdmin as any)
          .from("ai_usage_events")
          .select("id", { count: "exact", head: true })
          .eq("surface", "judge")
          .gte("created_at", sinceAi),
      ]);

      const deadman = evaluateDeadman({
        todayKst: kstToday,
        latestSnapshotDate: snap?.data?.snapshot_date ?? null,
        completedSessions: sessions?.count ?? 0,
        surveysSent: surveys?.count ?? 0,
        aiReplies: aiReplies?.count ?? 0,
        aiEvaluations: aiEvals?.count ?? 0,
        aiFlagged: aiFlagged?.count ?? 0,
        aiQualityAlertsSent: aiAlerts?.count ?? 0,
        aiJudgeCalls: aiJudgeCalls?.count ?? 0,
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
      // 「진짜 케이스인데 시험 계정으로 접수된 것」은 실적에서 빼면 안 된다 — 예외로 둔다.
      //   #37 첫 실고객(agency@test.com · 2026-07-07) · #60 세브란스 소견 요청(patient@test.com · 2026-08-01)
      //   2026-08-27 실DB 전수 조회: 이 조건(is_test=false + 계정이 시험 도메인)에 걸리는 문의는 이 둘뿐이다.
      //   왜 env 가 아니라 여기 적나: env 값은 콘솔에서 암호화돼 보이지 않아 «왜 예외인지»가 사라진다.
      //   #60 이 env 에 빠져 있어 같은 경보가 9일간 매일 울렸다(2026-08-27 확인). env 로도 더 넣을 수 있다(합집합).
      const KNOWN_INTENTIONAL_IDS = [37, 60];
      const ignore = new Set([
        ...KNOWN_INTENTIONAL_IDS,
        ...(process.env.TEST_POLLUTION_AUDIT_IGNORE || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) // 빈 env → [""] → Number("")=0 오염 방지(빈 문자열 먼저 제거)
          .map(Number)
          .filter((n) => Number.isFinite(n)),
      ]);
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
