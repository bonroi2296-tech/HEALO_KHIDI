/**
 * E2E E-2: 환자 증상 입력
 *
 * - 인증된 환자 계정으로 /patient/symptoms 접근
 * - 증상 입력 → 저장 → 서버가 «실제로 저장했는지»까지 확인
 *
 * ⚠️ 2026-08-25 고침: 예전엔 ①입력칸이 «한 번 봐서» 안 보이면 test.skip 으로 빠졌고
 *    (실측: 그 시점엔 없고 14초 뒤엔 있었다) ②저장 성공 판정을 화면 글자로 하고 있었다.
 *    이 화면은 «분석은 됐는데 DB 저장은 실패»해도 화면이 멀쩡해 보이는 전례가 있어
 *    (saved:false, 2026-08-14 감사), 판정은 서버 응답으로 한다.
 *
 * 필요한 환경변수:
 *   E2E_TEST_USER_EMAIL
 *   E2E_TEST_USER_PASSWORD
 *
 * 미설정 시 테스트 스킵 (CI 에서는 Secrets 로 주입)
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("환자 증상 입력", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_TEST_USER_EMAIL) {
      test.skip(true, "E2E_TEST_USER_EMAIL 미설정 — 인증 필요 테스트 스킵");
    }
    await loginAs(page, "patient");
  });

  test("증상 입력 → 저장 → 서버에 실제로 남는다", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/patient/symptoms");
    await page.waitForLoadState("domcontentloaded");

    const symptomInput = page.locator('[data-testid="symptom-name"]').first();
    // 없으면 «건너뜀이 아니라 실패»다 — 사후관리가 여기서 시작한다.
    await expect(symptomInput, "증상 입력칸이 없다").toBeVisible({ timeout: 30_000 });

    const symptomText = `E2E 검사 증상 ${Date.now()}`;
    await symptomInput.fill(symptomText);

    const saveBtn = page.locator('[data-testid="symptom-submit"]');
    await expect(saveBtn, "저장 단추가 없다").toBeVisible({ timeout: 20_000 });

    const posted = page.waitForResponse(
      (r) => r.url().includes("/api/portal/symptoms") && r.request().method() === "POST",
      { timeout: 60_000 }
    );
    await saveBtn.click();
    const res = await posted;

    expect(res.status(), "증상 제출이 서버에서 거절됐다").toBeLessThan(400);
    const body = await res.json().catch(() => ({}));
    // 🛑 서버는 «분석은 됐지만 DB 저장 실패» 를 saved:false 로 알려준다. 그때 환자는 보고된 줄
    //    알지만 코디·의사에게 안 간다. 그래서 여기까지 본다.
    expect(body.saved, "분석만 되고 DB 에는 안 남았다(saved:false)").not.toBe(false);

    // 저장에 성공하면 입력칸이 비워진다 — 화면도 성공으로 넘어갔는지 확인.
    await expect(symptomInput).toHaveValue("", { timeout: 30_000 });
  });
});
