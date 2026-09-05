/**
 * healwith: 에이전시 환자 의뢰(접수) API
 *
 * POST /api/agency/refer
 *   → 로그인한 에이전시 담당자가 환자를 직접 의뢰. 본인 에이전시(agency_id)로
 *     자동 귀속되어 inquiries 에 생성되고, 관리자/코디에게 알림 발송.
 *
 * 보안:
 * - checkAgencyAuth 로 인증된 에이전시만(agency_id 위조 불가 — 서버가 본인 것으로 강제)
 * - PII(이름·이메일·연락처·메모)는 AES-256-GCM 암호화 후 *_encrypted 컬럼
 * - 공개 접수(/api/inquiries/create)와 동일한 암호화·검증 패턴 재사용
 */

export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { checkAgencyAuth } from "@/lib/auth/checkAgencyAuth";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { encryptString, encryptStringNullable } from "@/lib/security/encryptionV2";
import { encryptPiiInObject } from "@/lib/security/piiJson";
import { checkRateLimit, getClientIp, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rateLimit";
import { sendAdminNotification } from "@/lib/notifications/adminNotifier";
import { detectInquiryIsTest } from "@/lib/khidi/testData";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import { normalizeCancerType } from "@/lib/khidi/medicalLabels";

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  // 1) 인증 — 에이전시 담당자만
  const auth = await checkAgencyAuth(request);
  if (!auth.isAgencyUser || !auth.agencyId) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 403 });
  }

  // 2) 레이트리밋(도배 방지)
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    // 인코딩 깨진 본문(U+FFFD) 거부 — CP949 등으로 깨진 한글이 DB·알림메일에 그대로 박힘 (POSTMORTEMS #92)
    if (hasMojibake(body)) {
      return Response.json(
        { ok: false, error: "broken_encoding", detail: "body contains U+FFFD — send UTF-8" },
        { status: 400 }
      );
    }

    // 3) 검증 — 암종/치료유형 필수 + 연락처(이메일 또는 메신저) 필수
    if (!body.treatmentType || !String(body.treatmentType).trim()) {
      return Response.json(
        { ok: false, error: "missing_required_fields", detail: "treatmentType is required" },
        { status: 400 }
      );
    }
    const hasEmail = body.email && String(body.email).trim();
    const hasMessenger = body.contactMethod && body.contactId && String(body.contactId).trim();
    if (!hasEmail && !hasMessenger) {
      return Response.json(
        { ok: false, error: "missing_contact", detail: "email or (contactMethod + contactId) required" },
        { status: 400 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (hasEmail && !emailRegex.test(String(body.email))) {
      return Response.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    // 4) PII 암호화
    const encryptedEmail = hasEmail ? encryptString(String(body.email).trim()) : null;
    const encryptedFirstName = encryptStringNullable(body.firstName);
    const encryptedLastName = encryptStringNullable(body.lastName);
    const encryptedMessage = encryptStringNullable(body.message);
    const encryptedContactId = encryptStringNullable(body.contactId);

    // 4-1) 상세 진단정보(intake) — 에이전시가 자세히 줄 수 있게. PII 키만 암호화, 의료 텍스트는 평문(테이블 service_role 전용).
    const intakeIn = (body.intake && typeof body.intake === "object" && !Array.isArray(body.intake)) ? body.intake : {};
    const encryptedIntake = encryptPiiInObject({ ...intakeIn, source: "agency_referral" }, null, "intake");

    // 4-2) 첨부서류(환자차트·진단서·검사결과) — /api/attachments/upload 가 돌려준 path 참조만 받음. 최대 20개.
    const attachmentsIn = Array.isArray(body.attachments) ? body.attachments : [];
    const attachments = attachmentsIn
      .filter((a: any) => a && typeof a.path === "string" && a.path.length < 500)
      .slice(0, 20)
      .map((a: any) => ({
        path: a.path,
        name: typeof a.name === "string" ? a.name.slice(0, 200) : null,
        type: typeof a.type === "string" ? a.type.slice(0, 100) : null,
        category: typeof a.category === "string" ? a.category.slice(0, 32) : "other",
      }));

    // 5) inquiries insert — 본인 에이전시로 귀속, 진행단계 'received'
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("inquiries")
      .insert({
        first_name: encryptedFirstName,
        last_name: encryptedLastName,
        email: encryptedEmail,
        nationality: body.nationality || null,
        spoken_language: body.spokenLanguage || null,
        contact_method: body.contactMethod || null,
        contact_id: encryptedContactId,
        treatment_type: String(body.treatmentType).trim(),
        // 암종 칸은 «정해진 키»여야 한다. 자유 입력을 그대로 넣으면 6개 언어 라벨이 안 붙고
        // (러시아 코디 화면에 한국어가 샌다) 진단코드 추천·병원 매칭이 그 케이스만 건너뛴다.
        // 우리 라벨과 정확히 맞으면 키로 되돌리고, 아니면 비운다(원문은 treatment_type 에 그대로 남는다).
        cancer_type: normalizeCancerType(String(body.treatmentType)),
        message: encryptedMessage,
        attachments,
        intake: encryptedIntake,
        status: "received",
        source: "agency_referral",
        agency_id: auth.agencyId,
        case_status: "intake",
        case_status_note: `에이전시 의뢰 (${auth.agencyName || ""})`.trim(),
        case_status_updated_at: new Date().toISOString(),
        // 테스트/실적 분리(PR #501): 생성 시점 판정 — 데모 에이전시 계정(@test.com)·사무실 IP·
        // 테스트 환자 이메일의 온보딩 연습 의뢰가 KHIDI 실적 문의로 집계되지 않게.
        // accountEmail = 로그인 에이전시 계정(폼 email 과 별개) — 감지기가 둘 다 검사.
        is_test: detectInquiryIsTest({
          ip,
          email: hasEmail ? String(body.email).trim() : null,
          accountEmail: auth.email || null,
        }),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[agency/refer] insert error:", insertError.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    const inquiryId = inserted.id;

    // 6) 케이스 단계 이력 1줄 (포털 타임라인용)
    // case_status_history 는 생성 스키마 타입에 없어 캐스팅(기존 agency API 패턴과 동일)
    await (supabaseAdmin as any)
      .from("case_status_history")
      .insert({
        inquiry_id: inquiryId,
        status: "received",
        note: `에이전시 의뢰 접수 (${auth.agencyName || ""})`.trim(),
        created_by: auth.userId || null,
      })
      .then(undefined, () => { /* 이력 실패는 무시 */ });

    // 7) 관리자/코디 알림(실패해도 접수는 성공)
    // after(): 응답 후에도 함수를 살려 이메일 발송이 잘리지 않게 (서버리스 freeze 방지)
    after(() => sendAdminNotification({
      inquiryId,
      nationality: body.nationality,
      treatmentType: String(body.treatmentType).trim(),
      contactMethod: body.contactMethod || (hasEmail ? "email" : "messenger"),
      createdAt: new Date().toISOString(),
    }).catch(() => { /* ignore */ }));

    console.log(`[agency/refer] ✅ inquiry ${inquiryId} by agency ${auth.agencyId}`);
    return Response.json({ ok: true, inquiryId });
  } catch (err: any) {
    console.error("[agency/refer] error:", err?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
