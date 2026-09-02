/**
 * E2E C-3: /treatments 암종 카드
 *
 * - /treatments 에 암종 카드 여러 개 표시
 * - 첫 번째 카드 클릭 → 상세 페이지
 */

import { test, expect } from "@playwright/test";

// 주요 암종 키워드 (한/영/러)
const CANCER_KEYWORDS = [
  /폐암|lung cancer|рак лёгких/i,
  /간암|liver|рак печени/i,
  /위암|stomach|желудок/i,
  /유방암|breast|молочная/i,
  /대장암|colon|толстая/i,
  /췌장암|pancrea|поджелудочная/i,
];

test.describe("/treatments 암종 페이지", () => {
  test("암종 관련 콘텐츠가 표시된다", async ({ page }) => {
    await page.goto("/treatments");
    await page.waitForLoadState("domcontentloaded");

    // 최소 1개 암종 키워드가 뜰 때까지 web-first 로 대기(클라이언트 렌더 레이스 방지).
    const cancerRe = new RegExp(CANCER_KEYWORDS.map((r) => r.source).join("|"), "i");
    await expect(page.locator("body")).toContainText(cancerRe, { timeout: 20_000 });
  });

  test("치료 페이지에 사전상담 CTA가 존재한다", async ({ page }) => {
    await page.goto("/treatments");
    await page.waitForLoadState("domcontentloaded");

    // 페이지가 actionable 한지 = 사전상담 CTA 존재로 검증(ko/en 무관).
    //
    // 🛑 «링크»로 찾는다. 버튼이 아니다 — 2026-08-31 #1564 가 이 CTA 를 router.push 버튼에서
    //    <Link>(=<a href>)로 바꿨는데 이 검사는 role:"button" 인 채였다. 화면은 멀쩡했고
    //    검사만 낡아서, 본판 E2E 가 6회 연속 빨간불이었다(2026-09-02 규명).
    //    되돌아가지 않게 role 을 link 로 못 박는다: 버튼으로 되돌리면 크롤러가 따라갈 주소가
    //    다시 사라진다 = #1564 가 고친 «고아 페이지» 회귀다. 여기서 실패하는 게 맞다.
    await expect(
      page.getByRole("link", { name: /사전상담 시작하기|Start Pre-consultation/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  // ⚠️ 「치료 항목 클릭 → 상세 진입」 시험은 2026-08-25 삭제했다.
  //    /treatments 는 «암종 펼침 카드 + 사전상담 CTA» 설계라 목록에서 상세로 가는 링크가 없다
  //    (바로 위 시험의 주석이 이미 그렇게 적고 있었고, 실서비스 실측에서도 상세 링크 0개).
  //    있지도 않은 링크를 찾다 «건너뜀»으로 빠져 만들어진 뒤 한 번도 돈 적이 없었다.
  //    ※ /treatments/[slug] 화면 «자체»는 빌드에 남아 있다 — 목록에서 갈 길이 없을 뿐이라,
  //      그 화면을 살릴지 지울지는 이 검사가 아니라 제품 판단이다(여기서 정하지 않는다).
});
