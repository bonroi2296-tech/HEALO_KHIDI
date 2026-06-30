/**
 * healwith AI 회귀 테스트 Cron API
 *
 * GET /api/cron/run-regression-tests  (Vercel Cron 은 GET 으로 호출 — POST·GET 모두 허용)
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
import { verifyCronSecret } from "@/lib/security/cronAuth";

// ⚠️ 미작동 버그 수정: Vercel Cron 은 GET 으로 호출하는데 이 라우트는 POST 만 export 해
//    405 로 영영 안 돌았다(8/27 'AI 자가관측' 정성근거가 비어있던 원인). GET·POST 모두 허용.
async function handle(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
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

export const GET = handle;
export const POST = handle;
