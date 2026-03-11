/**
 * HEALO: PII JSON 선택적 암호화 헬퍼
 * 
 * 목적:
 * - JSONB 객체 내 PII 필드만 선택적으로 암호화
 * - 비-PII 필드는 그대로 유지 (검색/집계 가능)
 * 
 * 사용 시나리오:
 * - inquiries.intake: 일부 키만 PII (email, phone, passport_no)
 * - normalized_inquiries.contact: 일부 키만 PII (email, messenger_handle)
 * 
 * ✅ Fail-Closed:
 * - 암호화 실패 시 즉시 throw
 * - 로그에 평문 출력 금지
 */

import { encryptString, decryptString, encryptStringNullable, decryptStringNullable } from "./encryptionV2";

// ========================================
// PII 키 정의 (컨텍스트별)
// ========================================

/**
 * inquiries.intake에서 암호화할 PII 키
 */
export const INTAKE_PII_KEYS = [
  "email",
  "phone",
  "passport_no",
  "passport_number",
  "kakao",
  "kakaotalk",
  "line",
  "whatsapp",
  "wechat",
  "telegram",
  "viber",
  "contact_id",
  "messenger_id",
  "social_id",
];

/**
 * normalized_inquiries.contact에서 암호화할 PII 키
 */
export const CONTACT_PII_KEYS = [
  "email",
  "phone",
  "contact_id",
  "messenger_id",
  "messenger_handle",
  "social_handle",
];

/**
 * 컨텍스트별 PII 키 매핑
 */
export const PII_KEY_SETS = {
  intake: INTAKE_PII_KEYS,
  contact: CONTACT_PII_KEYS,
} as const;

export type PiiContext = keyof typeof PII_KEY_SETS;

// ========================================
// PII 암호화/복호화
// ========================================

/**
 * ✅ 객체 내 PII 키만 암호화
 * 
 * @param obj 원본 객체
 * @param keysToEncrypt 암호화할 키 배열 (기본: 컨텍스트별 자동)
 * @param context PII 컨텍스트 (intake/contact)
 * @returns PII가 암호화된 새 객체
 * @throws 암호화 실패 시
 * 
 * @example
 * const intake = {
 *   email: "john@example.com",   // PII → 암호화
 *   phone: "+821012345678",       // PII → 암호화
 *   complaint: "knee pain"        // 비-PII → 평문 유지
 * };
 * 
 * const encrypted = encryptPiiInObject(intake, null, "intake");
 * // {
 * //   email: "{\"v\":\"v1\",\"iv\":\"...\"}",  // 암호화됨
 * //   phone: "{\"v\":\"v1\",\"iv\":\"...\"}",  // 암호화됨
 * //   complaint: "knee pain"                   // 평문 유지
 * // }
 */
export function encryptPiiInObject<T extends Record<string, any>>(
  obj: T | null | undefined,
  keysToEncrypt: string[] | null = null,
  context: PiiContext = "intake"
): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return (obj || {}) as T;
  }

  // 암호화할 키 결정
  const piiKeys = keysToEncrypt || PII_KEY_SETS[context];

  // 새 객체 생성 (원본 변경 방지)
  const result = { ...obj };

  // PII 키만 암호화
  for (const key of piiKeys) {
    if (key in result) {
      const value = result[key];

      // 문자열만 암호화 (null/number/boolean 등은 그대로)
      if (typeof value === "string" && value.trim() !== "") {
        try {
          result[key] = encryptString(value);
        } catch (error: any) {
          // Fail-Closed: 암호화 실패 시 즉시 throw
          throw new Error(`[piiJson] Encryption failed for key "${key}": ${error.message}`);
        }
      }
    }
  }

  return result;
}

/**
 * ✅ 객체 내 PII 키만 복호화
 * 
 * @param obj 암호화된 객체
 * @param keysToDecrypt 복호화할 키 배열 (기본: 컨텍스트별 자동)
 * @param context PII 컨텍스트 (intake/contact)
 * @returns PII가 복호화된 새 객체
 * @throws 복호화 실패 시
 */
export function decryptPiiInObject<T extends Record<string, any>>(
  obj: T | null | undefined,
  keysToDecrypt: string[] | null = null,
  context: PiiContext = "intake"
): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return (obj || {}) as T;
  }

  // 복호화할 키 결정
  const piiKeys = keysToDecrypt || PII_KEY_SETS[context];

  // 새 객체 생성
  const result = { ...obj };

  // PII 키만 복호화
  for (const key of piiKeys) {
    if (key in result) {
      const value = result[key];

      // 문자열만 복호화
      if (typeof value === "string" && value.trim() !== "") {
        try {
          result[key] = decryptString(value);
        } catch (error: any) {
          // 복호화 실패 시 경고 후 null 처리 (복호화는 덜 엄격하게)
          console.warn(`[piiJson] Decryption failed for key "${key}": ${error.message}`);
          result[key] = null;
        }
      }
    }
  }

  return result;
}

