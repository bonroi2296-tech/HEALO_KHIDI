#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" 스크립트 — 안 볼 배포는 짓지 않는다.
#
#   규칙 0. 자동저장(백업) 커밋            → 스킵
#   규칙 1. [프로덕션] production 브랜치(3시 창구)·[deploy] 커밋이 아니면 → 스킵
#   규칙 2. [프리뷰] 커밋 제목에 [preview] 없음 → 스킵
#   규칙 3. 문서/비앱 파일만 변경          → 스킵
#
# Vercel 규칙: 이 명령이  exit 0 → 배포 "스킵"(취소) / exit 1 → 배포 "진행"
#
# ✅ vercel.json 의 "ignoreCommand" 로 자동 연결됨 — main 에 머지되면 대시보드 설정 불필요.
#
# 왜 이렇게까지 하냐 (2026-07-28 실측):
#   Pro 전환 후 첫 청구 주기에서 $15.06 중 $14.13(94%)이 «빌드 CPU 시간»이었다.
#   5.5일간 배포 537건. 무료 플랜일 땐 같은 행동이 「하루 100건 한도 초과」로 나타났고
#   (2026-06-22 배포 막힘) Pro 로 오면서 같은 병이 「돈」으로 옷을 갈아입었을 뿐이다.
#   빌드 1건 ≈ $0.044 → 크레딧 $20 = 월 약 460건치. 그 안에서 살아야 한다.
#
# ⚠️ 이 스크립트의 대원칙: **모르면 짓는다.**
#    잘못 지어서 돈 몇 센트 쓰는 것보다, 잘못 스킵해서 실서비스가 안 나가는 게 훨씬 큰 사고다.
#    그래서 모든 판정은 «확실히 스킵해도 되는 경우»에만 exit 0 하고, 애매하면 exit 1 한다.

commit_subject="$(git log -1 --pretty=%s 2>/dev/null)"

# ── 규칙 0. 자동저장(백업) 커밋이면 스킵 ────────────────────────────────────
# Stop 훅(auto-commit-push.sh)이 작업 중간중간 "chore: 작업 자동 저장 (날짜)"로 백업한다.
# 아직 작업 중인 미완성 스냅샷이라 아무도 안 본다. 백업 자체는 그대로 — 배포만 건너뛴다.
case "$commit_subject" in
  "chore: 작업 자동 저장"*)
    echo "🛑 자동저장(백업) 커밋 — 배포 스킵. 백업은 그대로 보존됨."
    exit 0
    ;;
esac

