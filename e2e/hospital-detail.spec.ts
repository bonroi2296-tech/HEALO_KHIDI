/**
 * E2E C-2: 병원 상세 페이지
 *
 * - 목록의 상세 링크 클릭 → 상세 페이지로 이동
 * - 상세 페이지에 의료진 또는 시설 정보가 표시되어야 함
 *
 * ⚠️ 2026-07-23 목록 개편 반영(#881 지점 통합 · #897 카드 Link 화, POSTMORTEMS #112):
 * 지점 카드는 이제 **펼침 아코디언**(링크 아님)이고, 상세로 가는 진입로는
 * a[href*="/hospitals/"] 링크(면력 대표 페이지 입구 + DB 병원 카드)다.
 * 이전 버전은 "첫 카드 클릭 = 상세 진입"을 가정한 데다 DOM 첫 번째 링크를
 * 숨김 여부와 무관하게 잡아, 아코디언을 클릭하고 URL 불변으로 실패했다.
 */

import { test, expect } from "@playwright/test";

// 보이는 상세 링크만 잡는다 — 숨은 내비/메뉴 링크가 first()로 잡히는 오탐 방지.
const detailLink = (page: import("@playwright/test").Page) =>
  page.locator('a[href*="/hospitals/"]:visible').first();

test.describe("병원 상세 페이지", () => {
  test("목록의 상세 링크 클릭 → 상세 페이지 진입", async ({ page }) => {
    // 기본 30초는 로컬 개발 서버의 «첫 컴파일»을 못 버틴다. 이 검사가 재는 건 화면 속도가
    // 아니라 상세 링크의 존재이므로 시간은 넉넉히 준다(실서비스는 컴파일이 없어 무관).
    test.setTimeout(90_000);
    await page.goto("/hospitals");
    await page.waitForLoadState("domcontentloaded");

    const link = detailLink(page);
    // 없으면 «건너뜀이 아니라 실패»다 — 상세 링크가 사라지면 목록에서 병원으로 못 들어간다.
    // 2026-08-25 실서비스 실측: 보이는 상세 링크 5개.
    await expect(link).toBeVisible({ timeout: 20_000 });

    await link.click();
    // /hospitals/immune → /en/hospitals/immune 처럼 언어 리다이렉트를 거쳐도 통과
    await page.waitForURL(/\/hospitals\/./, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/hospitals\/./);
  });

  test("상세 페이지에 의료진 또는 시설 정보가 있다", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/hospitals");
    await page.waitForLoadState("domcontentloaded");

    const link = detailLink(page);
    // 없으면 «건너뜀이 아니라 실패»다 — 상세 링크가 사라지면 목록에서 병원으로 못 들어간다.
    // 2026-08-25 실서비스 실측: 보이는 상세 링크 5개.
    await expect(link).toBeVisible({ timeout: 20_000 });

    const href = await link.getAttribute("href");
    if (href) {
      await page.goto(href);
    } else {
      await link.click();
    }

    await page.waitForLoadState("domcontentloaded");

    const bodyText = await page.locator("body").innerText().catch(() => "");
    // 의료진, 시설, 전문, 치료 등 관련 키워드
    const hasMedicalInfo =
      /의료진|전문의|시설|치료|specialist|doctor|facility|treatment|врач|больница/i.test(bodyText);
    expect(hasMedicalInfo).toBeTruthy();
  });
});
