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

      // ── 브라우저 자동번역 판별 태그 (2026-07-27) ──
      // 크롬/엣지 번역기는 페이지 글자를 <font> 로 갈아끼운다 → React 가 자기 노드를 못 찾고
      // NotFoundError(insertBefore/removeChild)·Hydration Error 로 죽는다. 우리 코드 버그와
      // 겉모습이 같아서, 이 3개 태그 없이는 사후에 절대 못 가른다(센트리 7/23·7/27 상담방 사고).
      //   page_translated=yes 면 → 우리 코드 아님, 번역기가 범인.
      try {
        const el = document.documentElement;
        event.tags = {
          ...event.tags,
          // 크롬/엣지가 번역을 적용하면 <html> 에 translated-ltr|rtl 이 붙는다
          page_translated: /\btranslated-(ltr|rtl)\b/.test(el.className) ? "yes" : "no",
          page_lang: el.lang || "unknown",       // 페이지가 선언한 언어
          ui_lang: navigator.language || "unknown", // 브라우저 UI 언어 — 둘이 다르면 번역기가 뜬다
        };
      } catch {
        // 태그는 있으면 좋은 것 — 실패해도 에러 보고 자체를 막지 않는다
      }

      return event;
    },
  });
}
