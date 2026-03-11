/**
 * HEALO: 전화번호 포맷팅 유틸리티
 * 
 * 목적:
 * - 클라이언트/서버 모두에서 사용 가능한 순수 함수
 * - 한국 휴대폰 번호 전용 (010으로 시작하는 11자리)
 */

/**
 * 한국 휴대폰 번호 포맷팅 (표시용)
 * 예: 01012345678 → 010-1234-5678
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "-";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("010")) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * 한국 휴대폰 번호 포맷팅 (입력 중)
 * 사용자가 입력할 때 자동으로 하이픈 추가
 * 예: 01012345678 → 010-1234-5678
 */
export function formatPhoneInput(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
}

/**
 * 한국 휴대폰 번호 검증
 * 010으로 시작하는 11자리 숫자만 허용
 */
export function isValidKoreanMobile(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length === 11 && cleaned.startsWith("010");
}

/**
 * 이메일 형식 검증
 * 예: admin@healo.com
 */
export function isValidEmail(email: string): boolean {
  // RFC 5322 간소화 버전
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 전화번호에서 숫자만 추출
 * 예: 010-1234-5678 → 01012345678
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
