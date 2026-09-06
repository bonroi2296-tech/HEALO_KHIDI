#!/usr/bin/env bash
# 세션 시작 시 GitHub 최신으로 자동 동기화 (앉을 때마다 손으로 pull 안 하게).
# 안전 원칙:
#  - fast-forward 만 (로컬 작업 덮어쓰기 없음)
#  - 커밋 안 된 변경이 있으면 건드리지 않고 경고만 (충돌 방지)
#  - 무슨 일이 있어도 세션 시작을 막지 않음

set -uo pipefail

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
[ -z "$branch" ] && exit 0
[ "$branch" = "HEAD" ] && exit 0   # detached: 건너뜀

git fetch origin --quiet 2>/dev/null || exit 0

# 추적 upstream 없으면 동기화 대상 없음
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null) || exit 0

# 이미 최신이면 조용히 종료
local_sha=$(git rev-parse @ 2>/dev/null)
remote_sha=$(git rev-parse "@{u}" 2>/dev/null)
[ "$local_sha" = "$remote_sha" ] && exit 0

# 커밋 안 된 변경 있으면 자동 pull 안 함 (충돌 방지)
if [ -n "$(git status --porcelain)" ]; then
  printf '{"systemMessage":"⚠️ 로컬에 저장 안 된 변경이 있어 자동 동기화(pull) 건너뜀 — 커밋/정리 후 pull 하세요."}\n'
  exit 0
fi

if git pull --ff-only --quiet 2>/dev/null; then
  printf '{"systemMessage":"✅ GitHub 최신으로 동기화됨 → %s","suppressOutput":true}\n' "$branch"
else
  printf '{"systemMessage":"⚠️ 자동 동기화 실패 (로컬과 GitHub가 갈라짐) — 수동 확인 필요. \\"동기화 도와줘\\" 라고 하세요."}\n'
fi
exit 0
