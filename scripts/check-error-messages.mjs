#!/usr/bin/env node
/**
 * 업로드·접수가 실패했을 때 «사람이 할 일이 다른» 사유가 한 문구로 뭉치지 않았는지 본다.
 *
 * 왜 만들었나 (2026-09-08, PO 질문 「모든 실패 케이스에 대해 제대로 안내해줄 수 있는거야?」):
 *   그날 아침 실사고가 정확히 이 모양이었다. 서버가 「형식이 어딘가 틀렸다」는 코드 하나만
 *   줬고 화면이 그걸 「이메일 주소를 확인해 주세요」로 옮겨서, 실제 원인(첨부 개수 초과)과
 *   무관한 곳을 고치게 만들었다. 두 자리를 고친 뒤 전수로 대조해 보니 **또 두 자리가 남아
 *   있었다** — 서류함·문의 퍼널이 rate_limited 를 안 갈랐고, 접수가 broken_encoding 을
 *   칸 형식 오류와 뭉쳐 두고 있었다. 사람 눈으로는 계속 새는 자리다.
 *
 * 무엇을 재나:
 *   아래 표의 «갈라야 하는 코드»가 각 화면에서 실제로 갈라져 있는지(그 코드 이름이
 *   분기 조건에 나오는지). 없으면 그 화면은 일반 문구로 떨어뜨리고 있다는 뜻이다.
 *
 * 무엇을 안 재나 (일부러):
 *   - 문구의 «내용»이 좋은지는 기계가 못 잰다. 여기서 보는 건 «갈라져 있나»뿐이다.
 *   - 사람이 할 일이 같은 코드(upload_failed·internal_error 등)는 일반 문구가 맞다.
 *
 * 실행: node scripts/check-error-messages.mjs [--selftest]
 */

import { readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// 화면마다 «반드시 갈라야 하는» 코드. 사람이 할 일이 서로 다른 것만 넣는다.
const RULES = [
  {
    file: "app/inquiry/referral/ReferralForm.jsx",
    label: "의뢰서",
    codes: [
      ["file_too_large", "파일을 나누거나 링크로"],
      ["invalid_file_type", "다른 형식으로"],
      ["rate_limited", "기다리면 된다"],
      ["too_many_documents", "몇 장 빼면 된다"],
      ["broken_encoding", "붙여넣기를 다시"],
      ["consent_required", "동의를 체크"],
      ["rate_limit_exceeded", "잠시 뒤 다시"],
    ],
  },
  {
    file: "app/patient/documents/DocumentsClient.jsx",
    label: "환자 서류함",
    codes: [
      ["file_too_large", "파일을 나누거나 링크로"],
      ["invalid_file_type", "다른 형식으로"],
      ["rate_limited", "기다리면 된다"],
    ],
  },
  {
    file: "app/inquiry/_components/UnifiedInquiryFunnel.jsx",
    label: "문의 퍼널",
    codes: [
      ["file_too_large", "파일을 나누거나 링크로"],
      ["invalid_file_type", "다른 형식으로"],
      ["rate_limited", "기다리면 된다"],
    ],
  },
];

/** 소스에 그 코드가 «분기 조건»으로 등장하나. */
function handles(src, code) {
  return new RegExp(`["']${code}["']`).test(src);
}

function run(root) {
  const missing = [];
  for (const rule of RULES) {
    let src;
    try {
      src = readFileSync(join(root, rule.file), "utf8");
    } catch {
      continue; // 파일이 사라졌으면 다른 검사가 잡는다
    }
    for (const [code, todo] of rule.codes) {
      if (!handles(src, code)) missing.push({ ...rule, code, todo });
    }
  }
  return missing;
}

// ─── 자기시험 — 「진짜 잡는지」를 먼저 잰다 ───
if (process.argv.includes("--selftest")) {
  const tmp = mkdtempSync(join(tmpdir(), "err-msg-"));
  const write = (rel, body) => {
    const full = join(tmp, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body, "utf8");
  };
  let bad = 0;
  const cases = [
    ["코드를 안 가른 화면", `if (code === "file_too_large") return a;`, true],
    ["세 코드를 다 가른 화면",
      `if (code === "file_too_large") return a;
       if (code === "invalid_file_type") return b;
       if (code === "rate_limited") return c;`, false],
  ];
  for (const [name, body, shouldCatch] of cases) {
    write("app/patient/documents/DocumentsClient.jsx", body);
    const caught = run(tmp).some((m) => m.label === "환자 서류함");
    const ok = caught === shouldCatch;
    if (!ok) bad++;
    console.log(`  ${ok ? "✅" : "❌"} ${name} — ${shouldCatch ? "잡아야" : "통과해야"} 함, 실제 ${caught ? "잡음" : "통과"}`);
  }
  rmSync(tmp, { recursive: true, force: true });
  if (bad) {
    console.error(`\n[error-messages] 자기시험 ${bad}건 실패 — 이 검사는 «가짜 초록불»이다.`);
    process.exit(1);
  }
  console.log("[error-messages] 자기시험 통과 — 안 가른 화면을 실제로 잡는다.\n");
}

const missing = run(process.cwd());
if (missing.length === 0) {
  const total = RULES.reduce((n, r) => n + r.codes.length, 0);
  console.log(`[error-messages] OK — 화면 ${RULES.length}곳, 갈라야 할 사유 ${total}개 전부 갈라져 있다`);
  process.exit(0);
}

console.error(`[error-messages] 사유가 «일반 오류»로 뭉쳐 있는 자리 ${missing.length}건\n`);
for (const m of missing) {
  console.error(`  ${m.label} (${m.file})`);
  console.error(`    ${m.code} — 사람이 할 일: ${m.todo}`);
  console.error(`    → 이 코드를 갈라 전용 문구를 주지 않으면, 사람은 엉뚱한 데를 고친다.\n`);
}
console.error("2026-09-08 실사고: 「형식 오류」를 「이메일을 확인하세요」로 옮겨 멀쩡한 이메일을 계속 고쳤다.");
process.exit(1);
