import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // production 10%, dev 0% — 로컬 성능 추적은 쓸모없고(수신자가 개발자 1명뿐) 매 요청마다
    // 트레이싱 오버헤드만 붙는다(PO 2026-07-09: 백오피스 로컬 로딩 무거움 신고). 에러는
    // tracesSampleRate와 무관하게 항상 그대로 잡힌다 — 이건 퍼포먼스 트레이스만 끄는 것.
    tracesSampleRate: isProd ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: isProd ? 1.0 : 0,
    environment: process.env.NODE_ENV,
    enabled: true,

    // Session Replay — 에러 날 때만 녹화(위 onError 1.0). 의료앱이라 모든 텍스트·미디어 마스킹 유지(PII 보호).
    integrations: [
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],

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
