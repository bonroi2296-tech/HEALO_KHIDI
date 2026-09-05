declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    /** gtag.js 가 «진짜로 내려와 실행됐을 때만» 생기는 객체 (측정ID 로 키가 잡힌다). */
    google_tag_manager?: Record<string, any>;
    /** gtag() 호출이 쌓이는 대기줄. 스크립트가 늦게 내려와도 여기 있던 게 그때 처리된다. */
    dataLayer?: any[];
    /** 얀덱스 메트리카 — 러시아·CIS 측정. 스크립트가 뜨기 전에도 호출은 큐에 쌓인다. */
    ym?: (...args: any[]) => void;
    /** 메타(페이스북) 픽셀. 스니펫이 즉시 만들어 두므로 스크립트가 늦게 와도 호출은 큐에 쌓인다. */
    fbq?: (...args: any[]) => void;
  }
}

// ponytail: GA4 측정ID는 공개값(브라우저 번들에 노출). Vercel env(NEXT_PUBLIC_GA_ID)가
// 옛 실험 속성 G-TH0ZK2G9B9 로 오염돼 있어, 코드 상수를 단일 진실원천으로 고정한다.
// 정식 속성: healwith-cb0cb. 속성 바꾸려면 여기 한 줄만 수정.
// ⚠️ 옛 주석은 「(Probelle 계정)」이라 적혀 있어 «힐위드가 프로벨르 밑에 있다»로 읽혔다 — 아니다.
//    같은 구글 계정(bonroi2296)으로 힐위드와 프로벨르 자사몰 GA4 를 **각각** 만들어 둔 것뿐이고,
//    둘은 서로 별개 속성이다(2026-08-03 PO 확인). 로그인 계정이 같아서 화면에 나란히 보일 뿐.
export const GA_ID = "G-6JJCQXZJ9T";

const getGaId = () => GA_ID;

/**
 * 얀덱스 메트리카 카운터 번호 (러시아·CIS 측정). 2026-07-31 신설 — 그전엔 **카운터 자체가
 * 없어서** 러시아·카자흐 방문이 한 건도 안 잡혔다(우리 핵심 시장인데 측정이 0이었다).
 * GA4 는 러시아권에서 차단·신뢰도 문제가 있어 얀덱스가 사실상 유일한 대체재다.
 */
const getYmId = (): number | null => {
  const raw = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * 얀덱스에도 같은 이벤트를 「목표(goal)」로 보낸다.
 *
 * 왜 여기서 한꺼번에 하나: 호출부(문의 폼·채팅·메신저 버튼 등)가 이미 event() 하나만 부르고
 * 있다. 여기 한 줄을 넣으면 **모든 이벤트가 자동으로 두 곳에 다 간다** — 호출부를 하나도
 * 안 고쳐도 되고, 새 이벤트를 추가할 때 얀덱스만 빠뜨리는 사고도 안 난다.
 * 목표 이름은 GA 이벤트 이름을 그대로 쓴다(양쪽 보고서를 같은 이름으로 대조하기 위해).
 * 실패는 조용히 무시 — 측정이 화면을 깨뜨리면 안 된다.
 */
const sendYandexGoal = (action: string, params?: Record<string, any>) => {
  try {
    const ymId = getYmId();
    if (!ymId || typeof window === "undefined" || typeof window.ym !== "function") return;
    window.ym(ymId, "reachGoal", action, params || {});
  } catch { /* 얀덱스 실패는 무시 */ }
};

// ─────────────────────────────────────────────────────────────────────────────
// 메타(페이스북·인스타) 픽셀 — 광고 성과 측정·리타게팅
//
// GA4·얀덱스와 근본적으로 다른 점: **보낼 수 있는 것이 법으로 좁다.**
// 우리는 암환자 플랫폼이고, 「이 방문자가 폐암 화면을 봤다」는 그 자체로 건강정보다.
// 메타 비즈니스 도구 약관은 건강정보 전송을 명시적으로 금지하며(픽셀 생성 화면에도 경고가 뜬다),
// 국내 개인정보보호법에서도 건강은 «민감정보»라 별도 동의 없이는 제3자에게 못 넘긴다.
// 미국에서는 병원·의료사이트가 바로 이 구조 때문에 집단소송을 당했다.
//
// 그래서 **두 겹**으로 막는다. 하나가 뚫려도 나머지가 잡게.
//   ① 병명이 주소에 드러나는 화면에서는 픽셀을 아예 발화하지 않는다.
//   ② 이벤트는 화이트리스트만, 파라미터는 통째로 버린다.
// ─────────────────────────────────────────────────────────────────────────────

/** 메타 픽셀 ID (env). 없으면 이 아래가 전부 no-op — 얀덱스와 같은 방식. */
const getMetaPixelId = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return raw && /^\d{6,}$/.test(raw.trim()) ? raw.trim() : null;
};

