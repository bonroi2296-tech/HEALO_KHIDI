/**
 * HEALO: 관리자 감사 로그
 * 
 * 목적:
 * - 누가 언제 어떤 문의 데이터를 "복호화된 상태로 조회했는지" 추적
 * - 보안 사고 발생 시 추적 가능
 * 
 * 보안 원칙:
 * - ❌ email, message 등 환자 평문 절대 저장 금지
 * - ✅ inquiry_id만 기록
 * - ❌ error stack에 평문 포함 금지
 * 
 * 🔒 보안: 이 파일은 서버에서만 사용됩니다
 */

import "server-only";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import type { NextRequest } from "next/server";

export type AdminAuditAction =
  | "LIST_INQUIRIES"
  | "VIEW_INQUIRY"
  | "UPDATE_INQUIRY"
  | "DELETE_INQUIRY"
  | "EXPORT_INQUIRIES"
  | "UNAUTHORIZED_ADMIN_ACCESS";

export interface AdminAuditLogParams {
  adminEmail: string;
  adminUserId?: string | null;
  action: AdminAuditAction;
  inquiryIds?: number[] | null; // ✅ INT4[] (integer array)
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * ✅ 안전한 integer array 변환
 * 
 * @param value unknown input (string[], number[], mixed)
 * @returns number[] (positive integers only)
 */
function toIntArray(value: unknown): number[] {
  if (!value || !Array.isArray(value)) {
    return [];
  }

  return value
    .map((v) => {
      if (typeof v === "number" && Number.isInteger(v) && v > 0) {
        return v;
      }
      if (typeof v === "string") {
        const parsed = Number(v);
        if (Number.isInteger(parsed) && parsed > 0) {
          return parsed;
        }
      }
      return null;
    })
    .filter((n): n is number => n !== null);
}

/**
 * ✅ 관리자 조회 감사 로그 기록
 * 
 * @param params 로그 파라미터
 * @returns 로그 ID (실패 시 null)
 */
export async function logAdminAction(
  params: AdminAuditLogParams
): Promise<string | null> {
  try {
    // ⚠️ metadata에 PII 평문이 섞이지 않도록 검증
    const safeMetadata = params.metadata
      ? sanitizeMetadata(params.metadata)
      : null;

    // ✅ inquiry_ids를 INT4[]로 안전하게 변환
    const safeInquiryIds = params.inquiryIds
      ? toIntArray(params.inquiryIds)
      : null;

    // ✅ 검증 로그 (개발 환경에서만)
    if (process.env.NODE_ENV !== "production" && safeInquiryIds) {
      console.log("[adminAudit] writing inquiry_ids:", safeInquiryIds);
    }

    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        admin_email: params.adminEmail,
        admin_user_id: params.adminUserId,
        action: params.action,
        inquiry_ids: safeInquiryIds,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        metadata: safeMetadata,
      })
      .select("id")
      .single();

    if (error) {
      // ⚠️ 로깅 실패해도 메인 로직은 계속 진행
      console.error("[adminAuditLog] Failed to log:", error.message);
      return null;
    }

    return data.id;
  } catch (error: any) {
    console.error("[adminAuditLog] Exception:", error.message);
    return null;
  }
}

/**
 * ✅ NextRequest에서 IP 주소 추출
 */
export function getIpFromRequest(request: NextRequest): string | null {
  // Vercel/Cloudflare 헤더 우선
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    null
  );
}

/**
 * ✅ NextRequest에서 User-Agent 추출
 */
export function getUserAgentFromRequest(request: NextRequest): string | null {
  return request.headers.get("user-agent") || null;
}

/**
 * ✅ audit log metadata의 허용된 키 목록 (단일 소스 진실)
 * 
 * ⚠️ 중요: 이 whitelist는 서버(adminAuditLog.ts)와 클라이언트(AdminAuditPage.jsx) 모두에서 사용됩니다.
 * 키를 추가/제거할 때는 양쪽 모두 반영해야 합니다.
 */
export const AUDIT_METADATA_ALLOWED_KEYS = [
  "limit",
  "offset",
  "page",
  "status",
  "treatment_type",
  "nationality",
  "sort_by",
  "sort_order",
  "decrypt",
  "include_normalized",
  "error",      // ✅ requireAdminAuth에서 사용
  "reason",     // ✅ requireAdminAuth에서 사용
  "path",       // ✅ requireAdminAuth에서 사용
  "method",     // ✅ requireAdminAuth에서 사용
] as const;

/**
 * 🔒 metadata에서 PII 평문 제거 (whitelist 기반) - 단일 소스 진실
 * 
 * 허용되는 키:
 * - limit, offset, page (페이지네이션)
 * - status, treatment_type, nationality (필터)
 * - sort_by, sort_order (정렬)
 * - decrypt, include_normalized (조회 옵션)
 * - error, reason, path, method (audit 추적)
 * 
 * 차단되는 키:
 * - email, message, name, phone, address, free_text 등 PII
 * 
 * 값 처리:
 * - string: 200자 제한 (초과 시 잘라서 "…")
 * - number/boolean/null: 그대로
 * - object/array: 드롭 (PII 위험 방지)
 */
function sanitizeMetadata(
  metadata: Record<string, any>
): Record<string, any> | null {

  const MAX_STRING_LENGTH = 200;

  const sanitized: Record<string, any> = {};

  for (const key of Object.keys(metadata)) {
    // ✅ whitelist 체크
    if (!AUDIT_METADATA_ALLOWED_KEYS.includes(key as any)) {
      continue; // 허용되지 않은 키는 드롭
    }

    const value = metadata[key];

    // ✅ 값 타입별 처리
    if (value === null || value === undefined) {
      sanitized[key] = null;
    } else if (typeof value === "boolean" || typeof value === "number") {
      sanitized[key] = value;
    } else if (typeof value === "string") {
      // string은 길이 제한 (PII 방지)
      sanitized[key] = value.length > MAX_STRING_LENGTH 
        ? value.substring(0, MAX_STRING_LENGTH) + "…"
        : value;
    }
    // object/array는 드롭 (PII 위험 방지)
  }

  // ✅ 개발 환경에서만 디버그 로그
  if (process.env.NODE_ENV !== "production" && Object.keys(metadata).length !== Object.keys(sanitized).length) {
    console.log("[adminAudit] metadata keys filtered:", {
      original: Object.keys(metadata),
      sanitized: Object.keys(sanitized),
    });
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}