// ========================================
// Nullable 버전 (편의 함수)
// ========================================

/**
 * ✅ 객체 내 PII 키만 암호화 (nullable)
 * 
 * @param obj 원본 객체 (null 허용)
 * @param keysToEncrypt 암호화할 키 배열
 * @param context PII 컨텍스트
 * @returns 암호화된 객체 또는 null
 */
export function encryptPiiInObjectNullable<T extends Record<string, any>>(
  obj: T | null | undefined,
  keysToEncrypt: string[] | null = null,
  context: PiiContext = "intake"
): T | null {
  if (!obj) return null;
  return encryptPiiInObject(obj, keysToEncrypt, context);
}

/**
 * ✅ 객체 내 PII 키만 복호화 (nullable)
 * 
 * @param obj 암호화된 객체 (null 허용)
 * @param keysToDecrypt 복호화할 키 배열
 * @param context PII 컨텍스트
 * @returns 복호화된 객체 또는 null
 */
export function decryptPiiInObjectNullable<T extends Record<string, any>>(
  obj: T | null | undefined,
  keysToDecrypt: string[] | null = null,
  context: PiiContext = "intake"
): T | null {
  if (!obj) return null;
  return decryptPiiInObject(obj, keysToDecrypt, context);
}

// ========================================
// 중첩 경로 지원 (향후 확장)
// ========================================

/**
 * ✅ 중첩 경로 지원 암호화 (예: "contact.email")
 * 
 * @param obj 원본 객체
 * @param paths 암호화할 경로 배열 (점 표기법)
 * @returns 암호화된 객체
 * 
 * @example
 * const data = {
 *   contact: {
 *     email: "john@example.com"
 *   }
 * };
 * 
 * const encrypted = encryptPiiByPath(data, ["contact.email"]);
 */
export function encryptPiiByPath<T extends Record<string, any>>(
  obj: T | null | undefined,
  paths: string[]
): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return (obj || {}) as T;
  }

  const result = { ...obj };

  for (const path of paths) {
    const keys = path.split(".");
    let current: any = result;

    // 경로 탐색
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current) || typeof current[keys[i]] !== "object") {
        break; // 경로 없음
      }
      current = current[keys[i]];
    }

    // 마지막 키 암호화
    const lastKey = keys[keys.length - 1];
    if (lastKey in current) {
      const value = current[lastKey];

      if (typeof value === "string" && value.trim() !== "") {
        try {
          current[lastKey] = encryptString(value);
        } catch (error: any) {
          throw new Error(`[piiJson] Encryption failed for path "${path}": ${error.message}`);
        }
      }
    }
  }

  return result;
}

/**
 * ✅ 중첩 경로 지원 복호화
 */
export function decryptPiiByPath<T extends Record<string, any>>(
  obj: T | null | undefined,
  paths: string[]
): T {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return (obj || {}) as T;
  }

  const result = { ...obj };

  for (const path of paths) {
    const keys = path.split(".");
    let current: any = result;

    // 경로 탐색
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current) || typeof current[keys[i]] !== "object") {
        break;
      }
      current = current[keys[i]];
    }

    // 마지막 키 복호화
    const lastKey = keys[keys.length - 1];
    if (lastKey in current) {
      const value = current[lastKey];

      if (typeof value === "string" && value.trim() !== "") {
        try {
          current[lastKey] = decryptString(value);
        } catch (error: any) {
          console.warn(`[piiJson] Decryption failed for path "${path}": ${error.message}`);
          current[lastKey] = null;
        }
      }
    }
  }

  return result;
}

// ========================================
// 유틸리티
// ========================================

/**
 * ✅ 객체에 암호화된 PII가 있는지 확인
 */
export function hasEncryptedPii(
  obj: Record<string, any> | null | undefined,
  context: PiiContext = "intake"
): boolean {
  if (!obj) return false;

  const piiKeys = PII_KEY_SETS[context];

  for (const key of piiKeys) {
    if (key in obj && typeof obj[key] === "string") {
      // V2 페이로드 형식 확인
      try {
        const parsed = JSON.parse(obj[key]);
        if (parsed.v === "v1" && parsed.iv && parsed.tag && parsed.data) {
          return true;
        }
      } catch {
        // JSON 파싱 실패 → 암호화 안 됨
      }
    }
  }

  return false;
}