# ── 규칙 1. [프로덕션] 「배포 창구」 커밋일 때만 짓는다 ──────────────────────
# 왜 (2026-07-28 PO 정정): 묶어야 할 건 **머지가 아니라 배포**다.
#   앞선 규칙은 「PR 을 3시까지 붙잡아 뒀다 몰아서 머지」였는데, 그건 PR 이 최대 24시간
#   서랍에 갇힌다는 뜻이라 PO 가 원한 게 아니었다. 머지는 언제든 자유롭게 하고,
#   실서비스 반영(배포)만 하루 한 번으로 접는다.
#
#   그래서: main 에 머지돼도 프로덕션 빌드를 짓지 않는다. 오후 3시 창구
#   (.github/workflows/daily-deploy.yml)가 main 을 **production 브랜치**로 밀고,
#   그 한 건만 빌드한다. 그 한 건이 그날 머지된 것 **전부**를 포함한다.
#
#   ⚠️ 왜 「main 위에 [deploy] 빈 커밋」이 아니라 별도 브랜치냐 (2026-07-28 실측):
#      main 은 보호 브랜치라 「검사 통과한 커밋만」 받는다. 그런데 깃허브는 GITHUB_TOKEN 이
#      만든 커밋에 검사를 안 돌려준다(무한루프 방지) → 로봇은 그 조건을 영원히 못 채운다.
#      실제로 GH006 로 거부당했다. main 자물쇠를 푸는 대신 옆문(production)을 냈다.
#
#   급한 것(장애·보안·PO 가 지금 보자고 한 것)은 커밋 제목에 [deploy] 를 달면 즉시 나간다:
#     git commit --allow-empty -m "chore: 긴급 배포 [deploy]" && git push
#   또는 Actions 탭에서 "Daily Deploy" 를 Run workflow.
#
# ⚠️ 프로덕션에는 규칙 3(문서-only 스킵)을 적용하지 않는다 — 그날 마지막 머지가 문서뿐이면
#    「변경 없음」으로 스킵돼서 그날 배포가 통째로 사라진다.
if [ "$VERCEL_ENV" = "production" ]; then
  # 창구(app/api/cron/daily-deploy)가 직접 만든 배포. 이 표식은 그 경로에서만 붙는다
  # (배포를 만들 때 build.env 로 실어 보낸다) — 사람이 미는 커밋에는 붙을 수 없다.
  # 왜 필요: 창구를 Vercel 예약으로 옮기면서 «main 을 곧장 프로덕션으로» 짓게 됐다.
  #   그 배포의 가지 이름은 main 이라 아래 production 검사에 안 걸린다(2026-07-31).
  if [ "${DEPLOY_WINDOW:-}" = "1" ]; then
    echo "▶ 배포 창구(예약)가 연 배포 — 프로덕션 배포 진행"
    exit 1
  fi
  # 예비 창구(.github/workflows/daily-deploy.yml)가 미는 배포 전용 브랜치.
  if [ "${VERCEL_GIT_COMMIT_REF:-}" = "production" ]; then
    echo "▶ production 브랜치(3시 창구) — 프로덕션 배포 진행"
    exit 1
  fi
  case "$commit_subject" in
    *"[deploy]"*)
      echo "▶ [deploy] 커밋 — 프로덕션 배포 진행"
      exit 1
      ;;
  esac
  echo "🛑 창구 밖 머지 — 프로덕션 빌드 스킵. 배포는 오후 3시 창구가 한 번에 한다."
  echo "   급하면 커밋 제목에 [deploy] 를 달거나 Actions 에서 Daily Deploy 를 돌려라."
  exit 0
fi

# ── 규칙 2. [프리뷰] 달라고 했을 때만 짓는다 ────────────────────────────────
# 왜: 빌드 시간의 67%가 프리뷰였는데, 그 프리뷰는 대부분 아무도 안 본다
#     (PO 검토는 「큰 UI/플로우」 PR 때만). 병렬 세션들이 매 턴 커밋·푸시하는 게 그대로 빌드였다.
#     프리뷰가 필요하면 커밋 제목에 [preview] 를 달아 올리면 된다(빈 커밋도 됨).
#     사용법 예시는 CLAUDE.md 「빌드 & 배포」 + docs/rules/DEPLOY.md 에.
#
# VERCEL_ENV 가 비어 있으면(값 확인 불가) 이 블록을 건너뛴다 — 「모르면 짓는다」.
#
# 하루 상한 (2026-07-31 PO 지시 «프리뷰 배포도 아껴» → 같은 날 «프리뷰 만들 필요가 있나»):
# [preview] 를 달아도 같은 작업본에서 하루 PREVIEW_DAILY_LIMIT 건까지만 짓는다.
#   실측 근거: 창구 도입으로 프로덕션은 하루 1건으로 잡혔는데, 최근 3일 실제 빌드 50건 중
#   프리뷰가 27건(하루 9건)이었다. 한 세션이 화면을 손보며 [preview] 커밋을 5번 연달아
#   올리는 식 — 그중 PO 가 실제로 여는 건 마지막 한두 개다.
#
#   ⭐ 상한이 1인 이유: **화면 확인은 프리뷰가 아니라 로컬 + 화면 사진이 기본이다.**
#   「로그인해야 보이는 화면(코디·관리자)은 로컬에서 못 본다」가 프리뷰의 마지막 명분이었는데
#   2026-07-31 실측으로 깨졌다 — 로컬 dev 서버에 브라우저로 로그인해서 코디 대시보드까지
#   그대로 열고 사진을 찍었다. 프리뷰가 정말 필요한 건 둘뿐이다:
#     ① PO 가 «자기 폰으로 직접» 만져봐야 할 때  ② 외부(병원·에이전시)에 링크로 보여줄 때
#   내가 눈으로 확인하는 용도라면 프리뷰를 짓지 말고 로컬에서 찍어 대화에 붙여라.
PREVIEW_DAILY_LIMIT="${PREVIEW_DAILY_LIMIT:-1}"

