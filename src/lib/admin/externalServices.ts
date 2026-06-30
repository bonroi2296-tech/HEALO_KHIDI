/**
 * healwith 외부 서비스 레지스트리 (사용량·요금 모니터링 화면의 SoR)
 *
 * 목적: "지금 무엇을 얼마나 쓰는지 / 언제부터 돈이 나가는지"를 한 화면에서 본다.
 *       - 앱에서 실측 가능한 것(제미나이 토큰·비용, DB 활동량)은 live 로 채운다.
 *       - 벤더 콘솔에서만 보이는 것(대역폭·DB 용량·MAU 등)은 무료 한도/유료 임계와
 *         콘솔 링크만 제공(앱이 벤더 Management API 키를 들고 있지 않으므로).
 *
 * ⚠️ 무료 한도·유료 단가는 '참고치'다(벤더가 수시로 바꾼다). 정산 기준이 아니라
 *    "대략 언제 유료가 되는지" 감을 주는 용도 — 정확한 값은 각 콘솔에서 확인.
 */

export type MeasureKind = "live" | "console";

export interface ExternalService {
  id: string;
  name: string;
  category: string; // AI · 백엔드/DB · 호스팅 · 영상 · 모니터링
  what: string; // 우리가 쓰는 용도
  plan: string; // 현재 플랜
  freeTier: string; // 무료 한도 요약(참고)
  paidTrigger: string; // 유료 결제가 시작되는 조건/시점
  paidPrice: string; // 유료 단가 요약(참고)
  consoleUrl: string;
  measure: MeasureKind;
  /** measure='live' 일 때 API 응답에서 이 키로 실측치를 채운다. */
  liveKey?: "gemini" | "db_activity";
}

export const EXTERNAL_SERVICES: ExternalService[] = [
  {
    id: "gemini",
    name: "Gemini API (Google AI)",
    category: "AI",
    what: "공개 AI 상담·RAG·임베딩·실시간 통역",
    plan: "사용량 기반(pay-as-you-go) + Google 콘솔 spend cap",
    freeTier: "무료 등급: 분당/일일 요청 수 제한(저사용은 무료). 초과·유료키는 토큰당 과금.",
    paidTrigger: "무료 등급 요청 한도 초과 또는 유료키로 토큰 과금이 시작되는 시점",
    paidPrice: "Flash 계열 토큰당(입력/출력 분리) — 단가표는 src/lib/ai/usageLog.ts (추정)",
    consoleUrl: "https://aistudio.google.com/app/usage",
    measure: "live",
    liveKey: "gemini",
  },
  {
    id: "supabase",
    name: "Supabase",
    category: "백엔드 · DB",
    what: "PostgreSQL DB · 인증 · 스토리지 · RLS · pgvector",
    plan: "Free",
    freeTier: "DB 500MB · 스토리지 1GB · 월 egress 5GB · MAU 50,000",
    paidTrigger: "위 한도 초과 시 Pro 전환 필요(DB 용량·MAU가 먼저 닿을 가능성)",
    paidPrice: "Pro $25/월 + 초과분 종량",
    consoleUrl:
      "https://supabase.com/dashboard/project/hvwwlkawaxabhtumjhrg/settings/billing",
    measure: "live",
    liveKey: "db_activity",
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "호스팅",
    what: "Next.js 호스팅 · 배포 · 서버리스/엣지 함수 · cron",
    plan: "Hobby(무료) 추정",
    freeTier: "대역폭 100GB/월 · 함수 실행 한도 · 빌드 시간 제한",
    paidTrigger: "상업적 트래픽·대역폭/함수 한도 초과, 또는 팀 협업 기능 필요 시",
    paidPrice: "Pro $20/월/멤버 + 초과 종량",
    consoleUrl: "https://vercel.com/bonrois-projects/healo-khidi/usage",
    measure: "console",
  },
  {
    id: "livekit",
    name: "LiveKit",
    category: "영상",
    what: "원격협진 WebRTC 영상방(상담)",
    plan: "Cloud Free 추정",
    freeTier: "월 참가자·대역폭 무료 한도(저사용 무료)",
    paidTrigger: "월 참가자 분·대역폭 무료 한도 초과 시",
    paidPrice: "사용량 종량 또는 유료 플랜",
    consoleUrl: "https://cloud.livekit.io",
    measure: "console",
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
