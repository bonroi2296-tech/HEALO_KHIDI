/**
 * /api/inquiries/step1 — 단일 funnel Step 1 제출
 *
 * inquiries 테이블에 신규 row insert + step1_completed_at = now()
 * 기존 /api/inquiries/create 를 래핑하되, 새 컬럼 (cancer_type, preferred_language, phone, short_memo, step1_completed_at, ai_chat_thread_id) 추가 저장.
 */
export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
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
import { detectInquiryIsTest } from "@/lib/khidi/testData";
import { resolveAgencyIdForUser } from "@/lib/auth/resolveAgencyIdForUser";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderInquiryReceivedEmail } from "@/lib/email/templates/inquiryReceived";
import { trackingUrl, toTrackingLang } from "@/lib/inquiry/trackingLink";
import { siteUrl } from "@/lib/siteUrl";

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
  // PIPA 동의 (출시 법적 필수). 키별 boolean. 필수 4종은 서버에서도 재확인(폼 우회 방지).
  consents: z.record(z.boolean()).optional(),
  consentVersion: z.string().max(20).optional(),
  // 유입 기록(선택) — «어느 언어 화면·어디서·어느 페이지를 보고» 들어온 문의인지.
  // 브라우저가 보내는 값이라 신뢰할 수 없다 → 형태·길이만 제한하고 그대로 저장(집계용, 권한 판단에 안 씀).
  sourceLocale: z.enum(["ko", "en", "ru", "kz", "kk", "zh", "ja"]).nullable().optional(),
  referrerHost: z.string().max(120).nullable().optional(),
  landingPath: z.string().max(200).nullable().optional(),
  utm: z.record(z.string().max(60)).nullable().optional(),
});

