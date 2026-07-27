#!/usr/bin/env node
/**
 * 웹접근성(WCAG 2.1 A/AA = KWCAG 토대) 실측 — axe-core 자동검사.
 * 실서비스 공개 페이지를 Playwright(chromium)로 열어 위반을 집계.
 * 감리 증거용: docs/audit/a11y-report.json + 콘솔 요약.
 *
 * 사용: AUDIT_BASE_URL=https://healo-khidi.vercel.app node scripts/audit/a11y-scan.mjs
 */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";

const BASE = process.env.AUDIT_BASE_URL || "https://healo-khidi.vercel.app";
// 공개(무인증) 화면만 측정 가능 — 백오피스·환자포털은 로그인 뒤라 여기 안 잡힌다(스캔 범위 한계, 리포트에 명시).
// /en/inquiry·/ru/hospitals 는 전환 퍼널·주 타겟 언어라 2026-07-27 추가.
const PATHS = (
  process.env.AUDIT_PATHS ||
  "/en,/en/treatments,/en/hospitals,/en/telemedicine,/en/care-journey,/en/faq,/en/inquiry,/ru,/ru/hospitals,/ru/care-journey"
).split(",");

// 로그인 뒤 화면(백오피스·환자포털) 측정용 — E2E 가 이미 만들어 둔 storageState 쿠키를 그대로 재사용한다.
// 비밀번호는 이 스크립트가 다루지 않는다(로그인은 e2e/auth.setup.ts 가 CI 시크릿으로 수행).
const STATE = process.env.AUDIT_STORAGE_STATE || "";
const LABEL = process.env.AUDIT_LABEL || "public";
const OUT = process.env.AUDIT_OUT || "docs/audit/a11y-report.json";

const browser = await chromium.launch({ args: ["--no-sandbox", "--ignore-certificate-errors"] });
// 일부 실행환경(프록시)에서 TLS 체인을 못 믿는 경우가 있어 인증서 오류 무시.
const context = await browser.newContext({ ignoreHTTPSErrors: true });
if (STATE) {
  if (!existsSync(STATE)) {
    console.error(`⛔ storageState 파일이 없습니다: ${STATE} — 로그인 세션 없이 돌리면 로그인 화면만 재게 된다(거짓 합격).`);
    process.exit(1);
  }
  const { cookies } = JSON.parse(readFileSync(STATE, "utf8"));
  await context.addCookies(cookies || []);
  console.log(`[${LABEL}] 로그인 세션 주입: ${STATE} (쿠키 ${cookies?.length ?? 0}개)`);
}
const summary = [];

// 「빈 화면 통과」 차단 — 자동화 브라우저가 페이지를 하얗게 렌더하면 axe 는 위반 0 을 돌려주고
// 그게 "접근성 완벽"으로 기록된다(실제로 2026-06 리포트가 7개 페이지 전부 0/0 이었음).
// 그래서 스캔 전에 "이 페이지가 진짜 그려졌는가"를 먼저 단언한다. 못 넘으면 통과가 아니라 실패.
const MIN_TEXT = 200;   // 본문 글자수 하한
const MIN_NODES = 50;   // 렌더된 엘리먼트 수 하한
let sanityFailed = 0;

