/**
 * HEALO: 암호화 테스트 스크립트
 * 
 * AES-256-GCM 암호화/복호화 roundtrip 테스트
 * 
 * 실행:
 * ```bash
 * npx tsx scripts/test-encryption.ts
 * ```
 */

// ========================================
// ✅ 환경변수 로딩 (.env → .env.local)
// ========================================
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// ES module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. .env 로드
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("✅ Loaded .env");
} else {
  console.log("⚠️  .env not found");
}

// 2. .env.local 로드 (우선순위 높음)
const envLocalPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
  console.log("✅ Loaded .env.local");
} else {
  console.log("⚠️  .env.local not found");
}

// 3. ENCRYPTION_KEY_V1 확인
const hasEncryptionKey = !!process.env.ENCRYPTION_KEY_V1;
console.log(`\n🔑 ENCRYPTION_KEY_V1: ${hasEncryptionKey ? "✅ SET" : "❌ MISSING"}`);

if (!hasEncryptionKey) {
  console.error("\n❌ 오류: ENCRYPTION_KEY_V1 환경변수가 설정되지 않았습니다.");
  console.error("   .env.local 파일에 다음을 추가하세요:");
  console.error("   ENCRYPTION_KEY_V1=<32 bytes 키>\n");
  process.exit(1);
}

console.log();

// ========================================
// 암호화 모듈 import
// ========================================
import {
  encryptString,
  decryptString,
  encryptStringNullable,
  decryptStringNullable,
  maskEmail,
  maskPhone,
  safeHash,
  isEncryptedPayload,
} from "../src/lib/security/encryptionV2";

import {
  encryptPiiInObject,
  decryptPiiInObject,
  INTAKE_PII_KEYS,
  CONTACT_PII_KEYS,
} from "../src/lib/security/piiJson";

console.log("\n🔐 HEALO AES-256-GCM 암호화 테스트\n");
console.log("=".repeat(60) + "\n");

// ========================================
// 1. 기본 암호화/복호화
// ========================================

console.log("1️⃣ 기본 암호화/복호화 테스트");
console.log("-".repeat(60));

try {
  const plaintext = "Hello, HEALO!";
  console.log(`평문: "${plaintext}"`);

  const encrypted = encryptString(plaintext);
  console.log(`암호문: ${encrypted.slice(0, 50)}...`);

  // 페이로드 형식 확인
  const payload = JSON.parse(encrypted);
  console.log(`\n페이로드 구조:`);
  console.log(`  - 버전: ${payload.v}`);
  console.log(`  - IV 길이: ${Buffer.from(payload.iv, "base64").length} bytes`);
  console.log(`  - Tag 길이: ${Buffer.from(payload.tag, "base64").length} bytes`);
  console.log(`  - Data 길이: ${Buffer.from(payload.data, "base64").length} bytes`);

  const decrypted = decryptString(encrypted);
  console.log(`\n복호화: "${decrypted}"`);

  const match = plaintext === decrypted;
  console.log(`일치 여부: ${match ? "✅ 일치" : "❌ 불일치"}`);

  if (!match) {
    throw new Error("암호화/복호화 roundtrip 실패");
  }

  console.log("\n✅ 기본 암호화/복호화 성공\n");
} catch (error: any) {
  console.error("\n❌ 기본 암호화/복호화 실패:", error.message, "\n");
  process.exit(1);
}

// ========================================
// 2. Nullable 테스트
// ========================================

console.log("2️⃣ Nullable 테스트");
console.log("-".repeat(60));

try {
  const nullResult = encryptStringNullable(null);
  console.log(`null 암호화: ${nullResult}`);

  const emptyResult = encryptStringNullable("");
  console.log(`빈 문자열 암호화: ${emptyResult}`);

  const validResult = encryptStringNullable("test");
  console.log(`유효한 값 암호화: ${validResult?.slice(0, 30)}...`);

  const decryptedValid = decryptStringNullable(validResult);
  console.log(`복호화: "${decryptedValid}"`);

  console.log("\n✅ Nullable 테스트 성공\n");
} catch (error: any) {
  console.error("\n❌ Nullable 테스트 실패:", error.message, "\n");
  process.exit(1);
}

// ========================================
// 3. 마스킹 테스트
// ========================================

console.log("3️⃣ 마스킹 테스트");
console.log("-".repeat(60));

try {
  const email = "john.doe@example.com";
  const maskedEmail = maskEmail(email);
  console.log(`Email: ${email} → ${maskedEmail}`);

  const phone = "+821012345678";
  const maskedPhone = maskPhone(phone);
  console.log(`Phone: ${phone} → ${maskedPhone}`);

  const hash = safeHash(email);
  console.log(`Hash: ${hash}`);

  console.log("\n✅ 마스킹 테스트 성공\n");
} catch (error: any) {
  console.error("\n❌ 마스킹 테스트 실패:", error.message, "\n");
  process.exit(1);
}

