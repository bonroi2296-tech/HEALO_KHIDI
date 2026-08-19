/**
 * Environment variable validation script.
 * Usage: npm run check:env
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_VARS = {
  NEXT_PUBLIC_SUPABASE_URL: 'Supabase project URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anon key',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key',
  // ⚠️ 이름 주의(지도 열쇠와 «똑같은» 사고): 파일 이름은 encryptionV2.ts 인데
  //    코드가 실제로 읽는 환경변수는 ENCRYPTION_KEY_V1 이다(src/lib/security/encryptionV2.ts:53).
  //    2026-08-14 까지 이 검사기는 «있지도 않은» ENCRYPTION_KEY_V2 를 요구해서
  //    ①늘 실패하고(그래서 아무도 안 봄) ②정작 진짜 열쇠가 빠져도 한마디도 안 했다.
  ENCRYPTION_KEY_V1: '환자 개인정보 암·복호화 열쇠 (base64 44자 또는 hex 64자)',
  GOOGLE_GENERATIVE_AI_API_KEY: 'Google AI API key',
};

const OPTIONAL_VARS = {
  NEXT_PUBLIC_SITE_URL: 'Public base URL for emails/sitemap/canonical/survey links (should be https://healwith.co.kr in prod)',
  // ⚠️ 이름 주의: 코드가 실제로 읽는 건 «NEXT_PUBLIC_» 이 붙은 쪽이다
  //    (src/components/GoogleMap.jsx). 2026-08-14 까지 이 검사기는 앞머리 없는
  //    GOOGLE_MAPS_API_KEY 를 보고 있어서, 진짜 열쇠가 빠져도 아무 말을 안 했다.
  //    그 결과 실서비스에서 병원 지도가 «조용히» 안 뜨고 회색 위치 상자만 나왔다.
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'Google Maps 열쇠 — 없으면 병원 상세의 지도가 회색 위치 상자로 대체됨(의도된 대체 화면)',
  // ⚠️ GA4 측정ID는 env 가 아니라 «코드 상수»(src/lib/ga.ts 의 GA_ID)가 단일 진실원천이다.
  //    예전 Vercel env 가 옛 실험 속성으로 오염돼 있어 일부러 코드로 고정했다. 이 env 는
  //    설정해도 쓰이지 않으니 «미설정»이 정상 — 속성을 바꾸려면 src/lib/ga.ts 를 고칠 것.
  NEXT_PUBLIC_GA_MEASUREMENT_ID: '(미사용 — GA4 측정ID는 src/lib/ga.ts 의 GA_ID 상수가 SoR)',
  NEXT_PUBLIC_YANDEX_METRICA_ID: 'Yandex Metrica 카운터 ID (러시아/CIS). 없으면 Yandex 추적 완전 미로드',
  AWS_SES_REGION: 'AWS SES region',
  AWS_SES_ACCESS_KEY_ID: 'AWS SES access key',
  AWS_SES_SECRET_ACCESS_KEY: 'AWS SES secret key',
  AWS_SES_FROM_EMAIL: 'AWS SES sender email',
  ADMIN_EMAIL_ALLOWLIST: 'Comma-separated admin email allowlist',
};

console.log('Checking environment variables...\n');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local was not found.');
  console.error('Create it from .env.example, then fill in the required values.\n');
  process.exit(1);
}

dotenv.config({ path: envPath });

let hasErrors = false;
let hasWarnings = false;

console.log('Required variables\n');
for (const [key, description] of Object.entries(REQUIRED_VARS)) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    console.error(`Missing: ${key}`);
    console.error(`  ${description}\n`);
    hasErrors = true;
  } else {
    console.log(`OK: ${key} (${value.length} chars)`);
  }
}

console.log('\nOptional variables\n');
for (const [key, description] of Object.entries(OPTIONAL_VARS)) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    console.warn(`Missing optional: ${key}`);
    console.warn(`  ${description}\n`);
    hasWarnings = true;
  } else {
    console.log(`OK: ${key}`);
  }
}

// 길이 판정은 encryptionV2.ts 가 실제로 받아주는 두 형식에 맞춘다 — hex 64자 또는 base64 44자.
// (예전엔 hex 64자만 통과시켜서, 정상인 base64 열쇠를 «틀렸다»고 잡을 뻔했다.)
if (process.env.ENCRYPTION_KEY_V1) {
  const key = process.env.ENCRYPTION_KEY_V1.trim();
  const okHex = /^[0-9a-fA-F]{64}$/.test(key);
  const okB64 = key.length === 44 && Buffer.from(key, 'base64').length === 32;
  if (!okHex && !okB64) {
    console.error(`\nInvalid ENCRYPTION_KEY_V1: ${key.length} chars. Expected hex 64 chars or base64 44 chars (=32 bytes).`);
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    hasErrors = true;
  }
}

// NEXT_PUBLIC_SITE_URL must never point at a retired domain (emails/links break silently)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
const STALE_DOMAINS = ['healo-khidi.vercel.app', 'khidi.healo.kr'];
const staleHit = STALE_DOMAINS.find((d) => siteUrl.includes(d));
if (staleHit) {
  console.error(`\nNEXT_PUBLIC_SITE_URL points at a retired domain: ${staleHit}`);
  console.error('  All email/sitemap/canonical/survey links would break. Set it to https://healwith.co.kr');
  hasErrors = true;
}

console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('\nValidation failed. Fix the required variables in .env.local.\n');
  process.exit(1);
}

if (hasWarnings) {
  console.warn('\nValidation completed with warnings. Some optional features may not work.\n');
  process.exit(0);
}

console.log('\nValidation completed. All configured variables look valid.\n');
process.exit(0);
