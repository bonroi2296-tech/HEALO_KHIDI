/**
 * HEALO: 카카오 알림톡 어댑터
 *
 * 환경변수:
 *   KAKAO_BIZ_API_KEY  — 카카오 비즈니스 API 키
 *   KAKAO_SENDER_KEY   — 발신 프로필 키 (카카오 비즈메시지 포털에서 발급)
 *   KAKAO_BIZ_API_URL  — API 엔드포인트 (기본: https://alimtalk-api.bizmsg.kr)
 *
 * 키 없으면 console.log 만 출력 (개발/Mock 모드)
 */

import "server-only";

// ── 템플릿 상수 ──────────────────────────────────────────────
export const KAKAO_TEMPLATES = {
  /** 예약 30분 전 리마인더 */
  TPL_REMINDER_30MIN: "TPL_REMINDER_30MIN",
  /** 상담 후 만족도 설문 요청 */
  TPL_SURVEY_REQUEST: "TPL_SURVEY_REQUEST",
  /** 이상 증상 알림 */
  TPL_SYMPTOM_ALERT: "TPL_SYMPTOM_ALERT",
  /** 예약 확정 안내 */
  TPL_BOOKING_CONFIRMED: "TPL_BOOKING_CONFIRMED",
  /** 예약 취소 안내 */
  TPL_BOOKING_CANCELLED: "TPL_BOOKING_CANCELLED",
  /** 코디네이터 배정 안내 */
  TPL_COORDINATOR_ASSIGNED: "TPL_COORDINATOR_ASSIGNED",
} as const;

export type KakaoTemplateCode = (typeof KAKAO_TEMPLATES)[keyof typeof KAKAO_TEMPLATES];

// ── 타입 ─────────────────────────────────────────────────────
export interface KakaoAlimtalkOptions {
  /** 수신자 전화번호 (+82 포함 국제번호 또는 01x 형식) */
  to: string;
  /** 카카오 알림톡 템플릿 코드 */
  template: KakaoTemplateCode;
  /** 템플릿 치환 변수 (#{변수명} 자리에 들어가는 값) */
  variables: Record<string, string>;
  /** 알림톡 실패 시 SMS 대체 발송 (fallback). 기본 false */
  smsFailover?: {
    content: string;
    subject?: string;
  };
}

export interface KakaoAlimtalkResult {
  ok: boolean;
  mode: "live" | "mock";
  messageId?: string;
  error?: string;
}

// ── 환경변수 체크 ────────────────────────────────────────────
function isMockMode(): boolean {
  return (
    !process.env.KAKAO_BIZ_API_KEY ||
    !process.env.KAKAO_SENDER_KEY
  );
}

// ── 전화번호 정규화 ──────────────────────────────────────────
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9+]/g, "");
  // 01x 형식이면 +82 붙이기
  if (/^01[0-9]/.test(digits)) {
    return "+82" + digits.slice(1);
  }
  return digits;
}

// ── 메인 함수 ────────────────────────────────────────────────
/**
 * 카카오 알림톡 발송
 *
 * - 키 없으면 Mock 모드 (console.log + 성공 응답)
 * - 키 있으면 카카오 비즈메시지 API 실 호출
 */
export async function sendKakaoAlimtalk(
  opts: KakaoAlimtalkOptions
): Promise<KakaoAlimtalkResult> {
  // ── Mock 모드 ───────────────────────────────────────────────
  if (isMockMode()) {
    console.log(
      "[kakao/mock] sendKakaoAlimtalk — 키 미설정, 실 발송 없음:",
      JSON.stringify(
        {
          to: normalizePhone(opts.to).replace(/(\+82|0)(\d{2})\d{4}(\d{4})/, "$1$2****$3"),
          template: opts.template,
          variables: opts.variables,
        },
        null,
        2
      )
    );
    return { ok: true, mode: "mock", messageId: `mock-${Date.now()}` };
  }

  // ── Live 모드 ────────────────────────────────────────────────
  try {
    const apiUrl =
      process.env.KAKAO_BIZ_API_URL ||
      "https://alimtalk-api.bizmsg.kr/v2/sender/send";

    const phone = normalizePhone(opts.to);

    // 카카오 비즈메시지 API 스펙 (NHN Cloud / bizmsg.kr 공통 형식)
    const body: Record<string, unknown> = {
      senderKey: process.env.KAKAO_SENDER_KEY,
      templateCode: opts.template,
      recipientList: [
        {
          recipientNo: phone,
          templateParameter: opts.variables,
          ...(opts.smsFailover
            ? {
                resendType: "SMS",
                resendContent: opts.smsFailover.content,
                resendTitle: opts.smsFailover.subject,
              }
            : {}),
        },
      ],
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Secret-Key": process.env.KAKAO_BIZ_API_KEY!,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[kakao/live] API error:", res.status, text);
      return { ok: false, mode: "live", error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }

    const json: any = await res.json();
    // 카카오 비즈메시지 응답: { header: { resultCode: "0", resultMessage: "..." }, message: { ... } }
    const resultCode = json?.header?.resultCode ?? json?.resultCode;
    if (resultCode !== "0" && resultCode !== 0) {
      const msg = json?.header?.resultMessage ?? json?.resultMessage ?? "unknown";
      return { ok: false, mode: "live", error: `kakao resultCode=${resultCode}: ${msg}` };
    }

    const messageId = json?.message?.requestId ?? json?.requestId ?? `kakao-${Date.now()}`;
    return { ok: true, mode: "live", messageId };
  } catch (err: any) {
    console.error("[kakao/live] exception:", err.message);
    return { ok: false, mode: "live", error: err.message };
  }
}

/**
 * 30분 전 리마인더 알림톡 전송 헬퍼
 */
export async function sendReminder30MinKakao(opts: {
  to: string;
  patientName: string;
  scheduledAt: string; // ISO
  joinUrl: string;
}): Promise<KakaoAlimtalkResult> {
  const scheduledFormatted = new Date(opts.scheduledAt).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return sendKakaoAlimtalk({
    to: opts.to,
    template: KAKAO_TEMPLATES.TPL_REMINDER_30MIN,
    variables: {
      patient_name: opts.patientName,
      scheduled_at: scheduledFormatted,
      join_url: opts.joinUrl,
    },
    smsFailover: {
      subject: "[HEALO] 30분 후 상담",
      content: `[HEALO] ${opts.patientName}님, 30분 후 상담이 시작됩니다.\n입장: ${opts.joinUrl}`,
    },
  });
}
