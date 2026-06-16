/**
 * healwith: AES-256-GCM 암호화 (명시적 구현)
 * 
 * 목적:
 * - "AES-256 적용"을 외부에 명확히 설명 가능한 구현
 * - Node.js crypto를 사용한 투명한 암호화
 * - 키 버전 관리 지원 (향후 키 회전)
 * 
 * 알고리즘: AES-256-GCM
 * - 키 길이: 32 bytes (256 bits)
 * - IV 길이: 12 bytes (96 bits, GCM 권장)
 * - Auth Tag 길이: 16 bytes (128 bits)
 * 
 * 출력 형식: JSON
 * {
 *   "v": "v1",              // 키 버전
 *   "iv": "base64...",      // Initialization Vector
 *   "tag": "base64...",     // Authentication Tag
 *   "data": "base64..."     // Ciphertext
 * }
 * 
 * ✅ Fail-Closed 원칙:
 * - 키가 없거나 길이 부족 → 즉시 throw
 * - 암호화/복호화 실패 → 즉시 throw (null 반환 금지)
 * - 로그에 평문 절대 출력 금지
 * 
 * 🔒 보안: 이 파일은 서버에서만 사용됩니다 (클라이언트 번들 차단)
 */

import "server-only";
import crypto from "crypto";

// ========================================
// 환경변수 검증
// ========================================

const REQUIRED_KEY_BYTES = 32; // 256 bits
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM 권장
const AUTH_TAG_LENGTH = 16;

/**
 * ✅ 키 검증 및 디코딩 (Fail-Closed)
 * 
 * 지원 형식:
 * - base64: 44자 (32 bytes 인코딩)
 * - hex: 64자 (32 bytes 인코딩)
 * 
 * @returns 32-byte Buffer
 */
