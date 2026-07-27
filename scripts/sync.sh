#!/usr/bin/env bash
# =============================================================================
# sync.sh — 로컬 ↔ 깃 자동 동기화 (PO용, 한 줄 실행)
#
#   bash scripts/sync.sh
#
# 하는 일 (알아서 판단):
#   · 깃이 최신이면      → 내려받는다 (pull)
#   · 로컬이 최신이면    → 올린다 (commit + push)
#   · 둘 다 바뀌었으면   → 합친다 (rebase). 충돌나면 멈추고 알려준다
#   · 똑같으면          → 아무것도 안 한다
#
# 안 하는 일 (안전장치):
#   · 강제 푸시(--force) 절대 안 함
#   · 비밀키 파일(.env 등)이 섞여 있으면 멈춤
#   · 충돌은 자동 해결 안 함 — 멈추고 원래대로 되돌린 뒤 알려줌
# =============================================================================

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'; C_DIM=$'\033[2m'; C_B=$'\033[1m'; C_0=$'\033[0m'
say()  { printf '%s\n' "$*"; }
ok()   { printf '%s✅ %s%s\n' "$C_OK" "$*" "$C_0"; }
warn() { printf '%s⚠️  %s%s\n' "$C_WARN" "$*" "$C_0"; }
err()  { printf '%s❌ %s%s\n' "$C_ERR" "$*" "$C_0"; }
dim()  { printf '%s%s%s\n' "$C_DIM" "$*" "$C_0"; }

say ""
say "${C_B}🔄 동기화 시작${C_0}"
say "────────────────────────────────────────"

# ── 0. 여기가 저장소 맞나 ──────────────────────────────────────────────────
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  err "여기는 깃 저장소가 아니다. HEALO_KHIDI 폴더에서 실행해라."
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" = "HEAD" ]; then
  err "지금 브랜치가 아닌 상태(detached HEAD)라 동기화를 멈춘다."
  dim "  → 'git checkout main' 하고 다시 실행해라."
  exit 1
fi
say "현재 작업본(브랜치): ${C_B}${BRANCH}${C_0}"

# 비교 대상 정하기 (내 브랜치의 짝 → 없으면 origin/main)
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
if [ -z "$UPSTREAM" ]; then
  UPSTREAM="origin/main"
  dim "  (이 브랜치는 깃에 짝이 없어서 origin/main 과 비교한다)"
fi

# ── 1. 깃에서 최신 정보 가져오기 ───────────────────────────────────────────
say ""
say "1) 깃 확인 중…"
if ! git fetch --prune "${UPSTREAM%%/*}" >/dev/null 2>&1; then
  err "깃에 연결하지 못했다. 인터넷 또는 로그인 상태를 확인해라."
  exit 1
fi
if ! git rev-parse --verify "$UPSTREAM" >/dev/null 2>&1; then
  err "비교 대상 '$UPSTREAM' 을 찾지 못했다."
  exit 1
fi

# ── 2. 로컬에 안 올린 변경이 있나 ──────────────────────────────────────────
DIRTY="$(git status --porcelain)"
DIRTY_N=0
[ -n "$DIRTY" ] && DIRTY_N="$(printf '%s\n' "$DIRTY" | wc -l | tr -d ' ')"

if [ -n "$DIRTY" ]; then
  say ""
  say "2) 로컬에 안 올린 변경 ${C_B}${DIRTY_N}개${C_0} 발견:"
  printf '%s\n' "$DIRTY" | head -20 | sed 's/^/     /'
  [ "$DIRTY_N" -gt 20 ] && dim "     … 외 $((DIRTY_N - 20))개"

  # 🛑 비밀키 안전장치
  SECRETS="$(printf '%s\n' "$DIRTY" | awk '{print $NF}' \
    | grep -E '(^|/)\.env($|\.)|secret|credential|serviceAccount|\.pem$|\.p12$|\.key$' || true)"
  if [ -n "$SECRETS" ]; then
    say ""
    err "비밀키로 보이는 파일이 섞여 있어서 멈춘다 (깃에 올리면 안 되는 것):"
    printf '%s\n' "$SECRETS" | sed 's/^/     /'
    dim "  → 이 파일들을 빼거나 .gitignore 에 넣은 뒤 다시 실행해라."
    exit 1
  fi
else
  say ""
  say "2) 로컬에 안 올린 변경: 없음"
fi

# ── 3. 로컬과 깃 중 누가 앞서 있나 ─────────────────────────────────────────
AHEAD="$(git rev-list --count "$UPSTREAM..HEAD" 2>/dev/null || echo 0)"
BEHIND="$(git rev-list --count "HEAD..$UPSTREAM" 2>/dev/null || echo 0)"

say ""
say "3) 상태 판정"
say "     로컬이 앞선 저장 : ${AHEAD}개"
say "     깃이 앞선 저장   : ${BEHIND}개"
say "────────────────────────────────────────"
say ""

DID_SOMETHING=0

# ── 4. 안 올린 변경 먼저 저장(commit) ──────────────────────────────────────
if [ -n "$DIRTY" ]; then
  say "📦 로컬 변경을 저장한다…"
  git add -A || { err "파일 추가 실패."; exit 1; }
  STAMP="$(date '+%Y-%m-%d %H:%M')"
  if git commit -q -m "chore(sync): 로컬 변경 자동 저장 (${STAMP})" \
       -m "scripts/sync.sh 로 자동 저장됨. 변경 ${DIRTY_N}개." ; then
    ok "저장 완료 (${DIRTY_N}개)"
    DID_SOMETHING=1
    AHEAD=$((AHEAD + 1))
  else
    warn "저장할 내용이 없었다 (무시해도 됨)."
  fi
  say ""
fi

# ── 5. 방향 판단해서 실행 ──────────────────────────────────────────────────
if [ "$BEHIND" -gt 0 ] && [ "$AHEAD" -gt 0 ]; then
  # 양쪽 다 바뀜 → 합치기
  say "🔀 양쪽 다 바뀌었다. 깃 내용 위에 내 작업을 얹는다…"
  if git pull --rebase --no-edit "${UPSTREAM%%/*}" "${UPSTREAM#*/}" >/dev/null 2>&1; then
    ok "합치기 성공"
    DID_SOMETHING=1
  else
    git rebase --abort >/dev/null 2>&1 || true
    say ""
    err "같은 곳을 양쪽에서 고쳐서 자동으로 못 합친다 (충돌)."
    dim "  원래대로 되돌려놨으니 파일은 안전하다."
    dim "  → 클로드한테 '동기화 충돌났어' 라고 말해라. 어디가 겹쳤는지 보고 정리해준다."
    exit 2
  fi

elif [ "$BEHIND" -gt 0 ]; then
  # 깃이 최신 → 내려받기
  say "⬇️  깃이 최신이다. 내려받는다…"
  if git merge --ff-only "$UPSTREAM" >/dev/null 2>&1; then
    ok "내려받기 완료 (${BEHIND}개)"
    DID_SOMETHING=1
  else
    err "내려받기 실패."
    dim "  → 클로드한테 '동기화 안 돼' 라고 말해라."
    exit 2
  fi
fi

# ── 6. 올릴 게 있으면 올리기 ───────────────────────────────────────────────
AHEAD="$(git rev-list --count "$UPSTREAM..HEAD" 2>/dev/null || echo 0)"
if [ "$AHEAD" -gt 0 ]; then
  say ""
  say "⬆️  로컬 작업 ${AHEAD}개를 깃에 올린다…"
  if git push -u "${UPSTREAM%%/*}" "$BRANCH" >/dev/null 2>&1; then
    ok "올리기 완료"
    DID_SOMETHING=1
  else
    say ""
    err "올리기 실패."
    dim "  그 사이 깃이 또 바뀌었을 수 있다. 이 명령을 한 번 더 실행해봐라."
    exit 2
  fi
fi

# ── 7. 결과 ────────────────────────────────────────────────────────────────
say ""
say "────────────────────────────────────────"
if [ "$DID_SOMETHING" -eq 0 ]; then
  ok "이미 똑같다. 할 일 없음."
else
  ok "동기화 끝 — 로컬과 깃이 같아졌다."
fi
dim "   작업본: ${BRANCH}   최신 저장: $(git log --oneline -1 2>/dev/null)"
say ""
