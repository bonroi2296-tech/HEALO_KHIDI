#!/usr/bin/env node
/* =============================================================================
 * sync.mjs — 로컬 ↔ 깃 자동 동기화 (윈도우 cmd / PowerShell / macOS / 리눅스 공통)
 *
 *   npm run sync
 *
 * 하는 일 (알아서 판단):
 *   · 깃이 최신이면      → 내려받는다
 *   · 로컬이 최신이면    → 저장하고 올린다
 *   · 둘 다 바뀌었으면   → 합친다. 충돌나면 멈추고 원래대로 되돌린다
 *   · 똑같으면          → 아무것도 안 한다
 *
 * 안 하는 일 (안전장치):
 *   · 강제 푸시 절대 안 함
 *   · 비밀키 파일(.env 등)이 섞여 있으면 멈춤
 *   · 충돌 자동 해결 안 함 — 되돌린 뒤 알려줌
 *
 * ※ bash 를 안 쓴다(윈도우 명령 프롬프트에 bash 가 없는 경우가 많음).
 * ========================================================================== */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 윈도우 콘솔에서 ANSI 색이 안 먹는 경우가 있어 색은 선택적으로만 쓴다.
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor ? `[${code}m${s}[0m` : s);
const B = (s) => c("1", s);
const DIM = (s) => c("2", s);

const say = (s = "") => console.log(s);
const ok = (s) => console.log(`${c("32", "[완료]")} ${s}`);
const warn = (s) => console.log(`${c("33", "[주의]")} ${s}`);
const bad = (s) => console.log(`${c("31", "[실패]")} ${s}`);

/** git 실행. 실패해도 예외 대신 결과를 돌려준다. */
function git(args, { quiet = true } = {}) {
  const r = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
    // 윈도우에서 git 이 PATH 에 없으면 여기서 error 가 담긴다
  });
  return {
    ok: r.status === 0,
    out: (r.stdout || "").trim(),
    err: (r.error && r.error.message) || (r.stderr || "").trim(),
  };
}

function fail(msg, hint) {
  say();
  bad(msg);
  if (hint) say(DIM(`  ${hint}`));
  say();
  process.exit(2);
}

// ── 0. 준비 확인 ────────────────────────────────────────────────────────────
say();
say(B("동기화 시작"));
say("----------------------------------------");

const probe = git(["rev-parse", "--git-dir"]);
if (!probe.ok) {
  if (/ENOENT/i.test(probe.err)) {
    fail(
      "git 을 찾지 못했다.",
      "깃이 설치돼 있는지 확인해라. (https://git-scm.com/download/win)"
    );
  }
  fail(
    "여기는 깃 저장소가 아니다.",
    "HEALO_KHIDI 폴더 안에서 실행해야 한다."
  );
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).out;
if (!branch || branch === "HEAD") {
  fail(
    "지금 브랜치가 아닌 상태라 동기화를 멈춘다.",
    "git checkout main 하고 다시 실행해라."
  );
}
say(`현재 작업본(브랜치): ${B(branch)}`);

// 비교 대상: 내 브랜치의 짝 → 없으면 origin/main
// ⚠️ 짝이 없으면 git 이 실패하면서도 "@{u}" 라는 글자를 그대로 출력한다.
//    반드시 성공 여부(ok)를 먼저 보고 값을 써야 한다(안 그러면 "@{u}" 를 원격 이름으로 오인).
const up = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
let upstream = up.ok && up.out && up.out !== "@{u}" ? up.out : "";
if (!upstream) {
  upstream = "origin/main";
  say(DIM("  (이 작업본은 깃에 짝이 없어서 origin/main 과 비교한다)"));
}
const remote = upstream.split("/")[0];
let remoteBranch = upstream.slice(remote.length + 1);

// ── 1. 깃 확인 ──────────────────────────────────────────────────────────────
say();
say("1) 깃 확인 중...");
if (!git(["fetch", "--prune", remote]).ok) {
  fail(
    "깃에 연결하지 못했다.",
    "인터넷 연결 또는 깃 로그인 상태를 확인해라."
  );
}
// 짝 브랜치가 깃에서 사라진 경우(= 합쳐진 뒤 정리됨) main 기준으로 넘어간다.
if (!git(["rev-parse", "--verify", upstream]).ok) {
  const fallback = `${remote}/main`;
  if (git(["rev-parse", "--verify", fallback]).ok) {
    say(
      DIM(
        `  ('${upstream}' 이 깃에 없다 — 합쳐지고 정리된 작업본으로 보인다. main 기준으로 맞춘다.)`
      )
    );
    upstream = fallback;
    remoteBranch = "main";
  } else {
    fail(`비교 대상 '${upstream}' 을 찾지 못했다.`);
  }
}