/**
 * 「이 주소는 그 자체로 병명을 말해주는가」 — 픽셀의 **1차 방어선**.
 *
 * 왜 «파라미터만 빼면 된다»가 안 통하나: 픽셀은 발화할 때 현재 주소를 `dl` 파라미터로
 * **자기가 알아서** 실어 보낸다. 우리가 넘기는 값을 아무리 비워도 /treatments/lung 이라는
 * 주소는 그대로 나간다. 그러니 그 화면에서는 **안 쏘는 것 말고 방법이 없다.**
 *
 * ⚠️ 이 함수는 픽셀 전용이다. GA4·얀덱스에는 그대로 보낸다 — 둘은 계약상 우리가 통제하는
 *    분석 도구이고 광고 타겟팅 모수로 재사용되지 않는다(픽셀은 그게 목적이라 성격이 다르다).
 * ⚠️ 판정에 실패하면 «안 보낸다»로 떨어진다. 한 건 덜 재는 것보다 한 건 새는 게 훨씬 비싸다.
 */
const HEALTH_PATH_RE =
  /^\/(?:[a-z]{2}\/)?(?:treatments|specialties|cost-calculator|stories|education)(?:\/|$|\?)/i;

const isHealthSensitivePath = (path?: string): boolean => {
  try {
    let p = path;
    if (!p) p = typeof window !== "undefined" ? window.location.pathname : "";
    // 호출부가 «/ru/treatments/lung?x=1» 같은 전체 경로를 줄 수 있다 → 경로 부분만 본다.
    const q = p.indexOf("?");
    if (q >= 0) p = p.slice(0, q);
    if (!p.startsWith("/")) p = "/" + p;
    return HEALTH_PATH_RE.test(p);
  } catch {
    return true;
  }
};

/**
 * 픽셀로 내보낼 이벤트 **화이트리스트**. 여기 없는 이벤트는 안 나간다.
 *
 * ⚠️ 블랙리스트로 바꾸지 마라. 새 이벤트를 추가할 때마다 조용히 새는데, 그게 하필
 *    암종이 담긴 이벤트(view_treatment·cost_estimated)면 알아차렸을 땐 이미 메타 서버 안이다.
 * 값은 메타 «표준 이벤트» 이름 — 광고 최적화 목표로 고를 수 있는 것들이라 이 이름이어야 뜻이 산다.
 */
const META_PIXEL_EVENTS: Record<string, string> = {
  inquiry_submitted: "Lead",
  inquiry_detail_submitted: "CompleteRegistration",
  inquiry_messenger_click: "Contact",
};

/**
 * 픽셀 전송 — **파라미터를 통째로 버린다.**
 * 호출부가 무엇을 넘기든 cancer_type·hospital_slug 가 실려 나갈 구멍 자체를 없앤다
 * (호출부를 일일이 검사하는 방식은 새 호출부가 생기면 무너진다).
 */
const sendMetaPixel = (action: string) => {
  try {
    const standard = META_PIXEL_EVENTS[action];
    if (!standard) return;
    if (!getMetaPixelId() || typeof window === "undefined" || typeof window.fbq !== "function") return;
    if (isHealthSensitivePath()) return;
    window.fbq("track", standard);
  } catch { /* 픽셀 실패는 무시 — 측정이 화면을 깨뜨리면 안 된다 */ }
};

