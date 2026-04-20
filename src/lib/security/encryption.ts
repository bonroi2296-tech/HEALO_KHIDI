/**
 * @deprecated 이 모듈은 더 이상 새 코드에서 사용하지 마세요.
 * 대신 encryptionV2.ts (AES-256-GCM, Node.js crypto)를 사용하세요.
 * 
 * 이 파일은 pgcrypto RPC 기반 암호화로, 기존 데이터 복호화를 위해서만 유지됩니다.
 * 새로운 암호화: encryptString / encryptStringNullable (from encryptionV2)
 * 기존 데이터 복호화: decryptAuto (from encryptionV2, 양쪽 형식 자동 감지)
 * 
 * 마이그레이션 완료 후 이 파일은 삭제될 예정입니다.
 */

import { supabaseAdmin } from "../rag/supabaseAdmin";

const ENCRYPTION_KEY = process.env.SUPABASE_ENCRYPTION_KEY;
const MIN_KEY_LENGTH = 32;

/**
 * 암호화 키 검증 (서버 부팅 시/암호화 호출 전에 실행)
 * 키가 없거나 길이가 부족하면 즉시 에러 발생
 * @throws Error 키 누락 또는 길이 부족 시
 */
export function assertEncryptionKey(): void {
  if (!ENCRYPTION_KEY) {
    const error = new Error(
      "[security/encryption] SUPABASE_ENCRYPTION_KEY is missing. " +
      "암호화 키가 설정되지 않았습니다. 환경변수를 확인하세요. " +
      "키 분실/변경 시 기존 데이터 복호화 불가."
    );
    console.error(error.message);
    throw error;
  }

  if (ENCRYPTION_KEY.length < MIN_KEY_LENGTH) {
    const error = new Error(
      `[security/encryption] SUPABASE_ENCRYPTION_KEY is too short (${ENCRYPTION_KEY.length} < ${MIN_KEY_LENGTH}). ` +
      `암호화 키는 최소 ${MIN_KEY_LENGTH}자 이상이어야 합니다. ` +
      "키 분실/변경 시 기존 데이터 복호화 불가."
    );
    console.error(error.message);
    throw error;
  }
}

// 개발 환경에서만 경고 (프로덕션에서는 각 route에서 assertEncryptionKey() 호출)
if (process.env.NODE_ENV !== "production") {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < MIN_KEY_LENGTH) {
    console.warn(
      "[security/encryption] WARNING: SUPABASE_ENCRYPTION_KEY is missing or too short. " +
      "암호화 기능이 정상 작동하지 않을 수 있습니다."
    );
  }
}

/**
 * 텍스트 암호화 (서버에서만 사용)
 * @param plaintext 암호화할 텍스트
 * @returns base64 인코딩된 암호화 문자열 또는 null
 */
export async function encryptText(
  plaintext: string | null | undefined
): Promise<string | null> {
  // 키 검증 (암호화 전에 수행)
  assertEncryptionKey();

  if (!plaintext) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("encrypt_text", {
      plaintext: String(plaintext),
      encryption_key: ENCRYPTION_KEY!,
    });

    if (error) {
      console.error("[security/encryption] encrypt error:", error);
      return null;
    }

    return data as string | null;
  } catch (error) {
    console.error("[security/encryption] encrypt exception:", error);
    return null;
  }
}

/**
 * 텍스트 복호화 (서버에서만 사용)
 * @param ciphertext base64 인코딩된 암호화 문자열
 * @returns 복호화된 텍스트 또는 null
 */
export async function decryptText(
  ciphertext: string | null | undefined
): Promise<string | null> {
  // 키 검증 (복호화 전에 수행)
  assertEncryptionKey();

  if (!ciphertext) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("decrypt_text", {
      ciphertext: String(ciphertext),
      encryption_key: ENCRYPTION_KEY!,
    });

    if (error) {
      console.error("[security/encryption] decrypt error:", error);
      return null;
    }

    return data as string | null;
  } catch (error) {
    console.error("[security/encryption] decrypt exception:", error);
    return null;
  }
}

/**
 * Email 해시 생성 (검색용, 복호화 불가)
 * @param email 이메일 주소
 * @returns sha256 해시 (hex) 또는 null
 */
export async function hashEmail(
  email: string | null | undefined
): Promise<string | null> {
  if (!email) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("email_hash", {
      email: String(email),
    });

    if (error) {
      console.error("[security/encryption] hash error:", error);
      return null;
    }

    return data as string | null;
  } catch (error) {
    console.error("[security/encryption] hash exception:", error);
    return null;
  }
}
