// 브라우저 쪽 Sentry — 첫 화면이 그려진 뒤(idle)에 «통째로» 늦게 받는다.
//
// 왜 (2026-07-28 실측):
//   Sentry 브라우저 SDK 조각 하나(253KB)가 홈의 TBT(멈칫) 1,130ms 를 «전부» 만들고 있었다.
//   그 조각만 차단하면 TBT 1,130 → 0ms, 성능점수 44 → 64. 나머지 파일은 다 합쳐도 100ms 미만.
//   먼저 「녹화(replay)만 늦게 붙이기」를 시도했으나 번들러가 조각을 안 쪼갰다(같은 해시) → 통째로 미룸.
//
// 늦게 켜면 그 사이 에러를 놓치므로, SDK 가 붙기 전 에러는 아래 «임시 수신함»이 받아뒀다가
// init 직후 그대로 넘긴다. hydration·자동번역 사고처럼 «로딩 중에 나는» 에러가 우리 주력이라
// 이 버퍼가 없으면 늦게 켜는 것 자체가 성립하지 않는다.
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production";

if (SENTRY_DSN && typeof window !== "undefined") {
  // ── 1. 임시 수신함: SDK 오기 전 에러를 모아둔다 ──
  const pending = [];
  const onError = (e) => {
    if (pending.length < 20) pending.push(e?.error ?? e?.reason ?? e?.message ?? e);
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onError);

  const boot = async () => {
    const Sentry = await import("@sentry/nextjs");

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

      // Session Replay — 에러 날 때만 녹화. 의료앱이라 모든 텍스트·미디어 마스킹 유지(PII 보호).
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

    // ── 2. 수신함 비우기: 늦게 켠 대가를 여기서 갚는다 ──
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onError);
    for (const err of pending.splice(0)) {
      Sentry.captureException(err, { tags: { late_init: "yes" } });
    }
  };

  // 「화면이 다 뜬 뒤(load) → 한가할 때(idle)」 순서로 켠다.
  // idle 만 걸면 첫 화면 직후 곧바로 실행돼 로딩 구간을 여전히 막는다(실측: TBT 650→590ms 로 제자리).
  // load 를 먼저 기다리면 이미지·폰트까지 끝난 뒤라, 사용자가 화면을 만지는 구간에 멈칫이 없다.
  // timeout 5초는 상한 — 바쁜 페이지에서 idle 이 영영 안 와 «에러 수집이 아예 안 켜지는» 것을 막는다.
  const schedule = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(boot, { timeout: 5000 });
    else setTimeout(boot, 2000);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}
