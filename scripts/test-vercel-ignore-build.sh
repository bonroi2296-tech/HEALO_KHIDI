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

echo "── 규칙 1: 프로덕션 (배치 머지)"
# local 을 origin 과 같은 상태로 맞춘 뒤, origin 에만 새 커밋을 얹어 「내가 구버전」 상황을 만든다.
q git -C "$TMP/local" fetch origin main
q git -C "$TMP/local" reset --hard FETCH_HEAD
chk "프로덕션 + 내가 최신 = 빌드" "$(run production "$(head_local)")" 1

echo "console.log(2)" > "$TMP/origin/app.js"
q git -C "$TMP/origin" add -A
q git -C "$TMP/origin" commit -m "feat: 나중에 머지된 PR"
chk "프로덕션 + 더 최신 커밋 있음 = 스킵" "$(run production "$(head_local)")" 0

# 구멍 검사: 「문서만 바뀐 커밋」이 배치의 마지막이어도 프로덕션은 반드시 지어야 한다.
# (안 그러면 앞의 코드커밋은 «최신 아님»으로, 이건 «문서뿐»으로 둘 다 스킵돼 코드가 안 나간다.)
q git -C "$TMP/local" fetch origin main
q git -C "$TMP/local" reset --hard FETCH_HEAD
commit_local README.md "docs: 문서만 고침"
q git -C "$TMP/origin" fetch "$TMP/local" main:main2
q git -C "$TMP/origin" reset --hard main2 2>/dev/null || q git -C "$TMP/origin" checkout -B main main2
chk "프로덕션 + 최신인데 문서만 = 빌드(구멍 방지)" "$(run production "$(head_local)")" 1

echo "── 안전장치: 모르면 짓는다"
commit_local app.js "feat: env 를 모르는 상황"
chk "VERCEL_ENV 비어 있음 = 빌드" "$(run '' "$(head_local)")" 1

echo
if [ $fail -eq 0 ]; then echo "전부 통과"; else echo "실패 있음"; fi
exit $fail
