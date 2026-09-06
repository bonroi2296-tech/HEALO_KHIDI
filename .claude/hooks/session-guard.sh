#!/usr/bin/env bash
# 같은 폴더 동시작업 감지·경고 → worktree 분리 유도 (POSTMORTEMS #30: 여러 세션이 메인 폴더를
# 공유하다 브랜치가 서로 바뀌고 파일이 되돌려지는 충돌 발생).
#
# 원리: 활성 세션은 매 턴(Stop 훅 auto-commit-push.sh 맨 위)에서 lock 파일에 현재시각을 찍는다.
#   새 세션이 SessionStart에서 그 lock이 '최근(FRESH초 내)에 갱신돼 있으면' = 다른 세션이
#   같은 폴더에서 활동 중 → 경고. lock은 .git/ 안이라 폴더/worktree마다 따로(오탐 없음).
# 막지 않고 경고만 한다(정상 단독작업까지 차단하면 위험).
set -uo pipefail

gitdir=$(git rev-parse --git-dir 2>/dev/null) || exit 0
lock="$gitdir/.claude-active-session"
FRESH=600   # 10분 내 갱신돼 있으면 다른 세션 활성으로 간주

if [ -f "$lock" ]; then
  last=$(cat "$lock" 2>/dev/null || echo 0)
  now=$(date +%s)
  if [ "$last" -gt 0 ] 2>/dev/null && [ $((now - last)) -lt "$FRESH" ]; then
    printf '{"systemMessage":"⚠️ 다른 Claude 세션이 이 폴더에서 작업 중일 수 있습니다(최근 10분 내 활동 감지). 충돌(브랜치 바뀜·파일 되돌림) 방지: 이 작업은 scripts/new-session.sh 로 별도 폴더(worktree)에서 진행하거나, 다른 세션을 닫으세요."}\n'
  fi
fi
exit 0
