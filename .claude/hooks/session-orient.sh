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
KI="docs/KNOWN_ISSUES.md"

# ── 「지우면 안 되는 가지」 = 「신청서도 내면 안 되는 가지」 (2026-09-05 신설) ──────
# 왜: 아래 「서랍에 갇힌 작업」 경보가 PR 없는 가지를 보면 무조건 «오늘 신청서를 만들어라»
#   라고 말한다. 그런데 `fix/push-notification-icon` 은 KHIDI 중간평가 증빙 132MB(61파일)와
#   국내 에이전시 연락처 29건이 든 «본판에 올리면 안 되는» 가지다(KNOWN_ISSUES 의 표에
#   그렇게 박혀 있다). 게다가 본판과 뿌리가 달라(no merge base) 파일 2,275개짜리 신청서가 된다.
#   즉 훅의 지시를 그대로 따르면 **공개 저장소 본판에 증빙 132MB + 업체 연락처가 올라간다.**
#   2026-09-05 실측: 그 가지는 16일째 이 경보에 떠 있었고 아무 단서도 안 붙어 있었다.
# 어떻게: 문서의 표를 기계가 읽는다 — 사람이 표에 한 줄 더 적으면 훅이 바로 안다.
#   (목록을 훅에 손으로 박으면 문서와 어긋난다. 정본은 하나여야 한다.)
protected_refs() {
  awk '/^## .*지우면 안 되는 가지/{f=1;next} f&&/^## /{f=0} f&&/^\|/{print}' "$KI" 2>/dev/null \
    | sed -n 's/^| *\*\{0,2\}`\([^`]*\)`.*/\1/p'
}
PROTECTED=$(protected_refs)
# 표 제목이 바뀌면 이 보호가 «조용히» 사라진다 — 그게 제일 나쁜 고장이라 소리를 낸다.
if [ -f "$KI" ] && [ -z "$PROTECTED" ]; then
  echo "- ⚠️ \`${KI}\` 에서 「지우면 안 되는 가지」 표를 못 읽었다 — 보호 목록이 비었다. 표 제목이 바뀌었는지 봐라(.claude/hooks/session-orient.sh 의 protected_refs)."
fi
is_protected() {
  case "$1" in "") return 1;; esac
  printf '%s\n' "$PROTECTED" | grep -qxF "$1"
}

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

# ── 「이 폴더가 본판보다 얼마나 낡았나」 (2026-08-14 신설) ────────────
# 왜: 이 폴더가 8/03 에 갈라진 작업본에 **11일간** 올라타 있었는데 아무 경보도 없었다.
#   아래 「서랍에 갇힌 작업」 경보는 «마지막 커밋 날짜»로 방치를 재는데, 자동 저장 훅이
#   2분마다 커밋하므로 어떤 작업본이든 늘 「방금 만진 것」으로 보인다 → **영원히 안 걸린다.**
#   그래서 방치를 «갈라진 날짜»로 다시 잰다(자동 저장이 못 지우는 값).
# 무엇이 걸려 있나: 낡은 사본 위에서 파일을 고쳐 합치면 그 사이 남이 고친 것이 **되돌아간다.**
#   2026-08-14 실제로 걸릴 뻔했다(본판 8/04 법 조문 교정이 이 폴더에 없어 삭제로 잡혔다).
if [ "$branch" != "main" ] && [ "$branch" != "production" ]; then
  behind=$(git rev-list --count "HEAD..origin/main" 2>/dev/null || echo 0)
  fork=$(git merge-base HEAD origin/main 2>/dev/null || echo "")
  fdate=""; fdays=""
  if [ -n "$fork" ]; then
    fdate=$(git log -1 --format=%cd --date=short "$fork" 2>/dev/null)
    if [ -n "$fdate" ]; then
      ts_now=$(date +%s 2>/dev/null); ts_f=$(date -d "$fdate" +%s 2>/dev/null || echo "")
      [ -n "$ts_f" ] && [ -n "$ts_now" ] && fdays=$(( (ts_now - ts_f) / 86400 ))
    fi
  fi
  if [ "${behind:-0}" -ge 20 ] 2>/dev/null || { [ -n "$fdays" ] && [ "$fdays" -ge 3 ]; } 2>/dev/null; then
    echo "- 🔶 **이 폴더는 본판(main)보다 커밋 ${behind}개 뒤처졌다** — 갈라진 날 ${fdate:-?} (${fdays:-?}일 전)"
    echo "    → 코드를 고치기 전에 둘 중 하나: ①본판 최신을 이 작업본에 흡수 ②\`git worktree add <경로> -b <새작업본> origin/main\` 으로 **본판에서 새로 따서** 거기서 작업."
    echo "    → 이미 이 폴더에서 고쳤다면, 옮길 때 **삭제된 줄을 전수 확인**하라(남의 최신 수정이 삭제로 잡힌다)."
  fi
