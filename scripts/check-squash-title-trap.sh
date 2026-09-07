#!/usr/bin/env bash
#
# 스쿼시 «제목 함정» 검사 — 이 신청서(PR)를 스쿼시로 합치면 본판 커밋 제목이 «자동 저장» 제목이 되는가.
#
# 왜 (2026-09-07 실사고 #1671): 깃허브는 커밋이 «1개뿐인» 신청서를 스쿼시할 때 신청서 제목이 아니라
#   그 커밋 제목을 본판 제목으로 쓴다(저장소 기본값 «Default message» 로 보임 — 설정 화면은 못 읽었고
#   결과가 그 동작과 일치했다). 자동 저장 훅 커밋 위에 설명 커밋 없이 신청서를 올려 자동머지를 걸었더니
#   본판 머리가 «chore: 작업 자동 저장 (2026-09-07 19:12) (#1671)» 이 됐다. 두 가지가 깨진다:
#   ① scripts/vercel-ignore-build.sh 규칙 0 이 그 제목을 «백업 커밋»으로 보고 빌드를 스킵한다 — 규칙 0 이
#      프로덕션 판정보다 앞에 있던 동안은 오후 3시 창구 배포까지 «조용히» 사라졌다(같은 날 규칙 순서 교정).
#   ② 이력만 봐선 무엇이 들어갔는지 못 읽는다.
#
# 무엇을 보나: «스쿼시 뒤 제목»을 깃허브 규칙대로 계산한다 —
#   커밋 1개 → 그 커밋 제목 / 커밋 2개 이상 → 신청서 제목.
#   그 제목이 자동 저장 접두어(scripts/lib/autosave-title.sh)로 시작하면 빨간불.
#   커밋 수를 못 세면 «통과»가 아니라 «실패»다(못 잼 ≠ 통과).
#
# 쓰는 법:
#   bash scripts/check-squash-title-trap.sh --selftest         # 진짜 잡는지 — 임시 저장소에서 10형 재현 + 단일 출처 드리프트
#   HEAD_SHA=… BASE_SHA=… N_COMMITS=… PR_TITLE=… bash scripts/check-squash-title-trap.sh   # CI 신청서 이벤트
#   (CI 는 npm run check:squash-title 로 부른다. 체크아웃 HEAD 는 깃허브가 만든 «합친 척» 커밋이라
#    HEAD_SHA 는 pull_request.head.sha 를 따로 받는다.)
#
# 규약: exit 0 = 통과 / 1 = 차단 또는 못 잼

set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTOSAVE_TITLE_PREFIX=""
# shellcheck source=lib/autosave-title.sh
. "$ROOT/scripts/lib/autosave-title.sh" 2>/dev/null || { echo "::error::scripts/lib/autosave-title.sh 를 못 읽는다 — 단일 출처가 없으면 판정을 못 한다."; exit 1; }
[ -n "$AUTOSAVE_TITLE_PREFIX" ] || { echo "::error::AUTOSAVE_TITLE_PREFIX 가 비었다."; exit 1; }

# judge <저장소> <HEAD_SHA> <BASE_SHA> <N_COMMITS> <PR_TITLE> → 0 통과 / 1 차단 / 2 못 잼
judge() {
  local dir="$1" head="$2" base="$3" n="$4" pr_title="$5" head_title effective which
  head_title="$(git -C "$dir" log -1 --format=%s "$head" 2>/dev/null)" || {
    echo "::error::신청서 머리 커밋($head)을 못 읽는다."; return 2; }
  [ -z "$n" ] && n="$(git -C "$dir" rev-list --count "$base".."$head" 2>/dev/null || true)"
  case "$n" in
    ''|*[!0-9]*) echo "::error::신청서 커밋 수를 못 셌다(N_COMMITS='$n'). 「못 잼」은 「통과」가 아니다."; return 2 ;;
  esac
  if [ "$n" -eq 1 ]; then
    effective="$head_title"; which="유일한 커밋의 제목"
  else
    [ -n "$pr_title" ] || { echo "::error::커밋이 $n 개인데 신청서 제목(PR_TITLE)이 비었다 — 스쿼시 제목을 정할 수 없다."; return 2; }
    effective="$pr_title"; which="신청서 제목(커밋 $n 개)"
  fi
  case "$effective" in
    "${AUTOSAVE_TITLE_PREFIX}"*)
      echo "::error::스쿼시하면 본판 제목이 «$effective» 가 된다($which). 그 제목은 창구 밖 빌드를 스킵시키고 이력도 못 읽게 한다."
      echo "고치는 법: 커밋 1개면 무엇을 바꿨는지 적은 커밋을 하나 더 올려라(PROJECT_CONTEXT 중간 저장 한 줄이면 된다). 커밋 2개 이상이면 신청서 제목을 고쳐라."
      return 1 ;;
  esac
  echo "✓ 스쿼시 제목 함정 0건 ($which: $effective)"
  return 0
}

