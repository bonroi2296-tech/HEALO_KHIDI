/**
 * healwith AI 회귀 테스트 Cron API
 *
 * POST /api/cron/run-regression-tests
 *
 * Vercel Cron: 매일 18:00 UTC (KST 03:00) 자동 실행
 * 수동 트리거(관리자 화면)는 /api/admin/khidi/run-regression 사용(쿠키 인증).
 *
 * 보안: Authorization: Bearer <CRON_SECRET> 헤더 필수
 * 코어 로직은 src/lib/chat/regressionRunner.ts(runRegressionBatch) 공용.
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 5분 (Hobby 최대)

import { NextRequest, NextResponse } from "next/server";
import { runRegressionBatch } from "@/lib/chat/regressionRunner";

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

  try {
    const result = await runRegressionBatch();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[regression-cron] 오류:", err.message);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
