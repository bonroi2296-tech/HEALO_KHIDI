import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // production 10%, dev 100%
    tracesSampleRate: isProd ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: isProd ? 1.0 : 0,
    environment: process.env.NODE_ENV,
    enabled: true,

    // 환자 PII 필터링 — beforeSend에서 제거
    beforeSend(event) {
      // request body에서 PII 제거
      if (event.request?.data) {
        const data = event.request.data;
        if (typeof data === "object" && data !== null) {
          const piiKeys = [
            "name", "full_name", "patient_name",
            "email", "phone", "birth_date", "dob",
            "passport", "address", "diagnosis",
            "name_encrypted", "email_encrypted", "phone_encrypted",
          ];
          for (const key of piiKeys) {
            if (key in data) data[key] = "[Filtered]";
          }
        }
      }
      // user 객체에서 이메일/IP 제거
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }
      return event;
    },
  });
}
