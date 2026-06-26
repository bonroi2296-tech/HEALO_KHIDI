/**
 * healwith: 모델 성능 비교 벤치마크 수동 트리거 (관리자 전용)
 *
 * POST /api/admin/khidi/run-benchmark        — 우리 vs 하이엔드 맨몸
 * POST /api/admin/khidi/run-benchmark?full=1 — + 하이엔드+특화(공정 비교 상한선)
 *
 * 어드민 "모델 성능 비교" 화면의 "벤치 실행" 버튼이 호출. 쿠키 기반 관리자 인증(requireAdminAuth).
 * 프로덕션 환경변수의 GOOGLE 키로 서버에서 직접 실행 → PO가 키를 직접 다루지 않아도 됨.
 *
 * ⚠️ 비용: 클릭 1회당 Gemini 호출 수십 회(시나리오×비교군×2). 어드민 전용으로 가드.
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 5분 — 하이엔드(Pro) 응답이 느릴 수 있음

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";
import { runModelBenchmark } from "@/lib/chat/modelBenchmark";

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ ok: false, error: "ai_key_missing" }, { status: 503 });
  }

  const full = request.nextUrl.searchParams.get("full") === "1";

  try {
    const result = await runModelBenchmark({ full });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[admin/run-benchmark] 오류:", err?.message);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
