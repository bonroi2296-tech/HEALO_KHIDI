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
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.AUDIT_BASE_URL || "https://healo-khidi.vercel.app";
const PATHS = (process.env.AUDIT_PATHS || "/en,/en/treatments,/en/hospitals,/en/telemedicine,/en/care-journey,/en/faq,/ru").split(",");

const browser = await chromium.launch({ args: ["--no-sandbox", "--ignore-certificate-errors"] });
// 일부 실행환경(프록시)에서 TLS 체인을 못 믿는 경우가 있어 인증서 오류 무시.
const context = await browser.newContext({ ignoreHTTPSErrors: true });
const summary = [];

for (const p of PATHS) {
  const page = await context.newPage();
  try {
    await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 60000 });
    const res = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const v of res.violations) byImpact[v.impact || "minor"] += v.nodes.length;
    const nodes = res.violations.reduce((a, v) => a + v.nodes.length, 0);
    summary.push({
      path: p,
      ruleViolations: res.violations.length,
      nodes,
      byImpact,
      rules: res.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, help: v.help })),
    });
    console.log(`${p}: ${res.violations.length} rules / ${nodes} nodes  [crit ${byImpact.critical} · ser ${byImpact.serious} · mod ${byImpact.moderate} · min ${byImpact.minor}]`);
  } catch (e) {
    console.log(`${p}: ERROR ${e.message}`);
    summary.push({ path: p, error: e.message });
  }
  await page.close();
}
await browser.close();

const tot = summary.reduce((a, s) => {
  if (s.byImpact) { a.critical += s.byImpact.critical; a.serious += s.byImpact.serious; a.moderate += s.byImpact.moderate; a.minor += s.byImpact.minor; }
  return a;
}, { critical: 0, serious: 0, moderate: 0, minor: 0 });

mkdirSync("docs/audit", { recursive: true });
writeFileSync("docs/audit/a11y-report.json", JSON.stringify({ base: BASE, ts: new Date().toISOString(), totalsByImpact: tot, pages: summary }, null, 2));
console.log(`\nTOTAL by impact — critical:${tot.critical} serious:${tot.serious} moderate:${tot.moderate} minor:${tot.minor}`);
