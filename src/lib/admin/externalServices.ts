/**
 * healwith 외부 서비스 레지스트리 (사용량·요금 모니터링 화면의 SoR)
 *
 * 목적: "지금 무엇을 얼마나 쓰는지 / 언제부터 돈이 나가는지"를 한 화면에서 본다.
 *       모든 연동 서비스(제미나이·Supabase·Resend·SES·Twilio·Telegram·LiveKit·
 *       Vercel·Sentry)를 한눈에. 가능한 건 실측(live), 우리 DB로 대신 잴 수 있는 건
 *       프록시(proxy), 벤더 콘솔에서만 보이는 건 콘솔 링크(console).
 *
 * ⚠️ 무료 한도·유료 단가는 '참고치'다(벤더가 수시로 바꾼다). 정확한 값·청구는 콘솔에서.
 *
 * 실측 출처:
 *  - gemini:   ai_usage_events (토큰·비용)
 *  - supabase: get_external_db_usage() RPC (DB 용량·스토리지)
 *  - 알림 채널(resend/ses/twilio/telegram): admin_notification_logs.channel 집계
 *  - livekit:  consultation_sessions (상담방 수 — 영상 분은 콘솔)
 */

export type MeasureKind = "live" | "proxy" | "console";

export interface ExternalService {
  id: string;
  name: string;
  category: string; // AI · 백엔드/DB · 이메일 · 메시지 · 영상 · 호스팅 · 모니터링
  what: string;
  plan: string;
  freeTier: string;
  paidTrigger: string;
  paidPrice: string;
  consoleUrl: string;
  measure: MeasureKind;
  /** API 가 실측치를 채우는 키. */
  liveKey?: "gemini" | "supabase" | "notif" | "livekit";
  /** liveKey='notif' 일 때, admin_notification_logs.channel 중 이 서비스로 칠 값들. */
  notifChannels?: string[];
}

