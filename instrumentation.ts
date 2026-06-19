/**
 * Next.js 15 instrumentation hook — Sentry 초기화
 *
 * sentry.server.config.js / sentry.edge.config.js 를 런타임별로 import.
 * `NEXT_PUBLIC_SENTRY_DSN` 이 있을 때만 활성 (sentry.*.config.js 내부에서 체크).
 *
 * 참고: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  // 2026-06-19: 서버·엣지 Sentry 재활성.
  // 과거 OpenTelemetry 번들 충돌은 next.config.js 의 serverExternalPackages
  // (@opentelemetry/instrumentation, import/require-in-the-middle 외부화)로 해소됨
  // — withSentryConfig 래핑은 2026-06-12부터 프로덕션 빌드에서 정상 동작 중이었으나
  // 정작 런타임 init(이 파일)만 5/19 비활성 상태로 남아 서버 에러가 수집되지 않았다.
  // DSN 미설정 시에는 sentry.*.config 가 init 을 건너뛰므로 영향 없음.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next.js 15+ onRequestError — 서버 렌더링/라우트 핸들러 에러 캡처
export async function onRequestError(
  error: unknown,
  request: Readonly<{
    path: string;
    method: string;
    headers: { [key: string]: string };
  }>,
  context: Readonly<{
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?:
      | "react-server-components"
      | "react-server-components-payload"
      | "server-rendering";
    revalidateReason?: "on-demand" | "stale" | undefined;
    renderType?: "dynamic" | "dynamic-resume";
  }>
) {
  // 서버 렌더링/라우트 핸들러 에러를 Sentry 로 전달 (DSN 있을 때만).
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.captureRequestError(error, request, context);
}