fi

# ── 핸드오프 뒤처짐 경보 (C) ──────────────────────────────────
# ⚠️ 한글 「핸드오프」만 찾으면 안 된다 (2026-07-31 실측: 인수인계 커밋 9개 중 1개만 걸렸다).
#    이 저장소의 인수인계 커밋 제목은 대부분 `docs(handoff):` 로 «영문»이고 본문에 「인수인계」를 쓴다.
#    그래서 방금 합친 인수인계를 못 보고 「1일 경과·커밋 8개」라는 가짜 경보가 떴다.
#    경보가 엉뚱하게 울면 진짜 뒤처졌을 때 무시하게 된다 → 세 표현을 전부 본다(--grep 여러 개 = OR).
HO_GREP='--grep=핸드오프 --grep=handoff --grep=인수인계'
# shellcheck disable=SC2086
hc=$(git log -1 --format=%H -i $HO_GREP 2>/dev/null)
if [ -n "$hc" ]; then
  since=$(git rev-list --count "${hc}..HEAD" 2>/dev/null || echo 0)
  # shellcheck disable=SC2086
  hd=$(git log -1 --format=%cd --date=short -i $HO_GREP 2>/dev/null)
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

# ── 실서비스 배포 지연 경보 ───────────────────────────────────
# 왜: 「배포는 하루 한 번 오후 3시 창구」(2026-07-28)로 바꾼 뒤, 창구가 조용히 실패하면
#     **다음 날까지 아무도 모른다**(하루 1회라 실패가 눈에 안 띈다 — 반성문 #142).
#     그래서 세션이 열릴 때마다 「본판에는 있는데 실서비스엔 아직 없는 커밋」 수를 띄운다.
#     정상값은 0~그날 머지분이고, 이틀치가 쌓여 있으면 창구가 죽은 것이다.
#
# 🛑 2026-08-12 수리: 기준을 production 가지 → **실서비스가 실제로 돌고 있는 커밋**으로 바꿨다.
#     정시 창구(Vercel 예약, app/api/cron/daily-deploy/route.ts)는 열쇠가 없어 production
#     가지를 «갱신하지 않고» main 커밋으로 배포를 직접 만든다. 그래서 가지를 기준으로 재면
#     정상 배포된 것까지 「안 나갔다」로 세어 매 세션 거짓 경보가 떴다
#     (실측 2026-08-12: 「16개 안 나감」이라 떴지만 실제 미배포는 문서 2건뿐).
#     → daily-deploy.yml 의 건너뛰기 판정과 «같은 신호»(공개 헬스체크의 commit)를 본다.
git fetch -q --depth=50 origin main production >/dev/null 2>&1 || true
health_url="${HEALTH_URL:-https://healwith.co.kr/api/health}"
live=$(curl -fsS --max-time 8 "$health_url" 2>/dev/null \
       | sed -n 's/.*"commit":"\([0-9a-f]\{7,40\}\)".*/\1/p' || true)
if [ -n "$live" ] && git cat-file -e "$live^{commit}" 2>/dev/null; then
  base="$live"; base_label="실서비스 커밋"
else
  # 헬스체크가 안 열리거나 그 커밋을 아직 못 받았으면 옛 기준(production 가지)으로 물러선다.
  # 이땐 숫자가 부풀 수 있으므로 「참고값」이라고 밝힌다.
  base="origin/production"; base_label="production 가지(참고값 — 헬스체크 못 읽음)"