/**
 * 픽셀 화면조회. 스니펫에 자동 PageView 를 «일부러 안 넣었기 때문에» 이게 유일한 통로다
 * (자동으로 두면 /treatments/lung 첫 진입이 그대로 나간다).
 */
export const metaPixelPageView = (path?: string) => {
  try {
    if (!getMetaPixelId() || internalUser || typeof window === "undefined") return;
    if (typeof window.fbq !== "function") return;
    if (isHealthSensitivePath(path)) return;
    window.fbq("track", "PageView");
  } catch { /* 무시 */ }
};

/**
 * 주소에서 «열쇠»를 가린다 — 측정 도구로 새어 나가면 안 되는 것 (2026-07-31 신설).
 *
 * 무엇이 문제였나: /survey/<토큰> · /claim/<토큰> · /opinion/<토큰> · /c/<코드> 는
 *   **로그인 없이 열리는 링크**다. 그 토큰 자체가 인증 수단이라 주소를 아는 사람은 누구나
 *   그 환자의 설문·소견서·상담방에 들어간다. 그런데 page_location 에 전체 주소를 그대로
 *   실어 보내고 있었다 → 환자 열쇠가 구글(GA4)·버셀 측정 기록에 남는다.
 *   개인정보 문제이기 전에 **접근권한 유출**이다.
 *
 * 어디에 쓰나: GA4 page_view 의 page_location·page_path, 버셀 웹 애널리틱스 beforeSend.
 *   측정값으로서의 쓸모(어느 화면이 얼마나 열렸나)는 그대로 남는다 — 토큰 자리만 가린다.
 */
const TOKEN_PATH_RE = /\/(survey|claim|opinion|c)\/[^/?#]+/gi;
const TOKEN_QUERY_RE = /([?&](?:token|code|t)=)[^&#]+/gi;

export const maskSecretPath = (input: string): string => {
  if (!input) return input;
  try {
    return input
      .replace(TOKEN_PATH_RE, (_m, seg) => `/${String(seg).toLowerCase()}/[token]`)
      .replace(TOKEN_QUERY_RE, (_m, prefix) => `${prefix}[redacted]`);
  } catch {
    // 가리기에 실패하면 «원문을 보내느니 아무것도 안 보낸다» — 유출 쪽이 훨씬 비싸다.
    return "";
  }
};

/**
 * 쿠키 동의가 "all"("Accept All")인지. 분석툴 로드/발화 게이트의 단일 기준.
 * CookieConsent.jsx 가 localStorage["healo_cookie_consent"] 에 "essential" | "all" 저장.
 * SSR/차단 환경에서는 false (안전: 동의 없으면 추적 X).
 */
export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("healo_cookie_consent") === "all";
  } catch {
    return false;
  }
};

/**
 * 접속 플랫폼("web" | "ios" | "android").
 *
 * 왜 필요한가: 스토어 앱(Capacitor)은 정적 번들이 아니라 **라이브 사이트를 웹뷰로 그대로 로드**한다
 * (capacitor.config.ts 의 server.url). 그래서 앱 트래픽이 웹 트래픽과 GA4에서 **구분 없이 뒤섞인다** —
 * 앱 등록/심사 후 "앱에서 몇 명이 문의했나"를 물으면 답할 방법이 없다.
 * → 모든 이벤트에 platform 을 자동으로 붙여 GA4 에서 나눠 볼 수 있게 한다.
 * (GA4 콘솔에서 맞춤 측정기준(custom dimension) `platform` 을 이벤트 범위로 1회 등록해야 보고서에 뜬다.)
 */
export const getPlatform = (): string => {
  if (typeof window === "undefined") return "server";
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      return window.Capacitor.getPlatform?.() || "app";
    }
  } catch {
    /* 웹뷰 아님 → web */
  }
  return "web";
};

