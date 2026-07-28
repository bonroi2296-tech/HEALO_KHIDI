#!/usr/bin/env bash
#
# vercel-ignore-build.sh 자체 검사 — 진짜 git 저장소를 만들어 실제 스크립트를 돌린다.
#
# 왜 있냐: 이 스크립트가 잘못 판정하면 **실서비스 배포가 조용히 안 나간다**(가장 비싼 사고).
#          특히 「최신 아니면 스킵」 규칙과 「문서만이면 스킵」 규칙을 같이 걸면
#          코드커밋이 영원히 배포 안 되는 구멍이 생긴다 — 그 구멍을 여기서 붙잡는다.
#
# 실행:  bash scripts/test-vercel-ignore-build.sh
# 규약:  exit 0 = 배포 스킵 / exit 1 = 배포 진행

set -u
SCRIPT="$(cd "$(dirname "$0")" && pwd)/vercel-ignore-build.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

q() { "$@" >/dev/null 2>&1; }

# origin(원격 역할) + local(빌드가 도는 곳) 두 저장소를 만든다.
q git init -b main "$TMP/origin"
q git -C "$TMP/origin" config user.email t@t.t
q git -C "$TMP/origin" config user.name t
echo "console.log(1)" > "$TMP/origin/app.js"
q git -C "$TMP/origin" add -A
q git -C "$TMP/origin" commit -m "feat: 최초 커밋"

q git clone "$TMP/origin" "$TMP/local"
q git -C "$TMP/local" config user.email t@t.t
q git -C "$TMP/local" config user.name t

run() { # run <VERCEL_ENV> <SHA>  → exit code 출력
  ( cd "$TMP/local" && VERCEL_ENV="$1" VERCEL_GIT_COMMIT_SHA="$2" bash "$SCRIPT" >/dev/null 2>&1; echo $? )
}
commit_local() { # commit_local <파일> <제목>
  echo "x$RANDOM" > "$TMP/local/$1"
  q git -C "$TMP/local" add -A
  q git -C "$TMP/local" commit -m "$2"
}
head_local() { git -C "$TMP/local" rev-parse HEAD; }

fail=0
chk() { # chk <이름> <실제> <기대>
  if [ "$2" = "$3" ]; then
    printf '  ✅ %s\n' "$1"
  else
    printf '  ❌ %s — exit=%s (기대 %s)\n' "$1" "$2" "$3"; fail=1
  fi
}

echo "── 규칙 0: 자동저장 커밋"
commit_local app.js "chore: 작업 자동 저장 (2026-07-28 11:00)"
chk "자동저장 = 스킵" "$(run preview "$(head_local)")" 0

echo "── 규칙 2·3: 프리뷰"
commit_local app.js "feat: 코드 고침"
chk "프리뷰 + [preview] 없음 = 스킵" "$(run preview "$(head_local)")" 0
commit_local app.js "feat: 코드 고침 [preview]"
chk "프리뷰 + [preview] + 코드변경 = 빌드" "$(run preview "$(head_local)")" 1
commit_local README.md "docs: 문서만 [preview]"
chk "프리뷰 + [preview] + 문서만 = 스킵" "$(run preview "$(head_local)")" 0

echo "── 규칙 1: 프로덕션 (배포 창구 = [deploy] 커밋만)"
# 2026-07-28 정정: 머지는 자유, 배포만 하루 한 번. main 머지만으로는 프로덕션을 짓지 않는다.
commit_local app.js "feat: 평범하게 머지된 PR"
chk "프로덕션 + 평범한 머지 = 스킵" "$(run production "$(head_local)")" 0

commit_local app.js "chore: 오늘치 배포 창구 2026-07-28 15:00 [deploy]"
chk "프로덕션 + [deploy] = 빌드" "$(run production "$(head_local)")" 1

# 구멍 검사: 창구 커밋은 «빈 커밋»이다. 규칙 3(문서/비앱만 = 스킵)에 걸려버리면
# 그날 배포가 통째로 사라진다 → 프로덕션은 [deploy] 만 보고 즉시 exit 1 해야 한다.
commit_local README.md "chore: 배포 창구인데 코드 변경이 없다 [deploy]"
chk "프로덕션 + [deploy] + 코드변경 없음 = 빌드(구멍 방지)" "$(run production "$(head_local)")" 1

echo "── 안전장치: 모르면 짓는다"
commit_local app.js "feat: env 를 모르는 상황"
chk "VERCEL_ENV 비어 있음 = 빌드" "$(run '' "$(head_local)")" 1

echo
if [ $fail -eq 0 ]; then echo "전부 통과"; else echo "실패 있음"; fi
exit $fail
