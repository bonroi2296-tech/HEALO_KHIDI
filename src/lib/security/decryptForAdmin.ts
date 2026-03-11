/**
 * HEALO: 관리자 전용 복호화 헬퍼
 * 
 * 목적:
 * - DB에서 조회한 암호화된 PII를 관리자가 볼 수 있도록 복호화
 * - 관리자 권한 확인 후에만 사용
 * - 복호화 실패 시 fail-safe (null/"***" 처리)
 * 
 * 주의:
 * - 이 함수는 반드시 관리자 권한 체크 후에만 호출
 * - 복호화된 평문은 네트워크 응답에만 포함 (로그 금지)
 * 
 * 사용법:
 * ```ts
 * const authResult = await checkAdminAuth(request);
 * if (!authResult.isAdmin) {
 *   return Response.json({ error: "unauthorized" }, { status: 403 });
 * }
 * 
 * const { data } = await supabaseAdmin.from("inquiries").select("*");
 * const decryptedData = await decryptInquiryForAdmin(data[0]);
 * ```
 * 
 * 🔒 보안: 이 파일은 서버에서만 사용됩니다 (클라이언트 번들 차단)
 */

import "server-only";
import { decryptAuto } from "./encryptionV2";
import { decryptPiiInObject } from "./piiJson";

/**
 * ✅ Inquiry 레코드 복호화 (관리자 전용)
 * 
 * @param inquiry DB에서 조회한 inquiry 레코드
 * @returns 복호화된 inquiry 객체
 */
export async function decryptInquiryForAdmin(inquiry: any): Promise<any> {
  if (!inquiry) return null;

  const decrypted = { ...inquiry };

  // ========================================
  // 1. email 복호화
  // ========================================
  if (inquiry.email && typeof inquiry.email === "string") {
    try {
      decrypted.email = await decryptAuto(inquiry.email);
    } catch (error: any) {
      console.error(`[decryptForAdmin] email decryption failed for inquiry ${inquiry.id}:`, error.message);
      decrypted.email = null; // fail-safe
    }
  }

  // ========================================
  // 2. contact_id 복호화
  // ========================================
  if (inquiry.contact_id && typeof inquiry.contact_id === "string") {
    try {
      decrypted.contact_id = await decryptAuto(inquiry.contact_id);
    } catch (error: any) {
      console.error(`[decryptForAdmin] contact_id decryption failed for inquiry ${inquiry.id}:`, error.message);
      decrypted.contact_id = null; // fail-safe
    }
  }

  // ========================================
  // 3. message 복호화
  // ========================================
  if (inquiry.message && typeof inquiry.message === "string") {
    try {
      decrypted.message = await decryptAuto(inquiry.message);
    } catch (error: any) {
      console.error(`[decryptForAdmin] message decryption failed for inquiry ${inquiry.id}:`, error.message);
      decrypted.message = null; // fail-safe
    }
  }

  // ========================================
  // 4. first_name 복호화
  // ========================================
  if (inquiry.first_name && typeof inquiry.first_name === "string") {
    try {
      decrypted.first_name = await decryptAuto(inquiry.first_name);
    } catch (error: any) {
      console.error(`[decryptForAdmin] first_name decryption failed for inquiry ${inquiry.id}:`, error.message);
      decrypted.first_name = null; // fail-safe
    }
  }

  // ========================================
  // 5. last_name 복호화
  // ========================================
  if (inquiry.last_name && typeof inquiry.last_name === "string") {
    try {
      decrypted.last_name = await decryptAuto(inquiry.last_name);
    } catch (error: any) {
      console.error(`[decryptForAdmin] last_name decryption failed for inquiry ${inquiry.id}:`, error.message);
      decrypted.last_name = null; // fail-safe
    }
  }

  // ========================================
  // 6. intake JSONB 복호화
  // ========================================
  if (inquiry.intake && typeof inquiry.intake === "object") {
    try {
      decrypted.intake = decryptPiiInObject(inquiry.intake, null, "intake");
    } catch (error: any) {
      console.error(`[decryptForAdmin] intake decryption failed for inquiry ${inquiry.id}:`, error.message);
      // intake는 그대로 유지 (fail-safe)
    }
  }

  return decrypted;
}

/**
 * ✅ Inquiry 배열 복호화 (관리자 전용)
 * 
 * @param inquiries DB에서 조회한 inquiry 레코드 배열
 * @returns 복호화된 inquiry 배열
 */
export async function decryptInquiriesForAdmin(inquiries: any[]): Promise<any[]> {
  if (!Array.isArray(inquiries)) return [];

  // 병렬 복호화
  const decryptPromises = inquiries.map((inquiry) =>
    decryptInquiryForAdmin(inquiry)
  );

  return await Promise.all(decryptPromises);
}

/**
 * ✅ Normalized Inquiry 복호화 (관리자 전용)
 * 
 * @param normalized DB에서 조회한 normalized_inquiry 레코드
 * @returns 복호화된 normalized_inquiry 객체
 */
export async function decryptNormalizedInquiryForAdmin(normalized: any): Promise<any> {
  if (!normalized) return null;

  const decrypted = { ...normalized };

  // ========================================
  // 1. raw_message 복호화
  // ========================================
  if (normalized.raw_message && typeof normalized.raw_message === "string") {
    try {
      decrypted.raw_message = await decryptAuto(normalized.raw_message);
    } catch (error: any) {
      console.error(`[decryptForAdmin] raw_message decryption failed:`, error.message);
      decrypted.raw_message = null; // fail-safe
    }
  }

  // ========================================
  // 2. contact JSONB 복호화
  // ========================================
  if (normalized.contact && typeof normalized.contact === "object") {
    try {
      decrypted.contact = decryptPiiInObject(normalized.contact, null, "contact");
    } catch (error: any) {
      console.error(`[decryptForAdmin] contact decryption failed:`, error.message);
      // contact는 그대로 유지 (fail-safe)
    }
  }

  return decrypted;
}
