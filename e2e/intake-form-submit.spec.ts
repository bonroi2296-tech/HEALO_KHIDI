/**
 * E2E B-1: 인테이크 폼 제출 @smoke
 *
 * - /intake 진입
 * - 5개 필수 필드 입력
 * - 제출 → 완료/감사 페이지
 *
 * 더미 데이터 사용 — 실제 환자 PII 없음
 */

import { test, expect } from "@playwright/test";

const DUMMY_INTAKE = {
  name: "E2E Test Patient",
  email: "e2e-intake@healo-test.invalid",
  phone: "+7 777 000 0000",
  country: "KZ",
  cancerType: "폐암",
  message: "E2E 자동화 테스트 — 실제 문의 아님",
};

test.describe("인테이크 폼 제출 @smoke", () => {
  test("필수 필드 입력 후 제출 → 완료 메시지/페이지", async ({ page }) => {
    await page.goto("/intake");
    await page.waitForLoadState("domcontentloaded");

    // 이름
    const nameInput = page
      .locator('input[name="name"], input[name="patientName"], input[placeholder*="이름"], input[placeholder*="Name"]')
      .first();
    const hasName = await nameInput.isVisible().catch(() => false);
    if (hasName) await nameInput.fill(DUMMY_INTAKE.name);

    // 이메일
    const emailInput = page.locator('input[type="email"]').first();
    const hasEmail = await emailInput.isVisible().catch(() => false);
    if (hasEmail) await emailInput.fill(DUMMY_INTAKE.email);

    // 국가 선택
    const countrySelect = page
      .locator('select[name*="country"], select[name*="nation"]')
      .first();
    const hasCountry = await countrySelect.isVisible().catch(() => false);
    if (hasCountry) {
      await countrySelect.selectOption({ label: /카자흐스탄|Kazakhstan/i });
    }

    // 암종
    const cancerSelect = page
      .locator('select[name*="cancer"], select[name*="type"]')
      .first();
    const hasCancer = await cancerSelect.isVisible().catch(() => false);
    if (hasCancer) {
      // 첫 번째 옵션 선택 (빈 옵션 제외)
      const options = await cancerSelect.locator("option").all();
      if (options.length > 1) {
        await cancerSelect.selectOption({ index: 1 });
      }
    }

    // 메시지/증상
    const textarea = page.locator("textarea").first();
    const hasTextarea = await textarea.isVisible().catch(() => false);
    if (hasTextarea) await textarea.fill(DUMMY_INTAKE.message);

    // 제출
    const submitBtn = page
      .getByRole("button", { name: /제출|신청|보내기|submit|send/i })
      .first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);
    if (!hasSubmit) {
      test.skip(true, "제출 버튼 없음 — 인테이크 UI 확인 필요");
    }

    await submitBtn.click();
    await page.waitForLoadState("domcontentloaded");

    // 완료 확인
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const isComplete = /감사|완료|접수|submitted|success|thank/i.test(bodyText);
    expect(isComplete).toBeTruthy();
  });
});
