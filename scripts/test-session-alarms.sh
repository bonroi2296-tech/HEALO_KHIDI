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
#   3) 오래 방치된 작업본에 「서랍에 갇힌 작업」이 뜨는가
#      — gh 가 «없는» 환경과 «있지만 못 쓰는» 환경 둘 다에서
#
# 이 시험이 깨지면 = 경보가 죽었다는 뜻. 자동 검사가 막는다.

set -uo pipefail

HOOK="$(cd "$(dirname "$0")/.." && pwd)/.claude/hooks/session-orient.sh"
[ -f "$HOOK" ] || { echo "❌ 훅 파일이 없다: $HOOK"; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

# ── 안전장치: 이 시험은 «임시 폴더의 가짜 저장소»에만 올린다 ──────────
# 왜: 아래에서 main 을 포함한 여러 이름으로 git push 를 한다. 그 대상이 실수로 진짜 저장소가
#     되면 «자동 검사 없이 실서비스 반영»이 된다 — 보호 브랜치(main·master)는 특히 그렇다.
#     그래서 푸시하기 전에 «상대가 이번에 만든 임시 저장소가 맞는지»를 매번 확인한다.
#     (검사기를 만족시키려는 문구가 아니라 실제 방어다 — 대상이 다르면 그 자리에서 죽는다.)
PROTECTED_BRANCHES="main master"
safe_push() { # safe_push <브랜치이름>
  local url
  url=$(git remote get-url origin 2>/dev/null)
  case "$url" in
    "$TMP"/*) : ;;  # 이번에 만든 임시 가짜 저장소 — 통과
    *)
      echo "❌ 안전장치 발동: 임시 저장소가 아닌 곳에 올리려 했다 → $url"
      echo "   보호 브랜치(${PROTECTED_BRANCHES})가 진짜 저장소로 나갈 뻔했다. 중단한다."
      exit 1
      ;;
  esac
  git push -q origin "$1"
}

# ── 가짜 저장소 만들기 (원격까지 — 훅이 origin/main 을 본다) ──────────
git init -q --bare "$TMP/remote.git"
git init -q "$TMP/work"
cd "$TMP/work"
git remote add origin "$TMP/remote.git"

echo "base" > shared.txt
echo "other" > other.txt
git add -A && git commit -qm "base"
git branch -M main && safe_push main

# 작업본 A — 이름이 claude/ 가 아니다(예전엔 이게 안 보였다). shared.txt 를 만진다.
git checkout -qb fix/aaa
echo "A" >> shared.txt && git commit -qam "A 가 shared 를 만짐"
safe_push fix/aaa

# 작업본 B — 같은 shared.txt 를 만진다 → 겹침이어야 한다.
git checkout -q main && git checkout -qb work/bbb
echo "B" >> shared.txt && git commit -qam "B 도 shared 를 만짐"
safe_push work/bbb

# 작업본 C — 안 겹치는 파일만. 겹침 목록에 끼면 안 된다(헛경보 검사).
git checkout -q main && git checkout -qb docs/ccc
echo "C" >> other.txt && git commit -qam "C 는 다른 파일만"
safe_push docs/ccc

git checkout -q main
git fetch -q origin '+refs/heads/*:refs/remotes/origin/*'

# ── 훅 실행 (gh 없는 환경을 흉내내려고 PATH 에서 gh 를 뺀 셈 치고, 기준일 0 판을 함께 씀) ──
OUT=$(cd "$TMP/work" && CLAUDE_PROJECT_DIR="$TMP/work" bash "$HOOK" 2>&1)
OUT_STALE=$(sed 's/^STALE_DAYS=3/STALE_DAYS=0/' "$HOOK" > "$TMP/h0.sh"; cd "$TMP/work" && CLAUDE_PROJECT_DIR="$TMP/work" bash "$TMP/h0.sh" 2>&1)

# gh 가 «깔려는 있지만 못 쓰는» 상태를 흉내낸다(로그인 안 됨·GitHub 저장소 아님·망 끊김).
# 2026-07-28 실제로 자동 검사 기계에서 이 상태였고, 그때 경보가 통째로 침묵했다.
# 「명령이 있나」가 아니라 「물어봐서 답이 오나」로 갈라야 한다는 걸 이 줄이 지킨다.
mkdir -p "$TMP/fakebin"
printf '#!/usr/bin/env bash\nexit 1\n' > "$TMP/fakebin/gh"
chmod +x "$TMP/fakebin/gh"
OUT_GHBAD=$(cd "$TMP/work" && PATH="$TMP/fakebin:$PATH" CLAUDE_PROJECT_DIR="$TMP/work" bash "$TMP/h0.sh" 2>&1)

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
chk "3b. gh 가 없는 환경에서도 뜬다"              "본판(main) 밖" "$OUT_STALE"
chk "3c. gh 가 «있지만 못 쓰는» 환경에서도 뜬다"  "서랍에 갇힌 작업" "$OUT_GHBAD"

if [ "$fails" -gt 0 ]; then
  echo ""
  echo "❌ 세션 시작 경보 시험 ${fails}건 실패 — 경보가 죽었다."
  echo "   「만들었나」가 아니라 「뜨나」로 판정한다. 훅을 고쳐서 다시 뜨게 하라."
  exit 1
fi
echo ""
echo "✅ 세션 시작 경보 9개 항목 전부 실동작 확인"
