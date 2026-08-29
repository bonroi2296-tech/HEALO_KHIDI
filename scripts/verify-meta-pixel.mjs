/**
 * 메타 픽셀이 «진짜로» 도는지 재는 스크립트 (수동 실행).
 *
 * 왜 단위 테스트로 안 되나 (2026-08-28 실측으로 배운 것):
 *   src/lib/ga.test.ts 의 검사 20개는 전부 통과하는데도 실제 브라우저에서는 픽셀이
 *   **한 건도 안 나가고 있었다.** 단위 테스트가 못 보는 층이 둘 있었기 때문이다.
 *     ① CSP — script-src·connect-src·frame-src·form-action **네 군데** 전부 열려야 돈다.
 *     ② <Script onReady> — 인라인 스크립트에서는 안 불린다(useEffect 로 바꿔서 해결).
 *   둘 다 «화면 멀쩡 + 콘솔 조용 + 발화 0» 이라 사람 눈으로는 영원히 못 찾는다.
 *
 * 쓰는 법:
 *   1) 프로덕션 빌드로 서버를 띄운다 (`npx next build --webpack && npx next start -p 3300`)
 *      ⚠️ 개발 서버로는 못 잰다 — 픽셀은 프로덕션에서만 로드된다.
 *   2) `node scripts/verify-meta-pixel.mjs`
 *
 * 판정 기준을 «둘»로 나눈 이유:
 *   ①fbq 를 부르는가(우리 책임) ②메타로 요청이 나가는가(픽셀 라이브러리·브라우저 설정 몫).
 *   ①만 보면 CSP 차단을 놓치고, ②만 보면 doNotTrack 같은 브라우저 설정에 속는다.
 *   실제로 자동화 브라우저는 DNT 가 기본 1 이라 픽셀이 스스로 전송을 멈춘다 — 그래서 끄고 잰다.
 *
 * ⚠️ 시험 주소는 «실제로 200 이 뜨는 것»만 써라. 없는 주소는 홈으로 튕겨서
 *    「막혔어야 할 곳에서 발화」라는 **가짜 실패**를 만든다(이 스크립트를 짜다 실제로 한 번 속았다).
 */
import { chromium } from 'playwright';

// 판정 기준을 «둘»로 나눈다.
//  ① 우리 코드가 fbq 를 부르는가 (여기까지가 우리 책임)
//  ② 픽셀이 실제로 메타에 요청을 보내는가 (픽셀 라이브러리 + 브라우저 설정 몫)
// ①만 보면 CSP 차단을 놓치고, ②만 보면 DNT 같은 브라우저 설정에 속는다.
const CASES = [
  // ⚠️ 실제로 200 이 뜨는 주소만 쓴다. /en/stories 는 홈으로 308 튕겨서
  //    「막혔어야 할 곳에서 발화」로 보였는데, 실은 홈에서 정상 발화한 것이었다(시험이 틀린 것).
  { path: '/en',                   기대: '불러야 함' },
  { path: '/en/inquiry',           기대: '불러야 함' },
  { path: '/en/insurance',         기대: '불러야 함' },
  { path: '/en/treatments',        기대: '막아야 함' },
  { path: '/en/treatments/lung',   기대: '막아야 함' },
  { path: '/ru/treatments/liver',  기대: '막아야 함' },
  { path: '/kk/specialties/dermatology', 기대: '막아야 함' },
  { path: '/en/cost-calculator',   기대: '막아야 함' },
  { path: '/en/education',         기대: '막아야 함' },
];

const browser = await chromium.launch();
const out = [];

for (const c of CASES) {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    try { localStorage.setItem('healo_cookie_consent', 'all'); } catch (e) {}
    // 실제 방문자 대다수는 DNT 를 안 켠다. 기본값이 1 인 자동화 브라우저 때문에
    // 픽셀이 스스로 전송을 멈추면 「우리 코드가 고장난 것」과 구별이 안 된다 → 끄고 잰다.
    try { Object.defineProperty(navigator, 'doNotTrack', { get: () => null, configurable: true }); } catch (e) {}
    window.__calls = [];
    const iv = setInterval(() => {
      if (typeof window.fbq === 'function' && !window.fbq.__w) {
        const o = window.fbq;
        const w = function () { window.__calls.push(Array.from(arguments).map(String)); return o.apply(this, arguments); };
        w.__w = true;
        Object.keys(o).forEach(k => { try { w[k] = o[k]; } catch (e) {} });
        window.fbq = w;
        clearInterval(iv);
      }
    }, 20);
  });

  const page = await ctx.newPage();
  const tr = [];
  page.on('request', r => { if (/facebook\.com\/tr/i.test(r.url())) tr.push(r.url()); });

  await page.goto('http://localhost:3300' + c.path, { waitUntil: 'domcontentloaded' });
  await page.mouse.wheel(0, 400).catch(() => {});
  await page.waitForTimeout(10000);

  const calls = await page.evaluate(() => (window.__calls || []).filter(a => a[0] === 'track'));
  const 불렀나 = calls.length > 0;
  const 통과 = (c.기대 === '불러야 함') === 불렀나;
  // 민감 주소에서는 «주소가 실려 나갔는지»까지 본다 — 병명이 dl 에 담기면 그게 유출이다
  const 실린주소 = tr.map(u => decodeURIComponent((u.match(/[?&]dl=([^&]+)/) || [])[1] || '')).filter(Boolean);

  out.push({
    주소: c.path, 기대: c.기대,
    fbq호출: 불렀나 ? calls.map(a => a.slice(0, 2).join(':')).join(', ') : '없음',
    메타요청: tr.length,
    실린주소,
    판정: 통과 ? 'PASS' : 'FAIL',
  });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 1));
const fail = out.filter(r => r.판정 === 'FAIL');
const 유출 = out.filter(r => r.기대 === '막아야 함' && r.실린주소.length > 0);
console.log(`\n판정: ${out.length - fail.length}/${out.length} 통과` + (fail.length ? ` — 실패 ${fail.map(f => f.주소).join(', ')}` : ''));
console.log(`병명이 실려 나간 건: ${유출.length}건`);
