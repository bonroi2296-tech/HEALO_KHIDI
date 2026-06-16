#!/usr/bin/env bash
# 작업(턴) 종료 시 변경분이 있으면 자동 커밋 + 현재 브랜치로 푸시.
# 컨테이너가 회수돼도 작업이 날아가지 않도록 하는 안전장치.
# - main/master 브랜치에서는 동작하지 않음 (실수 방지)
# - 변경분이 없으면 아무것도 안 함

set -uo pipefail

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
[ -z "$branch" ] && exit 0
[ "$branch" = "HEAD" ] && exit 0          # detached HEAD: 건너뜀
case "$branch" in
  main|master) exit 0 ;;                   # 보호 브랜치에는 자동 푸시 금지
esac

# 변경분(추적/미추적/스테이지) 없으면 종료
[ -z "$(git status --porcelain)" ] && exit 0

git add -A || exit 0
ts=$(date '+%Y-%m-%d %H:%M')
git commit -m "chore: 작업 자동 저장 (${ts})" >/dev/null 2>&1 || exit 0

# 네트워크 실패 대비 간단 재시도 (2s, 4s, 8s)
pushed=0
for delay in 0 2 4 8; do
  [ "$delay" -ne 0 ] && sleep "$delay"
  if git push -u origin "$branch" >/dev/null 2>&1; then
    pushed=1
    break
  fi
done

if [ "$pushed" -eq 1 ]; then
  printf '{"systemMessage":"✅ 변경분 자동 커밋·푸시 완료 → %s","suppressOutput":true}\n' "$branch"
else
  printf '{"systemMessage":"⚠️ 자동 커밋은 됐으나 푸시 실패 (네트워크 확인). 로컬 커밋은 안전.","suppressOutput":true}\n'
fi
exit 0
