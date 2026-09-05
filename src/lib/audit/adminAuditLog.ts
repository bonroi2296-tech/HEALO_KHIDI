/**
 * healwith: 관리자 감사 로그
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
  // inquiries
  | "LIST_INQUIRIES"
  | "VIEW_INQUIRY"
  | "UPDATE_INQUIRY"
  | "DELETE_INQUIRY"
  | "EXPORT_INQUIRIES"
  // treatments
  | "LIST_TREATMENTS"
  | "CREATE_TREATMENT"
  | "UPDATE_TREATMENT"
  | "DELETE_TREATMENT"
  // hospitals
  | "LIST_HOSPITALS"
  | "CREATE_HOSPITAL"
  | "UPDATE_HOSPITAL"
  | "DELETE_HOSPITAL"
  | "HOSPITAL_OFFERS_APPLY"
  // leads
  | "LIST_LEADS"
  | "ASSIGN_LEADS"
  | "UPDATE_LEAD"
  // partner portals (agency / overseas medical institution)
  | "PARTNER_VIEW_CASES"
  // patient data-subject rights (GDPR Art.17 / PIPA)
  | "PATIENT_ACCOUNT_DELETED"
  | "PATIENT_DELETION_REQUEST"
  | "PROCESS_DELETION_REQUEST"
  // consultations (원격협진) — 2026-07-24 권한 감사 C 보완: 발급 격리 대신 추적성
  | "CREATE_CONSULTATION_INVITE"
  // 환자 교육자료 (2026-08-25 신설 — 환자에게 나가는 글이라 누가 언제 고쳤는지 남긴다)
  | "CREATE_EDUCATION_CONTENT"
  | "UPDATE_EDUCATION_CONTENT"
  // misc
  | "UPLOAD_IMAGE"
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
  "partner_type", // ✅ 파트너 포털(에이전시/의료기관) 접근 감사
  "count",        // ✅ 조회/요청 건수
  "request_id",   // ✅ 삭제요청 처리 추적
  "new_status",   // ✅ 삭제요청 상태 변경 추적
  "error",      // ✅ requireAdminAuth에서 사용
  "reason",     // ✅ requireAdminAuth에서 사용
  "path",       // ✅ requireAdminAuth에서 사용
  "method",     // ✅ requireAdminAuth에서 사용
  // ✅ PII 열람 접속기록(logPiiAccess) — 「어느 화면에서 봤나」가 법정 기록의 «수행업무»를
  //    구체화한다. path 만으론 같은 API 를 쓰는 화면이 구분되지 않는다.
  //    값은 우리가 코드에 박는 고정 문자열(case_board·voice_notes 등)이라 PII 가 아니다.
  "screen",
  "decrypted",  // ✅ 무엇을 복호화해 보여줬나(컬럼 «이름»만. 값이 아니다)
  "pending",    // ✅ 전환 깔때기 목록 건수
  "admitted",   // ✅ 전환 깔때기 목록 건수
  "emailSent",  // ✅ 안내메일 발송 여부
  "lang",       // ✅ 발송 언어
  "from",       // ✅ 집계 조회 기간
  "to",         // ✅ 집계 조회 기간
  // ✅ 상담 초대 토큰 발급 추적 (2026-07-24 권한 감사 C 보완 — CREATE_CONSULTATION_INVITE)
  //    consultation_id 는 uuid(PII 아님). 미등록 시 sanitize가 조용히 드롭해 추적성이 무산된다(독립 리뷰 C1).
  "consultation_id",
  "invite_role",
  "max_uses",
  "email_sent",
  // ✅ 환자 교육자료 편집 추적 (2026-08-25). education_id 는 uuid, cancer_type 은 분류값 — 둘 다 PII 아님.
  //    미등록이면 sanitize 가 조용히 드롭해 «누가 뭘 고쳤는지»가 통째로 빈다(위 C1 과 같은 함정).
  "education_id",
  "cancer_type",
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
