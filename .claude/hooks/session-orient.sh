#!/usr/bin/env bash
# 세션 시작/재개 시 "지금 어디였는지"를 컨텍스트에 자동 주입.
# 목적: 세션이 끊기거나 새로 켜져도, PO가 "동기화하고 이어가자"를 안 쳐도
#       Claude가 즉시 브랜치·최근 커밋·미커밋 상태를 알고 핸드오프부터 읽게 한다.
# (루프 엔지니어링 ⑥ 상태파일 + ① 오토메이션 원칙 — "에이전트는 잊어도 저장소는 안 잊는다")
# 안전: 무슨 일이 있어도 세션 시작을 막지 않는다(항상 exit 0).

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

# stdout 은 SessionStart 시 Claude 컨텍스트에 추가된다(ch07 Hooks).
echo "## 🧭 세션 오리엔테이션 (자동 주입)"
echo "- 현재 브랜치: ${branch}"
echo "- 미커밋 변경: ${dirty}개 파일"
echo "- 최근 커밋:"
git log --oneline -3 2>/dev/null | sed 's/^/    - /'
echo "- ▶ 이어가기 전 **docs/PROJECT_CONTEXT.md 최상단 핸드오프**를 먼저 읽어라. 남은 버그·개선점은 docs/KNOWN_ISSUES.md."

exit 0
