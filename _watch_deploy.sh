#!/usr/bin/env bash
# 배포 창구(15:00)가 열려 실서비스 커밋이 바뀔 때까지 기다렸다가, 바뀌면 그 자리에서 실측한다.
OLD="478cfaff388082a887fcb1355acd5236d778dbd2"
for i in $(seq 1 90); do   # 최대 45분
  CUR=$(curl -s -m 20 https://healwith.co.kr/api/health | python -c 'import sys,json;print(json.load(sys.stdin)["commit"])' 2>/dev/null)
  if [ -n "$CUR" ] && [ "$CUR" != "$OLD" ]; then
    echo "배포됨: $CUR"
    echo "--- 실서비스 상한 실측 ---"
    # 서명 발급을 25회 연달아 때려 429 가 나는지 본다(옛 상한 20 이면 21번째부터 429).
    OK=0; LIM=0
    for n in $(seq 1 25); do
      C=$(curl -s -o /dev/null -w "%{http_code}" -m 20 -X POST https://healwith.co.kr/api/attachments/upload \
        -H "Content-Type: application/json" \
        -d "{\"phase\":\"sign\",\"name\":\"probe_$n.pdf\",\"type\":\"application/pdf\",\"size\":1024}")
      [ "$C" = "200" ] && OK=$((OK+1)); [ "$C" = "429" ] && LIM=$((LIM+1))
    done
    echo "서명 25회 연속 → 200 $OK건 / 429 $LIM건  (옛 상한이면 429 가 5건 이상 나온다)"
    exit 0
  fi
  sleep 30
done
echo "45분 안에 배포가 안 됐다 — 창구를 확인해야 한다"
