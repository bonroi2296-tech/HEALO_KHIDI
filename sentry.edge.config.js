import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // production 10%, dev 0% — 로컬 성능 추적은 쓸모없고 오버헤드만 붙는다(PO 2026-07-09
    // 백오피스 로컬 로딩 무거움 신고). 에러 수집은 이 값과 무관하게 항상 동작.
    tracesSampleRate: isProd ? 0.1 : 0,
    environment: process.env.NODE_ENV,
    enabled: true,

    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }
      return event;
    },
  });
}
