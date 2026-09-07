#!/usr/bin/env bash
# 자동 저장 커밋 제목 접두어 — «단일 출처».
#
# 만드는 곳: .claude/hooks/auto-commit-push.sh (턴 끝마다 "chore: 작업 자동 저장 (시각)" 으로 백업 커밋)
# 보는 곳:   scripts/vercel-ignore-build.sh   (규칙 0 — 이 제목이면 창구 밖 빌드를 안 짓는다)
#            scripts/check-squash-title-trap.sh (신청서를 스쿼시하면 본판 제목이 이게 되는지 CI 에서 차단)
#
# 왜 한 파일로 뺐나 (2026-09-07): 세 곳이 같은 글자를 손으로 베껴 갖고 있었다. 훅의 문구를 한 글자만
# 바꿔도 검사 둘은 조용히 «안 잡는 상태»가 된다 — 초록불인데 실은 안 보는 것. 훅은 셸 환경이 제각각이라
# 이 파일을 «읽지 않고» 글자를 그대로 둔다. 대신 check:squash-title 의 자체 시험이 훅 파일 안의 문구와
# 여기 값이 같은지 대조한다 — 어긋나면 CI 가 빨간불을 낸다.
AUTOSAVE_TITLE_PREFIX='chore: 작업 자동 저장'
