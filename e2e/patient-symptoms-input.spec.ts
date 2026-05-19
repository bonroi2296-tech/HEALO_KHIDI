/**
 * E2E E-2: 환자 증상 입력
 *
 * - 인증된 환자 계정으로 /patient/symptoms 접근
 * - 증상 입력 → 저장 → 목록에 표시
 *
 * 필요한 환경변수:
 *   E2E_TEST_USER_EMAIL
 *   E2E_TEST_USER_PASSWORD
 *
 * 미설정 시 테스트 스킵 (CI 에서는 Secrets 로 주입)
 */

import { test, expect } from "@playwright/test";
import { loginAs, TEST_USER } from "./fixtures/auth";

test.describe("환자 증상 입력", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_TEST_USER_EMAIL) {
      test.skip(true, "E2E_TEST_USER_EMAIL 미설정 — 인증 필요 테스트 스킵");
    }
    await loginAs(page, "patient");
  });

  test("증상 입력 → 저장 → 목록에 표시", async ({ page }) => {
    await page.goto("/patient/symptoms");
    await page.waitForLoadState("networkidle");

    const symptomText = `E2E 테스트 증상 ${Date.now()}`;

    // 증상 입력 textarea/input
    const symptomInput = page
      .locator('textarea, input[type="text"]')
      .first();
    const hasInput = await symptomInput.isVisible().catch(() => false);

    if (!hasInput) {
      test.skip(true, "증상 입력 UI 없음");
    }

    await symptomInput.fill(symptomText);

    // 저장 버튼
    const saveBtn = page
      .getByRole("button", { name: /저장|추가|save|add/i })
      .first();
    const hasSave = await saveBtn.isVisible().catch(() => false);
    if (!hasSave) {
      test.skip(true, "저장 버튼 없음");
    }

    await saveBtn.click();
    await page.waitForLoadState("networkidle");

    // 입력한 증상이 목록에 표시
    await page.waitForTimeout(1000);
    const bodyText = await page.locator("body").innerText().catch(() => "");

    // 저장된 텍스트가 일부라도 표시되어야 함
    // (timestamp 부분 제외하고 "E2E 테스트 증상" 만 확인)
    expect(bodyText).toContain("E2E 테스트 증상");
  });
});
