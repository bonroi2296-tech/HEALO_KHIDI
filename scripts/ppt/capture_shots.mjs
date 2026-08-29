// 발표자료에 넣을 실화면 캡처 (공개 페이지). 사용: node scripts/ppt/capture_shots.mjs
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), 'docs', 'presentations', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  ['home_ru', 'https://healwith.co.kr/ru', 940],
  ['home_ko', 'https://healwith.co.kr/ko', 940],
  ['telemedicine_ru', 'https://healwith.co.kr/ru/telemedicine', 940],
  ['hospitals_ru', 'https://healwith.co.kr/ru/hospitals', 940],
  ['treatments_ru', 'https://healwith.co.kr/ru/treatments', 940],
  ['journey_ru', 'https://healwith.co.kr/ru/journey', 940],
  ['inquiry_ru', 'https://healwith.co.kr/ru/inquiry', 1100],
  ['insurance_ru', 'https://healwith.co.kr/ru/insurance', 940],
  ['partners_ru', 'https://healwith.co.kr/ru/partners', 940],
];

// 쿠키 배너는 「필수만 허용」으로 닫고 찍는다(개인정보 최소 수집 + 화면 가림 제거)
async function dismissCookies(p) {
  for (const label of ['Только необходимые', '필수만 허용', 'Only necessary']) {
    const btn = p.getByRole('button', { name: label });
    if (await btn.count()) {
      await btn.first().click().catch(() => {});
      await p.waitForTimeout(600);
      return;
    }
  }
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
for (const [name, url, h] of pages) {
  try {
    await p.setViewportSize({ width: 1440, height: h });
    const r = await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForTimeout(2000);
    await dismissCookies(p);
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log(name, r?.status(), await p.title());
  } catch (e) {
    console.log(name, 'ERR', e.message.split('\n')[0]);
  }
}

// 메뉴 실링크 목록(경로 확인용)
await p.goto('https://healwith.co.kr/ru', { waitUntil: 'domcontentloaded' });
const links = await p.$$eval('header a[href]', (as) =>
  [...new Set(as.map((a) => a.getAttribute('href')))].slice(0, 20));
console.log('NAV', links.join(' '));

await b.close();