/**
 * 현재 화면 언어(ko/en/ru/kz/zh/ja). 6개 언어 서비스라 "어느 언어권이 전환되는가"가 핵심 지표인데,
 * 지금은 일부 이벤트만 lang 을 손으로 넘기고 있어 언어별 비교가 불가능했다 → 공통 파라미터로 승격.
 * <html lang> 을 읽는다(i18n 이 여기에 반영됨). 실패해도 추적을 막지 않는다.
 */
const getLang = (): string | undefined => {
  if (typeof document === "undefined") return undefined;
  try {
    return document.documentElement.getAttribute("lang") || undefined;
  } catch {
    return undefined;
  }
};

/**
 * 직원(운영자·코디·병원) 여부. true 면 이 브라우저에서는 GA 로 아무것도 보내지 않는다.
 *
 * 왜: 우리가 우리 사이트를 하루에도 수십 번 돌아다닌다. 그게 그대로 «방문자»로 섞이면
 * 방문자 수(분모)가 조용히 부풀어 전환율이 실제보다 낮아 보이고, 「어느 화면이 잘 되나」
 * 비교가 통째로 왜곡된다 — 우리는 관리 목적으로만 도는 경로가 따로 있기 때문이다.
 * GA4 콘솔의 «내부 트래픽» 필터는 IP 기준이라 재택·모바일·해외출장이면 안 걸린다 —
 * 그래서 IP 가 아니라 «로그인한 사람의 역할»로 판단한다(우리가 확실히 아는 정보).
 */
let internalUser = false;

/** 개발자 검증용 debug_mode — GA4 「DebugView」에 실시간으로 뜨게 한다(아래 initDebugMode 참고). */
let debugMode = false;

/** 모든 이벤트/페이지뷰에 자동으로 얹히는 공통 파라미터. 호출부가 명시한 값이 항상 우선한다. */
const commonParams = (): Record<string, any> => {
  const lang = getLang();
  const p: Record<string, any> = { platform: getPlatform() };
  if (lang) p.lang = lang;
  // debug_mode 는 config 에도 얹지만, 이벤트마다 붙여야 DebugView 에서 빠짐없이 보인다.
  if (debugMode) p.debug_mode = true;
  return p;
};

/**
 * 「진짜로 GA 에 들어갔나」를 사람이 눈으로 볼 수 있게 하는 자가진단 값.
 *
 * 왜 필요한가 (2026-07-30 실측으로 발견):
 *   PO 가 실서비스에서 `?ga_debug=1` 로 열었더니 콘솔에 gtag.js **500** 이 찍혔다.
 *   화면은 완벽히 멀쩡했고 사용자도 아무 불편이 없었다 — 즉 «측정이 0 인데 아무도 모르는»
 *   상태가 실제로 일어난다. 그런데 이걸 확인하는 유일한 방법이 «개발자도구 콘솔 읽기»여서
 *   PO 가 스크린샷을 찍어 물어봐야 했다. → 상태를 코드가 들고 있게 하고 화면에 띄운다.
 *
 * 세 값이면 판정이 끝난다: 스크립트가 내려왔나 / 몇 건 보냈나 / 마지막에 뭘 보냈나.
 */
let sentCount = 0;
let lastSent = "";
const healthListeners = new Set<() => void>();

function noteSent(name: string) {
  sentCount += 1;
  lastSent = name;
  healthListeners.forEach((fn) => {
    try { fn(); } catch { /* 진단 표시가 화면을 깨뜨리면 안 된다 */ }
  });
}

/**
 * gtag.js 가 «네트워크에서 실제로 내려와 실행됐는지». `window.gtag` 존재로 판단하면 안 된다 —
 * 그건 우리 인라인 스니펫이 만드는 함수라 **스크립트가 500 으로 죽어도 항상 있다**(= 항상 초록불).
 * gtag.js 본체만 만드는 `google_tag_manager[측정ID]` 로 봐야 진짜 여부가 갈린다.
 */
