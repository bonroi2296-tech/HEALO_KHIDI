/**
 * 공개 AI 상담(ThreadChat) 진입 도우미.
 *
 * 왜 필요한가: 채팅 검사 3개가 「홈(/)에 채팅 입력창이 있다」고 가정하고 있었다. 실제로는 홈에
 * 입력 칸이 하나도 없어서(2026-08-25 실서비스 실측: input·textarea 0개) 세 검사 모두
 * test.skip 으로 빠졌다. 즉 «만들어진 뒤 한 번도 돈 적이 없다».
 *
 * 진짜 자리는 /inquiry → 「AI 상담」 카드 → 신원 확인(또는 동의) → 채팅이다.
 * 글자 대신 data-testid 로 고른다 — 「Start chat」으로 찾으면 러시아·카자흐 화면에서 못 찾는다.
 *
 * 🛑 여기서 만드는 대화는 실서비스 DB 에 들어간다. 이메일을 반드시 @healo-test.invalid 로 넣어
 *    문의로 승격되더라도 is_test 로 걸러지게 한다(src/lib/khidi/testData.ts).
 *    환자 메시지 1턴만 보내면 승격 자체가 안 걸린다(3턴마다 초안 생성).
 */
import { expect, type Page } from "@playwright/test";

export const testChatEmail = () => `e2e-chat-${Date.now()}@healo-test.invalid`;

/** /inquiry 에서 AI 상담을 열고, 문지기(신원 확인 또는 동의)를 통과해 입력칸까지 데려간다. */
export async function openPublicChat(page: Page) {
  // 🇰🇷 한국어 화면으로 «고정»한다 — 이 검사들의 목적은 채팅 기능이지 언어가 아닌데,
  //    로컬 개발 서버는 영어 화면이 빈 채로 뜨는 알려진 함정이 있어(실서비스는 멀쩡) 로케일이
  //    흔들리면 채팅과 무관한 이유로 빨간불이 된다. 다국어는 chat-multilingual 이 따로 본다.
  await page.goto("/ko/inquiry");
  // 「load」까지 기다린다 — domcontentloaded 만 보면 아직 자바스크립트가 안 붙은 화면에 대고
  // 카드를 눌러, 누른 뒤에 화면이 다시 그려지며 채팅이 초기화된다.
  await page.waitForLoadState("load");

  const aiCard = page.locator('[data-testid="channel-ai"]');
  await expect(aiCard, "/inquiry 에 「AI 상담」 카드가 없다").toBeVisible({ timeout: 25_000 });
  await aiCard.click();

  const identify = page.locator('[data-testid="chat-identify-name"]');
  const consentOnly = page.locator('[data-testid="chat-consent-start"]');
  const input = page.locator('[data-testid="chat-input"]');

  // 셋 중 무엇이 뜨든(신원 확인 / 동의 한 줄 / 이미 지난 대화 복구) 받아낸다.
  await expect
    .poll(
      async () =>
        (await input.count()) > 0
          ? "chat"
          : (await identify.count()) > 0
            ? "identify"
            : (await consentOnly.count()) > 0
              ? "consent"
              : "none",
      { timeout: 25_000, message: "AI 상담 화면이 아무것도 안 떴다" }
    )
    .not.toBe("none");

  if ((await input.count()) === 0 && (await identify.count()) > 0) {
    await identify.fill("E2E 자동검사");
    await page.locator('input[type="email"]').first().fill(testChatEmail());
    await page.locator("select").first().selectOption("KZ");
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('[data-testid="chat-identify-start"]').click();
  } else if ((await input.count()) === 0) {
    await page.locator('input[type="checkbox"]').first().check();
    await consentOnly.click();
  }

  await expect(input, "문지기를 지났는데 채팅 입력칸이 안 떴다").toBeVisible({ timeout: 30_000 });
  await expect(input, "채팅 입력칸이 떴는데 아직 쓸 수 없다").toBeEditable({ timeout: 15_000 });
  return input;
}

/** 한 턴 보내고 AI 응답 말풍선이 올 때까지 기다린다. */
export async function sendAndWaitReply(page: Page, text: string) {
  const bubbles = page.locator('[data-testid="chat-msg-assistant"]');
  // 첫 말풍선은 인사(intro)라 이미 하나 떠 있다 — «보내기 전보다 늘어나는 것»을 기다린다.
  const before = await bubbles.count();
  const input = page.locator('[data-testid="chat-input"]');
  await input.fill(text);
  await input.press("Enter");
  await expect
    .poll(async () => bubbles.count(), {
      // AI 응답은 원래 오래 걸린다(RAG 3단 + 스트리밍). 이 검사가 보는 건 «답이 오는가»이지
      // «몇 초에 오는가»가 아니다(응답시간은 P95 지표가 따로 본다). 넉넉히 준다.
      timeout: 120_000,
      message: "AI 응답 말풍선이 안 왔다",
    })
    .toBeGreaterThan(before);
}
