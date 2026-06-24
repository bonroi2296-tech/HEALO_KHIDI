/**
 * E2E: 코디 → 환자 '추가 정보 요청' 카드가 코디 문의상세에 뜨는지 (@smoke)
 *
 * 배경: 환자가 이메일/연락처만 남기면 코디가 상세 정보를 더 받아야 하는데, 과거엔
 *   '상담 잡기'·'병원 배정'뿐이라 추가 정보를 요청할 길이 없었음(표시만 있고 행동 없음).
 *   이 테스트는 Step1만 완료된 문의 상세에 '추가 정보 요청' 카드·버튼이 노출되는지를 잠근다.
 *
 * 주의: 버튼을 실제로 누르면 이메일 발송 + info_requested_at 기록(부작용)이라, 스모크는
 *   카드/버튼 노출까지만 확인(클릭·발송은 수동/별도 검증).
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("코디 추가 정보 요청 @smoke", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_COORDINATOR_EMAIL) {
      test.skip(true, "E2E_COORDINATOR_EMAIL 미설정 — 코디 인증 필요 테스트 스킵");
    }
    await loginAs(page, "coordinator");
  });

  test("Step1만 완료 문의 상세에 '추가 정보 요청' 카드가 뜬다", async ({ page }) => {
    // Step1만(추가 정보 필요) 테스트 문의 #17 상세로 직접 진입(데이터 의존 최소화).
    await page.goto("/coordinator/inbox/17");
    await page.waitForLoadState("domcontentloaded");

    // 문의가 없거나(404) 로드 실패면 스킵(환경 데이터 의존).
    const notFound = await page
      .getByText(/문의를 찾을 수 없|불러오지 못/)
      .isVisible()
      .catch(() => false);
    if (notFound) {
      test.skip(true, "문의 #17 없음(환경 데이터 의존)");
    }

    // Step2 완료면 카드가 안 뜨는 게 정상 → 그 경우 스킵.
    const step2Done = await page
      .getByText(/Step 1\+2 완료/)
      .isVisible()
      .catch(() => false);
    if (step2Done) {
      test.skip(true, "이 문의는 Step2 완료라 추가정보 요청 카드 비노출(정상)");
    }

    // Step1만이면 '추가 정보 요청' 카드·버튼이 보여야 한다.
    await expect(page.getByText("추가 정보 요청").first()).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /추가 정보 요청/ }).first()
    ).toBeVisible();
  });
});
