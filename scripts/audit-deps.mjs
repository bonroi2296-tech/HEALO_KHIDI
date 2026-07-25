#!/usr/bin/env node
/**
 * 의존성 취약점 게이트 (npm run audit:deps)
 *
 * 왜 `npm audit --audit-level=high` 를 그대로 안 쓰는가:
 *   2026-07-25 아침, 우리가 의존성을 한 줄도 안 건드렸는데 CI 가 통째로 빨개졌다.
 *   전날 밤 새 공고(brace-expansion DoS)가 등록됐고, **그 공고를 고칠 상위 버전이
 *   아직 안 나온** 상태였다(공고 대상 = 5.0.7 이하 전부 / 우리 체인이 물고 있는 1.x
 *   계열엔 패치판 없음). 즉 "우리가 할 수 있는 게 없는데 모든 PR 이 영구히 막히는" 상황.
 *   그렇다고 게이트를 끄면(--audit-level 을 올리거나 `|| true`) **고칠 수 있는 진짜
 *   취약점까지 같이 눈감게 된다** — 그래서 끄는 대신, "고칠 수단이 없는 공고만
 *   이유·만료일을 달아 한시적으로 통과"시키고 나머지는 그대로 막는다.
 *
 * 규칙:
 *   - high/critical 공고가 하나라도 예외 목록 밖이면 → 실패(머지 차단).
 *   - 예외는 반드시 만료일을 갖는다. **만료일이 지나면 그 자체로 실패** — 조용히
 *     영구 면제가 되는 걸 막는다(면제 목록을 무기한 남기면 존량이 쌓인다는 교훈,
 *     POSTMORTEMS #118).
 *   - 예외로 적어둔 공고가 audit 결과에서 사라지면(=상위 패치가 나와 해결) 경고를
 *     띄워 목록에서 지우라고 알린다.
 */

import { execFileSync } from "node:child_process";

/**
 * 한시 예외 목록.
 * 새로 추가할 땐 반드시: ①왜 지금 고칠 수 없는지(상위 패치 부재 등) ②우리 코드에서
 * 실제로 닿는 경로가 있는지 ③만료일. 만료일엔 재검토해서 지우거나 연장한다.
 */
const ALLOWLIST = [
  {
    id: "GHSA-mh99-v99m-4gvg",
    package: "brace-expansion",
    expires: "2026-08-25",
    reason:
      "상위 패치 부재: 공고 대상이 5.0.7 이하 전부이고, 우리 체인(exceljs→archiver→glob→minimatch@3, " +
      "eslint 계열)이 물고 있는 1.x·2.x 유지보수 라인엔 아직 패치판이 없다(2026-07-25 확인). " +
      "도달 경로: glob 패턴을 사용자 입력으로 받는 곳이 없다 — 패턴은 전부 우리가 코드에 " +
      "박아둔 값이라 크래프트된 패턴으로 DoS 를 유발할 통로가 없다. 만료일에 상위 패치 재확인.",
  },
];

const LEVELS = new Set(["high", "critical"]);

function runAudit() {
  try {
    // 취약점이 있으면 npm audit 은 종료코드 1 을 낸다 — 출력은 그대로 받아서 우리가 판정한다.
    return execFileSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    if (e.stdout) return e.stdout;
    throw e;
  }
}

let report;
try {
  report = JSON.parse(runAudit());
} catch (e) {
  console.error(`❌ 의존성 취약점 검사 실행 실패: ${e.message}`);
  process.exit(1);
}

// 실제 "공고"는 각 패키지의 via 안에 객체로 들어있다(문자열 via = 다른 패키지를 통해 전파된 것).
// 같은 공고가 사슬을 타고 여러 패키지에 중복 등장하므로 공고 단위로 접는다.
const advisories = new Map();
for (const [pkgName, entry] of Object.entries(report.vulnerabilities || {})) {
  for (const via of entry.via || []) {
    if (typeof via !== "object") continue;
    const id = String(via.url || "").split("/").pop() || via.source || via.name;
    if (!advisories.has(id)) {
      advisories.set(id, { id, severity: via.severity, title: via.title, package: via.name, seenOn: new Set() });
    }
    advisories.get(id).seenOn.add(pkgName);
  }
}

const today = new Date().toISOString().slice(0, 10);
const errors = [];
const notes = [];

// ① 만료된 예외는 그 자체로 실패 — 조용한 영구 면제 방지
for (const a of ALLOWLIST) {
  if (a.expires < today) {
    errors.push(
      `[예외만료] ${a.id} (${a.package}) 의 한시 예외가 ${a.expires} 에 만료됐다. ` +
        `상위 패치가 나왔는지 확인해 고치거나, 아직도 수단이 없으면 scripts/audit-deps.mjs 의 ` +
        `만료일을 근거와 함께 연장할 것. (그냥 늘리기 금지 — 왜 아직 못 고치는지 다시 적어라)`
    );
  }
}

const allowed = new Set(ALLOWLIST.filter((a) => a.expires >= today).map((a) => a.id));

// ② 예외 밖의 high/critical 은 전부 차단
for (const a of advisories.values()) {
  if (!LEVELS.has(a.severity)) continue;
  if (allowed.has(a.id)) {
    notes.push(`  · (한시 예외) ${a.severity} ${a.id} ${a.package} — ${a.title}`);
    continue;
  }
  errors.push(
    `[취약점] ${a.severity} ${a.id} — ${a.title}\n` +
      `      영향 패키지: ${[...a.seenOn].slice(0, 8).join(", ")}${a.seenOn.size > 8 ? ` …외 ${a.seenOn.size - 8}` : ""}\n` +
      `      → \`npm audit fix\` 로 고치거나, 상위 패치가 없어 고칠 수단이 없다면 ` +
      `scripts/audit-deps.mjs 의 ALLOWLIST 에 이유·만료일과 함께 등재할 것.`
  );
}

// ③ 이미 해결된 예외는 목록에서 지우라고 알림(실패는 아님 — 좋은 소식이라 CI 를 막진 않는다)
for (const a of ALLOWLIST) {
  if (!advisories.has(a.id)) {
    notes.push(`  · ✅ ${a.id} (${a.package}) 는 더 이상 audit 에 안 잡힌다 — ALLOWLIST 에서 지울 것.`);
  }
}

if (errors.length) {
  console.error(`\n❌ 의존성 취약점 검사 실패 (${errors.length}건)\n`);
  errors.forEach((e) => console.error("  " + e + "\n"));
  process.exit(1);
}

const m = report.metadata?.vulnerabilities || {};
console.log(
  `✓ 의존성 취약점 검사 통과 (예외 밖 high/critical 0 · 전체: high ${m.high || 0}·critical ${m.critical || 0}·moderate ${m.moderate || 0})`
);
if (notes.length) notes.forEach((n) => console.log(n));