function assertKeyV1(): Buffer {
  // 함수 호출 시점에 환경변수 읽기 (지연 로딩)
  const KEY_V1_RAW = process.env.ENCRYPTION_KEY_V1;
  
  if (!KEY_V1_RAW) {
    throw new Error(
      "[encryptionV2] ENCRYPTION_KEY_V1 is missing.\n" +
      "Generate a key:\n" +
      "  node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"\n" +
      "Then set: ENCRYPTION_KEY_V1=<generated_key>"
    );
  }

  // base64 시도 (44자 또는 43자 with padding)
  if (KEY_V1_RAW.length >= 43 && KEY_V1_RAW.length <= 44) {
    try {
      const keyBuffer = Buffer.from(KEY_V1_RAW, "base64");
      if (keyBuffer.length === REQUIRED_KEY_BYTES) {
        return keyBuffer;
      }
      throw new Error(`base64 decoded to ${keyBuffer.length} bytes, expected ${REQUIRED_KEY_BYTES}`);
    } catch (error: any) {
      throw new Error(
        `[encryptionV2] ENCRYPTION_KEY_V1 looks like base64 but failed validation: ${error.message}`
      );
    }
  }

  // hex 시도 (64자)
  if (KEY_V1_RAW.length === 64) {
    try {
      const keyBuffer = Buffer.from(KEY_V1_RAW, "hex");
      if (keyBuffer.length === REQUIRED_KEY_BYTES) {
        return keyBuffer;
      }
      throw new Error(`hex decoded to ${keyBuffer.length} bytes, expected ${REQUIRED_KEY_BYTES}`);
    } catch (error: any) {
      throw new Error(
        `[encryptionV2] ENCRYPTION_KEY_V1 looks like hex but failed validation: ${error.message}`
      );
    }
  }

  // 32 bytes raw (fallback, not recommended)
  if (KEY_V1_RAW.length === REQUIRED_KEY_BYTES) {
    console.warn(
      "[encryptionV2] Using raw 32-byte string as key. Consider encoding as base64 for safety."
    );
    return Buffer.from(KEY_V1_RAW, "utf8");
  }

  // 형식 불일치
  throw new Error(
    `[encryptionV2] ENCRYPTION_KEY_V1 format not recognized.\n` +
    `Current length: ${KEY_V1_RAW.length} chars\n` +
    `Expected formats:\n` +
    `  - base64: 44 chars (recommended)\n` +
    `  - hex: 64 chars\n` +
    `Generate a key:\n` +
    `  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  );
}

// 지연 검증: 함수 호출 시점에만 체크
// (모듈 import 시 env가 아직 로드되지 않을 수 있음)

// ✅ 키 로딩 확인 로그 (개발 환경, 값 출력 금지)
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  const hasKey = !!process.env.ENCRYPTION_KEY_V1;
  console.info("[encryptionV2] ENCRYPTION_KEY_V1 loaded:", hasKey ? "✅ YES" : "❌ NO");
}

// ========================================
// 암호화 페이로드 타입
// ========================================

interface EncryptedPayload {
  v: "v1"; // 키 버전
  iv: string; // Base64
  tag: string; // Base64
  data: string; // Base64
}

// ========================================
// 암호화/복호화
// ========================================

/**
 * ✅ 문자열 암호화 (AES-256-GCM)
 * 
 * @param plaintext 암호화할 평문
 * @returns JSON 문자열 (페이로드)
 * @throws 키 검증 실패, 암호화 실패 시
 */
export function encryptString(plaintext: string): string {
  // 1. 키 검증 (Fail-Closed) - returns Buffer
  const keyBuffer = assertKeyV1();

  // 2. IV 생성 (random, 12 bytes)
  const iv = crypto.randomBytes(IV_LENGTH);

  // 3. Cipher 생성 (keyBuffer is already a Buffer)
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // 4. 암호화
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  // 5. Auth Tag 추출
  const authTag = cipher.getAuthTag();

  // 6. 페이로드 생성
  const payload: EncryptedPayload = {
    v: "v1",
    iv: iv.toString("base64"),
    tag: authTag.toString("base64"),
    data: encrypted,
  };

  // 7. JSON 문자열 반환
  return JSON.stringify(payload);
}

/**
 * ✅ 문자열 복호화 (AES-256-GCM)
 * 
 * @param payloadJson JSON 문자열 (암호화된 페이로드)
 * @returns 복호화된 평문
 * @throws 키 검증 실패, 페이로드 파싱 실패, 복호화 실패, Tag 검증 실패 시
 */
export function decryptString(payloadJson: string): string {
  // 1. 키 검증 (Fail-Closed) - returns Buffer
  const keyBuffer = assertKeyV1();

  // 2. 페이로드 파싱
  let payload: EncryptedPayload;
  try {
    payload = JSON.parse(payloadJson) as EncryptedPayload;
  } catch (error: any) {
    throw new Error(`[encryptionV2] Payload JSON parse failed: ${error.message}`);
  }

  // 3. 페이로드 검증
  if (payload.v !== "v1") {
    throw new Error(`[encryptionV2] Unsupported key version: ${payload.v}`);
  }

  if (!payload.iv || !payload.tag || !payload.data) {
    throw new Error("[encryptionV2] Invalid payload: missing iv/tag/data");
  }

  // 4. Buffer 변환
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.tag, "base64");
  const encrypted = payload.data;

  // 5. Decipher 생성 (keyBuffer is already a Buffer)
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // 6. Auth Tag 설정
  decipher.setAuthTag(authTag);

  // 7. 복호화
  let decrypted: string;
  try {
    decrypted = decipher.update(encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");
  } catch (error: any) {
    throw new Error(`[encryptionV2] Decryption failed (auth tag mismatch?): ${error.message}`);
  }

  return decrypted;
}

// ========================================
// 헬퍼 함수 (nullable 지원)
// ========================================

/**
 * ✅ 문자열 암호화 (nullable)
 * 
 * @param plaintext 암호화할 평문 (null/undefined/빈 문자열 허용)
 * @returns 암호화된 JSON 문자열 또는 null
 * @throws 암호화 실패 시 (평문이 있는데 실패한 경우)
 */
export function encryptStringNullable(plaintext: string | null | undefined): string | null {
  if (!plaintext || plaintext.trim() === "") {
    return null;
  }

  return encryptString(plaintext);
}

/**
 * ✅ 문자열 복호화 (nullable)
 * 
 * @param payloadJson JSON 문자열 (null/undefined 허용)
 * @returns 복호화된 평문 또는 null
 * @throws 복호화 실패 시 (페이로드가 있는데 실패한 경우)
 */
export function decryptStringNullable(payloadJson: string | null | undefined): string | null {
  if (!payloadJson || payloadJson.trim() === "") {
    return null;
  }

  return decryptString(payloadJson);
}

// ========================================
// 마스킹 (로그용)
// ========================================

/**
 * ✅ 전화번호 마스킹 (E.164 형식)
 * 예: +821012345678 → +82-**-****-5678
 */
export function maskPhone(phoneE164: string): string {
  if (!phoneE164) return "****";

  const cleaned = phoneE164.replace(/[^0-9+]/g, "");
  if (cleaned.length <= 4) return "****";

  const lastFour = cleaned.slice(-4);
  const prefix = cleaned.slice(0, 3); // +82
  const masked = "*".repeat(cleaned.length - 3 - 4);

  return `${prefix}-${masked.slice(0, 2) || "**"}-${masked.slice(2) || "****"}-${lastFour}`;
}

/**
 * ✅ 이메일 마스킹
 * 예: john@example.com → j***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "****";

  const [local, domain] = email.split("@");
  if (local.length <= 1) return `*@${domain}`;

  const maskedLocal = local[0] + "*".repeat(Math.min(local.length - 1, 3));
  return `${maskedLocal}@${domain}`;
}

/**
 * ✅ 안전한 해시 (중복 방지/이벤트 메타용)
 * SHA-256 해시 (복호화 불가)
 */
export function safeHash(value: string): string {
  if (!value) return "";

  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex")
    .slice(0, 16); // 처음 16자만 (충분)
}

// ========================================
// 페이로드 검증 (암호문 여부 확인)
// ========================================

/**
 * ✅ 암호화된 페이로드인지 확인
 * 
 * @param value 검사할 값
 * @returns true if encrypted payload
 */
export function isEncryptedPayload(value: string | null | undefined): boolean {
  if (!value) return false;

  try {
    const parsed = JSON.parse(value);
    return parsed.v === "v1" && parsed.iv && parsed.tag && parsed.data;
  } catch {
    return false;
  }
}

// ========================================
// 하위 호환 (기존 RPC 방식 지원)
// ========================================

import { supabaseAdmin } from "../rag/supabaseAdmin";

const SUPABASE_ENCRYPTION_KEY = process.env.SUPABASE_ENCRYPTION_KEY;

/**
 * ✅ 기존 RPC 방식 암호화 (pgcrypto)
 * 
 * @deprecated 새 코드는 encryptString 사용 권장
 */
export async function encryptTextRPC(
  plaintext: string | null | undefined
): Promise<string | null> {
  if (!plaintext) return null;
  if (!SUPABASE_ENCRYPTION_KEY) {
    throw new Error("[encryptionV2] SUPABASE_ENCRYPTION_KEY is missing (RPC mode)");
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("encrypt_text", {
      plaintext: String(plaintext),
      encryption_key: SUPABASE_ENCRYPTION_KEY,
    });

    if (error) throw error;
    return data as string | null;
  } catch (error: any) {
    throw new Error(`[encryptionV2] RPC encryption failed: ${error.message}`);
  }
}

/**
 * ✅ 기존 RPC 방식 복호화 (pgcrypto)
 * 
 * @deprecated 새 코드는 decryptString 사용 권장
 */
export async function decryptTextRPC(
  ciphertext: string | null | undefined
): Promise<string | null> {
  if (!ciphertext) return null;
  if (!SUPABASE_ENCRYPTION_KEY) {
    throw new Error("[encryptionV2] SUPABASE_ENCRYPTION_KEY is missing (RPC mode)");
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("decrypt_text", {
      ciphertext: String(ciphertext),
      encryption_key: SUPABASE_ENCRYPTION_KEY,
    });

    if (error) throw error;
    return data as string | null;
  } catch (error: any) {
    throw new Error(`[encryptionV2] RPC decryption failed: ${error.message}`);
  }
}

/**
 * ✅ 스마트 복호화 (페이로드 타입 자동 감지)
 * 
 * @param value 암호화된 값 (V2 JSON 또는 RPC 암호문)
 * @returns 복호화된 평문
 */
export async function decryptAuto(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;

  // V2 형식 확인
  if (isEncryptedPayload(value)) {
    return decryptString(value);
  }

  // RPC 형식으로 간주
  return await decryptTextRPC(value);
}
