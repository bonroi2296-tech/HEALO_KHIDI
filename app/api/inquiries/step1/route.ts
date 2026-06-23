/**
 * /api/inquiries/step1 — 단일 funnel Step 1 제출
 *
 * inquiries 테이블에 신규 row insert + step1_completed_at = now()
 * 기존 /api/inquiries/create 를 래핑하되, 새 컬럼 (cancer_type, preferred_language, phone, short_memo, step1_completed_at, ai_chat_thread_id) 추가 저장.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { encryptString, encryptStringNullable } from "@/lib/security/encryptionV2";
import {
  checkRateLimitPersistent,
  getClientIp,
  RATE_LIMITS,
  getRateLimitHeaders,
} from "@/lib/rateLimit";
import { sendAdminNotification } from "@/lib/notifications/adminNotifier";

const Step1Schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  nationality: z.string().min(1).max(10),
  // 활성 언어 코드는 'kz'(i18n·문의 퍼널 드롭다운과 동일). 'kk'(BCP47)도 하위호환으로 허용.
  // 과거 'kk'만 받아 카자흐어('kz') 문의가 400 거부되던 버그 수정(POSTMORTEMS #23 — 핵심 타겟 카자흐스탄 퍼널 차단).
  preferredLanguage: z.enum(["ko", "en", "ru", "kz", "kk", "zh", "ja"]),
  cancerType: z.string().min(1).max(50),
  shortMemo: z.string().max(200).nullable().optional(),
  aiChatThreadId: z.string().uuid().nullable().optional(),
  // 기존 호환 필드
  spokenLanguage: z.string().max(50).optional(),
  contactMethod: z.string().max(50).nullable().optional(),
  contactId: z.string().max(200).nullable().optional(),
  treatmentType: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = Step1Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "validation_error", detail: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 이메일 또는 전화 중 하나 필수
  const hasEmail = data.email?.trim();
  const hasPhone = data.phone?.trim() || data.contactId?.trim();
  if (!hasEmail && !hasPhone) {
    return Response.json(
      { ok: false, error: "missing_contact" },
      { status: 400 }
    );
  }

  try {
    const encFirstName = encryptString(data.firstName);
    const encLastName = encryptStringNullable(data.lastName ?? null);
    const encEmail = data.email ? encryptString(data.email) : null;
    const encPhone = (data.phone || data.contactId)
      ? encryptStringNullable(data.phone ?? data.contactId ?? null)
      : null;
    const encMemo = encryptStringNullable(data.shortMemo ?? null);

    const { data: row, error: insertError } = await supabaseAdmin
      .from("inquiries")
      .insert({
        first_name: encFirstName,
        last_name: encLastName,
        email: encEmail,
        nationality: data.nationality,
        spoken_language: data.spokenLanguage || data.preferredLanguage,
        preferred_language: data.preferredLanguage,
        cancer_type: data.cancerType,
        phone: encPhone,
        short_memo: encMemo,
        contact_method: data.contactMethod ?? null,
        contact_id: encPhone,
        treatment_type: data.treatmentType || data.cancerType,
        preferred_date: null,
        preferred_date_flex: true,
        message: encMemo,
        attachments: [],
        intake: {},
        status: "received",
        match_accuracy: 60,
        step1_completed_at: new Date().toISOString(),
        ai_chat_thread_id: data.aiChatThreadId ?? null,
      })
      .select("id, public_token")
      .single();

    if (insertError) {
      console.error("[/api/inquiries/step1] insert error:", insertError.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    // 관리자 알림 (실패해도 무시)
    sendAdminNotification({
      inquiryId: row.id,
      nationality: data.nationality,
      treatmentType: data.cancerType,
      contactMethod: data.email ? "email" : "phone",
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    return Response.json({ ok: true, inquiryId: row.id, publicToken: row.public_token });
  } catch (e: any) {
    console.error("[/api/inquiries/step1] error:", e.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