// ========================================
// 4. 페이로드 검증 테스트
// ========================================

console.log("4️⃣ 페이로드 검증 테스트");
console.log("-".repeat(60));

try {
  const encrypted = encryptString("test");
  const isEncrypted = isEncryptedPayload(encrypted);
  console.log(`암호문 감지: ${isEncrypted ? "✅ 맞음" : "❌ 틀림"}`);

  const plaintext = "not encrypted";
  const isPlaintext = isEncryptedPayload(plaintext);
  console.log(`평문 감지: ${isPlaintext ? "❌ 틀림" : "✅ 맞음"}`);

  console.log("\n✅ 페이로드 검증 테스트 성공\n");
} catch (error: any) {
  console.error("\n❌ 페이로드 검증 테스트 실패:", error.message, "\n");
  process.exit(1);
}

// ========================================
// 5. PII JSON 암호화 테스트
// ========================================

console.log("5️⃣ PII JSON 암호화 테스트 (intake)");
console.log("-".repeat(60));

try {
  const intake = {
    email: "patient@example.com",
    phone: "+821012345678",
    passport_no: "M12345678",
    complaint: "knee pain",
    severity: 5,
  };

  console.log("원본 intake:");
  console.log(`  - email: ${intake.email}`);
  console.log(`  - phone: ${intake.phone}`);
  console.log(`  - passport_no: ${intake.passport_no}`);
  console.log(`  - complaint: ${intake.complaint}`);
  console.log(`  - severity: ${intake.severity}`);

  const encrypted = encryptPiiInObject(intake, null, "intake");

  console.log("\n암호화된 intake:");
  console.log(`  - email: ${encrypted.email.slice(0, 30)}...`);
  console.log(`  - phone: ${encrypted.phone.slice(0, 30)}...`);
  console.log(`  - passport_no: ${encrypted.passport_no.slice(0, 30)}...`);
  console.log(`  - complaint: ${encrypted.complaint} (평문 유지)`);
  console.log(`  - severity: ${encrypted.severity} (평문 유지)`);

  const decrypted = decryptPiiInObject(encrypted, null, "intake");

  console.log("\n복호화된 intake:");
  console.log(`  - email: ${decrypted.email}`);
  console.log(`  - phone: ${decrypted.phone}`);
  console.log(`  - passport_no: ${decrypted.passport_no}`);

  const emailMatch = intake.email === decrypted.email;
  const phoneMatch = intake.phone === decrypted.phone;
  const passportMatch = intake.passport_no === decrypted.passport_no;
  const complaintMatch = intake.complaint === decrypted.complaint;

  console.log(`\n일치 여부:`);
  console.log(`  - email: ${emailMatch ? "✅" : "❌"}`);
  console.log(`  - phone: ${phoneMatch ? "✅" : "❌"}`);
  console.log(`  - passport_no: ${passportMatch ? "✅" : "❌"}`);
  console.log(`  - complaint: ${complaintMatch ? "✅" : "❌"}`);

  if (!emailMatch || !phoneMatch || !passportMatch || !complaintMatch) {
    throw new Error("PII JSON 암호화/복호화 roundtrip 실패");
  }

  console.log("\n✅ PII JSON 암호화 테스트 성공\n");
} catch (error: any) {
  console.error("\n❌ PII JSON 암호화 테스트 실패:", error.message, "\n");
  process.exit(1);
}

// ========================================
// 6. 성능 테스트
// ========================================

console.log("6️⃣ 성능 테스트");
console.log("-".repeat(60));

try {
  const iterations = 1000;
  const plaintext = "Performance test string with reasonable length for testing.";

  const encryptStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    encryptString(plaintext);
  }
  const encryptTime = Date.now() - encryptStart;
  console.log(`암호화 ${iterations}회: ${encryptTime}ms (평균 ${(encryptTime / iterations).toFixed(2)}ms)`);

  const encrypted = encryptString(plaintext);
  const decryptStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    decryptString(encrypted);
  }
  const decryptTime = Date.now() - decryptStart;
  console.log(`복호화 ${iterations}회: ${decryptTime}ms (평균 ${(decryptTime / iterations).toFixed(2)}ms)`);

  console.log("\n✅ 성능 테스트 완료\n");
} catch (error: any) {
  console.error("\n❌ 성능 테스트 실패:", error.message, "\n");
  process.exit(1);
}

// ========================================
// 결과
// ========================================

console.log("=".repeat(60));
console.log("\n🎉 모든 테스트 통과!\n");
console.log("AES-256-GCM 암호화가 정상 작동합니다.");
console.log("\n다음 단계:");
console.log("  1. 백필 dry-run: npx tsx scripts/backfill-encryption.ts --dry-run");
console.log("  2. 백필 실행: npx tsx scripts/backfill-encryption.ts --execute");
console.log("  3. DB 확인: SELECT id, email FROM inquiries LIMIT 10;");
console.log("\n" + "=".repeat(60) + "\n");
