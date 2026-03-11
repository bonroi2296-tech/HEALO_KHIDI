/**
 * HEALO: 관리자 Role 설정 스크립트
 * 
 * 목적:
 * - 특정 유저에게 admin role 부여/제거
 * - Supabase Admin API 사용
 * 
 * 실행:
 * ```bash
 * # Admin role 부여
 * npx tsx scripts/set-admin.ts --email you@domain.com --role admin
 * 
 * # Admin role 제거
 * npx tsx scripts/set-admin.ts --email you@domain.com --role none
 * 
 * # 현재 관리자 목록 확인
 * npx tsx scripts/set-admin.ts --list
 * ```
 * 
 * 요구사항:
 * - SUPABASE_SERVICE_ROLE_KEY 환경변수 필수
 * - 유저가 이미 가입되어 있어야 함
 */

// ========================================
// 환경변수 로딩
// ========================================
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env → .env.local 순차 로딩
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const envLocalPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

// ========================================
// Supabase Admin 클라이언트
// ========================================
import { createClient } from "@supabase/supabase-js";

/** listUsers() 응답의 user 항목 타입 (Supabase 생성 타입이 never로 추론되는 경우 대비) */
interface AuthAdminUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ========================================
// 유틸 함수
// ========================================

/**
 * ✅ 이메일로 유저 찾기
 */
async function findUserByEmail(email: string): Promise<AuthAdminUser> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`유저 조회 실패: ${error.message}`);
  }

  const users = (data?.users ?? []) as AuthAdminUser[];
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    throw new Error(`유저를 찾을 수 없습니다: ${email}`);
  }

  return user;
}

/**
 * ✅ 유저에게 admin role 부여
 */
async function setAdminRole(email: string, role: "admin" | "none"): Promise<void> {
  const supabase = getSupabaseAdmin();

  // 1. 유저 찾기
  const user = await findUserByEmail(email);

  console.log(`\n✅ 유저 발견: ${user.email} (ID: ${user.id})`);

  // 2. user_metadata 업데이트
  const updateData: any = {
    user_metadata: {
      ...user.user_metadata,
      role: role === "admin" ? "admin" : null, // none이면 null로 설정
    },
  };

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, updateData);

  if (error) {
    throw new Error(`Role 업데이트 실패: ${error.message}`);
  }

  console.log(`✅ Role 업데이트 완료: ${email} → ${role}`);
  console.log(`   user_metadata.role: ${role === "admin" ? "admin" : "null (제거됨)"}`);
}

/**
 * ✅ 관리자 목록 조회
 */
async function listAdmins(): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`유저 조회 실패: ${error.message}`);
  }

  const users = (data?.users ?? []) as AuthAdminUser[];
  const admins = users.filter(
    (u) => u.user_metadata?.role === "admin" || u.app_metadata?.role === "admin"
  );

  // 환경변수 allowlist도 표시
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST?.split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0) || [];

  console.log("\n📋 관리자 목록\n");
  console.log("=".repeat(60));

  if (admins.length === 0) {
    console.log('❌ metadata.role="admin"인 유저가 없습니다.');
  } else {
    console.log(`✅ metadata.role="admin"인 유저 (${admins.length}명):\n`);
    admins.forEach((u, idx) => {
      const roleSource =
        u.user_metadata?.role === "admin"
          ? "user_metadata"
          : u.app_metadata?.role === "admin"
          ? "app_metadata"
          : "unknown";
      console.log(`  ${idx + 1}. ${u.email} (ID: ${u.id}, source: ${roleSource})`);
    });
  }

  console.log("\n" + "=".repeat(60));

  if (allowlist.length > 0) {
    console.log(`\n📧 환경변수 ADMIN_EMAIL_ALLOWLIST (${allowlist.length}명):\n`);
    allowlist.forEach((email, idx) => {
      console.log(`  ${idx + 1}. ${email}`);
    });
    console.log();
  } else {
    console.log("\n⚠️  환경변수 ADMIN_EMAIL_ALLOWLIST가 설정되지 않았습니다.");
    console.log("   .env.local에 다음을 추가하세요:");
    console.log('   ADMIN_EMAIL_ALLOWLIST="admin@healo.com,manager@healo.com"\n');
  }

  console.log("=".repeat(60) + "\n");
}

// ========================================
// 메인 실행
// ========================================

async function main() {
  const args = process.argv.slice(2);

  console.log("\n🔐 HEALO 관리자 Role 설정 도구\n");

  // --list: 관리자 목록 조회
  if (args.includes("--list")) {
    await listAdmins();
    return;
  }

  // --email, --role: Role 설정
  const emailArg = args.find((a) => a.startsWith("--email="))?.split("=")[1];
  const roleArg = args.find((a) => a.startsWith("--role="))?.split("=")[1];

  if (!emailArg || !roleArg) {
    console.log("사용법:");
    console.log("  npx tsx scripts/set-admin.ts --email you@domain.com --role admin");
    console.log("  npx tsx scripts/set-admin.ts --email you@domain.com --role none");
    console.log("  npx tsx scripts/set-admin.ts --list\n");
    process.exit(1);
  }

  if (roleArg !== "admin" && roleArg !== "none") {
    console.error("❌ --role은 'admin' 또는 'none'만 가능합니다.\n");
    process.exit(1);
  }

  await setAdminRole(emailArg, roleArg as "admin" | "none");

  console.log("\n✅ 완료!");
  console.log("\n다음 명령어로 확인하세요:");
  console.log("  npx tsx scripts/set-admin.ts --list\n");
}

// 실행
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ 오류:", error.message);
      process.exit(1);
    });
}

export { setAdminRole, listAdmins };
