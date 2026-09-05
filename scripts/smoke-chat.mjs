#!/usr/bin/env node
/**
 * healwith: AI 챗 라이브 스모크 테스트 (PO 수동 클릭 대체)
 *
 * 아까 사람이 손으로 확인하던 걸 자동화한다:
 *   TEST A) 연락처 없이 "접수해줘" → 거짓 "접수완료" 금지·연락처 요청 (state-detection 핵심 버그)
 *   TEST B) "로그인 안 했는데 저장돼?" → 정직한 "저장됨/30일" 안내 (topic-correction 오탐 금지)
 *   TEST C) 지식질문 → 응답 metadata.rag_chunks_used > 0 (RAG 실사용 가드, POSTMORTEMS #48)
 *           — RAG가 다시 죽으면(적재/RPC 고장) 모든 응답이 청크 0개로 떨어지는데, 그게
 *             "지표는 찍히는데 아무도 안 봄"이라 6개월 들킬 뻔했다. 이 테스트가 그 침묵을 깬다.
 *             SUPABASE 자격증명이 있어야 응답 metadata를 읽을 수 있어, 없으면 SKIP(실패 아님).
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

async function startThread({ contact = true } = {}) {
  const res = await fetch(`${BASE_URL}/api/public/chat/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "ko",
      browser_session_id: `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      landing_path: "/inquiry",
      client_meta: { smoke_test: true },
      // ⚠️ 이메일 표식이 «실적 오염»을 막는다 (2026-08-04 실측으로 추가).
      //   이 스모크는 대화를 3턴 이상 끌고 가면 서버가 그 스레드를 **진짜 문의로 승격**시킨다
      //   (promoteThreadToInquiry). 그런데 여기서 이메일을 안 주면 승격된 문의에 식별값이
      //   하나도 없어 「테스트」 판정이 안 걸리고 is_test=false, 즉 진짜 문의로 남는다.
      //   실측: 14일간 이렇게 만들어진 문의가 17건, 같은 기간 진짜 웹 문의는 3건이었다
      //   (전부 사후에 is_test=true 로 정정). 스레드는 아래 cleanup 이 지우지만
      //   **승격된 문의는 아무도 안 지운다** — 그래서 만드는 시점에 표식을 남긴다.
      //   healo-test.invalid = 이 저장소의 내부 전용 도메인(resolveTestDomains 기본에 포함).
      //
      // 🛑 단 TEST A 만은 contact:false 로 «연락처 없는» 스레드를 쓴다 (2026-08-30 정정).
      //   TEST A 의 존재 이유가 「연락처 없이 접수해줘 → 거짓 접수완료 금지」인데,
      //   위 오염 방지선(8/04)이 모든 스레드에 이메일을 심으면서 전제가 무너졌다 —
      //   봇은 연락처가 «있으니» 정당하게 접수했고, 검사는 그걸 거짓 접수라 오판해
      //   8/04부터 26회 연속 빨간불을 냈다(아무도 안 봄 — 알림 부재는 chat-smoke.yml 에서 고침).
      //   TEST A 는 1문답이라 정상 동작(연락처 요청)이면 승격이 안 일어나 오염도 없다.
      //   만약 연락처 없는 스레드가 승격된다면 그게 바로 이 검사가 잡아야 할 결함이다.
      ...(contact ? { guest_name: "스모크 점검", guest_email: "smoke@healo-test.invalid" } : {}),
      // PIPA: /start·/stream 이 동의를 요구함(게이트). 스모크도 동의 포함해야 통과.
      consent: true,
      consent_version: "1.0.0",
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

// 응답 저장 후 최신 AI(system) 메시지의 metadata.rag_chunks_used 를 service_role REST 로 읽는다.
// 스트림 종료 직후엔 비동기 저장이 안 끝났을 수 있어 잠깐 폴링(최대 ~5초)해 깜빡임을 줄인다.
async function getRagChunksUsed(threadId) {
  const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
  const url = `${SB_URL}/rest/v1/chat_messages?thread_id=eq.${threadId}` +
    `&actor_type=eq.system&select=metadata&order=created_at.desc&limit=1`;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { headers: h });
      if (res.ok) {
        const rows = await res.json();
        const v = rows?.[0]?.metadata?.rag_chunks_used;
        if (typeof v === "number") return v;
      }
    } catch { /* 폴링 중 일시 오류 무시 */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null; // 못 읽음(저장 지연/권한) — 호출부에서 SKIP 처리
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
      // ponytail: 3턴+ 자동 승격으로 생기는 is_test 문의 행은 안 지운다 — inquiries 를 참조하는
      // FK 중 NO ACTION 이 5개(normalized_inquiries 등)라 지우려면 연쇄 삭제가 필요하다.
      // 문제였던 "매일 오는 알림 메일"은 adminNotifier 의 is_test 스킵으로 막았고, 남는 행은 실적 집계에서 제외된다.
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

  // 🛑 실서비스를 향하는데 «치울 열쇠»가 없으면 시작조차 하지 않는다.
  //    2026-09-05 실측: 열쇠 없이 실서비스로 돌렸더니 시험 스레드 2개가 그대로 남았고
  //    (경고는 나왔지만 「치우는 법」이 없어 그냥 지나쳤다) 나중에 손으로 SQL 3벌을 돌려 치웠다.
  //    FK 순서(playbook_usage_events → chat_messages → chat_threads)를 모르면 그마저 막힌다.
  //    → 「경고하고 더럽히기」보다 「시작 전에 멈추기」가 싸다.
  const 실서비스 = /healwith\.co\.kr|healo-khidi\.vercel\.app/.test(BASE_URL);
  if (실서비스 && (!SB_URL || !SB_KEY)) {
    console.error("❌ 실서비스를 향하는데 정리 열쇠가 없다 — 시험 스레드가 실서비스에 남는다.");
    console.error("   이렇게 돌려라:  node --env-file=.env.local scripts/smoke-chat.mjs");
    console.error("   (로컬 대상이면 BASE_URL=http://localhost:3000 으로 두면 이 관문을 안 탄다)");
    process.exit(1);
  }
  let passed = 0, total = 0;

  // TEST A: 연락처 없이 접수 → 거짓 접수완료 금지 + 연락처 요청
  // (반드시 contact:false — 연락처가 있으면 접수 확인이 «정당»해져 검사 전제가 무너진다. 위 startThread 주석 참조)
  total++;
  try {
    const t = await startThread({ contact: false });
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

  // TEST C: 지식질문 → RAG 실사용(rag_chunks_used > 0). 자격증명 없으면 SKIP.
  let skipped = 0;
  if (!SB_URL || !SB_KEY) {
    console.warn("⚠️ TEST C SKIP — SUPABASE_URL/SERVICE_ROLE_KEY 없어 응답 metadata 못 읽음(RAG 가드 미실행).");
    skipped++;
  } else {
    total++;
    try {
      const t = await startThread();
      // 적재된 지식(한방병원·면역강화/항노화 등 치료)과 강하게 매칭되는 질문.
      // RPC엔 유사도 컷오프가 없어 RAG가 살아만 있으면 어떤 질문이든 청크>0 → 0이면 #48 재발.
      await sendMessage(t, "한국에서 받을 수 있는 면역강화나 항노화 한방 치료에 대해 알려줘.");
      const used = await getRagChunksUsed(t.thread_id);
      if (used === null) {
        console.warn("⚠️ TEST C SKIP — 응답 metadata 못 읽음(저장 지연/권한). RAG 상태 미확인.");
        skipped++;
      } else if (used > 0) {
        ok(`TEST C RAG 헬스 — 지식질문에 청크 ${used}개 사용(RAG 살아있음)`);
        passed++;
      } else {
        fail(`TEST C 실패 — rag_chunks_used=0. RAG가 죽었다(적재/RPC 고장 가능, POSTMORTEMS #48 재발).`);
      }
    } catch (e) { fail(`TEST C 예외: ${e.message}`); }
  }

  await cleanup();

  console.log(`\n결과: ${passed}/${total} 통과${skipped ? ` (SKIP ${skipped})` : ""}`);
  if (passed !== total) process.exit(1);
}

main().catch((e) => { console.error(`치명적 오류: ${e.message}`); cleanup().finally(() => process.exit(1)); });
