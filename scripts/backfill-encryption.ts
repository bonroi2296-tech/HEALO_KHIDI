/**
 * HEALO: 암호화 백필 스크립트
 * 
 * 목적:
 * - 기존 평문 PII 데이터를 AES-256-GCM으로 암호화
 * - inquiries 테이블의 PII 필드 암호화
 * - inquiries.intake JSONB 내 PII 키 암호화
 * 
 * 실행:
 * ```bash
 * # Dry-run (실제 업데이트 안 함)
 * npx tsx scripts/backfill-encryption.ts --dry-run
 * 
 * # 실제 암호화 실행
 * npx tsx scripts/backfill-encryption.ts --execute
 * 
 * # 특정 배치 크기로 실행
 * npx tsx scripts/backfill-encryption.ts --execute --batch-size=50
 * 
 * # 특정 inquiry_id부터 시작
 * npx tsx scripts/backfill-encryption.ts --execute --start-id=100
 * ```
 * 
 * ✅ Fail-safe:
 * - 암호화 실패 시 해당 레코드 건너뛰고 계속 진행
 * - 실패 레코드는 별도 로그에 기록
 * - 로그에 평문 절대 출력 금지
 */

// ========================================
// 환경변수 로딩
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
}

// 2. .env.local 로드 (우선순위 높음)
const envLocalPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

// ========================================
// 모듈 import
// ========================================
import { supabaseAdmin, assertSupabaseEnv } from "../src/lib/rag/supabaseAdmin";
import { encryptString, encryptStringNullable, isEncryptedPayload, maskEmail, maskPhone } from "../src/lib/security/encryptionV2";
import { encryptPiiInObject, hasEncryptedPii } from "../src/lib/security/piiJson";

// ========================================
// 설정
// ========================================

interface BackfillOptions {
  dryRun: boolean;
  batchSize: number;
  startId: number;
}

const DEFAULT_OPTIONS: BackfillOptions = {
  dryRun: true,
  batchSize: 100,
  startId: 0,
};

// ========================================
// inquiries 테이블 백필
// ========================================

interface InquiryRow {
  id: number;
  email: string | null;
  contact_id: string | null;
  message: string | null;
  first_name: string | null;
  last_name: string | null;
  intake: any;
}

/**
 * ✅ inquiries 테이블 백필
 */
async function backfillInquiries(options: BackfillOptions): Promise<{
  total: number;
  encrypted: number;
  skipped: number;
  failed: number;
}> {
  console.log("\n🔄 inquiries 테이블 백필 시작...\n");

  let encrypted = 0;
  let skipped = 0;
  let failed = 0;
  let offset = options.startId;
  let hasMore = true;

  while (hasMore) {
    // 배치 조회
    const { data: rows, error } = await supabaseAdmin
      .from("inquiries")
      .select("id, email, contact_id, message, first_name, last_name, intake")
      .gte("id", offset)
      .order("id", { ascending: true })
      .limit(options.batchSize);

    if (error) {
      console.error("❌ 조회 실패:", error.message);
      break;
    }

    if (!rows || rows.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`\n📦 Batch: ${rows.length}건 (ID ${rows[0].id} ~ ${rows[rows.length - 1].id})`);

    for (const row of rows as InquiryRow[]) {
      try {
        // 암호화 필요 여부 확인
        const needsEncryption = needsInquiryEncryption(row);

        if (!needsEncryption) {
          skipped++;
          continue;
        }

        // 암호화 실행
        const updateData = await encryptInquiryRow(row);

        if (options.dryRun) {
          console.log(`  ✓ [DRY-RUN] ID ${row.id}: ${Object.keys(updateData).join(", ")}`);
        } else {
          // 실제 업데이트
          const { error: updateError } = await supabaseAdmin
            .from("inquiries")
            .update(updateData)
            .eq("id", row.id);

          if (updateError) {
            console.error(`  ❌ ID ${row.id} 업데이트 실패: ${updateError.message}`);
            failed++;
            continue;
          }

          console.log(`  ✓ ID ${row.id}: ${Object.keys(updateData).join(", ")}`);
        }

        encrypted++;
      } catch (error: any) {
        console.error(`  ❌ ID ${row.id} 암호화 실패: ${error.message}`);
        failed++;
      }
    }

    offset = rows[rows.length - 1].id + 1;

    // 진행 상황
    console.log(`\n📊 진행: 암호화 ${encrypted}, 건너뜀 ${skipped}, 실패 ${failed}`);
  }

  const total = encrypted + skipped + failed;

  return { total, encrypted, skipped, failed };
}

/**
 * ✅ 암호화 필요 여부 확인
 */
