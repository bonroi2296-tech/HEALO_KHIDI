#!/usr/bin/env node
/**
 * install-hooks.js
 * npm install / npm ci 후 자동으로 git hooks 를 설치.
 * `npm run prepare` 또는 `npm install` 시 실행됨.
 */

import { writeFileSync, chmodSync, mkdirSync, existsSync } from "fs";
import { join, isAbsolute, resolve } from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();

if (!existsSync(join(ROOT, ".git"))) {
  // CI 환경 등 .git 없으면 조용히 종료
  process.exit(0);
}

// worktree에서는 .git이 디렉토리가 아니라 gitdir 포인터 파일이라
// git-common-dir(진짜 .git 위치)을 물어봐서 훅을 설치한다.
let gitCommonDir;
try {
  gitCommonDir = execSync("git rev-parse --git-common-dir", {
    cwd: ROOT,
    encoding: "utf-8",
  }).trim();
} catch {
  // git 명령 실패 시 조용히 종료 (훅은 없어도 개발은 가능)
  console.log("git rev-parse 실패 — hooks 설치 건너뜀");
  process.exit(0);
}

const HOOKS_DIR = join(isAbsolute(gitCommonDir) ? gitCommonDir : resolve(ROOT, gitCommonDir), "hooks");

mkdirSync(HOOKS_DIR, { recursive: true });

const PRE_COMMIT = `#!/bin/sh
# pre-commit: vercel.json 스테이지됐으면 Hobby 플랜 호환성 검증

if git diff --cached --name-only | grep -q "^vercel\\.json$"; then
  echo "[pre-commit] vercel.json 변경 감지 — Hobby 플랜 호환성 검증 중..."
  node scripts/validate-vercel-config.js
  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "커밋이 차단됐습니다. vercel.json을 수정 후 다시 커밋하세요."
    echo "Hobby 플랜은 daily 크론만 허용. Pro 업그레이드 전엔 \\"0 X * * *\\" 형태만 사용."
    exit 1
  fi
fi

exit 0
`;

const hookPath = join(HOOKS_DIR, "pre-commit");
writeFileSync(hookPath, PRE_COMMIT, { encoding: "utf-8" });

try {
  chmodSync(hookPath, 0o755);
} catch {
  // Windows에서는 chmod 무시 (git bash가 실행 가능)
}

console.log("✓ git pre-commit hook 설치 완료 (vercel.json 검증)");