export const EXTERNAL_SERVICES: ExternalService[] = [
  {
    id: "gemini",
    name: "Gemini API (Google AI)",
    category: "AI",
    what: "공개 AI 상담·RAG·임베딩·실시간 통역",
    plan: "사용량 기반 + Google 콘솔 spend cap",
    freeTier: "무료 등급: 분당/일일 요청 수 제한. 초과·유료키는 토큰당 과금.",
    paidTrigger: "무료 요청 한도 초과 또는 유료키로 토큰 과금 시작",
    paidPrice: "Flash 계열 토큰당(추정 단가 — usagePricing.ts)",
    consoleUrl: "https://aistudio.google.com/app/usage",
    measure: "live",
    liveKey: "gemini",
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "백엔드 · DB",
    what: "PostgreSQL · 인증 · 스토리지 · RLS · pgvector",
    plan: "Pro ($25/월, 2026-07 전환)",
    freeTier: "Pro 포함: DB 8GB · 스토리지 100GB · egress 250GB/월",
    paidTrigger: "포함량 초과분은 종량 과금",
    paidPrice: "$25/월 + 초과 종량",
    consoleUrl: "https://supabase.com/dashboard/project/hvwwlkawaxabhtumjhrg/settings/billing",
    measure: "live",
    liveKey: "supabase",
  },
  {
    id: "resend",
    name: "Resend",
    category: "이메일",
    what: "트랜잭션 이메일(알림·설문·문의) — 1순위",
    plan: "Free 추정",
    freeTier: "월 3,000통 · 일 100통",
    paidTrigger: "월 3,000통 초과 시",
    paidPrice: "Pro $20/월(5만통~)",
    consoleUrl: "https://resend.com/overview",
    measure: "live",
    liveKey: "notif",
    notifChannels: ["resend", "email"],
  },
  {
    id: "ses",
    name: "AWS SES",
    category: "이메일",
    what: "이메일 발송 폴백(Resend 실패 시)",
    plan: "사용량 기반",
    freeTier: "샌드박스 일 200통 / EC2 발송 시 월 6.2만통 무료",
    paidTrigger: "무료 한도 초과 시 1,000통당 과금",
    paidPrice: "$0.10 / 1,000통",
    consoleUrl: "https://console.aws.amazon.com/ses",
    measure: "live",
    liveKey: "notif",
    notifChannels: ["ses", "aws_ses"],
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "메시지",
    what: "SMS 발송(코디·환자 알림)",
    plan: "사용량 기반(무료 한도 없음)",
    freeTier: "체험 크레딧만 — 사실상 건당 과금",
    paidTrigger: "체험 크레딧 소진 후 발송 즉시 과금",
    paidPrice: "건당 종량(국가별 상이)",
    consoleUrl: "https://console.twilio.com",
    measure: "live",
    liveKey: "notif",
    notifChannels: ["twilio", "sms"],
  },
  {
    id: "telegram",
    name: "Telegram Bot",
    category: "메시지",
    what: "운영자 알림(어드민 경보)",
    plan: "무료",
    freeTier: "봇 메시지 무료(분당 속도 제한만)",
    paidTrigger: "없음(무료)",
    paidPrice: "—",
    consoleUrl: "https://core.telegram.org/bots",
    measure: "live",
    liveKey: "notif",
    notifChannels: ["telegram"],
  },
  {
    id: "livekit",
    name: "LiveKit",
    category: "영상",
    what: "원격협진 WebRTC 영상방",
    plan: "Ship ($50/월, 2026-07-28 구독)",
    freeTier: "Ship 포함: WebRTC 참가자 150,000분/월 · 통역봇 5,000분/월 (Build 무료는 5,000분·1,000분이었음)",
    paidTrigger: "포함량 초과 시 참가자 $0.0005/분 · 봇 $0.01/분",
    paidPrice: "$50/월 + 초과 종량 (유료 플랜부터 잡음제거·녹화 사용 가능)",
    consoleUrl: "https://cloud.livekit.io",
    measure: "proxy",
    liveKey: "livekit",
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "호스팅",
    what: "Next.js 호스팅·배포·서버리스/엣지·cron",
    // ⚠️ 아래 문구는 **토큰이 없을 때만 쓰는 대체 텍스트**다. 토큰이 있으면 요금제·청구주기·
    //    포함 크레딧은 청구 API 실값으로 덮어써서 화면에 나온다(그래서 이 문구는 안 낡는다).
    plan: "Pro ($20/월, 2026-07-24 전환)",
    freeTier:
      "Pro 포함: 크레딧 $20/주기 · Edge Requests 1,000만 · Fast Data Transfer 1TB (2026-07-28 청구 API 실확인)",
    paidTrigger: "크레딧 $20 소진 후 종량 — 실측상 소진액의 94%가 «빌드 CPU 시간»이었다(2026-07-28)",
    paidPrice: "$20/월/멤버 + 초과 종량 (빌드 ≈ 벽시계 1분당 $0.0143 · 건당 약 $0.044)",
    consoleUrl: "https://vercel.com/bonrois-projects/healo-khidi/usage",
    measure: "console", // 토큰(VERCEL_API_TOKEN 또는 VERCEL_TOKEN)이 있으면 자동으로 live 로 승격
  },
  {
    id: "sentry",
    name: "Sentry",
    category: "모니터링",
    what: "오류·예외 추적, AI 가드 침입 알림",
    plan: "Developer(무료) 추정",
    freeTier: "월 5,000 오류 이벤트",
    paidTrigger: "월 오류 이벤트 한도 초과 시",
    paidPrice: "Team $26/월~",
    consoleUrl: "https://sentry.io",
    measure: "console",
  },
];

// 무료 한도(숫자) — %바 계산용. 모르는 건 생략(콘솔 확인).
export const FREE_LIMITS = {
  supabaseDbBytes: 500 * 1024 * 1024, // 500MB
  supabaseStorageBytes: 1024 * 1024 * 1024, // 1GB
  resendMonthly: 3000, // 월 3,000통
} as const;
