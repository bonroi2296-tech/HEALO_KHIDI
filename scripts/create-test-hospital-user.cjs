/**
 * 테스트용 병원 담당자 계정 생성 스크립트
 * 실행: node scripts/create-test-hospital-user.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ⚠️ 보안: 비밀번호를 하드코딩하지 않고 환경변수로 주입
//   실행 예: TEST_HOSPITAL_EMAIL=foo@bar.com TEST_HOSPITAL_PASSWORD='$(openssl rand -base64 18)' node scripts/create-test-hospital-user.cjs
const TEST_EMAIL = process.env.TEST_HOSPITAL_EMAIL;
const TEST_PASSWORD = process.env.TEST_HOSPITAL_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    "❌ TEST_HOSPITAL_EMAIL, TEST_HOSPITAL_PASSWORD 환경변수가 필요합니다.\n" +
      "   예: TEST_HOSPITAL_EMAIL=foo@bar.com TEST_HOSPITAL_PASSWORD=\"$(openssl rand -base64 18)\" node scripts/create-test-hospital-user.cjs"
  );
  process.exit(1);
}

if (TEST_PASSWORD.length < 12) {
  console.error("❌ TEST_HOSPITAL_PASSWORD는 12자 이상이어야 합니다.");
  process.exit(1);
}

async function main() {
  console.log("=== 병원 테스트 계정 생성 ===\n");

  // 1. 병원 목록 조회
  const { data: hospitals, error: hErr } = await supabase
    .from("hospitals")
    .select("id, name")
    .order("name");

  if (hErr) {
    console.error("병원 조회 실패:", hErr.message);
    return;
  }

  console.log("등록된 병원:");
  hospitals.forEach((h, i) => console.log(`  ${i + 1}. ${h.name} (${h.id})`));

  // 면력한방병원 찾기 (또는 첫 번째 병원)
  const target = hospitals.find((h) => h.name.includes("면력") || h.name.includes("Immune")) || hospitals[0];
  if (!target) {
    console.error("병원이 없습니다.");
    return;
  }
  console.log(`\n대상 병원: ${target.name}`);

  // 2. Auth 유저 생성 (이미 있으면 찾기)
  let userId;

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(
    (u) => u.email === TEST_EMAIL
  );

  if (existing) {
    console.log(`기존 유저 발견: ${existing.email} (${existing.id})`);
    // 비밀번호 업데이트
    await supabase.auth.admin.updateUserById(existing.id, {
      password: TEST_PASSWORD,
    });
    console.log(`비밀번호 '${TEST_PASSWORD}'로 업데이트 완료`);
    userId = existing.id;
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (createErr) {
      console.error("유저 생성 실패:", createErr.message);
      return;
    }
    console.log(`새 유저 생성: ${newUser.user.email} (${newUser.user.id})`);
    userId = newUser.user.id;
  }

  // 3. hospital_users에 연결
  const { data: existingLink } = await supabase
    .from("hospital_users")
    .select("id")
    .eq("user_id", userId)
    .eq("hospital_id", target.id)
    .single();

  if (existingLink) {
    console.log("이미 병원에 연결되어 있습니다.");
  } else {
    const { error: linkErr } = await supabase
      .from("hospital_users")
      .insert({
        user_id: userId,
        hospital_id: target.id,
        role: "manager",
        is_active: true,
      });

    if (linkErr) {
      console.error("병원 연결 실패:", linkErr.message);
      return;
    }
    console.log("병원 담당자로 등록 완료!");
  }

  console.log("\n=== 테스트 로그인 정보 ===");
  console.log(`이메일: ${TEST_EMAIL}`);
  console.log(`비밀번호: ${TEST_PASSWORD}`);
  console.log(`병원: ${target.name}`);
  console.log(`\n로그인 후 http://localhost:3000/hospital 접속`);
}

main().catch(console.error);
