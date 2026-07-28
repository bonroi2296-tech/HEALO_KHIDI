declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  }
}

// ponytail: GA4 측정ID는 공개값(브라우저 번들에 노출). Vercel env(NEXT_PUBLIC_GA_ID)가
// 옛 실험 속성 G-TH0ZK2G9B9 로 오염돼 있어, 코드 상수를 단일 진실원천으로 고정한다.
// 정식 속성: healwith-cb0cb (Probelle 계정). 속성 바꾸려면 여기 한 줄만 수정.
export const GA_ID = "G-6JJCQXZJ9T";

const getGaId = () => GA_ID;

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
 * KHIDI 성과지표(유치·상담 건수)의 분모가 조용히 부풀고, 전환율은 반대로 낮아 보인다.
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

export const pageview = (url: string) => {
  const gaId = getGaId();
  if (!gaId || internalUser || typeof window === "undefined" || !window.gtag) return;
  // ⚠️ 예전엔 gtag("config", …) 를 라우트마다 다시 불렀다(UA 시절 방식).
  //    GA4 공식 방식은 «page_view 이벤트»를 직접 쏘는 것이다. config 재호출은
  //    page_location(전체 URL)을 갱신해준다는 보장이 없어서, 화면을 옮겨 다녀도
  //    **첫 진입 URL 이 그대로 기록될 위험**이 있었다(= 어느 페이지가 문의로
  //    이어졌는지 알 수 없게 됨). page_location 을 명시해 그 위험을 없앤다.
  //    page_title 은 일부러 안 넘긴다 — Next.js 는 제목을 렌더 뒤에 바꿔서
  //    이 시점에 읽으면 «이전 화면 제목»이 박힐 수 있다. GA 가 알아서 읽게 둔다.
  window.gtag("event", "page_view", {
    page_location: window.location.href,
    page_path: url,
    ...commonParams(),
  });
};

export const event = (action: string, params: Record<string, any> = {}) => {
  const gaId = getGaId();
  if (!gaId || internalUser || typeof window === "undefined" || !window.gtag) return;
  // 공통값(platform·lang)을 먼저 깔고 호출부 params 로 덮어쓴다 → 호출부가 명시한 lang 이 이긴다.
  window.gtag("event", action, { ...commonParams(), ...params });
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

/** AnalyticsWrapper 가 gtag 초기 설정에 얹을 값 (debug_mode 는 config 단계에서 켜야 전체 이벤트에 걸린다). */
export const isDebugMode = () => debugMode;

/**
 * 이벤트 이름 단일 진실원천(SoR).
 *
 * ⚠️ GA4 는 이름이 한 글자만 달라도 **다른 이벤트로 조용히 쌓인다**(오타를 아무도 안 알려줌).
 * 새 이벤트를 넣을 땐 반드시 여기에 먼저 추가하고 상수를 import 해서 쓸 것 — 문자열 직접 타이핑 금지.
 *
 * 📌 «전환(conversion)» 표시 대상 = INQUIRY_SUBMITTED / INQUIRY_DETAIL_SUBMITTED / MESSENGER_CLICK.
 *    KHIDI 중간평가 성과지표(사전상담·사후관리 120건)와 대조하는 숫자가 이 셋이다.
 */
export const GA_EVENTS = {
  /** 문의 진입 화면에서 상담 방식(ai/human/form) 선택 */
  CHOOSE_CHANNEL: "inquiry_choose_channel",
  /** 폼 1단계 화면 진입 */
  STEP1_STARTED: "inquiry_step1_started",
  /** 폼 1단계 «전송 버튼을 눌렀다»(성공 여부 무관) — 이탈률 계산용 분모 */
  STEP1_ATTEMPTED: "inquiry_step1_attempted",
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
} as const;
