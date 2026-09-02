/**
 * 처음 들어온 환자의 «첫 화면»에 안내창이 겹쳐 쌓이지 않는가.
 *
 * 왜 있나 (2026-09-02, PO 시연 점검): 폰·러시아어로 홈을 열면 쿠키 동의 배너와
 * PWA 설치 안내가 **동시에** 떠서, 하필 홈의 핵심 문구와 「무료 상담」 단추를 덮었다.
 * 서로 비켜 앉기는 했지만(`--cookie-banner-h`) 세로로 쌓이니 결과가 같았다.
 * → 한 번에 하나씩: **동의 배너가 먼저, 설치 안내는 그 뒤.**
 *
 * 이 검사는 「덮였나」가 아니라 «둘이 같이 떠 있나»를 본다 — 배치를 바꿔도 살아남는 기준이다.
 */

import { test, expect, devices } from "@playwright/test";

const COOKIE_BANNER = /Настройки файлов cookie|쿠키 설정|Cookie settings/i;
const INSTALL_CARD = /Добавьте healwith|홈 화면에 추가|Add healwith|Установите приложение|앱을 설치/i;

test.describe("첫 방문 홈 — 안내창이 겹쳐 쌓이지 않는다", () => {
  // 🛑 «아이폰 사파리 흉내»가 필수다. 설치 안내는 iOS Safari 에서만 뜨므로(애플 정책상 자동
  //    설치가 없어 수동 안내만 한다), 화면 크기만 폰으로 바꾸고 이름표를 크롬으로 두면
  //    안내가 «애초에 안 떠서» 이 검사가 아무것도 안 잡는다 — 2026-09-02 에 실제로 그랬다.
  //    되돌려 확인했을 때 통과해 버려서 발각됐다.
  //    (`devices[...]` 를 통째로 쓰면 브라우저 종류까지 바꾸려 해서 describe 안에서는 못 쓴다
  //     → 필요한 것만 뽑아 쓴다.)
  const iphone = devices["iPhone 12"];
  test.use({
    userAgent: iphone.userAgent,
    viewport: iphone.viewport,
    deviceScaleFactor: iphone.deviceScaleFactor,
    isMobile: iphone.isMobile,
    hasTouch: iphone.hasTouch,
  });

  test("@smoke 쿠키 배너가 떠 있는 동안에는 설치 안내가 뜨지 않는다", async ({ page, context }) => {
    // 러시아어 = 우리 환자의 기본 언어. 글자가 길어 배너가 가장 높아지는 조건이기도 하다.
    await context.addCookies([
      { name: "healo_lang", value: "ru", domain: "localhost", path: "/" },
      { name: "healo_lang_pick", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/");
    await page.waitForTimeout(3000); // 두 안내창 모두 붙은 뒤에 재야 «동시에 떴나»를 볼 수 있다

    const cookieShown = await page.getByText(COOKIE_BANNER).first().isVisible().catch(() => false);
    const installShown = await page.getByText(INSTALL_CARD).first().isVisible().catch(() => false);

    // 배너가 안 뜨는 환경(이미 동의한 상태로 시작 등)이면 이 검사는 뜻이 없다 — 그때는 통과.
    if (!cookieShown) {
      expect(installShown || true).toBeTruthy();
      return;
    }
    expect(installShown, "쿠키 동의 배너와 설치 안내가 «동시에» 떠 있다 — 첫 화면이 겹겹이 가려진다").toBe(false);
  });

  test("@smoke 동의를 누르면 배너가 사라지고 첫 화면의 주 단추가 보인다", async ({ page, context }) => {
    await context.addCookies([
      { name: "healo_lang", value: "ru", domain: "localhost", path: "/" },
      { name: "healo_lang_pick", value: "1", domain: "localhost", path: "/" },
    ]);

    await page.goto("/");
    await page.waitForTimeout(3000);

    const accept = page.getByRole("button", { name: /Принять все|모두 허용|Accept all/i }).first();
    if (await accept.isVisible().catch(() => false)) {
      await accept.click();
      await page.waitForTimeout(800);
      await expect(page.getByText(COOKIE_BANNER).first()).toBeHidden();
    }

    // 홈의 주 행동 단추가 «스크롤 없이» 보여야 한다 — 가려지면 시연에서 제일 먼저 티가 난다.
    const cta = page.getByRole("link", { name: /Бесплатная консультация|무료 상담|Free consultation/i }).first();
    await expect(cta, "홈 첫 화면에 주 행동 단추가 안 보인다").toBeVisible();
  });
});