fi
lag=$(git rev-list --count "$base..origin/main" 2>/dev/null || echo "")
if [ -n "$lag" ] && [ "$lag" -gt 0 ] 2>/dev/null; then
  last=$(git log -1 --format=%cd --date=format:'%m-%d %H:%M' "$base" 2>/dev/null)
  code_lag=$(git rev-list "$base..origin/main" 2>/dev/null \
             | while read -r c; do
                 git show --name-only --format= "$c" 2>/dev/null \
                   | grep -qvE '^(docs/|\.claude/|[^/]*\.md$)' && echo x
               done | wc -l | tr -d ' ')
  echo "- 📦 **실서비스에 아직 안 나간 커밋 ${lag}개** (그중 코드 변경 ${code_lag}개 / 기준: ${base_label}, ${last:-?}). 오후 3시 창구가 한 번에 내보낸다."
  echo "    ⚠️ 이 숫자가 어제치까지 쌓여 있으면 창구가 죽은 것 → Actions 의 \"Daily Deploy (배포 창구)\" 실행 이력 확인."
fi

# ── 열린 작업 목록 (병렬 세션 네비게이션) ─────────────────────────
# main 에 아직 안 들어간 작업본(브랜치)을 최신순으로 번호 매겨 띄운다.
# PO가 여러 세션을 병렬로 돌릴 때 "지금 열린 일이 뭐뭐였지"를 한눈에 보고,
# "1번 이어가" / "<이름> 이어가" 한마디로 고르면 그 브랜치로 이어가게 한다.
#
# 2026-07-28 수리 2건 (이 목록이 «있는데 안 보이던» 이유):
#  ① 예전엔 refs/remotes/origin/claude 만 봤다 → 이름이 fix/·work/·docs/ 로 시작하는 브랜치는
#     통째로 안 보였다. 실제로 7/28 14:08~15:56 에 「배포 창구」 하나를 6개 브랜치가 각자 고쳤는데
#     (fix/deploy-side-door·side-door2·skipcheck·not-merge-window·work/fix-deploy-window·fix/prod-build-lock)
#     전부 이 목록 밖이라 세션들이 서로를 못 봤다. → 이제 원격 브랜치 전체를 본다.
#  ② 새로 켜진 세션은 원격 브랜치 정보가 아직 없을 수 있어 이 섹션이 통째로 안 떴다.
#     → 아래에서 짧은 타임아웃으로 브랜치 목록만 먼저 받아온다(실패해도 그냥 진행).
timeout 10 git fetch -q --depth=50 origin '+refs/heads/*:refs/remotes/origin/*' >/dev/null 2>&1 || true

open_raw=$(git for-each-ref --sort=-committerdate \
  --format='%(refname:short)|%(committerdate:relative)|%(contents:subject)' \
  refs/remotes/origin 2>/dev/null \
  | grep -vE '^origin/(main|master|production|HEAD)\|' | head -40)