if [ "$VERCEL_ENV" = "preview" ]; then
  case "$commit_subject" in
    *"[preview]"*)
      # 오늘 이 작업본에서 이미 지은 [preview] 커밋 수(이번 것 제외).
      # ⚠️ 얕게 받기(shallow clone)면 git log 가 짧아 적게 세진다 → 상한에 안 걸리고 짓는다.
      #    프리뷰는 실서비스가 아니라 「덜 아끼는 쪽」으로 틀리는 게 안전하다.
      # ponytail: 날짜 경계는 빌드머신 시간대(UTC) 기준 — 한국 오전 9시에 하루가 갈린다.
      #    상한이 느슨해지는 방향이라 그대로 둔다. 정확한 24시간 창이 필요해지면 --since=24.hours.
      today="$(git log -1 --date=format:%Y-%m-%d --pretty=%cd 2>/dev/null)"
      earlier=0
      if [ -n "$today" ]; then
        earlier="$(git log HEAD~1 --since="$today 00:00:00" --pretty=%s 2>/dev/null \
                    | grep -c '\[preview\]' || true)"
      fi
      if [ "${earlier:-0}" -ge "$PREVIEW_DAILY_LIMIT" ]; then
        echo "🛑 오늘 이 작업본의 프리뷰 $PREVIEW_DAILY_LIMIT 건을 이미 다 썼다 (앞서 $earlier 건) — 빌드 스킵."
        echo "   마지막으로 지은 프리뷰 주소는 그대로 살아 있다. 정말 새로 봐야 하면"
        echo "   Vercel 대시보드에서 Redeploy 하거나 PREVIEW_DAILY_LIMIT 을 올려라."
        exit 0
      fi
      echo "▶ [preview] 요청 커밋 — 프리뷰 빌드 진행 (오늘 $((earlier + 1))/$PREVIEW_DAILY_LIMIT)"
      ;;
    *)
      echo "🛑 프리뷰 자동빌드 스킵. 프리뷰가 필요하면 커밋 제목에 [preview] 를 달아라."
      exit 0
      ;;
  esac
fi

# ── 규칙 3. 문서/비앱 파일만 바뀌었으면 스킵 ────────────────────────────────
# 직전 커밋과 비교 불가(첫 커밋·shallow clone)면 안전하게 배포 진행.
if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  echo "▶ HEAD^ 없음 — 안전하게 배포 진행"
  exit 1
fi

# 변경이 '제외 경로(문서 등)'에만 있으면 git diff --quiet 가 0 → 스킵.
# 앱 코드(.ts/.tsx/.js/.jsx/설정 등)에 변경이 있으면 1 → 배포 진행.
# 주의: 앱이 .md 파일을 직접 콘텐츠로 쓰게 되면(MDX 등) 아래 제외 목록을 조정할 것.
if git diff --quiet HEAD^ HEAD -- \
  ':(exclude)*.md' \
  ':(exclude)docs/' \
  ':(exclude).claude/'
then
  echo "🛑 문서/비앱 파일만 변경 — 배포 스킵"
  exit 0
else
  echo "▶ 앱 코드 변경 있음 — 배포 진행"
  exit 1
fi
