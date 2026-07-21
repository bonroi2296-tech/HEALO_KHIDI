#!/usr/bin/env bash
# 턴 종료 시 "내가 규칙 어겼나"를 기계가 재서 되돌려준다.
# 왜: 문서 규칙은 안 지켜진다(2026-07-21 실측 — 기존 규칙 3개 전부 위반).
#     응답 길이·질문 빈도는 PO 대기시간에 직결되는데 자각이 안 됨 → 숫자로 강제 자각.
# 기준(실측): 응답 2,800자 ≈ 9초, 7,700자 ≈ 30초 (출력량↔응답시간 r=0.84).

set -uo pipefail

t=$(sed -n 's/.*"transcript_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' 2>/dev/null | head -1)
t=${t//\\\\/\/}
[ -f "$t" ] || exit 0

# 마지막 어시스턴트 응답의 text 길이 + 이번 세션 누적 버튼질문 수
read -r len asks <<<"$(awk '
  /"type":"assistant"/ { last = length($0) }
  /"name":"AskUserQuestion"/ { a++ }
  END { printf "%d %d", last+0, a+0 }
' "$t" 2>/dev/null)"

[ "${len:-0}" -gt 0 ] || exit 0

warn=""
[ "$len" -gt 4000 ] && warn="응답 ${len}자(4000 초과) — 그만큼 PO가 기다렸다. 다음 턴 짧게."
[ "${asks:-0}" -ge 3 ] && warn="${warn}${warn:+ / }버튼질문 ${asks}개 — 🚦관문(돈·되돌리기·PO만 아는 것) 다시 읽어라."

[ -z "$warn" ] && exit 0
printf '{"systemMessage":"⚖️ 자기점검: %s","suppressOutput":true}\n' "$warn"
exit 0
