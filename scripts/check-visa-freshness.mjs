#!/usr/bin/env node
/**
 * check:visa-freshness — 비자/K-ETA 정적 데이터의 "조용한 만료"를 CI가 잡는다.
 *
 * 왜: 비자·K-ETA는 외부 법령이라 날짜가 박힌 규정("2026년 6월까지" 등)이
 *     시간만 지나도 저절로 틀려진다. 빌드·타입·i18n 검사는 이런 사실 만료를
 *     못 본다. 이 스크립트가 src/lib/visa/visaGuide.ts 의 두 장치를 검사:
 *   1) VISA_DATA_LAST_VERIFIED  — 마지막 실검증일. 180일 초과 시 실패.
 *   2) TIME_SENSITIVE_DEADLINES — 기한부 사실. expiresOn 이 지나면 실패.
 *
 * 실패하면 = "규정 다시 확인하고 데이터·날짜를 갱신하라"는 신호.
 * (POSTMORTEMS #56/#57 재발방지. PO가 화면에서 stale을 찾는 일을 없앤다.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src', 'lib', 'visa', 'visaGuide.ts');

const STALE_AFTER_DAYS = 180; // 마지막 검증 후 이만큼 지나면 재검증 강제
const WARN_BEFORE_DAYS = 45; // 만료 이만큼 앞두면 경고(실패 아님)

const DAY = 86400000;
const today = new Date();
today.setHours(0, 0, 0, 0);

const errors = [];
const warnings = [];

function parseISO(s) {
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

let text;
try {
  text = fs.readFileSync(SRC, 'utf8');
} catch {
  console.error(`✗ 비자 데이터 파일을 못 읽음: ${SRC}`);
  process.exit(1);
}

// 1) 마지막 검증일
const lvMatch = text.match(/VISA_DATA_LAST_VERIFIED\s*=\s*'(\d{4}-\d{2}-\d{2})'/);
if (!lvMatch) {
  errors.push("VISA_DATA_LAST_VERIFIED 상수를 찾지 못함 (형식: export const VISA_DATA_LAST_VERIFIED = 'YYYY-MM-DD').");
} else {
  const lv = parseISO(lvMatch[1]);
  if (!lv) {
    errors.push(`VISA_DATA_LAST_VERIFIED 날짜 형식 오류: "${lvMatch[1]}"`);
  } else {
    const ageDays = Math.floor((today - lv) / DAY);
    if (ageDays > STALE_AFTER_DAYS) {
      errors.push(
        `비자 데이터 마지막 검증(${lvMatch[1]})이 ${ageDays}일 전 — ${STALE_AFTER_DAYS}일 초과. ` +
          `규정 재검증 후 VISA_DATA_LAST_VERIFIED를 오늘 날짜로 갱신하세요.`,
      );
    } else if (ageDays > STALE_AFTER_DAYS - 30) {
      warnings.push(`비자 데이터 검증 ${ageDays}일 경과 — 곧 재검증 필요(${STALE_AFTER_DAYS}일 임박).`);
    }
  }
}

// 2) 기한부 사실 (id 바로 뒤 expiresOn 형태)
const dlRe = /id:\s*'([^']+)',\s*expiresOn:\s*'(\d{4}-\d{2}-\d{2})'/g;
let m;
let count = 0;
while ((m = dlRe.exec(text)) !== null) {
  count += 1;
  const [, id, iso] = m;
  const exp = parseISO(iso);
  if (!exp) {
    errors.push(`기한부 사실 '${id}'의 expiresOn 날짜 형식 오류: "${iso}"`);
    continue;
  }
  const daysLeft = Math.floor((exp - today) / DAY);
  if (daysLeft < 0) {
    errors.push(
      `기한부 사실 '${id}' 만료됨 (expiresOn ${iso}, ${-daysLeft}일 지남) — ` +
        `규정을 재확인해 해당 국가 문구와 expiresOn을 갱신하세요.`,
    );
  } else if (daysLeft <= WARN_BEFORE_DAYS) {
    warnings.push(`기한부 사실 '${id}' 만료 임박 (expiresOn ${iso}, ${daysLeft}일 남음) — 미리 재확인.`);
  }
}
if (count === 0) {
  errors.push('TIME_SENSITIVE_DEADLINES에서 항목을 하나도 못 읽음 — 배열/형식을 확인하세요.');
}

for (const w of warnings) console.warn(`⚠ ${w}`);

if (errors.length > 0) {
  console.error('\n✗ 비자 데이터 프레시니스 검사 실패:');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\n조치: 공식 출처(k-eta.go.kr·MOFA·visa policy of South Korea)로 규정을 재확인하고');
  console.error('      src/lib/visa/visaGuide.ts의 데이터·expiresOn·VISA_DATA_LAST_VERIFIED를 갱신하세요.');
  process.exit(1);
}

const warnNote = warnings.length ? ` (경고 ${warnings.length}건)` : '';
console.log(`✓ 비자 데이터 프레시니스 검사 통과 — 기한부 사실 ${count}건 유효${warnNote}`);
