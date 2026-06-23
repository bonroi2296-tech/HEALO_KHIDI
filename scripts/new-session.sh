#!/usr/bin/env bash
# 주제별 병렬 작업공간(worktree) 한 줄 생성.
# 세션마다 폴더·브랜치가 분리돼 같은 .git을 공유하면서도 서로 git이 안 엉킨다.
# (같은 폴더에서 두 세션을 돌리면 브랜치가 서로 발밑에서 바뀌어 충돌남 — 그걸 막는 용도.)
#
# 사용법:  bash scripts/new-session.sh <주제>
# 예:      bash scripts/new-session.sh og-image
#          bash scripts/new-session.sh backoffice
#
# 만들고 나면 출력된 폴더에서 새 Claude 세션을 열어 작업하면 된다.
set -euo pipefail

topic="${1:-}"
if [ -z "$topic" ]; then
  echo "사용법: bash scripts/new-session.sh <주제>   (예: og-image)"
  exit 1
fi

# 주제 → 안전한 슬러그(영숫자·하이픈만)
slug=$(printf '%s' "$topic" | tr 'A-Z ' 'a-z-' | tr -cd 'a-z0-9-_')
[ -z "$slug" ] && { echo "주제 이름에 영문/숫자를 포함해줘 (예: og-image)"; exit 1; }

root=$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)
dir="$(dirname "$root")/HEALO_worktrees/$slug"
branch="work/$slug"

if [ -e "$dir" ]; then
  echo "이미 있음: $dir  (그 폴더에서 세션 열면 됨)"
  exit 0
fi

git -C "$root" fetch origin --quiet
# 항상 origin/main 최신 기준으로 새 브랜치 + 작업폴더 생성
git -C "$root" worktree add -B "$branch" "$dir" origin/main

echo ""
echo "✅ 새 작업공간 준비됨"
echo "   폴더:   $dir"
echo "   브랜치: $branch  (origin/main 최신 기준)"
echo ""
echo "👉 그 폴더에서 새 Claude 세션을 열어 작업해. main 세션·다른 주제 세션과 안 엉킴."
echo "   끝나면:  git worktree remove \"$dir\"   (브랜치는 머지 후 정리)"
