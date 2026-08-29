// 발표자료용 어드민 화면 캡처 (테스트 계정 로그인).
// 사용: node scripts/ppt/capture_admin.mjs  [기본 https://healwith.co.kr]
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'https://healwith.co.kr';
const EMAIL = process.env.ADMIN_TEST_EMAIL || 'admin@test.com';
const PW = process.env.ADMIN_TEST_PW || 'Healwith2026!';
const OUT = path.join(process.cwd(), 'docs', 'presentations', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();

await p.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 45000 });
await p.waitForTimeout(1500);
const email = p.locator('input[type="email"], input[name="email"]').first();
const pw = p.locator('input[type="password"]').first();
await email.fill(EMAIL);
await pw.fill(PW);
await pw.press('Enter');
await p.waitForTimeout(6000);
console.log('after login:', p.url());

async function dismissCookies(page) {
  for (const label of ['Essential Only', '필수만 허용', 'Только необходимые']) {
    const btn = page.getByRole('button', { name: label });
    if (await btn.count()) {
      await btn.first().click().catch(() => {});
      await page.waitForTimeout(600);
      return;
    }
  }
}

const targets = [
  ['admin_kpi', '/admin/khidi/kpi-dashboard'],
  ['admin_conversion', '/admin/khidi/conversion'],
  ['admin_ai_quality', '/admin/khidi/ai-regression'],
  ['admin_home', '/admin'],
];
for (const [name, route] of targets) {
  try {
    await p.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(7000);
    await dismissCookies(p);
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log(name, p.url());
  } catch (e) {
    console.log(name, 'ERR', e.message.split('\n')[0]);
  }
}
await b.close();
