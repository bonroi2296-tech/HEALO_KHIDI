import { test, expect } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

/**
 * 스태프 포털(코디·어드민) 언어 전환 — 반성문 #156 의 재발 방지.
 *
 * 왜 필요한가: 이 기능이 **조용히** 죽어 있었다(에러 없음·빌드 통과·콘솔 깨끗).
 * 백오피스 기본값이 한국어라 한국인이 열면 정상으로 보였고, 러시아어로 여는 사람이 없어
 * 「코디가 처음부터 한국어 화면만 보고 있었다」는 걸 몇 달간 아무도 몰랐다.
 * → 사람 대신 기계가 매번 러시아어로 열어 본다.
 */
test("코디 포털: 언어 버튼으로 러시아어로 바뀐다", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "coordinator");
  await page.goto("/coordinator/content");
  await expect(page.getByRole("heading", { name: "콘텐츠 편집 · 전 화면" })).toBeVisible({ timeout: 120_000 });

  await page.getByRole("button", { name: "Change language" }).first().click();
  await page.getByText("Русский", { exact: true }).first().click();

  // 화면 글자가 실제로 바뀌어야 한다(쿠키만 심기고 화면은 그대로였던 게 바로 그 버그였다)
  await expect(page.getByRole("heading", { name: "Редактирование контента · все экраны" })).toBeVisible({ timeout: 30_000 });
  const cookie = await page.evaluate(
    () => document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("healo_bo_lang=")) || ""
  );
  expect(cookie).toBe("healo_bo_lang=ru");

  // 변경 이력의 「어느 화면인가」 이름표도 번역돼야 한다 — 여기가 코디가 실제로 읽는 자리다.
  //
  // ⚠️ 2026-07-29: 이 부분이 본판(main)에서 계속 빨간불이었다. 제품이 아니라 **시험의 전제**가
  //   틀렸다 — 이력 이름표는 「이력 행이 있을 때만」 그려지는데, 자동검사가 보는 검사 전용 DB 는
  //   이력이 **0건**이다(실측: 실서비스 267건 / 검사 DB 0건 · content_change_log).
  //   그래서 로컬에선 통과하고 CI 에선 100% 실패했다.
  //   → 이력이 있으면 예전 그대로 검사하고, 없으면 「빈 이력」 화면이 러시아어로 뜨는 것까지만
  //     확인한 뒤 **못 쟀다고 기록**하고 끝낸다(조용히 초록불로 지나가지 않게).
  await page.getByRole("button", { name: "История изменений" }).click();

  const firstKey = page.locator("span.font-mono").first();
  const emptyNote = page.getByText("Изменений пока нет.", { exact: true });
  await expect(firstKey.or(emptyNote).first()).toBeVisible({ timeout: 40_000 });

  if (await emptyNote.isVisible().catch(() => false)) {
    test.info().annotations.push({
      type: "못 잰 부분",
      description: "이 DB 에 변경 이력 0건 — 이름표 번역은 확인 못 함(빈 이력 문구 번역까지만 확인)",
    });
    return;
  }

  await expect(firstKey).toBeVisible({ timeout: 40_000 });
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll("span.bg-teal-50")].map((e) => (e.textContent || "").trim()).filter(Boolean)
  );
  expect(chips.length).toBeGreaterThan(0);
  expect(chips.some((c) => /[가-힣]/.test(c))).toBe(false);
});
