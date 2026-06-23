/**
 * E2E: 상담 생성 모달 — '새 상담' 이 모달을 열고 통합 참여 링크 UI 인지 @smoke
 *
 * 왜: 과거 코디 '새 상담 생성'이 /intake(→공개 /inquiry)로 이탈했고(POSTMORTEMS #31 흐름),
 *     모달은 역할 5개 체크박스로 과복잡했음. 이제 모달이 열리고 '참여 링크' 단일 UI 여야 한다(#311).
 *     admin·coordinator 가 같은 공용 컴포넌트(CreateConsultationModal)를 쓰므로 admin 경로로 검증.
 *
 * 필요한 환경변수: E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD (없으면 스킵)
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("상담 생성 모달 @smoke", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_ADMIN_EMAIL) {
      test.skip(true, "E2E_ADMIN_EMAIL 미설정 — 스킵");
    }
    await loginAs(page, "admin");
  });

  test("'새 상담 예약' 클릭 → 모달 열림(참여 링크 단일)·/inquiry 이탈 없음", async ({ page }) => {
    await page.goto("/admin/consultations");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /새 상담/ }).first().click();

    // 모달이 열린다(과거엔 페이지 이동으로 이탈) — 제목 확인
    await expect(page.getByText(/새 원격 상담 예약/)).toBeVisible({ timeout: 8000 });

    // 통합 참여 링크 UI(역할 5개 체크박스가 아니라) + 문의에서 환자 선택
    await expect(page.getByText(/참여 링크/)).toBeVisible();
    await expect(page.getByText(/문의에서 환자 선택/)).toBeVisible();

    // 환자용 공개 문의 퍼널로 이탈하지 않았는지
    expect(page.url()).not.toContain("/inquiry");
  });
});
