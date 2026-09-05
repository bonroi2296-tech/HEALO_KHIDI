/**
 * 모바일 폭(390px)에서 «가로 넘침»(문서 폭 > 화면 폭)이 없는지 — 언어별.
 *
 * 2026-09-06 로컬 실측(iPhone 12): 일본어 5쪽이 가로로 넘쳤다(/ja/hospitals/immune · telemedicine · care-journey ·
 * insurance · partners). 원인은 글자가 아니라 전역 CSS — body { word-break: keep-all } 이 «전 언어»에 걸려 있어
 * 띄어쓰기 없는 일·중 문단이 한 줄로 늘어났다(src/index.css, 지금은 html:lang(ko) 에만). 같은 부류가 다시 오면
 * 여기서 잡는다. 야간 Full E2E 에서만 돈다(@smoke 아님 — 화면 15개, 40초 안팎).
 *
 * ⚠️ 스크롤바·고정 요소는 안 센다. 「문서 폭」만 본다 — 부모가 overflow-hidden 으로 자른 건 화면상 문제가 아니다
 *    (scripts/mobile-sweep.mjs 와 같은 기준).
 */
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

const ROUTES = ["/hospitals/immune", "/telemedicine", "/care-journey", "/insurance", "/partners"];
const LOCALES = ["ja", "zh", "ru"];

for (const loc of LOCALES) {
  for (const route of ROUTES) {
    test(`@mobile-overflow /${loc}${route} — 390px 에서 가로 넘침 없음`, async ({ page }) => {
      const resp = await page.goto(`/${loc}${route}`, { waitUntil: "domcontentloaded" });
      expect(resp?.status() ?? 0, "화면이 열려야 한다").toBeLessThan(400);
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => ({
        vw: window.innerWidth,
        docW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      }));
      expect(m.docW, `문서 폭 ${m.docW} > 화면 폭 ${m.vw} — 어떤 칸이 화면 밖으로 나갔다(scripts/mobile-sweep.mjs 로 어느 요소인지 찾아라)`).toBeLessThanOrEqual(m.vw + 2);
    });
  }
}