if [ -n "$open_raw" ]; then
  rows=""
  i=0
  # 브랜치별로 «만지는 파일»을 모아 둔다 — 같은 파일을 두 브랜치가 만지면 그게 곧 중복 착수 경보.
  filemap=""
  while IFS='|' read -r ref rel subj; do
    [ -z "$ref" ] && continue
    # main 에 이미 머지된 브랜치는 제외(잔재 거르기). squash 머지분은 원격 브랜치 삭제로 사라짐.
    if git merge-base --is-ancestor "$ref" origin/main 2>/dev/null; then continue; fi
    # 앞선 커밋이 하나도 없으면 열린 작업이 아니다.
    ahead=$(git rev-list --count "origin/main..$ref" 2>/dev/null || echo 0)
    [ "${ahead:-0}" -eq 0 ] && continue
    short=${ref#origin/}
    # 그 브랜치가 본판 대비 만지는 파일(기록 문서는 어차피 다 같이 만지므로 제외 — 신호가 묻힌다).
    # core.quotepath=false: 안 그러면 한글 파일명이 \354\234... 로 나와 사람이 못 읽는다.
    fs=$(git -c core.quotepath=false diff --name-only "origin/main...$ref" 2>/dev/null \
         | grep -vE '^docs/|\.md$' | head -6)
    top=$(printf '%s' "$fs" | head -3 | paste -sd',' - 2>/dev/null | sed 's/,/, /g')
    i=$((i+1))
    rows="${rows}  ${i}. \`${short}\` — ${subj} (${rel}, 커밋 ${ahead}개)
"
    [ -n "$top" ] && rows="${rows}       만지는 곳: ${top}
"
    while IFS= read -r f; do
      [ -n "$f" ] && filemap="${filemap}${f}	${short}
"
    done <<EOF
$fs
EOF
    [ "$i" -ge 10 ] && break
  done <<EOF
$open_raw
EOF
  if [ "$i" -gt 0 ]; then
    echo ""
    echo "## 🗂️ 열린 작업(작업본 브랜치) — 병렬 세션용"
    echo "  ⚠️ 새 작업 시작 전 이 목록에서 **중복 확인**: 같은 영역(배포·AI챗·안전가드 등)을 이미 하는 브랜치가 있으면 새로 만들지 말고 그걸 이어가거나 PO에게 알려라(3중복 재발 방지)."
    printf '%s' "$rows"
    # ── 겹침 자동 판정: 같은 파일을 2개 이상 브랜치가 만지고 있으면 그 자리에서 띄운다 ──
    clash=$(printf '%s' "$filemap" | sort -u | awk -F'\t' '
      { if ($1==prev) { list=list ", " $2; n++ } else { if (n>1) print prev " ← " list; prev=$1; list=$2; n=1 } }
      END { if (n>1) print prev " ← " list }' | head -6)
    if [ -n "$clash" ]; then
      echo ""
      echo "  🔴 **겹침 감지 — 같은 파일을 여러 작업본이 동시에 만지고 있다** (충돌·중복작업 예정지)"
      printf '%s\n' "$clash" | sed 's/^/     · /'
      echo "     → 여기에 손대야 하면 **동시에 하지 말고** 먼저 끝나는 쪽을 본판에 합친 뒤 최신을 받아와서 이어라."
    fi
    echo "  → PO가 \"N번 이어가\" 또는 \"<이름> 이어가\"라고 하면: 그 브랜치로 \`git checkout\` 한 뒤 이어가라."
    echo "     · 핸드오프가 있으면 ${CTX}·해당 PR을 보고 이어간다."
    echo "     · **핸드오프가 없어도(까먹음·토큰끊김·세션죽음) 반드시 복원해서 이어가라**: \`git log origin/main..<브랜치>\`(커밋 기록) + \`git diff origin/main...<브랜치>\`(실제 변경) + 해당 PR 설명으로 '무슨 작업이었는지'를 재구성. 매 턴 자동 커밋·푸시되므로 코드는 항상 남아 있다 — 핸드오프 유무와 무관하게 모든 작업을 이어갈 수 있어야 한다."
  fi
fi

# ── 서랍에 갇힌 작업 경보 (커밋은 있는데 PR 이 없는 브랜치) ────────
# 2026-07-27 사고: 커밋만 해두고 PR 을 안 낸 브랜치에 작업 3건이 갇혀 회수 세션이 따로 필요했다(#1056·#1058·#1059).
# 「머지됐나」가 아니라 **PR 이 있나**로 가른다 — squash 머지를 쓰면 알맹이가 다 들어가도
# 브랜치는 영원히 --no-merged 라 git 만으론 구분이 안 된다. 그래서 여기서만 GitHub 를 본다.
#
# ⚠️ 2026-07-28 수리 2차: 예전엔 «gh 명령이 있나»만 봤다. 그런데 gh 가 **있어도 못 쓰는** 경우가 있다
#    (로그인 안 됨·GitHub 저장소가 아님·망 끊김). 그때 조용히 아무것도 안 띄우고 넘어갔다 =
#    경보가 있는데 없는 것과 같다. 실제로 이번 자동 검사 기계에서 그게 났다(gh 는 깔려 있는데 못 씀).
#    → 이제 «있나»가 아니라 **«실제로 물어봐서 답이 오나»**로 가른다. 못 쓰면 git 만으로 하는
#      대체 경보로 떨어진다(판정은 낮아지지만 **침묵보다 낫다** — 오늘 사고의 교훈 그대로).
STALE_DAYS=3
GH_OK=0
if command -v gh >/dev/null 2>&1; then
  timeout 10 gh pr list --limit 1 --json number >/dev/null 2>&1 && GH_OK=1
fi
if [ "$GH_OK" = "1" ]; then
    now=$(date +%s)
    stale=""; sn=0; checked=0
    while IFS='|' read -r ref ts subj; do
      [ -z "$ref" ] && continue
      # ① 먼저 git 만으로(=망 없이) 후보를 거른다 — 본판에 안 들어갔고 · 오래됐고 · 앞선 커밋이 있는 것.
      git merge-base --is-ancestor "$ref" origin/main 2>/dev/null && continue
      d=$(( (now - ts) / 86400 ))
      [ "$d" -lt "$STALE_DAYS" ] && continue
      n=$(git rev-list --count "origin/main..$ref" 2>/dev/null || echo 0)
      [ "${n:-0}" -eq 0 ] && continue
      short=${ref#origin/}
      # ② 후보에 대해서만 GitHub 를 묻는다(보통 0건 → 망 호출 0). 전체 PR 목록을 받으면
      #    800건이 넘어 느리고, --limit 에 잘리면 «PR 있는데 없다»고 거짓 경보가 난다.
      # 한계: gh 호출은 최신 8개 후보까지만(훅이 느려지지 않게). 오래 방치된 브랜치가 8개를 넘으면
      # 그 아래는 못 본다 — 갇힌 작업은 보통 최근 것이라 이 정도로 충분. 자주 잘리면 상한을 올릴 것.
      checked=$((checked+1)); [ "$checked" -gt 8 ] && break
      pr=$(timeout 10 gh pr list --state all --head "$short" --limit 1 --json number,state,mergedAt,closedAt \
             -q '.[]|"\(.number)|\(.state)|\(.mergedAt // .closedAt // "")"' 2>/dev/null) || continue
      why=""
      if [ -z "$pr" ]; then
        why="커밋 ${n}개 · **${d}일째 PR 없음**"
      else
        IFS='|' read -r pnum pstate pend <<<"$pr"
        [ "$pstate" = "OPEN" ] && continue
        # 「PR 은 있었다」로 끝내면 안 된다 — 머지 뒤 같은 브랜치에 새 커밋을 더 쌓아두고
        # 새 PR 을 안 낸 것이 2026-07-27 실제 사고였다(#982 머지 뒤 27커밋). 마감 시각 뒤 커밋만 센다.
        pend_s=$(date -d "$pend" +%s 2>/dev/null || echo 0)
        [ "$pend_s" -gt 0 ] && [ "$ts" -le "$pend_s" ] && continue
        na=$(git rev-list --count --after="$pend" "origin/main..$ref" 2>/dev/null || echo "$n")
        [ "${na:-0}" -eq 0 ] && continue
        why="PR #${pnum} 마감 뒤 커밋 ${na}개 · **${d}일째 새 PR 없음**"
      fi
      sn=$((sn+1))
      if is_protected "$short"; then
        why="${why} — 🛑 **본판에 올리지 마라**(\`${KI}\` 「지우면 안 되는 가지」). 신청서를 만들지 말고 가지를 그대로 둬라"
      fi
      stale="${stale}  · \`${short}\` — ${why} — ${subj}
"
      [ "$sn" -ge 6 ] && break
    done <<EOF
$(git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:unix)|%(contents:subject)' refs/remotes/origin 2>/dev/null)
EOF
    if [ "$sn" -gt 0 ]; then
      echo ""
      echo "## 🚨 서랍에 갇힌 작업 — 커밋은 있는데 **합치기 신청서(PR)가 없다** (${STALE_DAYS}일+ 방치)"
      printf '%s' "$stale"
      echo "  → 이대로 두면 본판에 영영 안 들어간다. **오늘 처리하라**: 살릴 것이면 \`gh pr create\`, 이미 본판에 있는 잔재면 대조 후 브랜치 삭제."
      echo "     · 🛑 위에 «본판에 올리지 마라»가 붙은 가지는 **예외다** — 신청서도 삭제도 하지 말고 그대로 둬라(사유는 \`${KI}\`)."
      echo "     · ⚠️ 삭제 전엔 \`docs/\` 까지 포함해 전수 대조(과거에 핸드오프 76줄이 브랜치에만 남아 있던 적 있음)."
    fi
else
    # ── gh 가 없는 환경용 대체 경보 (2026-07-28 추가) ──────────────
    # 왜: 이 경보는 `gh` 가 있을 때만 돌게 짜여 있었는데, 웹·원격 세션 컨테이너엔 `gh` 가 없다.
    #     그래서 「만들어는 뒀지만 정작 병렬 세션을 제일 많이 돌리는 환경에서 한 번도 안 뜨는」
    #     상태였다(2026-07-28 이 세션에서 실측 확인 — 본판 밖 커밋 96개가 쌓여 있는데 무경보).
    # 한계(솔직히): git 만으로는 «합치기 신청서가 있는지»를 알 수 없다. 그래서 판정을 낮춰
    #     «본판 밖에 며칠째 남아 있다»만 띄우고, 신청서 유무 확인은 세션에게 시킨다.
    now=$(date +%s)
    stale=""; sn=0
    while IFS='|' read -r ref ts subj; do
      [ -z "$ref" ] && continue
      case "$ref" in origin/main|origin/master|origin/production|origin/HEAD) continue;; esac
      git merge-base --is-ancestor "$ref" origin/main 2>/dev/null && continue
      d=$(( (now - ts) / 86400 ))
      [ "$d" -lt "$STALE_DAYS" ] && continue
      n=$(git rev-list --count "origin/main..$ref" 2>/dev/null || echo 0)
      [ "${n:-0}" -eq 0 ] && continue
      sn=$((sn+1))
      mark=""
      if is_protected "${ref#origin/}"; then
        mark=" — 🛑 **본판에 올리지 마라**(\`${KI}\` 「지우면 안 되는 가지」). 신청서도 삭제도 하지 말 것"
      fi
      stale="${stale}  · \`${ref#origin/}\` — 커밋 ${n}개가 **${d}일째 본판 밖**${mark} — ${subj}
"
      [ "$sn" -ge 6 ] && break
    done <<EOF
$(git for-each-ref --sort=-committerdate --format='%(refname:short)|%(committerdate:unix)|%(contents:subject)' refs/remotes/origin 2>/dev/null)
EOF
    if [ "$sn" -gt 0 ]; then
      echo ""
      echo "## 🚨 서랍에 갇힌 작업 — **${STALE_DAYS}일+ 본판(main) 밖**에 남아 있다"
      printf '%s' "$stale"
      echo "  → 이 환경엔 \`gh\` 가 없어 **합치기 신청서(PR)가 있는지까지는 여기서 못 본다.** 세션이 GitHub 도구로 확인하라:"
      echo "     ① 신청서가 있고 열려 있으면 → 그대로 두고 자동 검사만 확인."
      echo "     ② 신청서가 없으면 → **오늘 만들어라**(이대로 두면 본판에 영영 안 들어간다)."
      echo "     ③ 이미 본판에 알맹이가 들어간 잔재면 → \`docs/\` 까지 전수 대조 후 브랜치 삭제."
      echo "     · 🛑 위에 «본판에 올리지 마라»가 붙은 가지는 **②·③ 둘 다 예외다** — 그대로 둬라(사유는 \`${KI}\`)."
      echo "     · ⚠️ **남의 차선(다른 세션이 지금 쓰는 브랜치)은 손대지 말고 이유와 함께 남겨라.**"
    fi
fi

echo "- ▶ 이어가기 전 **${CTX} 최상단 핸드오프** 전체를 읽어라. 남은 버그·개선점은 docs/KNOWN_ISSUES.md."

# ── 기억에만 적어둔 할 일 띄우기 (2026-07-31 신설) ─────────────────
# 왜: 2026-07-23 PO 결정 4건이 어시 기억파일에만 있어 8일 묻혔다. 기억파일은 정리 세션의
#     모집단(작업본·신청서)에도, 할 일 목록에도 없는 «아무도 안 보는 자리»다.
node scripts/check-parked-decisions.mjs || true   # ⚠️ 2>/dev/null 을 다시 붙이지 마라 — 탐지기가 깨져도 아무도 모르게 된다(2026-08-28 실사고: 이 자리에서 branch-handoffs 가 13일간 죽어 있었다)
# 작업본 «안»에만 있는 인수인계 — 「신청서 없음 = 방치」 오판 방지(2026-08-15 실제 오판으로 신설)
node scripts/check-branch-handoffs.mjs || true   # ⚠️ 2>/dev/null 을 다시 붙이지 마라 — 탐지기가 깨져도 아무도 모르게 된다(2026-08-28 실사고: 이 자리에서 branch-handoffs 가 13일간 죽어 있었다)

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
    echo "## 🎯 PO 취향·선호 — 분류 대기실 (누적 학습 — 고정 규칙 외, 어기지 마라)"
    echo "$active"
    echo "_(세션 중 새 취향이 드러나면 /handoff가 ${PREFS}에 **분류 태그와 함께** 누적한다._"
    echo "_ 태그 = [CI]기계가 잡음 / [문서]상황별 / [말투] / [규칙]매번 / [기록]사건. 여긴 창고가 아니라 대기실이다 — 태그가 가리키는 자리로 옮기고 빼라. 검사: \`npm run check:rules\`)_"
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

# ── 2주 규칙 다이어트 리마인드 (2026-07-28 PO 결정 — 알림만, 정리는 PO 승인 후) ──
# 왜: 2026-07-15 에 84개로 줄였는데 13일 만에 182개로 돌아왔다(하루 7~8개). "짧게 유지"를
#     문서에 적어두는 것만으로는 안 지켜진다 → 시간이 되면 사람 눈앞에 뜨게 한다.
#     ⚠️ 자동으로 지우지 않는다. PO 승인 없이 정리 착수 금지.
PREFS="docs/PO_PREFERENCES.md"
if [ -f "$PREFS" ]; then
  last_diet=$(grep -m1 -oE 'LAST_DIET: [0-9]{4}-[0-9]{2}-[0-9]{2}' "$PREFS" 2>/dev/null | awk '{print $2}')
  if [ -n "$last_diet" ]; then
    now_s=$(date +%s 2>/dev/null); ld_s=$(date -d "$last_diet" +%s 2>/dev/null || echo "")
    if [ -n "$ld_s" ] && [ -n "$now_s" ]; then
      d_days=$(( (now_s - ld_s) / 86400 ))
      if [ "$d_days" -ge 14 ] 2>/dev/null; then
        # 2026-07-28: 항목 형식이 「- `[태그]` **…**」로 바뀌어 옛 정규식(^- \*\*)이 0을 세던 것을 수정
        n_items=$(awk '/ACTIVE:START/{f=1;next} /ACTIVE:END/{f=0} f&&/^- /{c++} END{print c+0}' "$PREFS")
        echo ""
        echo "## 📏 규칙 다이어트 기한 경과 — 마지막 정리 ${last_diet} (${d_days}일 전) · 지금 활성 ${n_items}개"
        echo "  → PO 에게 **알리기만** 하라: 「활성 규칙이 ${n_items}개다, 정리할까?」 (버튼)."
        echo "  → **PO 승인 전에는 손대지 마라.** 승인되면: 유지(별 2개 이상은 전부 유지)/CLAUDE.md 승격/보관 3갈래, 삭제 0건,"
        echo "     끝나고 ${PREFS} 의 LAST_DIET 날짜를 오늘로 갱신해야 이 알림이 꺼진다."
      fi
    fi
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
