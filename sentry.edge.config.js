import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // production 10%, dev 0% — 로컬 트레이싱 오버헤드 제거(PO 2026-07-09).
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
