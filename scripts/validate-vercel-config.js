#!/usr/bin/env node
/**
 * validate-vercel-config.js
 * vercel.json 설정이 Hobby 플랜 제약을 충족하는지 검증.
 * pre-commit 훅 및 CI에서 호출됨.
 * 에러 시 exit 1.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = process.cwd();
const CONFIG_PATH = resolve(ROOT, "vercel.json");

// Hobby 허용: "분(0-59) 시(0-23) * * *" — 분/시 자리 모두 숫자여야 daily
// 예: "0 2 * * *" (O), "*/10 * * * *" (X), "0 * * * *" (X, hourly)
const DAILY_CRON_PATTERN = /^\d+\s+\d+\s+\*\s+\*\s+\*$/;
const FORBIDDEN_PATTERNS = [
  { regex: /\*\/\d+\s+\*\s+\*\s+\*\s+\*/, label: "분 단위 반복 (*/N * * * *)" },
  { regex: /\*\s+\*\/\d+\s+\*\s+\*\s+\*/, label: "시간 단위 반복 (* */N * * *)" },
  { regex: /^\*\s+\*\s+\*\s+\*\s+\*$/, label: "매 분 (* * * * *)" },
  { regex: /^\d+\s+\*\s+\*\s+\*\s+\*$/, label: "매 시간 (N * * * *)" },
];

const HOBBY_MAX_DURATION = 10; // seconds
const VALID_REGIONS = [
  "iad1","sfo1","pdx1","sea1","dfw1","lax1","mia1",
  "bos1","lga1","cle1","gru1","hkg1","sin1","nrt1",
  "icn1","fra1","cdg1","lhr1","arn1","cpt1","bom1","dub1",
];

let errors = [];

if (!existsSync(CONFIG_PATH)) {
  console.log("vercel.json 없음 — 검증 스킵");
  process.exit(0);
}

let config;
try {
  config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
} catch (e) {
  errors.push(`vercel.json JSON 파싱 실패: ${e.message}`);
  report(errors);
}

// 1. crons 검증
if (Array.isArray(config.crons)) {
  config.crons.forEach((cron, i) => {
    const schedule = cron.schedule ?? "";
    const path = cron.path ?? `(index ${i})`;

    // 금지 패턴 먼저 체크
    for (const { regex, label } of FORBIDDEN_PATTERNS) {
      if (regex.test(schedule)) {
        errors.push(
          `crons[${i}] "${path}": 금지된 스케줄 "${schedule}" (${label})\n` +
          `  → Hobby 플랜은 daily 크론만 허용. Pro 업그레이드 전엔 "0 X * * *" 형태만 사용.`
        );
      }
    }

    // daily 패턴 아닌지 확인 (금지 패턴에 걸리지 않은 경우만)
    if (!DAILY_CRON_PATTERN.test(schedule) && !errors.some(e => e.includes(`crons[${i}]`))) {
      errors.push(
        `crons[${i}] "${path}": 스케줄 "${schedule}"이 Hobby 허용 형식이 아님\n` +
        `  → Hobby 플랜은 daily 크론만 허용. "0 X * * *" 형태만 사용 가능.`
      );
    }
  });
}

// 2. functions maxDuration 검증
if (config.functions && typeof config.functions === "object") {
  for (const [fn, opts] of Object.entries(config.functions)) {
    if (opts.maxDuration !== undefined && opts.maxDuration > HOBBY_MAX_DURATION) {
      errors.push(
        `functions["${fn}"].maxDuration = ${opts.maxDuration}초 → Hobby 한도 초과 (최대 ${HOBBY_MAX_DURATION}초)\n` +
        `  → Pro 플랜 업그레이드 전까지 maxDuration을 ${HOBBY_MAX_DURATION} 이하로 설정.`
      );
    }
  }
}

// 3. regions 검증
if (Array.isArray(config.regions)) {
  config.regions.forEach((r) => {
    if (!VALID_REGIONS.includes(r)) {
      errors.push(`regions에 알 수 없는 값 "${r}" — 유효한 리전: ${VALID_REGIONS.join(", ")}`);
    }
  });
}

report(errors);

function report(errs) {
  if (errs.length === 0) {
    console.log("✓ vercel.json 검증 통과 (Hobby 플랜 호환)");
    process.exit(0);
  }
  console.error("\n[vercel.json 검증 실패]\n");
  errs.forEach((e, i) => console.error(`${i + 1}. ${e}\n`));
  console.error(
    "배포 전 위 항목을 수정하세요.\n" +
    "Pro 업그레이드 필요 시: https://vercel.com/pricing\n"
  );
  process.exit(1);
}
