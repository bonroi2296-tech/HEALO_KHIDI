/**
 * HEALO: 문의 생성 API (서버 전용)
 * 
 * 경로: /api/inquiries/create
 * 권한: 공개 (Rate limited)
 * 
 * 목적:
 * - 클라이언트에서 문의를 제출하면 서버에서 암호화 후 DB에 저장
 * - RLS 우회 (service_role_key 사용)
 * - 기존 클라이언트 직접 insert를 서버 경유로 변경
 * 
 * 🔒 보안:
 * - RLS 정책: 클라이언트 직접 insert 차단
 * - 서버 API만 insert 가능 (service_role_key)
 * - PII 암호화 중앙화
 * - Rate limiting 적용
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../src/lib/rag/supabaseAdmin";
import { encryptString, encryptStringNullable } from "../../../../src/lib/security/encryptionV2";
import { checkRateLimit, getClientIp, RATE_LIMITS, getRateLimitHeaders } from "../../../../src/lib/rateLimit";
import { logInquiryReceived } from "../../../../src/lib/operationalLog";
import { trackFunnelEvent } from "../../../../src/lib/events/funnelTracking";
import { sendAdminNotification } from "../../../../src/lib/notifications/adminNotifier";

export async function POST(request: NextRequest) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();
  
  const clientIp = getClientIp(request);
  const apiPath = '/api/inquiries/create';
  
  // ========================================
  // 1. Rate limiting (봇/도배 방지)
  // ========================================
  const rateLimitResult = checkRateLimit(clientIp, RATE_LIMITS.INQUIRY);
  if (!rateLimitResult.allowed) {
    console.warn(`[${apiPath}] Rate limit exceeded: ${clientIp}`);
    
    // ✅ 퍼널 이벤트: 차단
    trackFunnelEvent({
      stage: 'form_blocked',
      dropReason: 'rate_limit_exceeded',
    });
    
    return Response.json(
      { 
        ok: false, 
        error: "rate_limit_exceeded",
        message: rateLimitResult.reason,
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }
  
  // ========================================
  // 2. Body 파싱 및 검증
  // ========================================
  try {
    const body = await request.json().catch(() => ({}));
    
    // 필수 필드 검증: treatmentType
    if (!body.treatmentType) {
      return Response.json(
        { ok: false, error: "missing_required_fields", detail: "treatmentType is required" },
        { status: 400 }
      );
    }
    
    // 연락처 검증: 이메일 OR (contactMethod + contactId)
    const hasEmail = body.email && body.email.trim();
    const hasMessenger = body.contactMethod && body.contactId && body.contactId.trim();
    
    if (!hasEmail && !hasMessenger) {
      return Response.json(
        { ok: false, error: "missing_contact", detail: "email or (contactMethod + contactId) is required" },
        { status: 400 }
      );
    }
    
    // 이메일 형식 검증 (이메일이 있을 경우만) - 정규식 사용
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (hasEmail && (typeof body.email !== 'string' || !emailRegex.test(body.email))) {
      return Response.json(
        { ok: false, error: "invalid_email" },
        { status: 400 }
      );
    }
    
    // ========================================
    // 3. PII 암호화
    // ========================================
    try {
      // 이메일 암호화 (있을 경우만)
      const encryptedEmail = body.email ? encryptString(body.email) : null;
      const encryptedFirstName = encryptStringNullable(body.firstName);
      const encryptedLastName = encryptStringNullable(body.lastName);
      const encryptedMessage = encryptStringNullable(body.message);
      const encryptedContactId = encryptStringNullable(body.contactId);
      
      // ========================================
      // 4. DB insert (service_role - RLS 우회)
      // ========================================
      const { data: insertedRow, error: insertError } = await supabaseAdmin
        .from("inquiries")
        .insert({
          first_name: encryptedFirstName,
          last_name: encryptedLastName,
          email: encryptedEmail,
          nationality: body.nationality || null,
          spoken_language: body.spokenLanguage || null,
          contact_method: body.contactMethod || null,
          contact_id: encryptedContactId,
          treatment_type: body.treatmentType,
          preferred_date: body.preferredDate || null,
          preferred_date_flex: body.preferredDateFlex || false,
          message: encryptedMessage,
          attachments: body.attachments || [],
          intake: {},
          status: "received",
        })
        .select("id, public_token")
        .single();
      
      if (insertError) {
        console.error(`[${apiPath}] Insert error:`, insertError.message);
        
        // ✅ 운영 로그
        logInquiryReceived({
          inquiryId: null,
          source: 'inquiry_form',
          status: 'failed',
          reason: insertError.message,
        });
        
        return Response.json(
          { ok: false, error: "insert_failed", detail: insertError.message },
          { status: 500 }
        );
      }
      
      const inquiryId = insertedRow.id;
      const publicToken = insertedRow.public_token;
      
      // ✅ 운영 로그
      logInquiryReceived({
        inquiryId,
        source: 'inquiry_form',
        status: 'success',
        nationality: body.nationality,
        treatmentType: body.treatmentType,
      });
      
      console.log(`[${apiPath}] ✅ Inquiry created: ${inquiryId}`);
      
      // ========================================
      // 5. 관리자 알림 발송 (Fail-safe)
      // ========================================
      // 알림 실패해도 inquiry 생성은 성공으로 처리
      sendAdminNotification({
        inquiryId,
        nationality: body.nationality,
        treatmentType: body.treatmentType,
        contactMethod: body.contactMethod || (hasEmail ? 'email' : 'messenger'),
        createdAt: new Date().toISOString(),
      }).catch((error) => {
        console.error(`[${apiPath}] 알림 발송 실패 (무시):`, error.message);
      });
      
      // ========================================
      // 6. 응답 반환
      // ========================================
      return Response.json({
        ok: true,
        inquiryId,
        publicToken,
      });
      
    } catch (encryptError: any) {
      console.error(`[${apiPath}] Encryption error:`, encryptError.message);
      
      // ✅ 운영 로그
      logInquiryReceived({
        inquiryId: null,
        source: 'inquiry_form',
        status: 'failed',
        reason: `encryption_error: ${encryptError.message}`,
      });
      
      return Response.json(
        { ok: false, error: "encryption_failed" },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error(`[${apiPath}] Internal error:`, error.message);
    
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
