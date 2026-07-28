#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" 스크립트 — 안 볼 배포는 짓지 않는다.
#   ① 자동저장 커밋  ② 문서/비앱 파일만 바뀐 커밋  ③ [preview] 안 붙은 프리뷰
# (원래는 Hobby 일일 배포 한도 100/일 절약용이었고, 2026-07-24 Pro 전환 후로는
#  «빌드 CPU 시간» 요금 절약이 목적이다 — 한도가 아니라 돈이 걸려 있다.)
#
# 왜: Vercel은 "푸시 1회 = 배포 1회"라, CLAUDE.md·docs/ 같은 문서만 고쳐도 배포가 돌아
#     한도를 까먹었다(2026-06-22 한도 초과 발생). 이 스크립트로 문서-only 커밋은 스킵.
#
# Vercel 규칙: 이 명령이
#   - exit 0  → 배포 "스킵"(취소)
#   - exit 1  → 배포 "진행"
#
# ✅ vercel.json 의 "ignoreCommand": "bash scripts/vercel-ignore-build.sh" 로 자동 연결됨
#    → main 에 머지되면 별도 대시보드 설정 없이 모든 배포에 적용된다(설정 불필요).
#
# 주의: 앱이 .md 파일을 직접 콘텐츠로 쓰게 되면(MDX 등) 아래 제외 목록을 조정할 것.

# 자동저장(백업) 커밋이면 배포 스킵.
# 왜: Stop 훅(auto-commit-push.sh)이 작업 중간중간 "chore: 작업 자동 저장 (날짜)"로
#     커밋·푸시해 백업한다. 이건 아직 작업 중인 미완성 스냅샷이라 아무도 프리뷰를 안 본다.
#     그런데 푸시마다 Vercel이 풀 배포를 돌려 무료 일일 한도(100/일)를 까먹었다
#     (2026-06-23: 최근 배포의 ~25%가 이 자동저장이었고, 병렬 세션과 겹쳐 한도 초과 발생).
#     → 자동저장 커밋은 배포만 건너뛴다. 백업(커밋·푸시)은 그대로 — 작업은 안전히 보존됨.
#     진짜 커밋·PR·main 머지는 정상 배포된다.
commit_subject="$(git log -1 --pretty=%s 2>/dev/null)"
case "$commit_subject" in
  "chore: 작업 자동 저장"*)
    echo "🛑 자동저장(백업) 커밋 — 배포 스킵(한도 절약). 백업은 그대로 보존됨."
    exit 0
    ;;
esac

# 프리뷰 빌드는 «달라고 했을 때만» 짓는다 (2026-07-28, PO 승인).
# 왜: Pro 전환 후 청구 실측 결과 이번 주기 $15.06 중 $14.13(94%)이 «빌드 CPU 시간»이었다.
#     5.5일간 배포 537건(프리뷰 386 + 프로덕션 152), 7/27 하루만 232건 — 병렬 세션들이
#     매 턴 커밋·푸시하는데 푸시 1회 = 풀빌드 1회라서다. 빌드 시간의 67%가 프리뷰였고,
#     그 프리뷰는 대부분 아무도 안 본다(PO 검토는 «큰 UI/플로우» PR 때만).
#     → 프리뷰는 기본 끄고, 볼 게 있을 때 커밋 제목에 [preview] 를 달아 켠다.
#     프로덕션(main)·CI 는 영향 없음. E2E/스모크는 localhost·프로덕션을 쓰므로 무관(확인함).
#
#     프리뷰가 필요하면 세션이 이렇게 한 줄 밀면 된다:
#       git commit --allow-empty -m "chore: 프리뷰 [preview]" && git push
#
# ⚠️ VERCEL_ENV 가 비어 있으면(값 확인 불가) 이 블록은 통째로 건너뛴다 —
#    «모르면 짓는다»가 안전한 방향이다(잘못 스킵해서 프로덕션이 안 나가는 게 최악).
if [ "$VERCEL_ENV" = "preview" ]; then
  case "$commit_subject" in
    *"[preview]"*)
      echo "▶ [preview] 요청 커밋 — 프리뷰 빌드 진행"
      ;;
    *)
      echo "🛑 프리뷰 자동빌드 스킵(빌드비 절약). 프리뷰가 필요하면 커밋 제목에 [preview] 를 달아라."
      exit 0
      ;;
  esac
fi

# 직전 커밋과 비교 불가(첫 커밋·shallow clone)면 안전하게 배포 진행.
if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  echo "▶ HEAD^ 없음 — 안전하게 배포 진행"
  exit 1
fi

# 앱과 무관한 경로를 제외하고 변경이 있는지 검사.
# 변경이 '제외 경로(문서 등)'에만 있으면 git diff --quiet 가 0 → 배포 스킵.
# 앱 코드(.ts/.tsx/.js/.jsx/설정 등)에 변경이 있으면 1 → 배포 진행.
if git diff --quiet HEAD^ HEAD -- \
  ':(exclude)*.md' \
  ':(exclude)docs/' \
  ':(exclude).claude/'
then
  echo "🛑 문서/비앱 파일만 변경 — 배포 스킵(한도 절약)"
  exit 0
else
  echo "▶ 앱 코드 변경 있음 — 배포 진행"
  exit 1
fi
