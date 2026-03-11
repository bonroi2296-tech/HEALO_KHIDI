/**
 * 환경변수 검증 스크립트
 * Usage: node scripts/check-env.js
 */

const fs = require('fs');
const path = require('path');

// 필수 환경변수 목록
const REQUIRED_VARS = {
  // Supabase (필수)
  NEXT_PUBLIC_SUPABASE_URL: '프로젝트 URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '공개 anon key',
  SUPABASE_SERVICE_ROLE_KEY: '서비스 role key (서버 전용)',
  
  // Encryption (필수)
  ENCRYPTION_KEY_V2: '암호화 키 (32바이트 hex)',
  
  // AI (챗봇, 번역, 시술 추출 등 전체 LLM 기능)
  GOOGLE_GENERATIVE_AI_API_KEY: 'Google AI (Gemini) API key',
};

// 선택 환경변수 (경고만)
const OPTIONAL_VARS = {
  GOOGLE_MAPS_API_KEY: 'Google Maps API key',
  NEXT_PUBLIC_GA_MEASUREMENT_ID: 'Google Analytics ID',
  AWS_SES_REGION: 'AWS SES 리전 (이메일 발송)',
  AWS_SES_ACCESS_KEY_ID: 'AWS SES Access Key',
  AWS_SES_SECRET_ACCESS_KEY: 'AWS SES Secret Key',
  AWS_SES_FROM_EMAIL: '발신 이메일 주소',
  ADMIN_EMAIL_ALLOWLIST: '관리자 이메일 목록 (쉼표 구분)',
};

console.log('🔍 환경변수 검증 시작...\n');

// .env.local 파일 확인
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local 파일이 없습니다!');
  console.log('💡 .env.example을 복사하여 .env.local을 생성하세요:');
  console.log('   cp .env.example .env.local\n');
  process.exit(1);
}

// 환경변수 로드
require('dotenv').config({ path: envPath });

let hasErrors = false;
let hasWarnings = false;

// 필수 환경변수 체크
console.log('📌 필수 환경변수 검증:\n');
for (const [key, description] of Object.entries(REQUIRED_VARS)) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    console.error(`❌ ${key} - 누락됨`);
    console.error(`   설명: ${description}\n`);
    hasErrors = true;
  } else {
    console.log(`✅ ${key} - 설정됨 (${value.length}자)`);
  }
}

// 선택 환경변수 체크
console.log('\n⚙️  선택 환경변수 검증:\n');
for (const [key, description] of Object.entries(OPTIONAL_VARS)) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    console.warn(`⚠️  ${key} - 누락됨 (선택사항)`);
    console.warn(`   설명: ${description}\n`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${key} - 설정됨`);
  }
}

// 암호화 키 검증 (길이 체크)
if (process.env.ENCRYPTION_KEY_V2) {
  const keyLength = process.env.ENCRYPTION_KEY_V2.length;
  if (keyLength !== 64) {
    console.error(`\n❌ ENCRYPTION_KEY_V2 길이 오류: ${keyLength}자 (64자 hex 필요)`);
    console.error('   생성 방법: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    hasErrors = true;
  }
}

// 결과 출력
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('\n❌ 검증 실패: 필수 환경변수가 누락되었습니다.');
  console.error('💡 .env.local 파일을 수정한 후 다시 실행하세요.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️  검증 완료 (경고 있음): 일부 선택 환경변수가 누락되었습니다.');
  console.warn('💡 해당 기능 사용 시 오류가 발생할 수 있습니다.\n');
  process.exit(0);
} else {
  console.log('\n✅ 검증 완료: 모든 환경변수가 올바르게 설정되었습니다!\n');
  process.exit(0);
}