export const isGaScriptLoaded = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const g = window.google_tag_manager;
    if (!g) return false;
    // 측정ID 키가 잡히면 확실. 다만 gtag.js 내부 키 이름은 구글이 바꿀 수 있어서
    // «객체가 생겼고 키가 하나라도 있다»도 로드 성공으로 본다(우리 인라인 스니펫은 이걸 못 만든다).
    return !!g[GA_ID] || Object.keys(g).length > 0;
  } catch { return false; }
};

/**
 * 「랜딩(첫 진입) 조회가 GA 로 나갔는가」의 판정 근거.
 *
 * ⚠️ 여기서 `sentCount` 를 보면 안 된다 — 첫 화면 조회는 **우리 코드가 보내는 게 아니다.**
 * 인라인 스니펫의 `gtag('config', …, { send_page_view: true })` 를 보고 **gtag.js 가 스스로**
 * page_view 를 보낸다(그래서 우리 `pageview()` 를 안 거치고 `sentCount` 도 안 올라간다).
 * 즉 «화면 하나만 보고 나간 방문»에서는 정상인데도 `sentCount` 가 0 이다 —
 * 그걸 판정 기준으로 쓰면 **잘 되는 상태를 «실패»로 표시한다**(자가진단이 거짓말을 한다).
 *
 * 그래서 대기줄(dataLayer)에 우리 측정ID 로 `config` 가 들어갔는지를 본다.
 * 이게 있고 + gtag.js 가 내려왔으면 → 랜딩 조회는 GA 가 확실히 받았다.
 */
const isGaConfigured = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const dl = window.dataLayer;
    if (!Array.isArray(dl)) return false;
    // gtag() 는 arguments 객체를 그대로 넣으므로 배열이 아니다 → 인덱스로 읽는다.
    return dl.some((e: any) => e && e[0] === "config" && e[1] === GA_ID);
  } catch { return false; }
};

/**
 * 「수집 주소에 실제로 «닿는가»」 — 자가진단이 거짓말하는 마지막 구멍을 막는 값.
 *
 * 왜 필요한가 (2026-07-30 실측):
 *   gtag.js 가 내려오고(`loaded`) 대기줄에 config 가 들어가도(`configured`), **수집 주소가
 *   막혀 있으면 아무것도 도착하지 않는다.** 그런데 그 둘은 전부 «우리 탭 안의 사실»이라
 *   차단 여부를 알 수 없다 → 자가진단이 초록불을 켜고 데이터는 0 이 된다.
 *   실제로 PO PC 의 광고차단기(AdGuard)가 `||google-analytics.com^` 을 DNS 에서 막고 있었다
 *   (`0.0.0.0` 응답). 이 값이 없으면 그 상태를 «정상»이라고 보고하게 된다.
 *
 * 판정 원리: `mode:"no-cors"` 요청은 응답 내용을 못 읽는 대신 **4xx·5xx 여도 «성공»으로 온다.**
 * 즉 거절(reject)된다면 그건 서버 응답이 아니라 **네트워크 단계에서 막힌 것**이다.
 *
 * ponytail: 대표 주소(www.google-analytics.com) 한 곳만 찔러본다. 지역 수집기
 * (region1~N.google-analytics.com)만 골라 막는 차단 목록이 있으면 이 검사는 못 잡는다 —
 * 그런 목록이 실제로 나오면 그때 주소를 늘려라.
 */
let endpointReachable: boolean | null = null;
let probing = false;

/** 자가진단 배지가 뜰 때만 호출된다(일반 방문자에겐 이 요청이 나가지 않는다). */
export const probeGaEndpoint = (): void => {
  if (typeof window === "undefined" || endpointReachable !== null || probing) return;
  probing = true;
  // tid 없는 빈 요청 — GA 는 이걸로 아무것도 기록하지 않는다(도달 여부만 본다).
  fetch("https://www.google-analytics.com/g/collect", {
    method: "POST",
    mode: "no-cors",
    cache: "no-store",
    body: "",
  })
    .then(() => { endpointReachable = true; })
    .catch(() => { endpointReachable = false; })
    .finally(() => {
      probing = false;
      healthListeners.forEach((fn) => {
        try { fn(); } catch { /* 진단 표시가 화면을 깨뜨리면 안 된다 */ }
      });
    });
};

