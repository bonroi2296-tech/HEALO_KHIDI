/**
 * HEALO: 관리자 문의 상세 조회 API
 * 
 * 경로: /api/admin/inquiries/[id]
 * 권한: 관리자 전용
 * 
 * 목적:
 * - 관리자가 특정 문의의 상세 정보를 조회할 때 PII를 복호화하여 표시
 * - normalized_inquiries 정보도 함께 조회
 * - 복호화는 서버에서만 수행
 * 
 * 보안:
 * - 관리자 권한 확인 필수
 * - 복호화된 평문은 네트워크 응답에만 포함
 * - 로그에 평문 출력 금지
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { supabaseAdmin, assertSupabaseEnv } from "../../../../../src/lib/rag/supabaseAdmin";
import { requireAdminAuth } from "../../../../../src/lib/auth/requireAdminAuth";
import {
  decryptInquiryForAdmin,
  decryptNormalizedInquiryForAdmin,
} from "../../../../../src/lib/security/decryptForAdmin";
import {
  logAdminAction,
  getIpFromRequest,
  getUserAgentFromRequest,
} from "../../../../../src/lib/audit/adminAuditLog";

/**
 * GET: 문의 상세 조회 (관리자 전용, PII 복호화)
 * 
 * Path Parameters:
 * - id: 문의 ID
 * 
 * Query Parameters:
 * - decrypt: 복호화 여부 (true/false, 기본: true)
 * - include_normalized: normalized_inquiries 포함 여부 (true/false, 기본: true)
 * 
 * Response:
 * {
 *   ok: true,
 *   inquiry: {...},
 *   normalized: {...},
 *   decrypted: true
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ✅ 환경변수 검증
  assertSupabaseEnv();

  // ========================================
  // ID 검증: 숫자 형식만 허용
  // ========================================
  // Next.js 15+: params는 Promise입니다
  const params = await context.params;
  const rawId = params.id;
  
  // 숫자 형식 체크
  if (!rawId || !/^\d+$/.test(rawId)) {
    return Response.json(
      {
        ok: false,
        error: "invalid_inquiry_id",
        detail: "ID must be a positive integer",
      },
      { status: 400 }
    );
  }

  const inquiryId = Number(rawId);

  // ========================================
  // 1. 관리자 권한 확인 (자동 audit log 포함)
  // ========================================
  const auth = await requireAdminAuth(request);
  if (!auth.success) {
    return auth.response; // 403 + audit log 자동 처리
  }
  const { authResult } = auth;

  // ========================================
  // 2. Query Parameters 파싱
  // ========================================
  const { searchParams } = new URL(request.url);

  const shouldDecrypt = searchParams.get("decrypt") !== "false"; // 기본: true
  const includeNormalized = searchParams.get("include_normalized") !== "false"; // 기본: true

  // ========================================
  // 3. inquiry 조회
  // ========================================
  try {
    // 🔒 보안: detail API는 필요한 필드만 SELECT
    const DETAIL_FIELDS = [
      "id",
      "created_at",
      "first_name",
      "last_name",
      "email",
      "message",
      "treatment_type",
      "contact_method",
      "nationality",
      "status",
      "attachment",
      "preferred_date",
      "contact_id",
    ].join(",");

    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from("inquiries")
      .select(DETAIL_FIELDS)
      .eq("id", inquiryId)
      .single();

    if (inquiryError) {
      if (inquiryError.code === "PGRST116") {
        // Not found
        return Response.json(
          {
            ok: false,
            error: "not_found",
            detail: "Inquiry not found",
          },
          { status: 404 }
        );
      }

      // 🚨 에러 로깅 시 PII 제외
      console.error(`[admin/inquiries/${inquiryId}] DB query error:`, inquiryError.message);
      return Response.json(
        {
          ok: false,
          error: "db_query_failed",
          detail: inquiryError.message,
        },
        { status: 500 }
      );
    }

    // ========================================
    // 4. normalized_inquiries 조회 (옵션)
    // ========================================
    let normalized = null;

    if (includeNormalized) {
      const { data: normalizedData, error: normalizedError } = await supabaseAdmin
        .from("normalized_inquiries")
        .select("*")
        .eq("source_inquiry_id", inquiryId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (normalizedError) {
        // 🚨 에러 로깅 시 PII 제외
        console.error(
          `[admin/inquiries/${inquiryId}] normalized_inquiries query error:`,
          normalizedError.message
        );
        // Fail-safe: 에러가 나도 inquiry는 반환
      } else {
        normalized = normalizedData;
      }
    }

    // ========================================
    // 5. PII 복호화 (관리자만)
    // ========================================
    let decryptedInquiry = inquiry;
    let decryptedNormalized = normalized;

    if (shouldDecrypt) {
      try {
        decryptedInquiry = await decryptInquiryForAdmin(inquiry);
        console.log(`[admin/inquiries/${inquiryId}] ✅ Inquiry decrypted`);

        if (normalized) {
          decryptedNormalized = await decryptNormalizedInquiryForAdmin(normalized);
          console.log(`[admin/inquiries/${inquiryId}] ✅ Normalized inquiry decrypted`);
        }
      } catch (decryptError: any) {
        // 🚨 복호화 실패 시 에러 메시지만 로깅 (PII 제외)
        console.error(
          `[admin/inquiries/${inquiryId}] Decryption failed:`,
          decryptError.message
        );
        // Fail-safe: 복호화 실패해도 응답은 반환 (암호문 상태로)
      }
    }

    // ========================================
    // 6. 감사 로그 기록 (성공 시에만)
    // ========================================
    // ⚠️ 중요: 조회 성공 후에만 audit log 적재 (PII 제외)
    // ✅ inquiry_ids는 INT4[] (number[])로 전달
    // 백그라운드로 실행 (메인 로직 블로킹 방지)
    logAdminAction({
      adminEmail: authResult.email || "unknown",
      adminUserId: authResult.userId,
      action: "VIEW_INQUIRY",
      inquiryIds: [inquiryId], // ✅ number[] (not string[])
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: {
        decrypt: shouldDecrypt,
        include_normalized: includeNormalized,
      },
    }).catch((err) => {
      // 감사 로그 실패는 조용히 처리 (에러 메시지만 로깅)
      console.error(`[admin/inquiries/${inquiryId}] Audit log failed:`, err.message);
    });

    // ========================================
    // 7. 응답 반환
    // ========================================
    return Response.json({
      ok: true,
      inquiry: decryptedInquiry,
      normalized: decryptedNormalized,
      decrypted: shouldDecrypt,
    });
  } catch (error: any) {
    // 🚨 에러 로깅 시 PII 제외 (error.message만 로깅)
    console.error(`[admin/inquiries/${inquiryId}] Internal error:`, error.message);
    return Response.json(
      {
        ok: false,
        error: "internal_error",
      },
      { status: 500 }
    );
  }
}
