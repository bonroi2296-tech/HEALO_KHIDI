#!/usr/bin/env node
/**
 * 「검사가 쓰는 저장소 열쇠가 실제로 먹히나」 — E2E 가 돌기 «전»에 30초 만에 가린다.
 *
 * 왜 만들었나 (2026-08-30):
 *   `chat-file-upload` E2E 가 며칠째 빨간불이었다. 화면 오류는 「파일명 칩이 안 뜬다」라
 *   프론트 문제로 보였지만, 서버 기록엔 `[directUpload] sign error: The related resource
 *   does not exist (404)` 가 찍혀 있었다.
 *
 * 🛑 2026-08-31 정정 — 아래 ①의 반증이 «틀렸다». 진범은 바로 그 ①이었다.
 *   원래 이 자리엔 이렇게 적혀 있었다:
 *     ① 통(bucket)이 없다      → ✗ `attachments` 는 4/10 부터 있다   ← **틀렸다**
 *   그 「4/10 부터 있다」는 **실서비스 프로젝트**(hvwwlkawaxabhtumjhrg)를 보고 한 말이다.
 *   그런데 E2E 는 **검사 전용 프로젝트**(aawpxzhlytrgqmdsbcni)를 본다 — 거기엔
 *   `storage.buckets` 가 **0개**다(2026-08-31 실측). 실서비스엔 5개.
 *   즉 «다른 상자를 보고 반증»했고, 그 바람에 남은 후보인 「열쇠」를 진범으로 지목했다.
 *   ⚠️ 교훈: **어느 프로젝트에서 잰 값인지를 안 적으면 반증이 뒤집힌다.**
 *
 *   더 나쁜 것은 그 뒤였다. 이 검사는 그날부터 매번 정확히 🔴 를 찍고 있었는데
 *   워크플로에 `continue-on-error: true` 가 붙어 있어 **아무도 그 줄을 안 봤다.**
 *   E2E 결론은 「파일 첨부 시험 실패」로만 보였고, 진짜 원인을 적은 줄은 위쪽에 묻혔다.
 *
 * 🔑 이 검사의 값어치: 통이나 열쇠가 죽으면 **E2E 여러 개가 엉뚱한 이유로 빨개진다.**
 *    여기서 먼저 잡으면 「프론트가 깨졌나」를 뒤지는 시간이 통째로 없어진다.
 *    그래서 이제 **가리기만 하지 않고 «검사 전용 프로젝트면 통을 만들어» 준다** — 사람이
 *    콘솔에 들어가지 않아도 다음 실행부터 돈다(실서비스에는 절대 안 만든다, 아래 안전장치).
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

/**
 * 깃허브 «주석»으로 올린다 — 이 단계는 `continue-on-error: true` 라서 그냥 찍으면
 * 로그 수천 줄에 묻힌다(2026-08-31: 그렇게 이틀을 놓쳤다). 이러면 요약 화면에 뜬다.
 */
const 알림 = (msg) => console.error(process.env.GITHUB_ACTIONS ? `::error::[e2e-storage] ${msg}` : `🔴 ${msg}`);

console.log(`[e2e-storage] 프로젝트: ${ref(url)} · 통: ${BUCKET}`);
console.log(`[e2e-storage] service_role 열쇠: ${형식(key)} · ${key ? key.length : 0}자`);

if (!url || !key) {
  알림("URL 또는 service_role 열쇠가 비었다 — 워크플로 env 에 안 넘어왔다.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

/** 실서비스 프로젝트 — 여기에는 «절대» 통을 만들지 않는다(이미 5개 있고, 만들 일도 없다). */
const 실서비스_REF = "hvwwlkawaxabhtumjhrg";

/** 실서비스 `attachments` 와 같은 설정. 다르게 만들면 «검사만 통과하고 실서비스에서 막히는» 짝이 생긴다. */
const 통설정 = {
  public: false,
  fileSizeLimit: 209715200, // 200MB
  allowedMimeTypes: [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip", "application/x-zip-compressed",
    "application/vnd.rar", "application/x-rar-compressed",
    "application/dicom", "application/octet-stream",
  ],
};

/** 발급만 한다 — 파일을 만들지도, 올리지도 않는다(서명 URL 은 안 쓰면 그냥 만료된다). */
const 발급 = () => sb.storage.from(BUCKET).createSignedUploadUrl(`inquiry/${randomUUID()}_e2e-preflight.pdf`);

let { error } = await 발급();

if (error) {
  알림(`서명 URL 발급 실패: ${error.message} (status=${error.status} statusCode=${error.statusCode})`);

  // 「열쇠가 죽었다」와 「통이 없다」는 증상이 똑같다(둘 다 404) — 목록을 읽어 «가른다».
  // 목록이 읽히면 열쇠는 살아 있는 것이다.
  const { data: 통목록, error: 목록오류 } = await sb.storage.listBuckets();
  if (목록오류) {
    console.error(`   → 통 목록도 못 읽는다(${목록오류.message}) = **열쇠 문제**다.`);
    console.error("   → 고칠 곳: 저장소 비밀값 E2E_SUPABASE_SERVICE_ROLE_KEY (없으면 SUPABASE_SERVICE_ROLE_KEY).");
    process.exit(1);
  }

  const 이름들 = (통목록 || []).map((b) => b.name);
  console.error(`   → 열쇠는 살아 있다(통 목록 ${이름들.length}개: ${이름들.join(", ") || "없음"}) = **통이 없는 것**이다.`);

  if (ref(url) === 실서비스_REF) {
    console.error("   🛑 실서비스 프로젝트다 — 여기서는 통을 만들지 않는다. 사람이 봐야 한다.");
    process.exit(1);
  }

  console.log(`[e2e-storage] 검사 전용 프로젝트이므로 «${BUCKET}» 통을 만든다(실서비스와 같은 설정).`);
  const { error: 생성오류 } = await sb.storage.createBucket(BUCKET, 통설정);
  if (생성오류) {
    알림(`통을 못 만들었다: ${생성오류.message}`);
    process.exit(1);
  }

  ({ error } = await 발급());
  if (error) {
    알림(`통을 만들었는데도 발급이 안 된다: ${error.message}`);
    process.exit(1);
  }
  console.log("✅ 통을 만들고 발급까지 확인 — 다음 실행부터는 이 단계가 조용히 지나간다.");
} else {
  console.log("✅ 발급됨 — 파일 첨부 검사가 통·열쇠 때문에 깨지진 않는다.");
}