export const getGaHealth = () => ({
  loaded: isGaScriptLoaded(),
  configured: isGaConfigured(),
  /** null = 아직 확인 중 / true = 막힘 없음 / false = 광고차단기·DNS 가 막고 있음 */
  reachable: endpointReachable,
  sent: sentCount,
  last: lastSent,
  internal: internalUser,
});

/** 자가진단 배지가 실시간으로 따라오게 하는 구독. 반환값을 호출하면 해제. */
export const onGaActivity = (fn: () => void): (() => void) => {
  healthListeners.add(fn);
  return () => healthListeners.delete(fn);
};

export const pageview = (url: string) => {
  const gaId = getGaId();
  // 픽셀은 gtag 유무와 «무관하게» 먼저 처리한다 — 광고차단기가 구글만 막는 경우가 흔한데
  // 아래 게이트에 걸리면 픽셀까지 통째로 죽어서 광고 성과가 0 으로 보인다.
  metaPixelPageView(url);
  if (!gaId || internalUser || typeof window === "undefined" || !window.gtag) return;
  // ⚠️ 예전엔 gtag("config", …) 를 라우트마다 다시 불렀다(UA 시절 방식).
  //    GA4 공식 방식은 «page_view 이벤트»를 직접 쏘는 것이다. config 재호출은
  //    page_location(전체 URL)을 갱신해준다는 보장이 없어서, 화면을 옮겨 다녀도
  //    **첫 진입 URL 이 그대로 기록될 위험**이 있었다(= 어느 페이지가 문의로
  //    이어졌는지 알 수 없게 됨). page_location 을 명시해 그 위험을 없앤다.
  //    page_title 은 일부러 안 넘긴다 — Next.js 는 제목을 렌더 뒤에 바꿔서
  //    이 시점에 읽으면 «이전 화면 제목»이 박힐 수 있다. GA 가 알아서 읽게 둔다.
  // 🛡️ 추적이 화면을 깨뜨리면 안 된다 — 여기서 예외가 나면 «호출한 쪽»이 멈춘다.
  //    실제로 병원·암종 상세는 데이터를 불러오는 도중에 이걸 부르므로, 던지면 그 뒤
  //    로딩이 통째로 중단된다. 호출부마다 감싸는 대신 여기서 한 번에 막는다.
  try {
    // 🔑 열쇠 링크(/survey·/claim·/opinion·/c)는 토큰 자리를 가려서 보낸다 — maskSecretPath 주석 참고.
    window.gtag("event", "page_view", {
      page_location: maskSecretPath(window.location.href),
      page_path: maskSecretPath(url),
      ...commonParams(),
    });
    noteSent("page_view");
  } catch { /* 분석 실패는 조용히 무시 — 화면은 계속 동작해야 한다 */ }
};

export const event = (action: string, params: Record<string, any> = {}) => {
  const gaId = getGaId();
  // 얀덱스는 gtag 유무와 무관하게 보낸다 — 광고차단기가 구글만 막는 경우가 흔하고,
  // 러시아·CIS 에서는 그 상황이 오히려 기본값에 가깝다(얀덱스가 하한선 역할).
  if (!internalUser) {
    sendYandexGoal(action, params);
    // 메타 픽셀은 화이트리스트에 걸린 전환만·파라미터 없이 나간다 (sendMetaPixel 주석 참고).
    sendMetaPixel(action);
  }
  if (!gaId || internalUser || typeof window === "undefined" || !window.gtag) return;
  // 공통값(platform·lang)을 먼저 깔고 호출부 params 로 덮어쓴다 → 호출부가 명시한 lang 이 이긴다.
  // 🛡️ pageview 와 같은 이유로 방탄 (위 주석 참고).
  try {
    window.gtag("event", action, { ...commonParams(), ...params });
    noteSent(action);
  } catch { /* 분석 실패는 조용히 무시 — 화면은 계속 동작해야 한다 */ }
};

