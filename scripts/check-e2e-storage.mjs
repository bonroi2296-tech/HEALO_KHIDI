#!/usr/bin/env node
/**
 * 「검사가 쓰는 저장소 열쇠가 실제로 먹히나」 — E2E 가 돌기 «전»에 30초 만에 가린다.
 *
 * 왜 만들었나 (2026-08-30):
 *   `chat-file-upload` E2E 가 며칠째 빨간불이었다. 화면 오류는 「파일명 칩이 안 뜬다」라
 *   프론트 문제로 보였지만, 서버 기록엔 `[directUpload] sign error: The related resource
 *   does not exist (404)` 가 찍혀 있었다. 원인을 좁히는 데 후보를 셋이나 반증해야 했다:
 *     ① 통(bucket)이 없다      → ✗ `attachments` 는 4/10 부터 있다
 *     ② 검사가 다른 프로젝트를 본다 → ✗ 시험 계정이 실서비스에서 로그인한 기록이 남았다
 *     ③ 코드·경로가 틀렸다      → ✗ 같은 경로로 로컬에서 발급하면 성공한다
 *   남은 것은 **열쇠 하나**였다. 그런데 그걸 가리는 데 사람이 한참 걸렸다 —
 *   E2E 는 «화면이 안 뜬다»로만 말하기 때문이다.
 *
 * 🔑 이 검사의 값어치: 열쇠가 죽으면 **E2E 여러 개가 엉뚱한 이유로 빨개진다.**
 *    여기서 먼저 잡으면 「프론트가 깨졌나」를 뒤지는 시간이 통째로 없어진다.
 *
 * ⚠️ 비밀값 자체는 절대 찍지 않는다 — 형식·길이·되나 안 되나만 낸다.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.E2E_STORAGE_BUCKET || "attachments";

const 형식 = (k) => (!k ? "없음" : k.startsWith("sb_secret_") ? "새 형식(sb_secret_)" : k.startsWith("eyJ") ? "옛 JWT" : "알 수 없음");
const ref = (u) => (u || "").replace(/^https:\/\/([^.]+)\..*$/, "$1") || "(빈 값)";

console.log(`[e2e-storage] 프로젝트: ${ref(url)} · 통: ${BUCKET}`);
console.log(`[e2e-storage] service_role 열쇠: ${형식(key)} · ${key ? key.length : 0}자`);

if (!url || !key) {
  console.error("🔴 URL 또는 service_role 열쇠가 비었다 — 워크플로 env 에 안 넘어왔다.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// 발급만 한다 — 파일을 만들지도, 올리지도 않는다(서명 URL 은 안 쓰면 그냥 만료된다).
const { error } = await sb.storage.from(BUCKET).createSignedUploadUrl(`inquiry/${randomUUID()}_e2e-preflight.pdf`);

if (error) {
  console.error(`🔴 서명 URL 발급 실패: ${error.message} (status=${error.status} statusCode=${error.statusCode})`);
  console.error("   → 통이 없거나, 열쇠가 폐기됐거나, 열쇠가 «다른 프로젝트» 것이다.");
  console.error("   → 고칠 곳: 저장소 비밀값 E2E_SUPABASE_SERVICE_ROLE_KEY (없으면 SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}
console.log("✅ 발급됨 — 파일 첨부 검사가 열쇠 때문에 깨지진 않는다.");
