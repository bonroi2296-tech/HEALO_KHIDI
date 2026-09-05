/**
 * 스토어 제출용 스크린샷 자동 촬영 (2026-07-13)
 *
 * 왜: 앱이 라이브 사이트를 그대로 싣는 구조(Capacitor server.url)라, 스토어 규격 해상도로
 *     실사이트를 찍으면 그게 곧 앱 화면. 계정·결제 없이 미리 준비 가능한 유일한 대형 준비물.
 *
 * 사용: node scripts/appstore-screenshots.mjs [locales]   (기본 ko,en,ru — 예: node ... ko,en,ru,kk,zh,ja)
 * 출력: appstore-assets/screenshots/<기기>/<언어>-<페이지>.png  (git 미추적 — .gitignore 등재)
 * 규격: iOS 6.7" 1290×2796 / iOS 6.5" 1242×2688 (애플 필수 2종) / Android 폰 1080×2400
 * 주의: 웹 캡처 초안임 — 최종 제출 전 실기기/시뮬레이터 캡처로 교체 권장(상태바 없음).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_BASE_URL || "https://healwith.co.kr";
const LOCALES = (process.argv[2] || "ko,en,ru").split(",");

// 스토어가 요구하는 픽셀 크기 = viewport × scale (정수로 떨어지게 선정)
const DEVICES = {
  "ios-6.7": { width: 430, height: 932, scale: 3 },   // 1290×2796
  "ios-6.5": { width: 414, height: 896, scale: 3 },   // 1242×2688
  // 아이패드 13형 — 애플이 「심사에 추가」를 막는 필수 규격(2026-07-29 실측: 없으면 제출 불가)
  "ios-ipad-13": { width: 1032, height: 1376, scale: 2, tablet: true }, // 2064×2752
  "android": { width: 360, height: 800, scale: 3 },   // 1080×2400
  // 구글 태블릿 2종도 필수(별표) — 비율이 «정확히» 9:16 이어야 해서 크기를 딱 떨어지게 잡았다
  "android-tablet-7": { width: 540, height: 960, scale: 2, tablet: true },   // 1080×1920
  "android-tablet-10": { width: 720, height: 1280, scale: 2, tablet: true }, // 1440×2560
};

const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// 스토어에 보여줄 대표 화면 4개 (스토어 문구의 기능 소개 순서와 일치)
const PAGES = [
  ["home", "/"],
  ["care-journey", "/care-journey"],
  ["telemedicine", "/telemedicine"],
  ["inquiry", "/inquiry"],
];

// 브라우저 실행 파일 위치를 환경변수로 덮어쓸 수 있게 둔다.
// 왜: 클라우드 실행 환경(원격 세션·CI)은 브라우저를 미리 깔아두고 그 경로만 알려주는 경우가 있는데,
//     playwright 가 기대하는 버전 폴더와 이름이 달라 「Executable doesn't exist」로 죽는다.
//     PLAYWRIGHT_CHROMIUM_PATH 를 주면 그걸 쓰고, 없으면 평소대로 playwright 가 찾은 것을 쓴다.
const launchOpts = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {};
const browser = await chromium.launch(launchOpts);
let shot = 0, failed = 0;
for (const [deviceName, d] of Object.entries(DEVICES)) {
  const dir = `appstore-assets/screenshots/${deviceName}`;
  mkdirSync(dir, { recursive: true });
  for (const locale of LOCALES) {
    const ctx = await browser.newContext({
      viewport: { width: d.width, height: d.height },
      deviceScaleFactor: d.scale,
      // 태블릿은 isMobile 을 끈다 — 켜면 모바일 레이아웃이 잡혀 아이패드 화면이 「늘린 폰」으로 찍힌다
      isMobile: !d.tablet,
      hasTouch: true,
      userAgent: d.tablet ? IPAD_UA : IPHONE_UA,
      locale,
    });
    // 공개 사이트 언어 쿠키(healo_lang) — src/lib/i18n/config.js 의 LOCALE_COOKIE
    await ctx.addCookies([{ name: "healo_lang", value: locale, domain: new URL(BASE).hostname, path: "/" }]);
    // 배너류 전부 숨김(스토어 스크린샷에 금지): 쿠키 동의(CookieConsent.jsx) + PWA 설치 안내(InstallPrompt/IosInstallHint)
    await ctx.addInitScript(() => {
      localStorage.setItem("healo_cookie_consent", "essential");
      localStorage.setItem("a2hs-dismissed", "1");
      localStorage.setItem("ios-a2hs-dismissed", "1");
    });
    const page = await ctx.newPage();
    for (const [name, path] of PAGES) {
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(1500); // 폰트·이미지 안착
        await page.screenshot({ path: `${dir}/${locale}-${name}.png` });
        shot++;
      } catch (e) {
        failed++;
        console.error(`✗ ${deviceName} ${locale} ${name}: ${e.message.split("\n")[0]}`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`완료: ${shot}장 촬영, 실패 ${failed}건 → appstore-assets/screenshots/`);
