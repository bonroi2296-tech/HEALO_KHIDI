/**
 * healwith: AI 회귀 테스트 수동 트리거 (관리자 전용)
 *
 * POST /api/admin/khidi/run-regression
 *
 * 어드민 대시보드 "지금 실행" 버튼이 호출. 쿠키/Bearer 기반 관리자 인증(requireAdminAuth).
 *
 * ⚠️ 과거엔 화면이 cron 라우트를 공개(NEXT_PUBLIC_) 접두사 비밀키로 직접 호출 →
 *    cron 비밀키가 클라이언트 번들에 노출되던 보안 결함이 있었음. 이 라우트로 감싸
 *    비밀키 노출 없이 관리자 세션만으로 트리거한다. cron(정기실행)은 기존 경로 유지.
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 5분 (Hobby 최대) — 회귀 배치가 길 수 있음

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { runRegressionBatch } from "@/lib/chat/regressionRunner";

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  try {
    const result = await runRegressionBatch();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[admin/run-regression] 오류:", err.message);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
