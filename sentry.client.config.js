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
//
// 감수한 손실 2가지(알고 택한 것 — 되돌리려면 이 파일을 옛 판으로):
//   ① 센트리 «성능 추적(pageload 트랜잭션)»은 이제 안 잡힌다. 로딩이 끝난 뒤 켜지니 로딩 자체를
//      못 잰다. 우리 성능 판단 근거는 Lighthouse 실측이라 실손해가 없다(tracesSampleRate 0.1 은
//      켜진 뒤의 API 호출·라우팅에 계속 적용된다).
//   ② 에러 녹화(replay)가 에러 «직전» 화면을 못 담는다. 에러가 나면 그 순간 켜지므로 보고는
//      온전하지만, 녹화는 켜진 이후 구간만 남는다.
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProd = process.env.NODE_ENV === "production";

if (SENTRY_DSN && typeof window !== "undefined") {
  // ── 1. 임시 수신함: SDK 오기 전 에러를 모아둔다 ──
  const pending = [];
  const onErrorHooks = []; // 에러가 들어오면 실행할 것들(아래에서 «즉시 켜기»를 붙인다)
  const onError = (e) => {
    if (pending.length < 20) pending.push(e?.error ?? e?.reason ?? e?.message ?? e);
    onErrorHooks.forEach((fn) => fn());
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

  // 켜는 시점 = 「에러가 났거나 · 사용자가 화면을 만졌거나 · 15초가 지났거나」 중 가장 먼저.
  //
  // 왜 이렇게까지 미루나(2026-07-28 프로덕션 실측): 「load 뒤 idle」은 부족했다 — 실서비스는 로딩이
  // 길어서 idle 이 여전히 측정·체감 구간 안에 들어왔고 TBT 가 329→294ms 로 제자리였다.
  // 반대로 «에러가 나면 즉시» 켜므로 늦춰서 잃는 것이 없다: 보고할 일이 생긴 순간이 곧 켜는 순간이다.
  // 사용자가 만지기 시작하면(=페이지를 실제로 쓰기 시작하면) 그때부터는 오류 감시가 붙어 있어야 하므로
  // 첫 조작도 방아쇠. 아무 일도 없는 방문(대부분·측정 로봇 포함)에서는 15초 뒤 조용히 켜진다.
  let booted = false;
  const bootOnce = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  // 에러가 수신함에 들어오면 곧바로 켠다 — 수신함에 쌓아두기만 하면 이탈 시 통째로 유실된다.
  onErrorHooks.push(bootOnce);
  for (const ev of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(ev, bootOnce, { once: true, passive: true });
  }
  setTimeout(bootOnce, 15000);
}

// 이 파일은 «켜는 일»만 하고 내보낼 게 없다. 다만 정적 import 가 사라져서(센트리를 동적으로 받게
// 바꿨다) TypeScript 가 «모듈이 아닌 스크립트»로 보고 import 를 거부한다 → 빈 export 로 모듈임을 알린다.
export {};
