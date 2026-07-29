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

# ── 말투 검사 (2026-07-28 추가) ──────────────────────────────────
# 왜: 말투 규칙은 CLAUDE.md 에 있고 plain-korean.sh 가 **매 턴 다시 띄우는데도** 어겼다.
#     PO 가 한 세션에서 세 번 지적 → *"규칙 그렇게 해놔도 안 지키잖아"*. 맞는 말이다.
#     알려주기(주입)와 재기(검사)는 다른 일이다. 여기서 «잰다».
#     실측: 이 검사를 만든 시점 기준 그 세션의 긴 응답 4개 중 4개가 위반이었다.
talk=$(node scripts/check-plain-korean.mjs --transcript "$t" 2>&1 >/dev/null | tr '\n' ' ')
[ -n "$talk" ] && warn="${warn}${warn:+ / }${talk}"

[ -z "$warn" ] && exit 0
printf '{"systemMessage":"⚖️ 자기점검: %s","suppressOutput":true}\n' "$warn"
exit 0
