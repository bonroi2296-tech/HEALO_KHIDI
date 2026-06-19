#!/usr/bin/env bash
# Stop 훅 — 세션 종료 문지기.
# PO 결정(2026-06-19): 강제 차단 OFF (기본). 핸드오프는 "커밋 N개" 같은 대용지표로
#   강제하지 않는다. 대신 (1) PO가 마칠 때("핸드오프"/"오늘 끝") 또는
#   (2) 어시스턴트가 세션 과부하를 감지해 제안 → PO 동의 시에만 한다.
#   까먹음 방지: 세션 *시작* 시 session-orient.sh 의 "뒤처짐 경보"가 받쳐줌.
# 되살리려면 ENFORCE=1 로 바꿔라 (아래에 직전 강제 차단 로직 그대로 보존).
ENFORCE=0
[ "$ENFORCE" = "1" ] || exit 0

# ───────────────────────── ENFORCE=1 일 때만 동작 ─────────────────────────
# (PO 결정 2026-06-18 의 강제 차단 로직 — 보존. 무한루프 방지·에러 시 통과 동일.)
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

input=$(cat 2>/dev/null || echo "")
if echo "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

CTX="docs/PROJECT_CONTEXT.md"
[ -f "$CTX" ] || exit 0

ck=$(node scripts/check-handoff.mjs 2>&1)
ck_status=$?

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