/** 직원 계정으로 로그인한 브라우저인지 판정 (app_metadata.role 기준 — user_metadata 는 위조 가능). */
const STAFF_ROLES = new Set(["admin", "coordinator", "hospital", "agency", "clinic", "doctor"]);

/**
 * 로그인 상태를 GA 에 반영한다. 로그인/로그아웃 때마다 호출(ClientShell).
 *
 * 두 가지를 한다.
 *  1) **직원이면 추적 자체를 끈다** (위 internalUser 주석 참고).
 *  2) **user_id 연결** — 같은 사람이 휴대폰으로 보고 노트북으로 문의하면 GA 는 기본적으로
 *     «다른 사람 2명»으로 센다. 로그인 계정 id 를 넘기면 한 사람으로 이어 붙는다.
 *     ⚠️ 넘기는 값은 Supabase 계정 id(무작위 UUID) 뿐 — 이름·이메일·전화 같은 개인정보는
 *     GA 로 절대 보내지 않는다(구글 정책 위반이자 우리 PII 원칙 위반).
 */
export const setAnalyticsUser = (session: any | null) => {
  const role = session?.user?.app_metadata?.role || null;
  internalUser = !!role && STAFF_ROLES.has(role);

  if (typeof window === "undefined" || !window.gtag) return;
  if (internalUser) {
    // 직원으로 밝혀지면 이후 발화를 멈춘다(이미 나간 건 되돌릴 수 없음 — 그래서 로그인 즉시 호출).
    window.gtag("set", { user_id: undefined });
    return;
  }
  window.gtag("set", { user_id: session?.user?.id || undefined });
};

/**
 * GA4 「DebugView」로 이벤트를 실시간 확인할 수 있게 켠다.
 *
 * 왜 필요한가: 분석은 **틀려도 화면이 멀쩡해서** 눈으로 검증할 방법이 없다. 이걸 켜면
 * 실서비스에서 내가 누른 것이 GA4 관리자 화면(관리 → DebugView)에 **몇 초 안에 그대로 뜬다.**
 * → 「배포했는데 진짜 들어오나?」를 사람이 직접 확인할 수 있는 유일한 통로.
 *
 * 켜는 법: 주소 뒤에 `?ga_debug=1` 을 붙여 한 번 열면 그 탭에서 계속 켜져 있다(`?ga_debug=0` 이면 끔).
 * 일반 방문자에게는 절대 안 켜진다(주소로 직접 요청해야만 켜짐).
 */
export const initDebugMode = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("ga_debug");
    if (q === "1") window.sessionStorage.setItem("healo_ga_debug", "1");
    if (q === "0") window.sessionStorage.removeItem("healo_ga_debug");
    debugMode = window.sessionStorage.getItem("healo_ga_debug") === "1";
  } catch {
    debugMode = false;
  }
  return debugMode;
};

/**
 * 이벤트 이름 단일 진실원천(SoR).
 *
 * ⚠️ GA4 는 이름이 한 글자만 달라도 **다른 이벤트로 조용히 쌓인다**(오타를 아무도 안 알려줌).
 * 새 이벤트를 넣을 땐 반드시 여기에 먼저 추가하고 상수를 import 해서 쓸 것 — 문자열 직접 타이핑 금지.
 *
 * 📌 «전환(conversion)» 표시 대상 = INQUIRY_SUBMITTED / INQUIRY_DETAIL_SUBMITTED / MESSENGER_CLICK.
 *    「어느 유입·어느 화면·어느 언어가 실제로 상담까지 이어지나」를 재는 기준선이 이 셋이다.
 *    (정확한 건수가 필요하면 DB 를 본다 — GA 는 구조적으로 적게 센다. docs/GA4_SETUP.md §0)
 */
