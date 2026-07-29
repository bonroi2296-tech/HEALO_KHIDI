import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://localhost:3200/demo/hospital?lang=ko', { waitUntil:'networkidle', timeout:90000 });
const el = p.locator('section:has-text("치료 밖의 시간")').first();
await el.scrollIntoViewIfNeeded();
await p.waitForTimeout(3000);
await el.screenshot({ path: '/tmp/videos-section.png' });
// ⚠️ 지난번 오측정 교훈: complete 가 false 인 lazy 이미지가 필터에서 빠져 «깨짐 0» 으로 보였다.
//    이번엔 decode() 로 실제 로드를 강제 확인한다.
const chk = await p.evaluate(async () => {
  const imgs=[...document.querySelectorAll('img')];
  let ok=0, bad=0;
  for (const i of imgs) {
    try { await i.decode(); ok++; } catch { bad++; }
  }
  return { 총이미지: imgs.length, 실제로드: ok, 로드실패: bad };
});
console.log(JSON.stringify(chk));
await b.close();
