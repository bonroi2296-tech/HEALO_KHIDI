#!/usr/bin/env node
/**
 * healwith: AI 챗 라이브 스모크 테스트 (PO 수동 클릭 대체)
 *
 * 아까 사람이 손으로 확인하던 걸 자동화한다:
 *   TEST A) 연락처 없이 "접수해줘" → 거짓 "접수완료" 금지·연락처 요청 (state-detection 핵심 버그)
 *   TEST B) "로그인 안 했는데 저장돼?" → 정직한 "저장됨/30일" 안내 (topic-correction 오탐 금지)
 *
 * ⚠️ 실DB 오염 금지(PO 원칙): 테스트로 만든 스레드는 끝나면 service_role 로 삭제한다.
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 가 있으면 자동 정리.
 *   - 없으면 정리 못 함 경고(스레드 metadata.smoke_test=true 로 식별은 됨).
 *
 * 사용: BASE_URL=https://healo-khidi.vercel.app node scripts/smoke-chat.mjs
 * 종료코드: 0=전부 통과, 1=실패(또는 도달 불가) → CI/스케줄이 빨강으로 알림.
 */

const BASE_URL = (process.env.BASE_URL || "https://healo-khidi.vercel.app").replace(/\/$/, "");
const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const RS = ""; // 스트림 메타 프레임 구분자
const createdThreadIds = [];

const fail = (msg) => { console.error(`❌ ${msg}`); };
const ok = (msg) => { console.log(`✅ ${msg}`); };

async function startThread() {
  const res = await fetch(`${BASE_URL}/api/public/chat/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "ko",
      browser_session_id: `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      landing_path: "/inquiry",
      client_meta: { smoke_test: true },
    }),
  });
  if (!res.ok) throw new Error(`start 실패 HTTP ${res.status}`);
  const j = await res.json();
  if (!j.ok || !j.thread_id) throw new Error(`start 응답 이상: ${JSON.stringify(j)}`);
  createdThreadIds.push(j.thread_id);
  return j;
}

async function sendMessage(thread, text) {
  const res = await fetch(`${BASE_URL}/api/public/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: thread.thread_id, public_token: thread.public_token, message_text: text }),
  });
  if (!res.ok) throw new Error(`stream 실패 HTTP ${res.status}`);
  const raw = await res.text();
  return raw.split(RS)[0].trim(); // 메타 프레임 앞 = 사용자에게 보이는 답변
}

// service_role 로 테스트 스레드 삭제(REST). 실패해도 스모크 결과엔 영향 안 줌(경고만).
async function cleanup() {
  if (!SB_URL || !SB_KEY) {
    console.warn("⚠️ 정리 건너뜀 — SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 없음(테스트 스레드가 DB에 남음).");
    return;
  }
  const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: "return=minimal" };
  for (const id of createdThreadIds) {
    try {
      // FK 순서: playbook_usage_events(메시지 참조) → chat_messages → chat_threads
      await fetch(`${SB_URL}/rest/v1/playbook_usage_events?thread_id=eq.${id}`, { method: "DELETE", headers: h });
      await fetch(`${SB_URL}/rest/v1/chat_messages?thread_id=eq.${id}`, { method: "DELETE", headers: h });
      await fetch(`${SB_URL}/rest/v1/chat_threads?id=eq.${id}`, { method: "DELETE", headers: h });
    } catch (e) {
      console.warn(`⚠️ 정리 실패(thread ${id}): ${e.message}`);
    }
  }
  console.log(`🧹 테스트 스레드 ${createdThreadIds.length}개 정리 완료.`);
}

async function main() {
  console.log(`▶ AI 챗 스모크 테스트 @ ${BASE_URL}`);
  let passed = 0, total = 0;

  // TEST A: 연락처 없이 접수 → 거짓 접수완료 금지 + 연락처 요청
  total++;
  try {
    const t = await startThread();
    const reply = await sendMessage(t, "접수해줘");
    const asksContact = /(연락처|이메일|메신저|email|messenger|telegram|whatsapp)/i.test(reply);
    const falseConfirm = /(접수됐|접수\s*완료|접수해\s*드렸|등록되었|등록됐|registered)/.test(reply);
    if (asksContact && !falseConfirm) { ok(`TEST A 접수게이트 — 연락처 요청, 거짓 접수완료 없음`); passed++; }
    else fail(`TEST A 실패 — asksContact=${asksContact} falseConfirm=${falseConfirm}\n   답변: ${reply.slice(0, 200)}`);
  } catch (e) { fail(`TEST A 예외: ${e.message}`); }

  // TEST B: 세션 질문 → 정직 안내(저장/30일), 화제정정 오탐 금지
  total++;
  try {
    const t = await startThread();
    const reply = await sendMessage(t, "나 로그인 안 했는데 이거 저장돼? 창 닫으면 사라져?");
    const honest = /(저장|보관|30일|이\s*(브라우저|기기)|saved|stored)/.test(reply);
    const misfired = /(잘못\s*짚|misread|어떤 도움이 필요)/.test(reply);
    if (honest && !misfired) { ok(`TEST B 세션안내 — 정직한 저장 안내, 화제정정 오탐 없음`); passed++; }
    else fail(`TEST B 실패 — honest=${honest} misfired=${misfired}\n   답변: ${reply.slice(0, 200)}`);
  } catch (e) { fail(`TEST B 예외: ${e.message}`); }

  await cleanup();

  console.log(`\n결과: ${passed}/${total} 통과`);
  if (passed !== total) process.exit(1);
}

main().catch((e) => { console.error(`치명적 오류: ${e.message}`); cleanup().finally(() => process.exit(1)); });
