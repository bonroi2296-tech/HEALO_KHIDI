/**
 * E2E D-2: 유효한 게스트 초대 토큰 → 입장 UI 표시
 *
 * 실제 유효한 토큰은 없으므로, 서버 응답 상태를 기반으로 검증.
 * 토큰이 유효한 경우: 이름 입력 폼이 정상 표시되어야 함.
 *
 * Note: 실제 LiveKit 미디어 연결은 검증 대상 아님 — UI 레이어만.
 */

import { test, expect } from "@playwright/test";

test.describe("게스트 초대 토큰 — 유효 케이스 UI", () => {
  test("유효하지 않은 토큰이라도 입장 폼 UI가 먼저 표시된다", async ({ page }) => {
    // 짧은 토큰 (형식은 있지만 DB에 없는 것)
    const fakeSession = "11111111-1111-1111-1111-111111111111";
    const fakeToken = "a".repeat(64);

    await page.goto(`/consultation/${fakeSession}?invite=${fakeToken}`);

    // 게스트 이름 입력 폼이 노출되어야 함 (토큰 검증 전 UI)
    //
    // ⚠️ 「한 번 읽고 판정」하지 마라 (2026-07-27 POSTMORTEMS #132).
    //   이 화면은 서버렌더 시점엔 "연결 중…"만 그리고, 게스트 폼은 하이드레이션 뒤
    //   staff/guest 판정 fetch 가 끝나야(실측 load + 0.2~0.3초) 뜬다.
    //   그래서 예전의 `innerText() 한 번 → toBeTruthy()` 는 구조적으로 이길 수 없는 경주였고,
    //   실제로 3주 넘게 «1차 실패 → retry 로 통과»로 초록을 위장하다가 결국 터졌다.
    //   Playwright 웹퍼스트 어서션은 «뜰 때까지» 자동 재시도한다 — 이게 정답이다.
    const nameInput = page
      .locator('input[placeholder*="이름"], input[placeholder*="name"], input[placeholder*="Айжан"]')
      .first();

    await expect(nameInput).toBeVisible({ timeout: 15_000 });
  });

  test("게스트 페이지 — 네트워크 응답이 HTML을 반환한다 (404 아님)", async ({ page }) => {
    const fakeSession = "22222222-2222-2222-2222-222222222222";
    const response = await page.goto(
      `/consultation/${fakeSession}?invite=${"b".repeat(64)}`
    );

    // 404가 아니어야 함 — 페이지 자체는 존재
    const status = response?.status() ?? 0;
    expect(status).not.toBe(404);
  });
});
