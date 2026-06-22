#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" 스크립트 — 앱과 무관한 파일(문서·마크다운·.claude 설정)만
# 바뀐 커밋은 배포를 건너뛴다. 무료 일일 배포 한도(100/일) 절약용.
#
# 왜: Vercel은 "푸시 1회 = 배포 1회"라, CLAUDE.md·docs/ 같은 문서만 고쳐도 배포가 돌아
#     한도를 까먹었다(2026-06-22 한도 초과 발생). 이 스크립트로 문서-only 커밋은 스킵.
#
# Vercel 규칙: 이 명령이
#   - exit 0  → 배포 "스킵"(취소)
#   - exit 1  → 배포 "진행"
#
# 설정 방법(PO, 1회):
#   Vercel 대시보드 → 프로젝트 healo-khidi → Settings → Git → "Ignored Build Step"
#   → "Custom" 선택 후 아래 한 줄 입력 → Save:
#       bash scripts/vercel-ignore-build.sh
#
# 주의: 앱이 .md 파일을 직접 콘텐츠로 쓰게 되면(MDX 등) 아래 제외 목록을 조정할 것.

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
