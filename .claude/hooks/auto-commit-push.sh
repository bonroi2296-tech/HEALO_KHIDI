#!/usr/bin/env bash
# 작업(턴) 종료 시 변경분이 있으면 자동 커밋 + 현재 브랜치로 푸시.
# 컨테이너가 회수돼도 작업이 날아가지 않도록 하는 안전장치.
# - main/master 브랜치에서는 동작하지 않음 (실수 방지)
# - 변경분이 없으면 아무것도 안 함

set -uo pipefail

# 세션 활동 도장(heartbeat) — 같은 폴더 동시작업 감지용(session-guard.sh가 읽음).
# 매 턴 갱신해야 하므로 브랜치/변경분 체크(아래 early-exit)보다 먼저, 무조건 찍는다.
_gd=$(git rev-parse --git-dir 2>/dev/null) && date +%s > "$_gd/.claude-active-session" 2>/dev/null || true

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
[ -z "$branch" ] && exit 0
[ "$branch" = "HEAD" ] && exit 0          # detached HEAD: 건너뜀
case "$branch" in
  main|master) exit 0 ;;                   # 보호 브랜치에는 자동 푸시 금지
esac

# 변경분(추적/미추적/스테이지) 없으면 종료
[ -z "$(git status --porcelain)" ] && exit 0

# add -u: 이미 추적 중인 파일의 변경만 저장. 미추적(새) 파일은 자동 저장 안 함.
# (이유: -A 는 검토 대기 중이거나 잡파일인 미추적 파일까지 쓸어담아 본판을 오염시킴 —
#  실제로 Hospitals_Rev1 중복 잡폴더가 이렇게 main에 섞인 사고가 있었음. 새 파일은 직접 커밋.)
git add -u || exit 0
ts=$(date '+%Y-%m-%d %H:%M')
git commit -m "chore: 작업 자동 저장 (${ts})" >/dev/null 2>&1 || exit 0

# 푸시 쓰로틀: 마지막 자동푸시가 THROTTLE 초 이내면 푸시 생략(로컬 커밋은 유지).
# 왜: Stop 훅이 턴마다 푸시 → 푸시마다 Vercel 프리뷰 배포 → 무료 플랜 일일 배포한도 소진
#     (2026-06-23 사고: 이 폭증으로 프로덕션 배포까지 24h 막힘, POSTMORTEMS #30).
#     로컬 커밋은 매 턴 남고 이 머신은 영속이라 작업 유실 없음 — 푸시만 주기적으로.
# 즉시 올려야 하면 평소처럼 `git push` 하면 됨(쓰로틀은 자동푸시에만 적용).
THROTTLE=600   # 10분
stamp="$(git rev-parse --git-dir)/.last-autopush"
now=$(date +%s)
last=0; [ -f "$stamp" ] && last=$(cat "$stamp" 2>/dev/null || echo 0)
if [ $((now - last)) -lt "$THROTTLE" ]; then
  printf '{"systemMessage":"✅ 자동 커밋 완료(로컬). 푸시는 쓰로틀(10분 내 재푸시 생략) — 배포 폭증 방지. 즉시 올리려면 git push.","suppressOutput":true}\n'
  exit 0
fi

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
  echo "$now" > "$stamp" 2>/dev/null || true
  printf '{"systemMessage":"✅ 변경분 자동 커밋·푸시 완료 → %s","suppressOutput":true}\n' "$branch"
else
  printf '{"systemMessage":"⚠️ 자동 커밋은 됐으나 푸시 실패 (네트워크 확인). 로컬 커밋은 안전.","suppressOutput":true}\n'
fi
exit 0
