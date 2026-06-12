/**
 * Next.js 15 instrumentation hook — Sentry 초기화
 *
 * sentry.server.config.js / sentry.edge.config.js 를 런타임별로 import.
 * `NEXT_PUBLIC_SENTRY_DSN` 이 있을 때만 활성 (sentry.*.config.js 내부에서 체크).
 *
 * 참고: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register() {
  // 2026-05-19: 서버·엣지 Sentry 일시 비활성 — @opentelemetry/instrumentation
  // 의존성 체인 충돌로 빌드 실패. 클라이언트 사이드 Sentry 만 활성.
  // 추후 Sentry SDK 안정 버전 또는 next.config externalPackages 검토 후 재활성화.
  // 클라이언트 측 에러는 sentry.client.config.js 가 직접 처리하므로 영향 없음.
  return;

   
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
  // 서버 사이드 Sentry 비활성 동안 onRequestError 도 noop
  return;
}
