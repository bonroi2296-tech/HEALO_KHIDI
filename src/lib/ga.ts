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

/** 모든 이벤트/페이지뷰에 자동으로 얹히는 공통 파라미터. 호출부가 명시한 값이 항상 우선한다. */
const commonParams = (): Record<string, any> => {
  const lang = getLang();
  return lang ? { platform: getPlatform(), lang } : { platform: getPlatform() };
};

export const pageview = (url: string) => {
  const gaId = getGaId();
  if (!gaId || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", gaId, { page_path: url, ...commonParams() });
};

export const event = (action: string, params: Record<string, any> = {}) => {
  const gaId = getGaId();
  if (!gaId || typeof window === "undefined" || !window.gtag) return;
  // 공통값(platform·lang)을 먼저 깔고 호출부 params 로 덮어쓴다 → 호출부가 명시한 lang 이 이긴다.
  window.gtag("event", action, { ...commonParams(), ...params });
};

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
