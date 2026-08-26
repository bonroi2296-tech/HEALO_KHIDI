/**
 * E2E: 코디 → 환자 '추가 정보 요청' 카드가 코디 문의상세에 뜨는지 (@smoke)
 *
 * 배경: 환자가 이메일/연락처만 남기면 코디가 상세 정보를 더 받아야 하는데, 과거엔
 *   '상담 잡기'·'병원 배정'뿐이라 추가 정보를 요청할 길이 없었음(표시만 있고 행동 없음).
 *   이 테스트는 Step1만 완료된 문의 상세에 '추가 정보 요청' 카드·버튼이 노출되는지를 잠근다.
 *
 * 주의: 버튼을 실제로 누르면 이메일 발송 + info_requested_at 기록(부작용)이라, 스모크는
 *   카드/버튼 노출까지만 확인(클릭·발송은 수동/별도 검증).
 *
 * ⚠️ 2026-08-25 고침: 예전엔 「문의 #17」이라는 고정 번호로 들어가, 그 번호가 없으면
 *    «건너뜀»으로 빠졌다. 번호는 환경마다 다르고 실서비스에선 남아 있을 이유가 없어
 *    이 검사는 사실상 늘 눈을 감고 있었다. 이제 받은함에서 조건에 맞는 문의를 «찾아» 들어간다.
 *    받은함 자체가 안 열리면 그건 «건너뜀이 아니라 실패»다.
 */
import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

/** 받은함 목록에서 문의 상세 주소를 모은다(행은 링크가 아니라 클릭이라 id 표식으로 읽는다). */
async function inboxLinks(page: import("@playwright/test").Page): Promise<string[]> {
  // 목록을 읽는 «도중»에 화면이 이동하면 evaluateAll 이 통째로 터진다(문지기가 인증을 확인하고
  // 다시 그리는 순간). 그때는 빈 배열을 돌려 바깥의 poll 이 다시 세게 한다.
  const ids = await page
    .locator('[data-testid="inbox-row"]')
    .evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-inquiry-id") || "").filter(Boolean)
    )
    .catch(() => [] as string[]);
  return [...new Set(ids)].map((id) => "/coordinator/inbox/" + id);
}

test.describe("코디 추가 정보 요청 @smoke", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.E2E_COORDINATOR_EMAIL) {
      test.skip(true, "E2E_COORDINATOR_EMAIL 미설정 — 코디 인증 필요 테스트 스킵");
    }
    await loginAs(page, "coordinator");
  });

  test("Step1만 완료 문의 상세에 '추가 정보 요청' 카드가 뜬다", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/coordinator/inbox");
    // 「load」까지 — 문지기가 인증을 확인하고 화면을 다시 그리는 동안 읽으면 목록이 0건으로 보인다.
    await page.waitForLoadState("load");

    // 받은함 «화면»이 안 열리면 실패다 — 코디의 일이 여기서 시작한다.
    // 다만 문의가 0건인 것과는 갈라야 한다: 검사 전용 DB 에는 문의가 아예 없다.
    const table = page.locator('[data-testid="inbox-table"]');
    const empty = page.locator('[data-testid="inbox-empty"]');
    await expect
      .poll(async () => (await table.count()) + (await empty.count()), {
        timeout: 30_000,
        message: "코디 받은함 화면이 안 그려진다(표도 빈칸 안내도 없다)",
      })
      .toBeGreaterThan(0);

    if ((await empty.count()) > 0) {
      test.skip(true, "이 DB 에는 문의가 0건이라 볼 상세가 없다(검사 전용 DB 에서는 정상)");
    }

    const links = (await inboxLinks(page)).slice(0, 8);
    // 표는 떴는데 줄을 하나도 못 읽었다 = 줄에 붙은 표식이 사라진 것이다. 이건 고장이다.
    expect(links.length, "받은함 표는 떴는데 문의 줄을 하나도 못 읽었다").toBeGreaterThan(0);
    let checked = 0;

    for (const href of links) {
      await page.goto(href);
      await page.waitForLoadState("domcontentloaded");

      // 상세가 «다 그려질 때까지» 기다린다 — 안 기다리면 아직 안 그려진 화면을
      //  「카드 없음」으로 읽어 검사가 늘 건너뛴다(2026-08-25 실제로 그랬다).
      const badge = page.locator('[data-testid="inquiry-step-badge"]');
      await expect(badge, href + " 상세가 안 열린다").toBeVisible({ timeout: 30_000 });

      checked += 1;

      // Step2 까지 끝난 문의면 카드가 «안 뜨는 게 정상» → 다음 문의로.
      if ((await badge.getAttribute("data-step2-done")) === "1") continue;

      // Step1 만이면 카드가 «반드시» 있어야 한다. 판정은 글자가 아니라 표식으로 한다
      // — 코디 화면 언어가 한국어가 아닐 수 있다.
      const card = page.locator('[data-testid="request-info-card"]');

      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(
        card.locator('[data-testid="request-info-button"]'),
        "카드는 떴는데 「추가 정보 요청」 단추가 없다"
      ).toBeVisible();
      return; // 하나라도 확인하면 이 검사의 목적은 달성
    }

    // 여기까지 왔다 = 본 문의가 전부 Step2 완료. 카드가 안 뜨는 게 «정상»인 상태다.
    test.skip(
      true,
      `본 문의 ${checked}건이 전부 Step2 완료라 추가정보 요청 카드 비노출(정상)`
    );
  });
});