// ── 2. 안 올린 변경 확인 ────────────────────────────────────────────────────
const dirtyRaw = git(["status", "--porcelain"]).out;
const dirtyLines = dirtyRaw ? dirtyRaw.split(/\r?\n/).filter(Boolean) : [];

say();
if (dirtyLines.length) {
  say(`2) 로컬에 안 올린 변경 ${B(String(dirtyLines.length) + "개")} 발견:`);
  for (const l of dirtyLines.slice(0, 20)) say(`     ${l}`);
  if (dirtyLines.length > 20) say(DIM(`     ... 외 ${dirtyLines.length - 20}개`));

  // 비밀키 안전장치
  const SECRET = /(^|[\\/])\.env($|\.)|secret|credential|serviceAccount|\.pem$|\.p12$|\.key$/i;
  const secrets = dirtyLines
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
    .filter((f) => SECRET.test(f));
  if (secrets.length) {
    say();
    bad("비밀키로 보이는 파일이 섞여 있어서 멈춘다 (깃에 올리면 안 되는 것):");
    for (const s of secrets) say(`     ${s}`);
    say(DIM("  이 파일들을 빼거나 .gitignore 에 넣은 뒤 다시 실행해라."));
    say();
    process.exit(1);
  }
} else {
  say("2) 로컬에 안 올린 변경: 없음");
}

// ── 3. 상태 판정 ────────────────────────────────────────────────────────────
const count = (range) => {
  const r = git(["rev-list", "--count", range]);
  return r.ok ? parseInt(r.out || "0", 10) : 0;
};
let ahead = count(`${upstream}..HEAD`);
const behind = count(`HEAD..${upstream}`);

say();
say("3) 상태 판정");
say(`     로컬이 앞선 저장 : ${ahead}개`);
say(`     깃이 앞선 저장   : ${behind}개`);
say("----------------------------------------");
say();

let did = false;

// ── 4. 안 올린 변경 저장 ────────────────────────────────────────────────────
if (dirtyLines.length) {
  say("로컬 변경을 저장한다...");
  if (!git(["add", "-A"]).ok) fail("파일 추가에 실패했다.");
  const now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`;
  const r = git([
    "commit",
    "-q",
    "-m",
    `chore(sync): 로컬 변경 자동 저장 (${stamp})`,
    "-m",
    `scripts/sync.mjs 로 자동 저장됨. 변경 ${dirtyLines.length}개.`,
  ]);
  if (r.ok) {
    ok(`저장 완료 (${dirtyLines.length}개)`);
    did = true;
    ahead += 1;
  } else {
    warn("저장할 내용이 없었다 (무시해도 됨).");
  }
  say();
}

// ── 5. 방향 판단 ────────────────────────────────────────────────────────────
if (behind > 0 && ahead > 0) {
  say("양쪽 다 바뀌었다. 깃 내용 위에 내 작업을 얹는다...");
  const r = git(["pull", "--rebase", "--no-edit", remote, remoteBranch]);
  if (r.ok) {
    ok("합치기 성공");
    did = true;
  } else {
    git(["rebase", "--abort"]);
    say();
    bad("같은 곳을 양쪽에서 고쳐서 자동으로 못 합친다 (충돌).");
    say(DIM("  원래대로 되돌려놨으니 파일은 안전하다."));
    say(DIM("  클로드한테 '동기화 충돌났어' 라고 말해라. 어디가 겹쳤는지 보고 정리해준다."));
    say();
    process.exit(2);
  }
} else if (behind > 0) {
  say("깃이 최신이다. 내려받는다...");
  if (git(["merge", "--ff-only", upstream]).ok) {
    ok(`내려받기 완료 (${behind}개)`);
    did = true;
  } else {
    fail("내려받기에 실패했다.", "클로드한테 '동기화 안 돼' 라고 말해라.");
  }
}

// ── 6. 올리기 ───────────────────────────────────────────────────────────────
const finalAhead = count(`${upstream}..HEAD`);
if (finalAhead > 0) {
  say();
  say(`로컬 작업 ${finalAhead}개를 깃에 올린다...`);
  if (git(["push", "-u", remote, branch]).ok) {
    ok("올리기 완료");
    did = true;
  } else {
    fail(
      "올리기에 실패했다.",
      "그 사이 깃이 또 바뀌었을 수 있다. 이 명령을 한 번 더 실행해봐라."
    );
  }
}

// ── 7. 결과 ─────────────────────────────────────────────────────────────────
say();
say("----------------------------------------");
if (!did) ok("이미 똑같다. 할 일 없음.");
else ok("동기화 끝 - 로컬과 깃이 같아졌다.");
say(DIM(`   작업본: ${branch}   최신 저장: ${git(["log", "--oneline", "-1"]).out}`));
say();
