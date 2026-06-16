/**
 * Sentry 동작 검증용 테스트 라우트 (admin only)
 * GET /api/sentry/test — 의도적으로 에러를 발생시켜 Sentry로 전송
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export async function GET(request: NextRequest) {
  // admin 인증 체크
  const auth = await requireAdminAuth(request);
  if (!auth.success) return auth.response;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return NextResponse.json(
      { ok: false, message: "NEXT_PUBLIC_SENTRY_DSN 미설정 — Sentry 비활성 상태" },
      { status: 200 }
    );
  }

  // 의도된 에러 발생 → Sentry로 캡처됨
  const testError = new Error(
    `[healwith Sentry Test] 의도된 테스트 에러 — ${new Date().toISOString()}`
  );

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(testError);
    await Sentry.flush(2000); // Sentry 버퍼 flush
  } catch (_e) {
    // Sentry 없어도 라우트 자체는 정상 응답
  }

  return NextResponse.json({
    ok: true,
    message: "테스트 에러가 Sentry로 전송됐습니다. Sentry 대시보드에서 확인하세요.",
    timestamp: new Date().toISOString(),
  });
}
