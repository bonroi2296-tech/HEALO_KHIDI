#!/usr/bin/env node
/**
 * 성능·SEO·접근성·모범사례 실측 — Google Lighthouse.
 * 실서비스 공개 페이지 대상. 감리 증거용: docs/audit/lighthouse-report.json + 콘솔 표.
 *
 * 사용: AUDIT_BASE_URL=https://healo-khidi.vercel.app node scripts/audit/lighthouse-scan.mjs
 * CHROME_PATH 로 chromium 지정 가능(미지정 시 playwright 번들 chromium 자동 탐색).
 */
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const BASE = process.env.AUDIT_BASE_URL || "https://healo-khidi.vercel.app";
const PATHS = (process.env.AUDIT_PATHS || "/en,/en/treatments,/en/hospitals").split(",");

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    return execSync("ls -d /opt/pw-browsers/chromium-*/chrome-linux64/chrome 2>/dev/null | head -1", { encoding: "utf8" }).trim() || undefined;
  } catch { return undefined; }
}

const chrome = await chromeLauncher.launch({
  chromePath: findChrome(),
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--ignore-certificate-errors"],
});

const rows = [];
for (const p of PATHS) {
  try {
    const r = await lighthouse(BASE + p, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    const c = r.lhr.categories;
    const a = r.lhr.audits;
    const row = {
      path: p,
      performance: Math.round(c.performance.score * 100),
      accessibility: Math.round(c.accessibility.score * 100),
      bestPractices: Math.round(c["best-practices"].score * 100),
      seo: Math.round(c.seo.score * 100),
      lcp: a["largest-contentful-paint"]?.displayValue,
      tbt: a["total-blocking-time"]?.displayValue,
      cls: a["cumulative-layout-shift"]?.displayValue,
      totalByteWeightKB: a["total-byte-weight"]?.numericValue ? Math.round(a["total-byte-weight"].numericValue / 1024) : null,
    };
    rows.push(row);
    console.log(`${p}  perf:${row.performance} a11y:${row.accessibility} bp:${row.bestPractices} seo:${row.seo}  LCP:${row.lcp} TBT:${row.tbt} weight:${row.totalByteWeightKB}KB`);
  } catch (e) {
    console.log(`${p}: ERROR ${e.message}`);
    rows.push({ path: p, error: e.message });
  }
}
await chrome.kill();

mkdirSync("docs/audit", { recursive: true });
writeFileSync("docs/audit/lighthouse-report.json", JSON.stringify({ base: BASE, ts: new Date().toISOString(), rows }, null, 2));

const ok = rows.filter((r) => !r.error);
if (ok.length) {
  const avg = (k) => Math.round(ok.reduce((a, r) => a + r[k], 0) / ok.length);
  console.log(`\nAVG — perf:${avg("performance")} a11y:${avg("accessibility")} bestPractices:${avg("bestPractices")} seo:${avg("seo")}`);
}