// 외국인 의료정보 수집·국외이전이라 아래 4종은 법적 필수 동의.
const REQUIRED_CONSENT_IDS = [
  "pipa_collection",
  "sensitive_health",
  "third_party_hospital",
  "cross_border_kr",
];

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

  // 인코딩 깨진 본문(U+FFFD) 거부 — CP949 등으로 깨진 한글이 DB·알림메일에 그대로 박힘 (POSTMORTEMS #92)
  if (hasMojibake(body)) {
    return Response.json(
      { ok: false, error: "broken_encoding", detail: "body contains U+FFFD — send UTF-8" },
      { status: 400 }
    );
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

  // PIPA 필수 동의 서버 재확인 — 폼 게이트를 우회한 직접 호출도 차단.
  const consents = data.consents ?? {};
  const missingConsent = REQUIRED_CONSENT_IDS.filter((id) => consents[id] !== true);
  if (missingConsent.length > 0) {
    return Response.json(
      { ok: false, error: "consent_required" },
      { status: 400 }
    );
  }

  // 로그인 상태로 제출했으면 본인 계정에 귀속(환자 마이페이지 '내 문의'에 노출용).
  // 게스트 제출은 토큰 없음 → NULL 유지(공개 폼 보존). 토큰 검증 실패도 게스트로 처리.
  let userId: string | null = null;
  // 로그인 계정 이메일 — 실적 오염 차단용(공유 @test.com 계정이 폼엔 개인 이메일을 적는 경로).
  // getUser 가 이미 user 객체를 주므로 추가 조회 없이 email 을 함께 캡처한다.
  let accountEmail: string | null = null;
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { data: u } = await supabaseAdmin.auth.getUser(authHeader.substring(7));
      userId = u?.user?.id ?? null;
      accountEmail = u?.user?.email ?? null;
    } catch { /* 게스트로 처리 */ }
  }

  // 로그인 계정이 에이전시 소속이면 본인 에이전시로 귀속 → 에이전시 포털(agency_id 필터)에서
  // 자기 접수건·진행상황이 보이게. 공개 폼만 이 각인이 누락돼 있었음(/api/agency/refer 는 찍음).
  // service_role 조회(agency_users RLS 우회). 실패해도 접수는 진행(fail-safe, agency_id 없이 저장).
  const agencyId = await resolveAgencyIdForUser(supabaseAdmin, userId);

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
        // PIPA 동의 기록 보존 (감사·증빙용). 정본은 inquiries.intake.consents.
        intake: {
          consents,
          consentVersion: data.consentVersion ?? null,
          consentAt: new Date().toISOString(),
        },
        status: "received",
        match_accuracy: 60,
        step1_completed_at: new Date().toISOString(),
        ai_chat_thread_id: data.aiChatThreadId ?? null,
        // source(채널)는 여기서 안 넣는다 — DB 기본값이 'web' 이고 그게 맞다.
        // (AI 채팅에서 만들어지는 문의는 publicChatHelpers 가 'ai_agent'·'messenger_*' 로 따로 찍는다.)
        // 유입 기록 — 다국어·콘텐츠가 실제로 문의를 데려왔는지 나중에 세기 위한 네 칸.
        // 없으면 NULL(예전 문의·저장소 차단 브라우저)이고, 접수 자체는 이 값들과 무관하게 진행된다.
        source_locale: data.sourceLocale ?? null,
        referrer_host: data.referrerHost ?? null,
        landing_path: data.landingPath ?? null,
        utm: data.utm ?? null,
        user_id: userId,
        // 에이전시 유저의 공개 폼 접수를 본인 에이전시로 귀속(포털 가시성). 비에이전시/게스트는 null.
        agency_id: agencyId,
        // 테스트/실제 분리: 사무실IP·테스트이메일·(로그인)계정이메일·수동도장이면 테스트로 표시(KPI 기본 제외).
        is_test: detectInquiryIsTest({ ip: clientIp, email: data.email, accountEmail, manual: (body as any)?.isTest === true }),
      })
      .select("id, public_token")
      .single();

    if (insertError) {
      console.error("[/api/inquiries/step1] insert error:", insertError.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    // 관리자 알림 (실패해도 무시)
    // after(): 응답 후에도 함수를 살려 이메일 발송이 잘리지 않게 (서버리스 freeze 방지)
    after(() => sendAdminNotification({
      inquiryId: row.id,
      nationality: data.nationality,
      treatmentType: data.cancerType,
      contactMethod: data.email ? "email" : "phone",
      createdAt: new Date().toISOString(),
    }).catch(() => {}));

    // 문의자에게 접수 확인 + 진행상황 주소. 규칙 하나 — 「접수되면 들어온 그 채널로 주소를
    // 돌려준다」(PO 2026-08-03). 이메일이 없으면(전화·메신저 접수) 그냥 건너뛴다 —
    // 그 사람 몫은 완료 화면과 봇 답장이 맡는다.
    // 실패해도 접수 자체는 성공이다(메일은 부가). 그래서 catch 로 삼킨다.
    const notifyTo = data.email; // 클로저 안에서 타입 좁힘이 풀리므로 밖에서 붙잡아 둔다
    if (notifyTo) {
      after(async () => {
        try {
          const { subject, html, text } = renderInquiryReceivedEmail({
            recipientName: data.firstName || undefined,
            trackUrl: trackingUrl(siteUrl(), row.public_token, data.preferredLanguage || data.spokenLanguage),
            lang: toTrackingLang(data.preferredLanguage || data.spokenLanguage),
          });
          const res = await sendEmail({
            to: notifyTo,
            subject,
            html,
            text,
            tags: { kind: "inquiry_received", inquiry: String(row.id) },
          });
          // 성공도 남긴다 — 「조용히 안 나간 메일」은 아무 흔적이 없어 몇 주 뒤에야 들통난다.
          console.log(
            `[/api/inquiries/step1] 접수확인 메일 #${row.id}: ${res.ok ? "발송" : "실패"} (${res.provider}${res.error ? ` — ${res.error}` : ""})`
          );
        } catch (e: any) {
          console.error("[/api/inquiries/step1] 접수확인 메일 실패(무시):", e?.message);
        }
      });
    }

    return Response.json({ ok: true, inquiryId: row.id, publicToken: row.public_token });
  } catch (e: any) {
    console.error("[/api/inquiries/step1] error:", e.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
