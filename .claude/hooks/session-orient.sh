#!/usr/bin/env bash
# 세션 시작/재개 시 "지금 어디였는지"를 컨텍스트에 자동 주입.
# 목적: 세션이 끊기거나 새로 켜져도, PO가 "동기화하고 이어가자"를 안 쳐도
#       Claude가 즉시 브랜치·최근 커밋·핸드오프 핵심·PO 취향을 알고 이어가게 한다.
# (루프 엔지니어링 ⑥ 상태파일 + ① 오토메이션 원칙 — "에이전트는 잊어도 저장소는 안 잊는다")
# 안전: 무슨 일이 있어도 세션 시작을 막지 않는다(항상 exit 0).

set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

CTX="docs/PROJECT_CONTEXT.md"
PREFS="docs/PO_PREFERENCES.md"

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

# ── 핸드오프 최상단 블록에서 한 섹션만 뽑아오기 (B) ──────────────
# 헤더는 줄머리가 **로 시작. 해당 키 헤더부터 다음 ** 헤더/---/## 전까지 출력.
extract_section() {
  local key="$1"
  awk -v key="$key" '
    /^---[[:space:]]*$/ { if (grab) exit }
    /^## /             { if (grab) exit }
    /^\*\*/ {
      if (grab) exit
      if (index($0, key) > 0) { grab=1 }
    }
    grab { print }
  ' "$CTX" 2>/dev/null
}

echo "## 🧭 세션 오리엔테이션 (자동 주입)"
echo "- 현재 브랜치: ${branch}"
echo "- 미커밋 변경: ${dirty}개 파일"
echo "- 최근 커밋:"
git log --oneline -3 2>/dev/null | sed 's/^/    - /'

# ── 핸드오프 뒤처짐 경보 (C) ──────────────────────────────────
hc=$(git log -1 --format=%H --grep='핸드오프' 2>/dev/null)
if [ -n "$hc" ]; then
  since=$(git rev-list --count "${hc}..HEAD" 2>/dev/null || echo 0)
  hd=$(git log -1 --format=%cd --date=short --grep='핸드오프' 2>/dev/null)
  days=""
  if [ -n "$hd" ]; then
    today_s=$(date +%s 2>/dev/null)
    hd_s=$(date -d "$hd" +%s 2>/dev/null || echo "")
    [ -n "$hd_s" ] && days=$(( (today_s - hd_s) / 86400 ))
  fi
  if [ "${since:-0}" -ge 5 ] 2>/dev/null || { [ -n "$days" ] && [ "$days" -ge 2 ]; } 2>/dev/null; then
    echo "- ⚠️ **핸드오프 뒤처짐 경보**: 마지막 핸드오프(${hd:-?}) 이후 커밋 ${since}개·${days:-?}일 경과. 앞 세션 일이 기록 안 됐을 수 있음 → 이어가기 전 git log로 공백 확인."
  fi
fi

echo "- ▶ 이어가기 전 **${CTX} 최상단 핸드오프** 전체를 읽어라. 남은 버그·개선점은 docs/KNOWN_ISSUES.md."

# ── 핸드오프 핵심 3칸을 직접 띄움 (B) — 안 읽어도 눈앞에 ──────────
if [ -f "$CTX" ]; then
  nx=$(extract_section "다음 세션이 먼저 할 일")
  hold=$(extract_section "안 끝났거나 보류")
  ver=$(extract_section "검증 상태")
  if [ -n "$nx$hold$ver" ]; then
    echo ""
    echo "## 📌 직전 핸드오프 핵심 (전문은 ${CTX})"
    [ -n "$nx" ]   && { echo "### ▶ 다음 세션이 먼저 할 일"; echo "$nx"; }
    [ -n "$hold" ] && { echo "### ⏸ 안 끝났거나 보류";       echo "$hold"; }
    [ -n "$ver" ]  && { echo "### ✅ 검증 상태 (미검증=먼저 확인)"; echo "$ver"; }
  fi
fi

# ── PO 취향 원장 「활성」 띄움 (G) — 고정 규칙 밖의 성향 ──────────
if [ -f "$PREFS" ]; then
  active=$(awk '/<!-- ACTIVE:START -->/{f=1;next} /<!-- ACTIVE:END -->/{f=0} f' "$PREFS" 2>/dev/null)
  if [ -n "$active" ]; then
    echo ""
    echo "## 🎯 PO 취향·선호 (누적 학습 — 고정 규칙 외, 어기지 마라)"
    echo "$active"
    echo "_(세션 중 새 취향이 드러나면 /handoff가 ${PREFS}에 누적한다)_"
  fi
fi

echo ""
echo "## 🗣️ 말투 규칙 (PO=비개발자, 매 응답 강제)"
echo "- **개발 용어는 반드시 쉽게 풀어 설명 + 원어 병기.** 풀이 없이 용어만 쓰기 금지. 예: 정식주소(canonical), 주소록(DNS), 설정값(env), 검색등록(색인·index)."
echo "- 짧고 직설적 한국어. 결과물(URL·배포·시각) 우선, 긴 설명 X."
echo "- 어겼다고 PO가 지적하게 만들지 마라 — 이게 반복돼서 이 줄이 생겼다."

exit 0
