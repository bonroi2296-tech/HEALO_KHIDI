/**
 * Next.js 15 instrumentation hook — Sentry 초기화
 *
 * sentry.server.config.js / sentry.edge.config.js 를 런타임별로 import.
 * `NEXT_PUBLIC_SENTRY_DSN` 이 있을 때만 활성 (sentry.*.config.js 내부에서 체크).
 *
 * 참고: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register() {
  // DSN 없으면 Sentry 로드 스킵 (dev 환경에서 불필요한 의존성 에러 방지)
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
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
}
