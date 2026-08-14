/**
 * 로그인·가입 폼의 입력 칸에 「이 칸이 뭔지」 표시(autoComplete)가 붙어 있는지 검사.
 *
 * 왜 있나 (2026-08-14 PO 실기기 신고):
 *   갤럭시 S25 Ultra 에서 «이메일을 입력했더니 비밀번호 칸에 들어갔다».
 *   원인은 로그인 폼의 email·password 입력 칸에 `autoComplete` 가 «한 번도» 없었던 것.
 *   이 표시가 없으면 폰의 비밀번호 관리자(삼성 패스·구글)가 어느 칸에 무엇을 넣을지 «추측»한다.
 *   추측은 저장된 계정 수·어느 칸을 먼저 눌렀는지에 따라 달라져 **어떤 날은 맞고 어떤 날은 틀린다**
 *   — 그래서 «지난번엔 됐는데 오늘 안 된다»가 반복됐고, 사람이 눌러보기 전엔 아무도 몰랐다.
 *
 * 사람이 매번 폰으로 눌러보지 않아도 되게 이걸 기계로 막는다.
 * 검출 조건이 기계적으로 명확하다: 로그인 계열 화면의 email/password 입력 칸에 autoComplete 유무.
 */
import fs from "node:fs";
import path from "node:path";

// 검사 대상 = 「로그인 흐름」 화면. 여기 빠지면 비밀번호 관리자가 오작동한다.
const TARGETS = [
  "app/login/LoginClient.jsx",
  "app/signup/SignupClient.jsx",
  "app/reset-password/ResetPasswordClient.jsx",
  "app/forgot-password/ForgotPasswordClient.jsx",
  "app/account/password/ChangePasswordClient.jsx",
];

// 입력 칸 하나를 통째로 집는다 (<input … />)
const INPUT_RE = /<input\b[^>]*?\/?>/gs;
// 아이디·비밀번호 칸인지 (type 이 email/password 이거나 showPassword 토글을 쓰는 칸)
const IS_CREDENTIAL = /type=\{?\s*(?:"email"|"password"|showPassword)/;

let bad = 0;
let checked = 0;

for (const rel of TARGETS) {
  const file = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(file)) {
    console.error(`✗ 대상 파일이 없다: ${rel} (경로가 바뀌었으면 이 목록을 고쳐라)`);
    bad++;
    continue;
  }
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");

  for (const m of src.matchAll(INPUT_RE)) {
    const tag = m[0];
    if (!IS_CREDENTIAL.test(tag)) continue;
    checked++;
    if (/autoComplete\s*=/.test(tag)) continue;

    const lineNo = lines.findIndex((l, i) => src.split("\n").slice(0, i + 1).join("\n").length >= m.index) + 1;
    const label = (tag.match(/(?:id|aria-label)="([^"]+)"/) || [, "(이름 없음)"])[1];
    console.error(`✗ ${rel}:${lineNo} — 「${label}」 칸에 autoComplete 가 없다`);
    bad++;
  }
}

if (bad > 0) {
  console.error("");
  console.error(`실패: 아이디·비밀번호 칸 ${bad}개에 「이 칸이 뭔지」 표시가 없다.`);
  console.error("이게 없으면 폰 비밀번호 관리자가 «추측»해서 엉뚱한 칸에 값을 채운다(2026-08-14 실제 발생).");
  console.error("붙일 값: 아이디칸 autoComplete=\"username\" · 로그인 비번 \"current-password\" · 새 비번 \"new-password\"");
  process.exit(1);
}

console.log(`✓ 로그인 계열 입력 칸 ${checked}개 전부 autoComplete 있음`);