for (const p of PATHS) {
  const page = await context.newPage();
  try {
    const resp = await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 60000 });
    const status = resp?.status() ?? 0;
    const render = await page.evaluate(() => ({
      nodes: document.body ? document.body.querySelectorAll("*").length : 0,
      text: (document.body?.innerText || "").trim().length,
    }));
    const ok = status < 400 && render.nodes >= MIN_NODES && render.text >= MIN_TEXT;
    if (!ok) {
      // 여기서 axe 를 돌리면 "위반 0" 이라는 거짓 합격이 나온다 → 스캔하지 않고 실패로 기록.
      sanityFailed++;
      console.log(`${p}: ⛔ RENDER FAIL (status ${status} · nodes ${render.nodes} · text ${render.text}자) — 측정 불가, 통과 아님`);
      summary.push({ path: p, renderOk: false, status, ...render, error: "empty_or_error_render" });
      await page.close();
      continue;
    }

    // 「빈 화면 통과」와 같은 부류의 두 번째 구멍: 세션이 죽으면 로그인 화면으로 튕기는데
    // 그 화면은 멀쩡히 렌더되므로 위 검증을 통과해 버린다 → 로그인 페이지를 재고 "백오피스 0건"이라 보고하게 된다.
    // 그래서 로그인 뒤 화면을 잴 때는 「진짜 그 화면에 있는가」를 따로 단언한다.
    // 언어 접두사(/en, /ru …)와 끝 슬래시는 정상 이동이므로 벗겨내고 비교한다(괜한 오탐 방지).
    const norm = (s) => s.replace(/^\/(ko|en|ru|kz|zh|ja)(?=\/|$)/, "").replace(/\/$/, "") || "/";
    const landed = new URL(page.url()).pathname;
    if (STATE && (landed.includes("/login") || norm(landed) !== norm(p))) {
      sanityFailed++;
      console.log(`${p}: ⛔ AUTH FAIL — ${landed} 로 튕김(세션 만료·권한 없음). 측정 불가, 통과 아님`);
      summary.push({ path: p, renderOk: false, status, landedOn: landed, error: "redirected_not_authenticated" });
      await page.close();
      continue;
    }

    const res = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const v of res.violations) byImpact[v.impact || "minor"] += v.nodes.length;
    const nodes = res.violations.reduce((a, v) => a + v.nodes.length, 0);
    // axe 가 "위반"이라 단정 못 한 것들(사진·그라데이션 위 글씨 등 배경색을 계산할 수 없는 경우).
    // 위반 0 이어도 여기 숫자가 크면 "확인 안 된 것"이지 "괜찮은 것"이 아니다 → 따로 센다.
    const incomplete = res.incomplete.map((v) => ({
      id: v.id,
      count: v.nodes.length,
      samples: v.nodes.slice(0, 5).map((n) => ({ target: n.target.join(" "), html: (n.html || "").slice(0, 160) })),
    }));
    const incompleteNodes = incomplete.reduce((a, v) => a + v.count, 0);
    summary.push({
      path: p,
      renderOk: true,
      status,
      renderedNodes: render.nodes,
      renderedText: render.text,
      ruleViolations: res.violations.length,
      nodes,
      incompleteNodes,
      incomplete,
      byImpact,
      rules: res.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        count: v.nodes.length,
        help: v.help,
        // 어디를 고쳐야 하는지 — 대표 3건만(리포트 비대화 방지)
        samples: v.nodes.slice(0, 3).map((n) => ({ target: n.target.join(" "), summary: n.failureSummary })),
      })),
    });
    console.log(`${p}: ${res.violations.length} rules / ${nodes} nodes  [crit ${byImpact.critical} · ser ${byImpact.serious} · mod ${byImpact.moderate} · min ${byImpact.minor}]  미판정 ${incompleteNodes}  (렌더 ${render.nodes}노드·${render.text}자)`);
  } catch (e) {
    sanityFailed++;
    console.log(`${p}: ERROR ${e.message}`);
    summary.push({ path: p, renderOk: false, error: e.message });
  }
  await page.close();
}
await browser.close();

const tot = summary.reduce((a, s) => {
  if (s.byImpact) { a.critical += s.byImpact.critical; a.serious += s.byImpact.serious; a.moderate += s.byImpact.moderate; a.minor += s.byImpact.minor; }
  return a;
}, { critical: 0, serious: 0, moderate: 0, minor: 0 });

// 룰별 합계 — "무엇을 고치면 제일 많이 줄어드나"가 한눈에 보이게.
const byRule = {};
for (const s of summary) {
  for (const r of s.rules || []) {
    byRule[r.id] ??= { id: r.id, impact: r.impact, nodes: 0, pages: 0 };
    byRule[r.id].nodes += r.count;
    byRule[r.id].pages++;
  }
}
const rank = Object.values(byRule).sort((a, b) => b.nodes - a.nodes);

const incByRule = {};
for (const s of summary) {
  for (const r of s.incomplete || []) incByRule[r.id] = (incByRule[r.id] || 0) + r.count;
}
const incRank = Object.entries(incByRule).sort((a, b) => b[1] - a[1]);
const incTotal = incRank.reduce((a, [, n]) => a + n, 0);

mkdirSync("docs/audit", { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      base: BASE,
      label: LABEL,
      ts: new Date().toISOString(),
      scope: STATE ? `로그인 뒤 화면 (${LABEL} 계정)` : "공개(무인증) 페이지",
      sanityFailed,
      totalsByImpact: tot,
      incompleteTotal: incTotal,
      byRule: rank,
      incompleteByRule: Object.fromEntries(incRank),
      pages: summary,
    },
    null,
    2,
  ),
);
console.log(`\nTOTAL by impact — critical:${tot.critical} serious:${tot.serious} moderate:${tot.moderate} minor:${tot.minor}`);
if (rank.length) {
  console.log("\n룰별 순위 (고칠 순서):");
  for (const r of rank) console.log(`  ${String(r.nodes).padStart(4)} nodes · ${r.pages}p · [${r.impact}] ${r.id}`);
}
if (incRank.length) {
  console.log(`\n미판정(axe가 배경색을 계산 못 해 «확인 안 됨»으로 남긴 것) 총 ${incTotal}:`);
  for (const [id, n] of incRank) console.log(`  ${String(n).padStart(4)} nodes · ${id}`);
}
if (sanityFailed) {
  // 스캐너 정합성 문제(측정 자체가 안 된 것) = 실패. 위반 건수는 리포트로 남기되 잡을 죽이지 않는다.
  console.error(`\n⛔ ${sanityFailed}개 페이지가 렌더 검증을 통과하지 못했습니다 — 이 리포트의 "0건"은 통과가 아닙니다.`);
  process.exit(1);
}