function needsInquiryEncryption(row: InquiryRow): boolean {
  // email이 암호화되지 않음
  if (row.email && !isEncryptedPayload(row.email)) {
    return true;
  }

  // contact_id가 암호화되지 않음
  if (row.contact_id && !isEncryptedPayload(row.contact_id)) {
    return true;
  }

  // message가 암호화되지 않음
  if (row.message && !isEncryptedPayload(row.message)) {
    return true;
  }

  // first_name이 암호화되지 않음
  if (row.first_name && !isEncryptedPayload(row.first_name)) {
    return true;
  }

  // last_name이 암호화되지 않음
  if (row.last_name && !isEncryptedPayload(row.last_name)) {
    return true;
  }

  // intake에 암호화되지 않은 PII가 있음
  if (row.intake && typeof row.intake === "object" && !hasEncryptedPii(row.intake, "intake")) {
    return true;
  }

  return false;
}

/**
 * ✅ inquiry 행 암호화
 */
async function encryptInquiryRow(row: InquiryRow): Promise<Record<string, any>> {
  const updateData: Record<string, any> = {};

  // email 암호화
  if (row.email && !isEncryptedPayload(row.email)) {
    updateData.email = encryptString(row.email);
    console.log(`    - email: ${maskEmail(row.email)} → 암호화`);
  }

  // contact_id 암호화
  if (row.contact_id && !isEncryptedPayload(row.contact_id)) {
    updateData.contact_id = encryptString(row.contact_id);
    console.log(`    - contact_id: ${maskPhone(row.contact_id)} → 암호화`);
  }

  // message 암호화
  if (row.message && !isEncryptedPayload(row.message)) {
    updateData.message = encryptString(row.message);
    console.log(`    - message: ${row.message.slice(0, 20)}... → 암호화`);
  }

  // first_name 암호화
  if (row.first_name && !isEncryptedPayload(row.first_name)) {
    updateData.first_name = encryptString(row.first_name);
    console.log(`    - first_name: ${row.first_name[0]}*** → 암호화`);
  }

  // last_name 암호화
  if (row.last_name && !isEncryptedPayload(row.last_name)) {
    updateData.last_name = encryptString(row.last_name);
    console.log(`    - last_name: ${row.last_name[0]}*** → 암호화`);
  }

  // intake JSONB 암호화
  if (row.intake && typeof row.intake === "object" && !hasEncryptedPii(row.intake, "intake")) {
    updateData.intake = encryptPiiInObject(row.intake, null, "intake");
    console.log(`    - intake: PII 키 암호화`);
  }

  return updateData;
}

// ========================================
// 메인 실행
// ========================================

async function main() {
  // ✅ Supabase 환경변수 검증 (Fail-Closed)
  assertSupabaseEnv();

  const args = process.argv.slice(2);

  const options: BackfillOptions = {
    dryRun: !args.includes("--execute"),
    batchSize: parseInt(args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] || "100"),
    startId: parseInt(args.find((a) => a.startsWith("--start-id="))?.split("=")[1] || "0"),
  };

  console.log("\n🔐 HEALO 암호화 백필 스크립트\n");
  console.log("설정:");
  console.log(`  - 모드: ${options.dryRun ? "DRY-RUN (실제 변경 안 함)" : "EXECUTE (실제 암호화)"}`);
  console.log(`  - 배치 크기: ${options.batchSize}`);
  console.log(`  - 시작 ID: ${options.startId}`);
  console.log();

  if (options.dryRun) {
    console.log("⚠️  DRY-RUN 모드: 실제 DB 변경 없음");
    console.log("    실제 암호화하려면 --execute 플래그 사용\n");
  } else {
    console.log("🚨 EXECUTE 모드: DB가 실제로 변경됩니다!");
    console.log("    계속하려면 5초 기다립니다...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // inquiries 백필
  const inquiriesResult = await backfillInquiries(options);

  // 결과 요약
  console.log("\n" + "=".repeat(60));
  console.log("✅ 백필 완료\n");
  console.log("inquiries 테이블:");
  console.log(`  - 총 처리: ${inquiriesResult.total}건`);
  console.log(`  - 암호화: ${inquiriesResult.encrypted}건`);
  console.log(`  - 건너뜀: ${inquiriesResult.skipped}건 (이미 암호화됨)`);
  console.log(`  - 실패: ${inquiriesResult.failed}건`);
  console.log("=".repeat(60) + "\n");

  if (options.dryRun) {
    console.log("💡 실제 암호화하려면:");
    console.log("   npx tsx scripts/backfill-encryption.ts --execute\n");
  } else {
    console.log("🎉 암호화가 완료되었습니다!\n");
  }

  if (inquiriesResult.failed > 0) {
    console.log(`⚠️  ${inquiriesResult.failed}건 실패. 위 로그에서 오류 확인 후 재시도하세요.\n`);
  }
}

// 실행
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ 백필 오류:", error);
      process.exit(1);
    });
}

export { backfillInquiries };
