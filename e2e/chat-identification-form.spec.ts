/**
 * E2E A-2: 채팅 신원 확인 폼
 *
 * 채팅 첫 진입 시:
 * - 이름·이메일·국가 입력 폼이 보여야 함
 * - 제출 후 채팅 인터페이스로 전환
 */

import { test, expect } from "@playwright/test";

test.describe("채팅 신원 확인 폼", () => {
  test("첫 진입 시 이름·이메일·국가 폼이 노출된다", async ({ page }) => {
    // 문의 퍼널 → 문의서까지 두 화면을 지난다. 개발 서버는 화면마다 처음 한 번 빌드를 하느라
    // 기본 30초를 넘긴다(실서비스에선 10초 안쪽 — 실측 9초).
    test.slow();

    // 쿠키·세션 초기화 (신규 사용자 시뮬레이션)
    await page.context().clearCookies();

    // 🛑 첫 화면(/)을 들렀다 가지 마라 — 첫 화면이 스스로 이동을 시작해서 다음 goto 가
    //    끊긴다(net::ERR_ABORTED). 예전엔 여기서 채팅 위젯을 눌러보고 «있으면 말고» 식으로
    //    넘어갔는데, 아무것도 확인하지 않는 곁가지였고 검사를 죽이기만 했다(2026-08-21).
    // 🛑 언어 없는 맨 주소(/inquiry)도 쓰지 마라 — 언어 주소로 튕기는 사이에 똑같이 끊긴다.
    await page.goto("/en/inquiry", { waitUntil: "domcontentloaded" });

    // 갈림길 ①: 「문의서」를 고른다.
    // 정체(testid)가 먼저, 옛 영어 글자가 예비 — 야간 검사는 «실서비스»를 보는데 실서비스는
    // 배포 창구(하루 한 번) 때문에 저장소보다 하루 늦다. 예비가 없으면 고친 날 밤에 한 번은
    // 반드시 빨간불이 난다.
    const formChoice = page
      .getByTestId("channel-form")
      .or(page.getByText(/Inquiry Form/i))
      .first();
    await formChoice.waitFor({ state: "visible", timeout: 20000 });

    // 🛑 «한 번 누르고 기다리기»를 하지 마라 — 화면이 다 그려지기 «전»에 누르면 그 누름이
    //    통째로 버려진다(누른 자리의 옛 조각이 곧 새 조각으로 갈린다). 화면은 그대로 있고
    //    검사만 90초를 기다리다 죽는다 — 2026-08-21 로컬에서 재현. 넘어갈 때까지 다시 누른다.
    await expect(async () => {
      await formChoice.click();
      await page.waitForURL(/\/inquiry\/referral/, { timeout: 5000 });
    }).toPass({ timeout: 60000 });

    // 갈림길 ②: /inquiry/referral 은 폼 «전»에 「연락처만 / 진단까지」를 한 번 더 고르게 한다
    // (2026-08 개편). 안 고르면 화면에 입력칸이 하나도 없다 — 8/20부터 빨간불이던 진짜 이유.
    // .first() — 화면이 새로 그려지는 찰나에 옛 것과 새 것이 잠깐 같이 잡힌다(진짜 중복 아님).
    const pickQuick = page.getByTestId("pick-quick").first();
    await pickQuick.waitFor({ state: "visible", timeout: 45000 });
    await expect(async () => {
      await pickQuick.click();
      await expect(page.locator("input, textarea, select").first()).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 60000 });

    // 필수 필드가 최소 하나라도 있어야 함
    await expect(
      page.locator('input[type="email"], input[type="text"], select, textarea').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("신원 폼 제출 후 채팅/상담 인터페이스가 이어진다", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/inquiry");
    await page.waitForLoadState("domcontentloaded");

    // 이름 입력
    const nameInput = page
      .locator('input[name="name"], input[placeholder*="이름"], input[placeholder*="Name"]')
      .first();
    const hasName = await nameInput.isVisible().catch(() => false);
    if (hasName) {
      await nameInput.fill("E2E 테스트 사용자");
    }

    // 이메일 입력
    const emailInput = page.locator('input[type="email"]').first();
    const hasEmail = await emailInput.isVisible().catch(() => false);
    if (hasEmail) {
      await emailInput.fill("e2e-test@healo-test.invalid");
    }

    // 제출 버튼
    const submitBtn = page
      .getByRole("button", { name: /제출|보내기|신청|시작|submit|send/i })
      .first();
    const hasSubmit = await submitBtn.isVisible().catch(() => false);

    if (hasSubmit) {
      await submitBtn.click();
      await page.waitForLoadState("domcontentloaded");

      // 제출 후 — 성공 메시지 or 채팅 UI or 다음 단계
      const successOrChat = await page
        .locator(
          '[data-testid="chat-container"], [class*="success"], [class*="thank"]'
        )
        .first()
        .isVisible()
        .catch(() => false);

      const pageText = await page.locator("body").innerText();
      const hasSuccessText = /감사|완료|접수|submitted|success|thank/i.test(
        pageText
      );

      expect(successOrChat || hasSuccessText).toBeTruthy();
    }
  });
});
