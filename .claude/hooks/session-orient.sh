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

# ── 열린 작업 목록 (병렬 세션 네비게이션) ─────────────────────────
# main 에 아직 안 들어간 claude/* 작업본(브랜치)을 최신순으로 번호 매겨 띄운다.
# PO가 여러 세션을 병렬로 돌릴 때 "지금 열린 일이 뭐뭐였지"를 한눈에 보고,
# "1번 이어가" / "<이름> 이어가" 한마디로 고르면 그 브랜치로 이어가게 한다.
# (GitHub 조회 없이 git 원격추적 브랜치만 사용 — 훅은 네트워크를 쓰지 않는다.)
open_raw=$(git for-each-ref --sort=-committerdate \
  --format='%(refname:short)|%(committerdate:relative)|%(contents:subject)' \
  refs/remotes/origin/claude 2>/dev/null | head -12)
if [ -n "$open_raw" ]; then
  rows=""
  i=0
  while IFS='|' read -r ref rel subj; do
    [ -z "$ref" ] && continue
    # main 에 이미 머지된 브랜치는 제외(잔재 거르기). squash 머지분은 원격 브랜치 삭제로 사라짐.
    if git merge-base --is-ancestor "$ref" origin/main 2>/dev/null; then continue; fi
    short=${ref#origin/}
    i=$((i+1))
    rows="${rows}  ${i}. \`${short}\` — ${subj} (${rel})
"
    [ "$i" -ge 8 ] && break
  done <<EOF
$open_raw
EOF
  if [ "$i" -gt 0 ]; then
    echo ""
    echo "## 🗂️ 열린 작업(작업본 브랜치) — 병렬 세션용"
    echo "  ⚠️ 새 작업 시작 전 이 목록에서 **중복 확인**: 같은 영역(배포·AI챗·안전가드 등)을 이미 하는 브랜치가 있으면 새로 만들지 말고 그걸 이어가거나 PO에게 알려라(3중복 재발 방지)."
    printf '%s' "$rows"
    echo "  → PO가 \"N번 이어가\" 또는 \"<이름> 이어가\"라고 하면: 그 브랜치로 \`git checkout\` 한 뒤 이어가라."
    echo "     · 핸드오프가 있으면 ${CTX}·해당 PR을 보고 이어간다."
    echo "     · **핸드오프가 없어도(까먹음·토큰끊김·세션죽음) 반드시 복원해서 이어가라**: \`git log origin/main..<브랜치>\`(커밋 기록) + \`git diff origin/main...<브랜치>\`(실제 변경) + 해당 PR 설명으로 '무슨 작업이었는지'를 재구성. 매 턴 자동 커밋·푸시되므로 코드는 항상 남아 있다 — 핸드오프 유무와 무관하게 모든 작업을 이어갈 수 있어야 한다."
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

# ── PO 대기 관문 리마인드 (2026-07-02 PO 직접 지시: "안 해준 건 계속 보채야 해") ──
GATES="docs/LAUNCH_GATES_PO.md"
if [ -f "$GATES" ]; then
  gates=$(awk '/^## 🎯 지금 남은 관문/{f=1;next} /^## /{f=0} f&&/^\|/{print}' "$GATES" 2>/dev/null | head -14)
  if [ -n "$gates" ]; then
    echo ""
    echo "## ⏰ PO 대기 관문 — 보채기 의무 (PO 지시 2026-07-02: \"잘 메모해놨다가 내가 안 해준 건 빨리 좀 해달라고 계속 보채야 해\")"
    echo "$gates"
    echo "  → 이 세션에서 작업 완료 보고나 일일 요약을 할 때 **최상위 관문 1~2개를 같이 리마인드**하라(PO가 잊어서가 아니라 바빠서 밀리는 것 — 보채는 게 서비스임). 단 같은 세션 안에서 같은 관문 2번 이상 반복 금지. 관문을 닫으면 ${GATES}의 해당 행을 갱신해 목록에서 내려라."
  fi
fi

# ── 주간 문서 건강검진 리마인드 (2026-07-05 PO 승인 — 문서도 부패한다, #63 문서-현실 드리프트 방지) ──
DHLOG="docs/audit/DOC_HEALTH_LOG.md"
if [ -f "$DHLOG" ]; then
  last_dh=$(grep -m1 -oE '^## [0-9]{4}-[0-9]{2}-[0-9]{2}' "$DHLOG" 2>/dev/null | awk '{print $2}')
  if [ -n "$last_dh" ]; then
    now_s=$(date +%s 2>/dev/null)
    last_dh_s=$(date -d "$last_dh" +%s 2>/dev/null || echo "")
    if [ -n "$last_dh_s" ] && [ -n "$now_s" ]; then
      dh_days=$(( (now_s - last_dh_s) / 86400 ))
      if [ "$dh_days" -ge 7 ] 2>/dev/null; then
        echo ""
        echo "## 🩺 문서 건강검진 기한 경과 — 마지막 검진 ${last_dh} (${dh_days}일 전)"
        echo "  → 이 세션의 본 작업 전후로 \`/doc-health\` 스킬을 1회 실행하라(주 1회 루틴). 낡은 문서(=낡은 기억)를 믿고 일하면 사고남. 검진 후 ${DHLOG} 최상단에 엔트리를 남겨야 이 알림이 꺼진다."
      fi
    fi
  fi
fi

# ── 주간 완성도 감사 리마인드 (2026-07-15 — 완성도 루프 축 B: "완성 판정(Manager)"을 사람 눈에서 기계로) ──
CPLOG="docs/audit/COMPLETENESS_LOG.md"
if [ -f "$CPLOG" ]; then
  last_cp=$(grep -m1 -oE '^## [0-9]{4}-[0-9]{2}-[0-9]{2}' "$CPLOG" 2>/dev/null | awk '{print $2}')
  if [ -n "$last_cp" ]; then
    now_s=$(date +%s 2>/dev/null)
    last_cp_s=$(date -d "$last_cp" +%s 2>/dev/null || echo "")
    if [ -n "$last_cp_s" ] && [ -n "$now_s" ]; then
      cp_days=$(( (now_s - last_cp_s) / 86400 ))
      if [ "$cp_days" -ge 7 ] 2>/dev/null; then
        echo ""
        echo "## 🧩 완성도 감사 기한 경과 — 마지막 감사 ${last_cp} (${cp_days}일 전)"
        echo "  → 이 세션 본 작업 전후로 \`/completeness-audit\` 를 1회 실행하라(반복 미완성 7유형을 PO 눈 대신 기계가 훑음). diff 범위 우선(전면은 무거움). 감사 후 ${CPLOG} 최상단에 엔트리를 남겨야 이 알림이 꺼진다."
      fi
    fi
  fi
fi

echo ""
echo "## 🗣️ 말투 규칙 (PO=비개발자, 매 응답 강제)"
echo "- **개발 용어는 반드시 쉽게 풀어 설명 + 원어 병기.** 풀이 없이 용어만 쓰기 금지. 예: 정식주소(canonical), 주소록(DNS), 설정값(env), 검색등록(색인·index)."
echo "- 짧고 직설적 한국어. 결과물(URL·배포·시각) 우선, 긴 설명 X."
echo "- **PO에게 던지는 모든 질문은 예외 없이 AskUserQuestion 버튼으로** — 평문 '~할까요?'·예/아니오도 금지(버튼으로). 답 명백하면 묻지 말고 추천안 실행."
echo "- 어겼다고 PO가 지적하게 만들지 마라 — 이게 반복돼서 이 줄이 생겼다."

exit 0