selftest() {
  local tmp fail=0 base
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' RETURN
  q() { "$@" >/dev/null 2>&1; }
  q git init -q "$tmp/r"; q git -C "$tmp/r" config user.email t@t.t; q git -C "$tmp/r" config user.name t
  echo a > "$tmp/r/a"; q git -C "$tmp/r" add a; q git -C "$tmp/r" commit -m "base"; base="$(git -C "$tmp/r" rev-parse HEAD)"
  mk() { # mk <가지> <제목>… → 가지 머리 SHA
    q git -C "$tmp/r" checkout "$base"; q git -C "$tmp/r" checkout -b "$1"; shift
    for m in "$@"; do echo "$RANDOM" >> "$tmp/r/a"; q git -C "$tmp/r" commit -am "$m"; done
    git -C "$tmp/r" rev-parse HEAD
  }
  chk() { # chk <이름> <기대> <HEAD> <BASE> <N> <PR_TITLE>
    local name="$1" want="$2" got; shift 2
    judge "$tmp/r" "$@" >/dev/null 2>&1; got=$?
    if [ "$got" = "$want" ]; then printf '  ✅ %s\n' "$name"; else printf '  ❌ %s — 결과 %s (기대 %s)\n' "$name" "$got" "$want"; fail=1; fi
  }
  local AS="$AUTOSAVE_TITLE_PREFIX (2026-09-07 19:12)"
  local h1 h2 h3 h4 h5
  h1="$(mk s1 "$AS")"
  h2="$(mk s2 "$AS" "fix: 진짜 설명")"
  h3="$(mk s3 "feat: 하나짜리 설명 커밋")"
  h4="$(mk s4 "$AS" "$AUTOSAVE_TITLE_PREFIX (b)")"
  h5="$(mk s5 "feat: 먼저" "$AUTOSAVE_TITLE_PREFIX (c)")"
  echo "── 스쿼시 뒤 제목 판정 (0 통과 / 1 차단 / 2 못 잼)"
  chk "자동저장 1개 = 차단"                              1 "$h1" "$base" 1  "fix: 신청서 제목은 멀쩡"
  chk "자동저장 + 설명 커밋(2개) = 통과(신청서 제목 사용)"  0 "$h2" "$base" 2  "fix: 진짜 설명"
  chk "설명 커밋 1개 = 통과"                              0 "$h3" "$base" 1  "feat: 하나짜리"
  chk "자동저장 2개 + 멀쩡한 신청서 제목 = 통과"            0 "$h4" "$base" 2  "feat: 신청서 제목"
  chk "설명 뒤 자동저장(2개) = 통과"                       0 "$h5" "$base" 2  "feat: 먼저"
  chk "2개인데 신청서 제목이 자동저장(gh --fill) = 차단"     1 "$h2" "$base" 2  "$AS"
  chk "1개 설명 커밋 + 신청서 제목만 자동저장 = 통과(커밋 제목이 쓰임)" 0 "$h3" "$base" 1 "$AS"
  chk "커밋 수 비움 → rev-list 로 세서 차단"                1 "$h1" "$base" "" "fix: x"
  chk "커밋 수가 글자 = 못 잼(실패)"                        2 "$h1" "$base" "abc" "fix: x"
  chk "base 엉터리 + 커밋 수 비움 = 못 잼(실패)"             2 "$h1" "deadbeef" "" "fix: x"
  chk "2개인데 신청서 제목 비움 = 못 잼(실패)"               2 "$h2" "$base" 2 ""
  echo "── 단일 출처 드리프트 (훅·배포 스킵 스크립트가 같은 접두어를 보나)"
  if grep -qF "git commit -m \"${AUTOSAVE_TITLE_PREFIX} (" "$ROOT/.claude/hooks/auto-commit-push.sh"; then
    echo "  ✅ 훅(auto-commit-push.sh)의 커밋 제목이 단일 출처와 같다"
  else
    echo "  ❌ 훅(auto-commit-push.sh)의 커밋 제목이 scripts/lib/autosave-title.sh 와 다르다 — 검사 둘이 조용히 «안 잡는 상태»가 된다"; fail=1
  fi
  if grep -q 'lib/autosave-title\.sh' "$ROOT/scripts/vercel-ignore-build.sh"; then
    echo "  ✅ 배포 스킵 스크립트가 단일 출처를 읽는다"
  else
    echo "  ❌ scripts/vercel-ignore-build.sh 가 단일 출처를 안 읽는다"; fail=1
  fi
  echo
  if [ "$fail" -eq 0 ]; then echo "전부 통과"; else echo "실패 있음"; fi
  return "$fail"
}

if [ "${1:-}" = "--selftest" ]; then
  selftest; exit $?
fi

: "${HEAD_SHA:?HEAD_SHA 가 필요하다 (pull_request.head.sha)}"
judge "$ROOT" "$HEAD_SHA" "${BASE_SHA:-}" "${N_COMMITS:-}" "${PR_TITLE:-}"
rc=$?
[ "$rc" -eq 0 ] || exit 1
