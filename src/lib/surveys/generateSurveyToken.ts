/**
 * healwith: 환자 만족도 설문 토큰 생성 및 발송
 *
 * KHIDI KPI K-03 — 환자 만족도 90점 측정 핵심 수단 (목표 단일 소스 = src/lib/khidi/targets.ts)
 *
 * - generateSurveyToken: crypto.randomBytes 32자 토큰 → surveys 테이블 insert
 * - sendSurveyEmail:     Resend + HTML 이메일 (6개 언어)
 * - hashIp:             SHA-256 (개인정보 보호)
 *
 * NOTE: surveys 테이블은 마이그레이션으로 추가됨 (20260501_may_features_bundle.sql).
 * DB 타입 파일이 갱신되기 전까지 supabaseAdmin 을 `as any` 캐스팅 사용.
 */

import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderSurveyEmail } from "./surveyEmailTemplate";
import { siteUrl } from "@/lib/siteUrl";
import { withLang } from "@/lib/i18n/guestLinkLang";

/** 32자 URL-safe 토큰 (node:crypto 기반, 외부 패키지 의존 없음) */
function generateToken(): string {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(32);
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");
}

export interface GenerateSurveyTokenResult {
  ok: boolean;
  surveyId?: string;
  token?: string;
  error?: string;
}

/**
 * 새 설문 토큰 생성 + surveys 테이블 insert
 *
 * 설문은 상담세션(consultationSessionId) 또는 케이스(inquiryId) 중 하나에 연결한다.
 * 2026-07-21: consultation_sessions.status='completed' 가 영구 0건이라 설문이 구조적으로
 * 0건이었다(실측: 세션 35건 전부 scheduled). 사후관리(follow_up) 케이스에도 보낼 수 있게
 * inquiryId 경로를 추가한다(surveys.inquiry_id — 컬럼·인덱스는 이미 실재, PR #844).
 *
 * @param opts.consultationSessionId 사전상담 세션 ID (세션 연결 시)
 * @param opts.inquiryId             문의/케이스 ID (사후관리 케이스 연결 시)
 * @param opts.patientId             환자 auth.users.id (nullable — 게스트 환자 대응)
 * @param opts.surveyType            기본 'post_consultation'. 사후관리는 'post_followup'
 */
export async function generateSurveyToken(opts: {
  consultationSessionId?: string | null;
  inquiryId?: number | null;
  patientId?: string | null;
  surveyType?: string;
}): Promise<GenerateSurveyTokenResult> {
  // 세션·케이스 둘 다 없으면 어디에도 안 붙은 고아 설문이 된다 — 존재검사(멱등 가드)가
  // 영원히 못 찾아 매 실행마다 새 행이 쌓이고, K-03 집계도 대상을 못 짚는다. 실패-닫힘.
  if (!opts.consultationSessionId && !opts.inquiryId) {
    console.error("[surveys/generateToken] consultationSessionId·inquiryId 둘 다 없음");
    return { ok: false, error: "missing_link" };
  }

  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000
  ).toISOString(); // 14일

  const db = supabaseAdmin as any;

  const insertPayload: Record<string, unknown> = {
    consultation_session_id: opts.consultationSessionId ?? null,
    inquiry_id: opts.inquiryId ?? null,
    survey_type: opts.surveyType ?? "post_consultation",
    token,
    expires_at: expiresAt,
    responded: false,
    // sent_at 은 sendSurveyEmail 에서 업데이트
  };

  if (opts.patientId) {
    insertPayload.patient_id = opts.patientId;
  }

  const { data, error } = await db
    .from("surveys")
    .insert(insertPayload)
    .select("id, token")
    .single();

  if (error) {
    console.error("[surveys/generateToken] insert error:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, surveyId: data.id, token: data.token };
}

/**
 * SHA-256 으로 IP 해시 (평문 IP 저장 금지 — 개인정보 보호)
 */
export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT || "healo_survey_salt"))
    .digest("hex");
}

export interface SendSurveyEmailOptions {
  surveyId: string;
  token: string;
  toEmail: string;
  patientName?: string;
  lang?: "ko" | "en" | "ru" | "kk" | "zh" | "ja";
}

export interface SendSurveyEmailResult {
  ok: boolean;
  provider?: string;
  error?: string;
}

/**
 * 설문 이메일 발송 + surveys.sent_at 업데이트
 */
export async function sendSurveyEmail(
  opts: SendSurveyEmailOptions
): Promise<SendSurveyEmailResult> {
  // 기준 주소는 siteUrl() 하나로 (VERCEL_URL 폴백 금지 — 실제 환자 메일에 배포 임시주소가
  // 나갔던 사고 2026-07-22, src/lib/siteUrl.ts 주석 참고)
  const baseUrl = siteUrl();

  const lang = opts.lang || "ko";
  // ?lang= : 메신저에 붙여넣었을 때 미리보기 봇이 제 언어 카드를 만들게(2026-09-05, kk→kz 는 withLang 이 맞춘다)
  const surveyUrl = withLang(`${baseUrl.replace(/\/$/, "")}/survey/${opts.token}`, lang);

  const { subject, html, text } = renderSurveyEmail({
    recipientName: opts.patientName,
    surveyUrl,
    lang,
  });

  const result = await sendEmail({
    to: opts.toEmail,
    subject,
    html,
    text,
    tags: {
      type: "satisfaction_survey",
      survey_id: opts.surveyId,
    },
  });

  if (result.ok) {
    // sent_at 업데이트
    const db = supabaseAdmin as any;
    await db
      .from("surveys")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", opts.surveyId);
  } else {
    console.error("[surveys/sendEmail] send failed:", result.error);
  }

  return { ok: result.ok, provider: result.provider, error: result.error };
}
