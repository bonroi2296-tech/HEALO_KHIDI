/**
 * 환자 의뢰서(/inquiry/referral) — 사람이 하나씩 눌러 보던 것을 기계가 대신 누른다. @smoke
 *
 * 왜 있나 (2026-08-19 PO): *«또 내가 하나씩 눌러가면서 테스트해야겠니?»*
 * 이 화면은 우리 «첫 접점»이라 조용히 망가지면 문의가 0건이 되는데도, 그동안 검증이 사람 눈뿐이었다.
 *
 * 🛑 이 파일은 «접수 회수제한 통»을 4번 쓴다 (41·104·151·175 줄). 한도는 1분에 5회다.
 *    여유가 1회뿐이니 **접수하는 시험을 하나 더 늘리기 전에 `RATE_LIMITS.INQUIRY` 를 먼저 봐라.**
 *    (2026-08-31 반성문 #180: 실행 «두 개»가 통을 나눠 쓰다 8회가 되어 3연속 빨간불이 났다.
 *     실행끼리 섞이는 건 `RATE_LIMIT_NAMESPACE` 로 갈라 놨지만, 한 실행 안의 여유는 여전히 1회다.)
 *
 * 🛑 여기서 넣는 문의는 실서비스 DB 에 들어간다 — 반드시 @healo-test.invalid 로.
 *    그 도메인이면 detectInquiryIsTest 가 is_test 로 표시해 실적 집계에서 빠진다(src/lib/khidi/testData.ts).
 * 🛑 「있으면 채운다」식으로 무르게 쓰지 마라 — 칸이 사라져도 통과해버려 검사가 «아무것도 안 보는» 상태가 된다.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./fixtures/auth";
import { findClipped } from "./fixtures/clipCheck";

const uniq = () => `e2e-referral-${Date.now()}@healo-test.invalid`;

/**
 * 갈림길에서 「전체」 카드를 누른다.
 *
 * 🛑 그냥 click() 하지 마라 — 화면이 그려지는 아주 짧은 구간에 같은 카드가 «두 벌» 잡히는
 *    때가 있다(2026-08-26 야간 실측: strict 위반으로 첫 시도 실패 → 재시도 통과 = 불안정).
 *    두 요소는 class 까지 똑같았고 둘째만 이름이 비어 있었다(= 아직 안 채워진 껍데기).
 *    개수가 1로 «안정된 뒤»에 누른다. 두 벌이 계속 남는다면 그건 화면 결함이니 여기서 걸린다.
 */
async function pickFull(page: Page) {
  await expect(page.getByTestId("pick-full")).toHaveCount(1, { timeout: 15000 });
  await page.getByTestId("pick-full").click();
}

/** 접수 6칸 채우기 — 이 여섯이 「보내기」를 여는 유일한 관문이다. */
async function fillEssentials(page: Page, email: string) {
  await page.locator("#in-lastName").fill("E2E");
  await page.locator("#in-firstName").fill("Patient");
  await page.locator("#in-email").fill(email);
  await page.locator("#in-patientLang").selectOption("ru");
  await page.locator("#in-cancerType").selectOption("colorectal");
  await page.getByTestId("consent-all").click();
}

