/**
 * HEALO: 환자 만족도 설문 토큰 생성 및 발송
 *
 * KHIDI KPI K-03 — 환자 만족도 80점 이상 측정 핵심 수단
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
 * @param consultationSessionId 사전상담 세션 ID
 * @param patientId             환자 auth.users.id (nullable — 게스트 환자 대응)
 */
export async function generateSurveyToken(
  consultationSessionId: string,
  patientId?: string | null
): Promise<GenerateSurveyTokenResult> {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000
  ).toISOString(); // 14일

  const db = supabaseAdmin as any;

  const insertPayload: Record<string, unknown> = {
    consultation_session_id: consultationSessionId,
    survey_type: "post_consultation",
    token,
    expires_at: expiresAt,
    responded: false,
    // sent_at 은 sendSurveyEmail 에서 업데이트
  };

  if (patientId) {
    insertPayload.patient_id = patientId;
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
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://healo-khidi.vercel.app");

  const surveyUrl = `${baseUrl.replace(/\/$/, "")}/survey/${opts.token}`;
  const lang = opts.lang || "ko";

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
