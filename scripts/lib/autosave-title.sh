#!/usr/bin/env bash
# 자동 저장 커밋 제목 접두어 — «단일 출처».
#
# 만드는 곳: .claude/hooks/auto-commit-push.sh (턴 끝마다 "chore: 작업 자동 저장 (시각)" 으로 백업 커밋)
#            — 훅은 셸 환경이 제각각이라 이 파일을 «읽지 않고» 글자를 그대로 둔다. 대신 아래 검사의
#            자체 시험이 훅 파일 안의 문구와 여기 값이 같은지 대조한다(어긋나면 CI 빨간불).
# 보는 곳:   scripts/check-squash-title-trap.sh  (신청서를 스쿼시하면 본판 제목이 이게 되는지 CI 에서 차단)
#            scripts/test-vercel-ignore-build.sh (배포 스킵 판정이 이 제목의 본판 머리에서도 창구 배포를 짓는지)
#
# 왜 한 파일로 뺐나 (2026-09-07 #1672): 같은 글자를 세 곳이 손으로 베껴 갖고 있었다. 훅 문구를 한 글자만
# 바꿔도 검사들은 조용히 «안 잡는 상태»가 된다 — 초록불인데 실은 안 보는 것.
AUTOSAVE_TITLE_PREFIX='chore: 작업 자동 저장'
