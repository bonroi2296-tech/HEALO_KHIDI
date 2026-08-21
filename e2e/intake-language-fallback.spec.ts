/**
 * E2E B-4: 인테이크 — 카자흐어 UI 폴백
 *
 * - /kz 로 진입 (카자흐 주소는 /kk 가 아니라 /kz 다 — /kk 는 404)
 * - 카자흐어 UI 또는 러시아어 폴백이 표시되어야 함
 * - 폼 제목이 한국어/영어가 아닌 현지어여야 함
 */

import { test, expect } from "@playwright/test";

test.describe("인테이크 카자흐어 UI", () => {
  test("/kz 로 들어오면 카자흐어 화면이 뜬다", async ({ page }) => {
    // Accept-Language 헤더로 KZ 사용자 시뮬레이션
    await page.setExtraHTTPHeaders({ "Accept-Language": "kk-KZ,kk;q=0.9,ru;q=0.8" });

    await page.goto("/kz");
    await page.waitForLoadState("domcontentloaded");

    const bodyText = await page.locator("body").innerText();

    // 카자흐어(라틴/키릴) 또는 러시아어 폴백 확인
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(bodyText);
    const hasKazakh = /[әіңғүұқөһ]/i.test(bodyText);

    // 카자흐 화면이면 키릴·카자흐 글자가 반드시 있어야 한다.
    // 🛑 「글자수가 100 넘으면 통과」를 붙이지 마라 — 그러면 404 화면도 통과한다.
    //    실제로 주소가 /kk(404)로 잘못 적혀 있었고, 이 조건 때문에 두 달간 초록불이었다(2026-08-21).
    expect(hasCyrillic || hasKazakh, `카자흐 화면에 현지 글자가 없다: ${bodyText.slice(0, 120)}`).toBeTruthy();
  });

  test("intake 폼은 언어가 바뀌어도 접근 가능하다", async ({ page }) => {
    // 옛 주소 /intake 는 통합 퍼널로 넘어간다(2026-05 통폐합). 「넘어가는지」는 응답 코드로 «따로»
    // 확인한다 — 화면을 띄워놓고 「intake 링크」를 찾아 누르던 예전 방식은 링크가 보이냐 마느냐로
    // 결과가 갈렸고, 안 보이면 /intake 를 직접 열다가 이동이 끊겨(ERR_ABORTED) 빨간불이 났다.
    const old = await page.request.get("/intake", { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(old.status());
    expect(old.headers()["location"] || "").toContain("/inquiry");

    // 카자흐어로 퍼널을 연다 — 여기부터가 이 검사의 본론이다.
    await page.goto("/kz/inquiry");
    await page.waitForLoadState("domcontentloaded");

    // 갈림길 ①: 「문의서」를 고른다. «글자»가 아니라 정체로 고른다 — 「Inquiry Form」으로 찾으면
    // 카자흐·러시아 화면에서 못 찾고 그냥 지나친다.
    const formChoice = page.getByTestId("channel-form");
    await formChoice.waitFor({ state: "visible", timeout: 15000 });
    await formChoice.click();
    await page.waitForURL(/\/inquiry\/referral/, { timeout: 15000 }).catch(() => {});

    // 갈림길 ②: /inquiry/referral 은 폼 «전»에 「연락처만 / 진단까지」를 한 번 더 고르게 한다
    // (2026-08 개편). 안 고르면 화면에 입력칸이 하나도 없다 — 8/20부터 빨간불이던 진짜 이유.
    const pickQuick = page.getByTestId("pick-quick");
    await pickQuick.waitFor({ state: "visible", timeout: 10000 });
    await pickQuick.click();

    // 폼 요소가 있어야 함
    await expect(
      page.locator("form, input, textarea").first()
    ).toBeVisible({ timeout: 10000 });
  });
});
