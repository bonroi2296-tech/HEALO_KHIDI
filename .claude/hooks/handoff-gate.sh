#!/usr/bin/env bash
# Stop 훅 — 세션 종료 문지기 (PO 결정 2026-06-18: 강제/hard block).
# 목적: 세션이 실제 작업을 해놓고 핸드오프(인수인계) 없이 끝나는 걸 "막는다".
#       지시문(스킬)은 게으른 세션이 건너뛸 수 있으나, 훅은 도구가 강제 실행 → 못 건너뜀.
# 무한루프 방지: stop_hook_active=true(이미 한 번 막힌 뒤)면 다시 안 막는다(최대 1회 강제).
# 안전: 판단 불가/에러면 막지 않는다(작업 흐름을 인질로 잡지 않음).

set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

input=$(cat 2>/dev/null || echo "")
# 이미 이 훅 때문에 멈춤이 막힌 상태면 통과(루프 방지 — 1회만 강제).
if echo "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

CTX="docs/PROJECT_CONTEXT.md"
[ -f "$CTX" ] || exit 0

# 1) 핸드오프 형식 검사(6칸·절대날짜)
ck=$(node scripts/check-handoff.mjs 2>&1)
ck_status=$?

# 2) 직전 핸드오프 이후 실제 작업(커밋)이 쌓였는지
hc=$(git log -1 --format=%H --grep='핸드오프' 2>/dev/null)
since=0
[ -n "$hc" ] && since=$(git rev-list --count "${hc}..HEAD" 2>/dev/null || echo 0)

reason=""
if [ "$ck_status" -ne 0 ]; then
  reason="⛔ 세션 종료 차단 — 핸드오프 형식 검사 실패:
${ck}
→ docs/PROJECT_CONTEXT.md 최상단 핸드오프를 6칸(한 일/왜/보류/함정/다음 할 일/검증)·절대날짜(YYYY-MM-DD)로 채운 뒤 다시 끝내라."
elif [ "${since:-0}" -ge 2 ]; then
  reason="⛔ 세션 종료 차단 — 직전 핸드오프 이후 커밋 ${since}개인데 인수인계가 안 됨.
끝내기 전 /handoff 스킬을 실행해 docs/PROJECT_CONTEXT.md 최상단을 갱신하라(미검증 항목 승격 + PO 취향 누적 포함). 그 후 다시 끝내면 통과된다."
fi

if [ -n "$reason" ]; then
  REASON="$reason" node -e 'process.stdout.write(JSON.stringify({decision:"block",reason:process.env.REASON}))' 2>/dev/null || exit 0
fi
exit 0
