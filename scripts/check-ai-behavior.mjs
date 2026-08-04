#!/usr/bin/env node
/**
 * healwith: AI 챗 "행동" 점검 (배포 후 / 온디맨드)
 *
 * 왜: 빌드·단위테스트는 "문법·순수로직"만 본다. 실제 대화에서 AI 가
 *   ① 환자가 안 밝힌 암종을 단정하거나(대장암 떠넘기기),
 *   ② "그거 아니라고" 정정해도 계속 우기거나,
 *   ③ 사용자 언어가 아닌 언어로 답하는
 * 류의 "행동" 버그는 PO 가 스크린샷 찍어야만 드러났다. 이 스크립트는 그 시나리오를
 * 실제 라우트(/api/public/chat)로 재생해 invariant 위반을 자동으로 잡는다.
 *
 * 사용:
 *   node scripts/check-ai-behavior.mjs [BASE_URL]
 *   AI_SMOKE_URL=https://...preview.vercel.app node scripts/check-ai-behavior.mjs
 *   기본값: prod (https://healo-khidi.vercel.app)
 *
 * 주의: 실제 AI 를 호출하므로 비용·일일 회수제한을 소모한다. CI 매 PR 게이트가 아니라
 *   배포 후 1회 / 의심될 때 수동으로 돌린다(단위테스트 topicGuards.test.ts 가 CI 가드).
 *   회수제한(ai_daily_limit)에 걸리면 실패가 아니라 "건너뜀"으로 처리(거짓 실패 방지).
 */

const BASE = process.argv[2] || process.env.AI_SMOKE_URL || "https://healo-khidi.vercel.app";

// 스트림 메타 프레임 구분자(RS, U+001E) — 라우트의 STREAM_META_DELIM 과 동일.
const META_DELIM = String.fromCharCode(0x1e);

// 특정 암종어(단독 "암"은 제외 — 암종 명명만). topicGuards.ts 와 같은 취지.
const CANCER = /(?:[가-힣]{1,5}암)(?![가-힣])|백혈병|림프종|colorectal|breast cancer|lung cancer|stomach cancer/i;

let hardFails = 0;
let warns = 0;
let skipped = false;

async function startThread(language = "ko") {
  const r = await fetch(`${BASE}/api/public/chat/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // PIPA: /start·/stream 이 동의를 요구함(게이트). 점검도 동의 포함해야 통과.
    // ⚠️ guest_email 은 «실적 오염» 방지용이다 — 3턴 넘게 대화하면 서버가 이 스레드를
    //   진짜 문의로 승격시키는데, 식별값이 없으면 「테스트」 판정이 안 걸린다(2026-08-04 실측:
    //   이렇게 새어 진짜로 잡힌 문의 17건). healo-test.invalid = 내부 전용 도메인.
    body: JSON.stringify({
      language,
      consent: true,
      consent_version: "1.0.0",
      guest_name: "AI 동작 점검",
      guest_email: "ai-behavior@healo-test.invalid",
    }),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`start failed: ${JSON.stringify(j)}`);
  return { tid: j.thread_id, tok: j.public_token };
}

async function send({ tid, tok }, text) {
  const r = await fetch(`${BASE}/api/public/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: tid, public_token: tok, message_text: text }),
  });
  const raw = await r.text();
  if (/ai_daily_limit|rate_limited/.test(raw)) { skipped = true; return null; }
  // 와이어 끝의 메타 프레임(JSON) 제거 — 말풍선 텍스트만 본다.
  const rsIdx = raw.indexOf(META_DELIM);
  return (rsIdx >= 0 ? raw.slice(0, rsIdx) : raw).trim();
}

function check(name, condition, detail, hard = true) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else if (hard) {
    hardFails++;
    console.log(`  ✗ FAIL ${name}\n      ${detail}`);
  } else {
    warns++;
    console.log(`  ⚠ WARN ${name}\n      ${detail}`);
  }
}

async function run() {
  console.log(`[check-ai-behavior] target=${BASE}\n`);

  // 시나리오: 대장암을 여러 번 물어 화제를 "고정"시킨 뒤 → 정정 / generic 질문.
  const t = await startThread("ko");
  for (let i = 0; i < 3; i++) await send(t, "대장암 치료법 알려줘");

  console.log("[정정] '난대장암안물어봤는데?' — 화제 버리고 암종 언급 0 이어야:");
  const corr = await send(t, "난대장암안물어봤는데?");
  if (skipped) { console.log("  ⏭  회수제한으로 건너뜀(거짓실패 방지)"); }
  else {
    check("정정 응답에 암종 언급이 없다(대장암 등)", !CANCER.test(corr || ""),
      `응답: ${String(corr).slice(0, 120)}`);
    check("정정을 사과/재질문으로 수용한다", /(죄송|미안|sorry|apolog)/i.test(corr || ""),
      `응답: ${String(corr).slice(0, 120)}`);
  }

  console.log("\n[generic] '한국 가서 치료 절차 알려줘'(암종 안 밝힘) — 암종 단정 0 이어야:");
  const gen = await send(t, "한국에 가서 치료 받고 싶은데 절차 알려줘");
  if (skipped) { console.log("  ⏭  회수제한으로 건너뜀"); }
  else {
    // generic 은 모델 경유(확률적) → 경고로만(하드 실패 아님).
    check("generic 답변에 특정 암종 단정이 없다", !CANCER.test(gen || ""),
      `응답: ${String(gen).slice(0, 120)}`, false);
  }

  console.log("\n[영어 정정] 'I didnt ask about that' — 영어로 화제 버려야:");
  const t2 = await startThread("en");
  for (let i = 0; i < 2; i++) await send(t2, "tell me about colorectal cancer");
  const en = await send(t2, "I didnt ask about that");
  if (skipped) { console.log("  ⏭  회수제한으로 건너뜀"); }
  else {
    check("영어 정정 응답에 암종 언급이 없다", !CANCER.test(en || ""),
      `응답: ${String(en).slice(0, 120)}`);
  }

  console.log("");
  if (skipped) {
    console.log("⏭  일부/전부 회수제한으로 건너뜀 — 잠시 후 다시 실행 권장. (거짓 실패로 막지 않음)");
    process.exit(0);
  }
  if (hardFails > 0) {
    console.log(`❌ AI 행동 점검 실패: 하드 ${hardFails}건 / 경고 ${warns}건`);
    process.exit(1);
  }
  console.log(`✅ AI 행동 점검 통과 (경고 ${warns}건)`);
  process.exit(0);
}

run().catch((e) => { console.error("[check-ai-behavior] error:", e.message); process.exit(2); });
