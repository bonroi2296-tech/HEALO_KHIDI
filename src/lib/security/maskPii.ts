/**
 * HEALO: PII 마스킹 유틸리티
 * 
 * 목적:
 * - 관리자 목록 화면에서 대량 평문 노출 방지
 * - 최소 접근 원칙: 목록은 마스킹, 상세만 복호화
 * 
 * 사용:
 * - GET /api/admin/inquiries (목록)
 *   → decrypt=false (기본값)
 *   → 서버에서 마스킹된 값 반환
 * 
 * - GET /api/admin/inquiries/[id] (상세)
 *   → decrypt=true (기본값)
 *   → 서버에서 복호화된 값 반환
 * 
 * 🔒 보안: 이 파일은 서버에서만 사용됩니다
 */

import "server-only";

/**
 * ✅ 이메일 마스킹
 * 
 * @example
 * john.doe@gmail.com → j***@gmail.com
 * admin@healo.com → a***@healo.com
 */
export function maskEmail(email: string | null): string {
  if (!email || typeof email !== "string") return "***";

  const [localPart, domain] = email.split("@");
  if (!domain) return "***";

  const maskedLocal = localPart[0] + "***";
  return `${maskedLocal}@${domain}`;
}

/**
 * ✅ 이름 마스킹
 * 
 * @example
 * John → J***
 * 홍길동 → 홍**
 */
export function maskName(name: string | null): string {
  if (!name || typeof name !== "string") return "***";

  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + "*";
  
  return name[0] + "*".repeat(name.length - 1);
}

/**
 * ✅ 전화번호 마스킹
 * 
 * @example
 * +82 10-1234-5678 → +82 10-****-5678
 * 010-1234-5678 → 010-****-5678
 */
export function maskPhone(phone: string | null): string {
  if (!phone || typeof phone !== "string") return "***";

  // 숫자만 추출
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "***";

  // 마지막 4자리만 표시
  const last4 = digits.slice(-4);
  const masked = "*".repeat(digits.length - 4) + last4;

  // 원본 형식에 맞춰 재구성 (간단한 버전)
  if (phone.includes("+")) {
    return phone.slice(0, 3) + " " + "****-" + last4;
  }
  return "***-****-" + last4;
}

/**
 * ✅ 메시지 마스킹 (첫 20자만 표시)
 * 
 * @example
 * "I need help with..." → "I need help with...***"
 */
export function maskMessage(message: string | null): string {
  if (!message || typeof message !== "string") return "***";

  if (message.length <= 20) return message;
  return message.slice(0, 20) + "...***";
}

/**
 * ✅ Inquiry 레코드 마스킹 (관리자 목록용)
 * 
 * @param inquiry DB에서 조회한 inquiry 레코드 (암호화된 상태)
 * @returns 마스킹된 inquiry 객체
 * 
 * 주의:
 * - 이 함수는 복호화하지 않고 마스킹만 수행
 * - 암호화된 JSON 객체가 있으면 "***" 반환
 */
export function maskInquiryForList(inquiry: any): any {
  if (!inquiry) return null;

  const masked = { ...inquiry };

  // 이메일 마스킹
  if (typeof inquiry.email === "string" && inquiry.email.includes("@")) {
    masked.email = maskEmail(inquiry.email);
  } else {
    masked.email = "***"; // 암호화된 JSON은 마스킹
  }

  // 이름 마스킹
  if (typeof inquiry.first_name === "string" && !inquiry.first_name.startsWith("{")) {
    masked.first_name = maskName(inquiry.first_name);
  } else {
    masked.first_name = "***";
  }

  if (typeof inquiry.last_name === "string" && !inquiry.last_name.startsWith("{")) {
    masked.last_name = maskName(inquiry.last_name);
  } else {
    masked.last_name = "***";
  }

  // 메시지 마스킹
  if (typeof inquiry.message === "string" && !inquiry.message.startsWith("{")) {
    masked.message = maskMessage(inquiry.message);
  } else {
    masked.message = "***";
  }

  // 전화번호 마스킹 (있을 경우)
  if (inquiry.phone) {
    if (typeof inquiry.phone === "string" && !inquiry.phone.startsWith("{")) {
      masked.phone = maskPhone(inquiry.phone);
    } else {
      masked.phone = "***";
    }
  }

  return masked;
}

/**
 * ✅ Inquiries 배열 마스킹
 */
export function maskInquiriesForList(inquiries: any[]): any[] {
  return inquiries.map(maskInquiryForList);
}
