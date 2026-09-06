/**
 * 404 화면이 «주소가 말하는 언어»로 나오는지 — 쿠키 없는 첫 방문 기준.
 *
 * 2026-09-06 로컬 실측: /ru/없는-주소 는 proxy 가 x-locale 을 안 붙여 layout 의 마지막 폴백 en 으로 떨어졌다.
 * 공유된 옛 링크·검색 결과로 처음 오는 러시아어 방문자가 「Page not found」를 봤다. 제목(<title>)은 언어와
 * 무관하게 영어 고정이었다. 고침: proxy.ts 의 hasLocale 분기 + app/not-found.jsx generateMetadata.
 * 이 검사는 «쿠키 없이» 연다 — 쿠키가 있으면 고치기 전에도 통과해 버려서 아무것도 못 잡는다.
 */
import { test, expect } from "@playwright/test";

const CASES: Array<[string, RegExp, string]> = [
  ["ru", /Страница не найдена/, "ru"],
  ["kz", /Бет табылмады/, "kk"],
  ["ja", /ページが見つかりません/, "ja"],
];

for (const [loc, title, htmlLang] of CASES) {
  test(`@smoke @i18n-leak /${loc}/없는-주소 — 404 가 ${loc} 로 나온다(쿠키 없음)`, async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const resp = await page.goto(`/${loc}/this-page-does-not-exist-${Date.now()}`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), "404 여야 한다(200 이면 라우팅이 바뀐 것)").toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", htmlLang);
    await expect(page.locator("h1")).toHaveText(title);
    await expect(page).toHaveTitle(title);
    await ctx.close();
  });
}