test.describe("환자 의뢰서 @smoke", () => {
  test("갈래 화면 → 「상담만」 → 접수 완료(진행 링크까지)", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/inquiry/referral");
    // 갈래를 «반드시» 먼저 보여준다 — 바로 20칸이 뜨면 사람이 창을 닫는다(PO 2026-08-19 결정)
    await expect(page.getByTestId("pick-quick")).toBeVisible();
    await expect(page.getByTestId("pick-full")).toBeVisible();

    await page.getByTestId("pick-quick").click();
    const send = page.getByTestId("send");
    await expect(send).toBeDisabled();                 // 빈 폼에선 못 보낸다

    const email = uniq();
    await fillEssentials(page, email);
    await expect(send).toBeEnabled();

    await send.click();
    await expect(page.locator("#track-url")).toBeVisible({ timeout: 20000 });
    const track = await page.locator("#track-url").getAttribute("href");
    expect(track, "진행 링크(/claim/…)가 나와야 한다").toMatch(/\/claim\/[0-9a-f-]{36}$/);

    // 보낸 뒤엔 임시저장이 남아 있으면 안 된다 — 다음에 열었을 때 보낸 내용이 되살아난다.
    // 🛑 «바로» 재지 마라 — 0.4초 뒤에 쓰는 자동저장이 아직 남아 있으면 지운 것을 되살린다
    //    (2026-08-19 실서비스에서 실제로 그랬다. 로컬은 빨라서 안 보였다). 그 시간을 지나고 잰다.
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => localStorage.getItem("healo_referral_draft_v1"))).toBeNull();
    expect(errors.filter((e) => !/favicon|Failed to load resource/i.test(e)), errors.join(" | ")).toEqual([]);
  });

  test("이메일 모양이 틀리면 못 보낸다", async ({ page }) => {
    await page.goto("/inquiry/referral");
    await page.getByTestId("pick-quick").click();
    await fillEssentials(page, "11");                  // PO 실측 사례: 「11」이 통과해 서버가 거부했었다
    await expect(page.getByTestId("send")).toBeDisabled();
    await page.locator("#in-email").fill(uniq());
    await expect(page.getByTestId("send")).toBeEnabled();
  });

  test("동의를 지우면 다시 잠긴다 (법적 기록이라 절대 새면 안 된다)", async ({ page }) => {
    await page.goto("/inquiry/referral");
    await page.getByTestId("pick-quick").click();
    await fillEssentials(page, uniq());
    await expect(page.getByTestId("send")).toBeEnabled();
    await page.getByTestId("consent-all").click();     // 전체 끄기
    await expect(page.getByTestId("send")).toBeDisabled();
    // 낭독기가 «켜짐/꺼짐»을 읽을 수 있어야 한다
    await expect(page.getByTestId("consent-pipa")).toHaveAttribute("aria-checked", "false");
  });

  test("쓰던 내용은 남고, 갈래는 매번 다시 고른다", async ({ page }) => {
    await page.goto("/inquiry/referral");
    await pickFull(page);
    await page.locator("#in-lastName").fill("KEEPME");
    await page.waitForTimeout(700);                    // 자동저장은 0.4초 멈춘 뒤에 쓴다
    await page.reload();
    // 갈래 화면이 다시 뜬다(PO 결정: 「막상 들어왔더니 너무 많아서 접수만 할래」 할 수 있어야 한다)
    await expect(page.getByTestId("pick-quick")).toBeVisible();
    await pickFull(page);
    await expect(page.locator("#in-lastName")).toHaveValue("KEEPME");
  });

  test("「전체」 20칸도 끝까지 보내진다 (고르기 칸·딸린 글칸 포함)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/inquiry/referral");
    await pickFull(page);
    await fillEssentials(page, uniq());

    // 묶음은 접혀 있다(PO 결정) — 전부 펼친다. 「접힘」 표시가 사라지면 이 검사가 먼저 깨진다.
    const closed = page.locator('section > button[aria-expanded="false"]');
    for (let i = await closed.count(); i > 0; i = await closed.count()) {
      await closed.first().click();
      if (i === (await closed.count())) break;   // 안 열리면 무한 반복 금지
    }

    // 병기·진단명 같은 의뢰 칸도 실제로 들어가는지
    await page.locator("#in-stage").selectOption("III");
    await page.locator("#in-diagnosisNameRaw").fill("Adenocarcinoma of sigmoid colon");

    // 고르기(칩)를 누르면 딸린 글칸이 «그때» 나타난다 — 안 나타나면 병력 설명을 받을 길이 없다
    const chip = page.locator('[aria-labelledby="lbl-pastHistory"] button').first();
    await chip.click();
    await expect(page.locator("#in-pastHistoryNote")).toBeVisible();
    await page.locator("#in-pastHistoryNote").fill("E2E 자동 검사 — 실제 환자 아님");

    await page.getByTestId("send").click();
    await expect(page.locator("#track-url")).toBeVisible({ timeout: 20000 });
    expect(errors, errors.join(" | ")).toEqual([]);
  });

  test("러시아어로 열면 20칸 어디에도 한국어가 없다", async ({ page }) => {
    await page.goto("/ru/inquiry/referral");
    await pickFull(page);
    await expect(page.locator("#in-lastName")).toBeVisible();
    const closedRu = page.locator('section > button[aria-expanded="false"]');
    for (let i = await closedRu.count(); i > 0; i = await closedRu.count()) {
      await closedRu.first().click();
      if (i === (await closedRu.count())) break;
    }
    // 라벨·안내문·고르기 항목 전부 — 사전에서 한 언어만 빠지면 여기서 걸린다
    const text = await page.locator("main, body").first().innerText();
    // 「한국어」·「한국」은 언어·나라 고르기 칸의 «그 나라 말로 쓴 이름»이라 한국어로 적는 게 맞다
    // (Kazakhstan / Қазақстан 와 같은 규칙). 그 둘만 빼고 나머지 한국어는 전부 «샌 것»이다.
    const NATIVE_NAMES = ["한국어", "한국"];
    const hangul = (text.match(/[가-힣]{2,}/g) || []).filter((w) => !NATIVE_NAMES.includes(w));
    expect(hangul, `러시아어 화면에 한국어: ${[...new Set(hangul)].slice(0, 8).join(", ")}`).toEqual([]);
  });

  test("접수 뒤 받는 진행 링크가 «환자 언어»로 열린다", async ({ page }) => {
    // 🛑 이 링크는 카자흐·러시아 환자가 폰에서 여는 화면이다. 한국어로 열리면 그 자리에서 끝난다.
    //    (규칙: ①사람이 고른 언어 ②문의서에 적은 환자 언어 ③브라우저 ④영어)
    await page.goto("/inquiry/referral");
    await page.getByTestId("pick-quick").click();
    await fillEssentials(page, uniq());          // patientLang = ru 로 넣는다
    await page.getByTestId("send").click();
    await expect(page.locator("#track-url")).toBeVisible({ timeout: 20000 });
    const track = await page.locator("#track-url").getAttribute("href");

    // 언어 흔적이 없는 «새 사람»으로 연다 — 환자는 우리 사이트를 처음 여는 사람이다.
    // 🛑 링크의 «주소 전체»로 가지 마라 — 메일에 넣는 주소는 늘 실서비스(healwith.co.kr)라,
    //    자동 검사가 자기가 만든 문의를 «남의 서버»에서 찾다가 「링크가 유효하지 않습니다」를 본다
    //    (2026-08-19 CI 실측). 지금 검사 중인 서버에서 «같은 길»을 연다.
    const fresh = await page.context().browser()!.newContext();
    const p2 = await fresh.newPage();
    await p2.goto(new URL(track!).pathname);
    await expect(p2.locator("main")).toContainText(/[А-Яа-я]{4,}/, { timeout: 15000 });
    const txt = await p2.locator("main").innerText();
    const hangul = (txt.match(/[가-힣]{2,}/g) || []).filter((w) => !["한국어", "한국"].includes(w));
    expect(hangul, `러시아어 환자 화면에 한국어: ${[...new Set(hangul)].slice(0, 6).join(", ")}`).toEqual([]);
    await fresh.close();
  });

  test("코디 화면에 환자가 쓴 의뢰서가 «그대로» 뜬다", async ({ page }) => {
    // 🛑 이 개편의 존재 이유다. 2026-08-19 실측으로 여기가 통째로 비어 있었다 —
    //    환자가 진단명·불편한 곳·약물을 다 채웠는데 코디 화면엔 옛 6칸만 떴다.
    //    화면이 조용히 사라져도 아무도 모르니 기계가 본다.
    await page.goto("/inquiry/referral");
    await pickFull(page);
    await fillEssentials(page, uniq());
    const closed = page.locator('section > button[aria-expanded="false"]');
    for (let i = await closed.count(); i > 0; i = await closed.count()) {
      await closed.first().click();
      if (i === (await closed.count())) break;
    }
    const MARK = `E2E-DX-${Date.now()}`;
    await page.locator("#in-diagnosisNameRaw").fill(MARK);
    await page.getByTestId("send").click();
    // 🛑 innerText 를 «한 번» 읽고 판단하지 마라 — 하이드레이션과 경주가 된다(사이트 규칙 §33-b).
    //    될 때까지 기다리는 expect 로 본 뒤에 값을 읽는다.
    await expect(page.getByTestId("inquiry-no")).toBeVisible({ timeout: 20000 });
    const id = ((await page.getByTestId("inquiry-no").textContent()) || "").replace(/[^0-9]/g, "");
    expect(id, "접수 번호가 화면에 안 뜬다").not.toEqual("");

    await loginAs(page, "coordinator");
    await page.goto(`/coordinator/inbox/${id}`);
    // 라벨이 아니라 «환자가 쓴 값»이 떠야 한다 — 카드만 있고 값이 비면 못 잡는다
    await expect(page.locator("body")).toContainText(MARK, { timeout: 20000 });
  });

  test("폰 크기에서 옆으로 밀리지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/inquiry/referral");
    await pickFull(page);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, "가로 스크롤이 생기면 폰에서 글자가 잘린다").toBeLessThanOrEqual(1);
  });

  // 어제(2026-08-18) 내가 6개 언어 × 2가지 폭을 «눈으로» 훑었다. 그 일을 기계에 넘긴다 —
  // 러시아어·카자흐어는 한국어보다 2~3배 길어서 칸을 제일 잘 넘친다.
  for (const lang of ["ru", "kz"]) {
    test(`${lang} 20칸이 폰에서 글자가 잘리지 않는다`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/${lang}/inquiry/referral`);
      await pickFull(page);
      const closed = page.locator('section > button[aria-expanded="false"]');
      for (let i = await closed.count(); i > 0; i = await closed.count()) {
        await closed.first().click();
        if (i === (await closed.count())) break;
      }
      await page.waitForTimeout(600);          // 펼침 애니메이션이 끝난 뒤에 잰다
      const bad = await findClipped(page);     // 잘림 판정은 사이트 공용 탐지기 하나로
      expect(bad.map((b) => `${b.over}px 넘침: ${b.text}`), JSON.stringify(bad.slice(0, 4))).toEqual([]);
    });
  }
});
