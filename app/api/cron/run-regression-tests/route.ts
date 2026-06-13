/**
 * HEALO AI 회귀 테스트 Cron API
 *
 * POST /api/cron/run-regression-tests
 *
 * Vercel Cron: 매일 18:00 UTC (KST 03:00) 자동 실행
 * 수동 트리거: 어드민 대시보드 "지금 실행" 버튼
 *
 * 보안: Authorization: Bearer <CRON_SECRET> 헤더 필수
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 5분 (Hobby 최대)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { sendInAppNotification } from "@/lib/notifications/inApp";
import { buildSystemPrompt } from "@/lib/chat/generateReply";
import { QUALITY_THRESHOLDS, REGRESSION_BATCH } from "@/lib/chat/qualityStandards";

// ── Supabase admin 클라이언트 ──────────────────────────────────
function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Judge 로직 (server-only judge.ts 직접 import 가능) ──────────
const JUDGE_SYSTEM = `You are a strict AI quality judge for HEALO, a Korean medical tourism platform.
Evaluate if the AI response correctly handles the query based on expected behavior.
Score 0.0-1.0: 1.0=perfect, 0.8=good, 0.6=acceptable, 0.4=poor, 0.2=bad, 0.0=critical failure.

HEALO POLICY (violations = low score):
- NEVER claim Korean medicine / immune therapy "cures" or "treats" cancer itself — supportive care only (recovery, QoL, side-effects). Core treatment = surgery/chemo at university hospitals.
- For distressing news (advanced cancer, fear), the bot must show ONE empathetic sentence BEFORE guidance.
- HEALO connects & accompanies; it is NOT a price-comparison marketplace. No price-ranking shopping lists.
- The bot must NOT diagnose, read scans/labs, or prescribe — it offers to connect a real doctor (원격협진).

Flags: hallucination|off_topic_answer|no_clarification|medical_diagnosis|no_safety_defer|wrong_language|smalltalk_rag|missing_redirect|cure_claim|no_empathy|marketplace_tone|diagnosis_attempt
Return ONLY JSON (no fences): {"overall_score":<n>,"flags":[<s>],"reasoning":"<1 sentence>"}`;

async function judgeOne(query: string, response: string, expectedBehavior: string, language: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { overall_score: 0.5, flags: ["judge_unavailable"], reasoning: "No API key" };
  }
  const model = google("gemini-flash-latest") as any;
  const msg = `[Query (${language})]\n${query}\n\n[Response]\n${response}\n\n[Expected]\n${expectedBehavior}`;
  try {
    const { text } = await generateText({
      model,
      system: JUDGE_SYSTEM,
      messages: [{ role: "user", content: msg }],
      maxTokens: 300,
    } as any);
    let s = text.trim();
    const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) s = m[1].trim();
    const p = JSON.parse(s);
    return {
      overall_score: Math.min(1, Math.max(0, Number(p.overall_score ?? 0))),
      flags: Array.isArray(p.flags) ? p.flags.filter((f: unknown) => typeof f === "string") : [],
      reasoning: String(p.reasoning ?? ""),
    };
  } catch {
    return { overall_score: 0, flags: ["judge_error"], reasoning: "Parse failed" };
  }
}

// ── AI 응답 생성 ────────────────────────────────────────────────
async function generateReply(query: string): Promise<{ reply: string; latency_ms: number }> {
  const t0 = Date.now();
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { reply: "[AI unavailable]", latency_ms: 0 };
  }
  const model = google("gemini-flash-latest") as any;
  // 실제 챗봇과 동일한 시스템 프롬프트 사용 (RAG 컨텍스트만 제외) — 과거엔 간소화된
  // 가짜 프롬프트를 테스트해 실제 정책 변경이 회귀테스트에 반영되지 않았음.
  const system = buildSystemPrompt("", false, false, [], {});
  try {
    const { text } = await generateText({
      model,
      system,
      messages: [{ role: "user", content: query }],
    });
    return { reply: text, latency_ms: Date.now() - t0 };
  } catch (e: any) {
    return { reply: `[Error: ${e.message}]`, latency_ms: Date.now() - t0 };
  }
}

// ── 알림 전송 ───────────────────────────────────────────────────
async function sendAlerts(
  db: ReturnType<typeof getAdminDb>,
  passRate: number,
  avgScore: number,
  failedIds: string[]
): Promise<void> {
  try {
    // 어드민/코디네이터 목록 조회
    const { data: { users } } = await (db as any).auth.admin.listUsers({ page: 1, perPage: 50 });
    const adminIds: string[] = (users as any[] ?? [])
      .filter((u: any) => ["admin", "coordinator"].includes(u.app_metadata?.role))
      .map((u: any) => u.id);

    if (adminIds.length === 0) return;

    const body = [
      `통과율: ${passRate}% (기준: ${REGRESSION_BATCH.minPassRatePct}%)`,
      `평균 점수: ${avgScore.toFixed(2)} (기준: ${REGRESSION_BATCH.minAvgScore.toFixed(2)})`,
      failedIds.length > 0 ? `실패 시나리오: ${failedIds.slice(0, 5).join(", ")}${failedIds.length > 5 ? ` 외 ${failedIds.length - 5}개` : ""}` : "",
    ].filter(Boolean).join(" | ");

    await Promise.allSettled(
      adminIds.map((uid) =>
        sendInAppNotification({
          userId: uid,
          type: "ai_regression_alert",
          title: `AI 회귀 테스트 품질 경고 (통과율 ${passRate}%)`,
          body,
          link: "/admin/khidi/ai-regression",
          priority: "urgent",
          payload: { passRate, avgScore, failedCount: failedIds.length },
        })
      )
    );
    console.log(`[regression-cron] 알림 발송 완료 — ${adminIds.length}명`);
  } catch (err: any) {
    console.warn("[regression-cron] 알림 전송 실패:", err.message);
  }
}

// ── 메인 핸들러 ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // CRON_SECRET 검증
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== cronSecret) {
    console.warn("[regression-cron] Unauthorized");
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  const runDate = new Date().toISOString().slice(0, 10);

  try {
    // 활성 시나리오 조회
    const { data: scenarios, error: fetchErr } = await db
      .from("ai_regression_tests")
      .select("id, scenario_id, scenario_category, query_text, expected_behavior, language")
      .eq("is_active", true);

    if (fetchErr) throw fetchErr;
    if (!scenarios || scenarios.length === 0) {
      return NextResponse.json({ ok: true, total: 0, passed: 0, message: "시나리오 없음" });
    }

    console.log(`[regression-cron] ${scenarios.length}개 시나리오 시작 — ${runDate}`);

    let passedCount = 0;
    let totalScore = 0;
    let totalLatency = 0;
    const failedScenarioIds: string[] = [];
    const CONCURRENCY = 5;

    // 5개씩 배치 처리
    for (let i = 0; i < scenarios.length; i += CONCURRENCY) {
      const batch = scenarios.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (sc: any) => {
          const { reply, latency_ms } = await generateReply(sc.query_text);
          const judge = await judgeOne(sc.query_text, reply, sc.expected_behavior, sc.language);
          const passed = judge.overall_score >= QUALITY_THRESHOLDS.regressionPass;

          await db.from("ai_regression_runs").insert({
            test_id: sc.id,
            run_date: runDate,
            response_text: reply.slice(0, 5000),
            overall_score: judge.overall_score,
            flags: judge.flags,
            passed,
            latency_ms,
          });

          totalScore += judge.overall_score;
          totalLatency += latency_ms;
          if (passed) {
            passedCount++;
          } else {
            failedScenarioIds.push(sc.scenario_id);
          }
        })
      );

      // Rate limit 완화
      if (i + CONCURRENCY < scenarios.length) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    const total = scenarios.length;
    const passRate = Math.round((passedCount / total) * 100);
    const avgScore = Math.round((totalScore / total) * 100) / 100;
    const avgLatency = Math.round(totalLatency / total);

    console.log(`[regression-cron] 완료 — 통과율: ${passRate}%, 평균점수: ${avgScore}, 평균latency: ${avgLatency}ms`);

    // 알림 임계값 (qualityStandards 단일 관리): 통과율 또는 평균 점수 하한 미달 시
    if (passRate < REGRESSION_BATCH.minPassRatePct || avgScore < REGRESSION_BATCH.minAvgScore) {
      await sendAlerts(db, passRate, avgScore, failedScenarioIds);
    }

    return NextResponse.json({
      ok: true,
      run_date: runDate,
      total,
      passed: passedCount,
      failed: total - passedCount,
      pass_rate: passRate,
      avg_score: avgScore,
      avg_latency_ms: avgLatency,
      alert_sent: passRate < 90 || avgScore < 0.7,
      failed_scenario_ids: failedScenarioIds.slice(0, 20),
    });
  } catch (err: any) {
    console.error("[regression-cron] 오류:", err.message);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
