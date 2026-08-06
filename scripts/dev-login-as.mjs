/**
 * 개발용 화면 확인 로그인 — 내부·테스트 계정 전용.
 *
 * 왜 있나: 로그인해야만 보이는 화면(에이전시 포털·관리자 큐 등)을 어시스턴트가 눈으로
 * 확인해야 할 때가 있는데, 어시스턴트는 비밀번호를 입력할 수 없다. 그래서 비밀번호를
 * 다루지 않고 **서버 관리키(service_role)로 일회용 토큰을 만들어 세션으로 교환**만 한다.
 * (플레이라이트 e2e 가 하는 것과 같은 목적, 다만 비밀번호를 안 쓰는 방식.)
 *
 * 🔒 안전선
 *  - 내부·테스트 계정만 허용(ALLOWED). 실제 고객 계정은 이름만 넣어도 거부한다.
 *  - 로컬 개발 서버 화면 확인 전용. 출력은 브라우저에 심을 쿠키 값 한 줄.
 *  - PO 승인 기록: 2026-07-31 «테스트 계정이랑 내부 계정은 니가 들어가봐 허가 할게».
 *
 * 사용법:  node scripts/dev-login-as.mjs agency@test.com
 */
import { loadEnvLocal } from "./_env.mjs";

// 내부·테스트 계정만. 여기 없는 주소는 거부(실고객 계정 오사용 방지).
const ALLOWED = /^[a-z0-9._-]+@(test\.com|healo-test\.invalid)$/i;

const email = (process.argv[2] || "").trim();
if (!ALLOWED.test(email)) {
  console.error(`거부: 내부·테스트 계정만 허용한다(@test.com). 받은 값: ${email || "(없음)"}`);
  process.exit(1);
}

// 값 끝의 리터럴 \n 까지 벗겨야 한다 — 안 그러면 service_role 열쇠가 401 이 나서
// 이 스크립트가 «항상» 실패한다(2026-08-06 발견). 읽는 방법은 scripts/_env.mjs 한 곳에만 둔다.
loadEnvLocal({ applyToProcess: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !svc || !anon) {
  console.error("거부: .env.local 에 Supabase 주소·키가 없다");
  process.exit(1);
}

const gen = await (
  await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", email }),
  })
).json();
if (!gen.hashed_token) {
  console.error("일회용 토큰 발급 실패:", JSON.stringify(gen).slice(0, 200));
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/verify`, {
  method: "POST",
  headers: { apikey: anon, "Content-Type": "application/json" },
  body: JSON.stringify({ type: "magiclink", token_hash: gen.hashed_token }),
});
const s = await res.json();
if (!s.access_token) {
  console.error("세션 교환 실패:", res.status, JSON.stringify(s).slice(0, 200));
  process.exit(1);
}

// @supabase/ssr(0.8) 쿠키 형식: sb-<프로젝트>-auth-token = "base64-" + base64url(세션 JSON)
const ref = new URL(url).hostname.split(".")[0];
const payload = {
  access_token: s.access_token,
  refresh_token: s.refresh_token,
  expires_at: s.expires_at,
  expires_in: s.expires_in,
  token_type: s.token_type || "bearer",
  user: s.user,
};
console.log(
  JSON.stringify({
    who: s.user?.email,
    role: s.user?.app_metadata?.role || null,
    cookieName: `sb-${ref}-auth-token`,
    cookieValue: "base64-" + Buffer.from(JSON.stringify(payload), "utf8").toString("base64url"),
  })
);
