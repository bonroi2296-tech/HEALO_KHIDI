#!/usr/bin/env bash
# 로그인 뒤 화면(백오피스·환자포털) 접근성 실측 — 역할별로 a11y-scan 을 한 번씩 돌린다.
# 로그인은 하지 않는다. e2e/auth.setup.ts 가 만들어 둔 e2e/.auth/<role>.json 쿠키만 재사용.
#
# 사용: AUDIT_BASE_URL=https://healwith.co.kr bash scripts/audit/a11y-authed.sh
#
# 한 역할이 실패해도 나머지는 계속 돌리고, 마지막에 실패가 하나라도 있으면 exit 1.
# (한 계정 문제로 나머지 측정을 통째로 잃지 않게 — 그러나 조용히 넘기지도 않게.)
set -uo pipefail

ROLES=(admin coordinator agency clinic patient)

paths_for() {
  case "$1" in
    admin)       echo "/admin,/admin/inquiries,/admin/consultations,/admin/staff,/admin/users,/admin/hospitals,/admin/khidi/conversion,/admin/khidi/kpi-dashboard" ;;
    coordinator) echo "/coordinator,/coordinator/cases,/coordinator/inbox,/coordinator/intakes,/coordinator/consultations,/coordinator/messages" ;;
    agency)      echo "/agency" ;;
    clinic)      echo "/clinic" ;;
    patient)     echo "/patient,/patient/consultations,/patient/documents,/patient/messages,/patient/symptoms,/patient/visa" ;;
  esac
}

failed=0
for role in "${ROLES[@]}"; do
  state="e2e/.auth/${role}.json"
  if [ ! -f "$state" ]; then
    # 계정 시크릿이 없는 역할은 auth.setup 이 건너뛴다 → 측정 안 된 사실을 남긴다(조용한 누락 금지).
    echo "⚠️  ${role}: 로그인 세션 없음(${state}) — 계정 시크릿 미설정으로 보임. 이 역할은 측정하지 못했습니다."
    failed=1
    continue
  fi
  echo ""
  echo "───────── ${role} ─────────"
  AUDIT_STORAGE_STATE="$state" \
  AUDIT_LABEL="$role" \
  AUDIT_OUT="docs/audit/a11y-${role}.json" \
  AUDIT_PATHS="$(paths_for "$role")" \
    node scripts/audit/a11y-scan.mjs || failed=1
done

echo ""
echo "═════════ 역할별 합계 ═════════"
node -e '
const fs=require("fs");
let t={critical:0,serious:0,moderate:0,minor:0},inc=0;
for(const f of fs.readdirSync("docs/audit").filter(f=>/^a11y-(admin|coordinator|agency|clinic|patient)\.json$/.test(f))){
  const r=JSON.parse(fs.readFileSync("docs/audit/"+f,"utf8"));
  for(const k in t) t[k]+=r.totalsByImpact[k]||0;
  inc+=r.incompleteTotal||0;
  const bad=(r.pages||[]).filter(p=>p.renderOk===false).length;
  console.log(`${(r.label||f).padEnd(12)} crit ${r.totalsByImpact.critical} · ser ${r.totalsByImpact.serious} · mod ${r.totalsByImpact.moderate} · min ${r.totalsByImpact.minor}  미판정 ${r.incompleteTotal||0}${bad?`  ⛔측정실패 ${bad}p`:""}`);
}
console.log(`\n합계 — critical:${t.critical} serious:${t.serious} moderate:${t.moderate} minor:${t.minor} / 미판정:${inc}`);
'

exit $failed
