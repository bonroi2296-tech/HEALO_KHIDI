#!/usr/bin/env bash
#
# 세션 시작 경보 실동작 시험 — npm run test:alarms
#
# 왜 (2026-07-28, 이 저장소에서 두 번 데임):
#   경보를 «만드는 것»과 «뜨는 것»은 다른 일이다.
#     · 「서랍에 갇힌 작업」 경보: 09:39 에 만들었는데 13:20 에 «웹 창에서 통째로 안 돈다»가 드러났다.
#       버틴 시간 3시간 41분. (원인: gh 명령이 없는 환경에서 조용히 건너뜀)
#     · 「열린 작업 목록」: 이름이 claude/ 로 시작하는 작업본만 봐서, 같은 문제를 고치던
#       작업본 6개가 전부 목록 밖이었다.
#   둘 다 «저장소에 코드가 있다»는 참이었고 «화면에 뜬다»는 거짓이었다.
#   그래서 이 시험은 **가짜 저장소를 만들어 실제로 훅을 돌리고, 경보 문구가 나오는지**를 본다.
#
# 시험 3가지:
#   1) 열린 작업 목록이 «claude/ 아닌 이름»의 작업본도 보여주는가
#   2) 같은 파일을 두 작업본이 만질 때 「겹침 감지」가 뜨는가
#   3) 오래 방치된 작업본에 「서랍에 갇힌 작업」이 뜨는가 (gh 없는 환경 기준)
#
# 이 시험이 깨지면 = 경보가 죽었다는 뜻. 자동 검사가 막는다.

set -uo pipefail

HOOK="$(cd "$(dirname "$0")/.." && pwd)/.claude/hooks/session-orient.sh"
[ -f "$HOOK" ] || { echo "❌ 훅 파일이 없다: $HOOK"; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

# ── 가짜 저장소 만들기 (원격까지 — 훅이 origin/main 을 본다) ──────────
git init -q --bare "$TMP/remote.git"
git init -q "$TMP/work"
cd "$TMP/work"
git remote add origin "$TMP/remote.git"

echo "base" > shared.txt
echo "other" > other.txt
git add -A && git commit -qm "base"
git branch -M main && git push -q origin main

# 작업본 A — 이름이 claude/ 가 아니다(예전엔 이게 안 보였다). shared.txt 를 만진다.
git checkout -qb fix/aaa
echo "A" >> shared.txt && git commit -qam "A 가 shared 를 만짐"
git push -q origin fix/aaa

# 작업본 B — 같은 shared.txt 를 만진다 → 겹침이어야 한다.
git checkout -q main && git checkout -qb work/bbb
echo "B" >> shared.txt && git commit -qam "B 도 shared 를 만짐"
git push -q origin work/bbb

# 작업본 C — 안 겹치는 파일만. 겹침 목록에 끼면 안 된다(헛경보 검사).
git checkout -q main && git checkout -qb docs/ccc
echo "C" >> other.txt && git commit -qam "C 는 다른 파일만"
git push -q origin docs/ccc

git checkout -q main
git fetch -q origin '+refs/heads/*:refs/remotes/origin/*'

# ── 훅 실행 (gh 없는 환경을 흉내내려고 PATH 에서 gh 를 뺀 셈 치고, 기준일 0 판을 함께 씀) ──
OUT=$(cd "$TMP/work" && CLAUDE_PROJECT_DIR="$TMP/work" bash "$HOOK" 2>&1)
OUT_STALE=$(sed 's/^STALE_DAYS=3/STALE_DAYS=0/' "$HOOK" > "$TMP/h0.sh"; cd "$TMP/work" && CLAUDE_PROJECT_DIR="$TMP/work" bash "$TMP/h0.sh" 2>&1)

fails=0
chk() { # chk "설명" "찾을 문구" "$본문"
  if printf '%s' "$3" | grep -q "$2"; then
    echo "✅ $1"
  else
    echo "❌ $1  — 「$2」 가 출력에 없다"
    fails=$((fails + 1))
  fi
}
chk_not() {
  if printf '%s' "$3" | grep -q "$2"; then
    echo "❌ $1  — 「$2」 가 뜨면 안 되는데 떴다(헛경보)"
    fails=$((fails + 1))
  else
    echo "✅ $1"
  fi
}

echo "── 세션 시작 경보 실동작 시험 ──"
chk "1a. 열린 작업 목록이 뜬다"                  "열린 작업" "$OUT"
chk "1b. claude/ 가 아닌 이름도 보인다 (fix/aaa)" "fix/aaa"   "$OUT"
chk "1c. work/ 이름도 보인다"                    "work/bbb"  "$OUT"
chk "2a. 겹침 감지가 뜬다"                       "겹침 감지" "$OUT"
chk "2b. 겹치는 파일을 정확히 짚는다"            "shared.txt" "$OUT"
chk_not "2c. 안 겹치는 파일은 겹침으로 안 뜬다"  "other.txt ←" "$OUT"
chk "3a. 서랍에 갇힌 작업 경보가 뜬다"           "서랍에 갇힌 작업" "$OUT_STALE"
chk "3b. gh 없는 환경에서도 뜬다"                "본판(main) 밖" "$OUT_STALE"

if [ "$fails" -gt 0 ]; then
  echo ""
  echo "❌ 세션 시작 경보 시험 ${fails}건 실패 — 경보가 죽었다."
  echo "   「만들었나」가 아니라 「뜨나」로 판정한다. 훅을 고쳐서 다시 뜨게 하라."
  exit 1
fi
echo ""
echo "✅ 세션 시작 경보 8개 항목 전부 실동작 확인"