export const GA_EVENTS = {
  /** 문의 진입 화면에서 상담 방식(ai/human/form) 선택 */
  CHOOSE_CHANNEL: "inquiry_choose_channel",
  /** 폼 1단계 화면 진입 */
  STEP1_STARTED: "inquiry_step1_started",
  /** 폼 1단계 «전송 버튼을 눌러 검증까지 통과»한 시도 — 서버 실패율 계산용 분모 */
  STEP1_ATTEMPTED: "inquiry_step1_attempted",
  /**
   * ⭐ 전송을 눌렀는데 «빨간 오류로 못 넘어간» 경우 — { blocked_by, missing }.
   * 보내려는 의지가 있었는데 우리 폼이 막은 것 = 가장 아까운 이탈이다.
   * blocked_by 값(consent / required_field / phone_dial / email_format)이 곧 고칠 대상.
   */
  STEP1_BLOCKED: "inquiry_step1_blocked",
  /** ⭐ 폼 1단계가 «서버에 실제로 저장됐다» = 핵심 전환 */
  INQUIRY_SUBMITTED: "inquiry_submitted",
  /** 폼 2단계(상세 정보) 화면 진입 */
  STEP2_STARTED: "inquiry_step2_started",
  /** 폼 2단계(상세 정보) 전송 버튼 클릭 */
  STEP2_ATTEMPTED: "inquiry_step2_attempted",
  /** 중간 이탈(다음 단계로 안 가고 빠져나감) — { phase } */
  DROPOFF: "inquiry_dropoff",
  /** ⭐ 폼 2단계가 «서버에 실제로 저장됐다» = 상세정보까지 완주 */
  INQUIRY_DETAIL_SUBMITTED: "inquiry_detail_submitted",
  /** 제출 실패(서버 오류·네트워크) — { step: 1 | 2 } */
  INQUIRY_SUBMIT_FAILED: "inquiry_submit_failed",
  /** ⭐ 메신저(WhatsApp/Telegram/WeChat/LINE)로 나감 = 사람 상담 전환 */
  MESSENGER_CLICK: "inquiry_messenger_click",
  /** 메신저 목록 화면 진입 */
  HUMAN_CHANNELS_VIEW: "inquiry_human_channels_view",
  /** 메신저 대신 폼으로 되돌아온 폴백 */
  HUMAN_FALLBACK_TO_FORM: "inquiry_human_fallback_to_form",
  /** 상담 방식 선택 화면 진입 */
  CHANNEL_VIEW: "inquiry_channel_view",
  /** 회원가입 버튼 클릭 — { method } */
  SIGNUP_CLICKED: "inquiry_signup_clicked",
  /** 병원 상세 조회 — { hospital_slug } */
  VIEW_HOSPITAL: "view_hospital",
  /** 암종/치료 상세 조회 — { treatment_slug } */
  VIEW_TREATMENT: "view_treatment",

  // ── AI 상담 (우리 서비스의 핵심 차별점인데 지금까지 «깜깜이»였다) ──────────────
  // 재는 이유: ①사람들이 실제로 쓰는가 ②몇 마디 만에 그만두는가(= 답이 시원찮다는 뜻)
  // ③AI 가 답을 못 해서 사람 코디를 부르는 비율 ④AI 답이 도움이 됐는가.
  // 전부 «AI 를 어떻게 고칠까»로 바로 이어지는 숫자다.
  /** AI 상담 대화가 실제로 열림 */
  CHAT_STARTED: "chat_started",
  /** 사용자가 메시지를 보냄 — { message_index } 로 몇 번째인지(이탈 지점 파악) */
  CHAT_MESSAGE_SENT: "chat_message_sent",
  /** AI 답변 평가 — { rating: "up" | "down" } */
  CHAT_FEEDBACK: "chat_feedback",
  /** AI 대신 사람 코디를 불러달라고 함 (= AI 가 못 푼 질문) */
  CHAT_REQUEST_HUMAN: "chat_request_human",
  /** AI 상담을 하다가 «접수(문의 등록)»로 넘어감 — AI 가 실제로 문의를 만들어내나 */
  CHAT_TO_INQUIRY: "chat_to_inquiry",

  /** 화면 언어를 바꿈 — { from, to }. 어느 번역을 먼저 손봐야 하는지 알려준다 */
  LANGUAGE_CHANGED: "language_changed",
  /** 비용 계산기를 실제로 써봄 — { cancer_type } */
  COST_ESTIMATED: "cost_estimated",
} as const;
