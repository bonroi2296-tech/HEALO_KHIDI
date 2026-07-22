/**
 * E2E: 환자 포털 모바일 — 단일 크롬(이중 헤더/하단바/푸터 회귀 방지) @smoke
 *
 * 왜: /patient 가 ClientShell.isPortalPage 에서 빠지면 공개 마케팅 헤더+하단바(진료과목/문의/병원)
 *     +푸터가 환자 레이아웃의 자체 하단탭 위에 겹쳐 모바일 레이아웃이 깨진다(2026-06-23, POSTMORTEMS #32).
 *     빌드/린트로는 안 잡히고 "모바일에서 직접 눌러야" 보이던 부류 → 자동 클릭으로 매 PR 차단.
 *
 * 필요한 환경변수: E2E_TEST_USER_EMAIL, E2E_TEST_USER_PASSWORD (없으면 스킵)
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("환자 포털 모바일 단일 크롬 @smoke", () => {
  // 모바일 뷰포트 — 공개 하단바(MobileBottomNav)는 md:hidden 이라 데스크톱에선 안 보임.
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_TEST_USER_EMAIL) {
      test.skip(true, "E2E_TEST_USER_EMAIL 미설정 — 스킵");
    }
    await loginAs(page, "patient");
  });

  test("환자 대시보드에 공개 마케팅 푸터·하단바가 겹쳐 뜨지 않는다", async ({ page }) => {
    await page.goto("/patient");
    await page.waitForLoadState("domcontentloaded");

    const body = await page.locator("body").innerText().catch(() => "");

    // ClientShell 에서 공개 마케팅 푸터와 공개 하단바(MobileBottomNav)는 둘 다 동일 조건
    // (!isPortalPage)으로 렌더된다. 즉 푸터가 안 보이면 공개 하단바도 안 뜬 것 = 단일 크롬.
    // 푸터(사업자등록번호)가 보이면 공개 크롬이 환자 포털에 누수된 이중 크롬 회귀.
    //
    // ⚠️ 여기서 **언어에 안 흔들리는 앵커**를 쓴다(2026-07-22, POSTMORTEMS #108 독립 리뷰 지적).
    //    예전엔 "Business Registration Number" 라는 영어 라벨로 판정했는데, 그 라벨이 6개 언어로
    //    번역되면서 ko/ru/kz/zh/ja 문맥에서는 실제로 푸터가 새도 이 부정단언이 **통과**해버린다
    //    (= 초록불인데 가드는 죽어 있는 상태). 사업자등록번호 값은 어느 언어에서도 같은 숫자다.
    expect(body).not.toMatch(/463-35-00902/);
  });
});
