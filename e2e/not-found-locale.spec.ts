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

/**
 * 위 검사가 못 잡던 «다른 길»의 404 — 라우트는 있는데 안의 notFound() 가 불린 경우.
 *
 * 2026-09-10 실서비스 실측: /ru/hospitals/<없는 uuid> 는 Next 가 서버 HTML 로 빈 껍데기
 * (<html id="__next_error__">)만 보내고 레이아웃을 브라우저에서 다시 그린다. 그때 React 는
 * 인라인 <script> 를 실행하지 않아 window.__I18N__ 이 비었고, 푸터가 값 대신 키를 그렸다
 * (「footer.tagline」·「footer.company」·「nav.about」…). 위 loop 는 «없는 주소»만 열어서
 * 이 길을 한 번도 안 지나갔다 — 그래서 못 잡았다.
 */
const KEY_LEAK = /\b(footer|nav|btn|common)\.[a-zA-Z][a-zA-Z.]+/;

for (const [loc, title, htmlLang] of CASES) {
  test(`@smoke @i18n-leak /${loc}/hospitals/<없는 slug> — 화면에 번역 키가 안 보인다`, async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const resp = await page.goto(`/${loc}/hospitals/no-such-hospital-${Date.now()}`);
    expect(resp?.status(), "404 여야 한다(200 이면 라우팅이 바뀐 것)").toBe(404);
    await expect(page.locator("h1")).toHaveText(title);
    await expect(page.locator("html")).toHaveAttribute("lang", htmlLang);
    // 푸터까지 그려진 뒤에 본다 — 이 화면은 브라우저에서 그려지므로 곧바로 읽으면 이르다.
    await expect(page.locator("footer")).toBeVisible({ timeout: 20_000 });
    const body = (await page.locator("body").innerText()) || "";
    expect(body.match(KEY_LEAK)?.[0] ?? null, "번역 키가 글자 그대로 노출됐다").toBeNull();
    await ctx.close();
  });
}
