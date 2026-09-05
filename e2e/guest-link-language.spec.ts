/**
 * 초대 링크(상담방·설문)가 «방문자 언어»로 뜨는가 — 첫 방문(쿠키 없음) 기준.
 *
 * 왜 이 테스트가 있나 (2026-07-27 실측):
 *   상담방·설문은 SEO 무관이라 URL 언어화 대상이 아니다 → x-locale 이 안 붙는다.
 *   쿠키까지 없는 «초대 링크로 처음 온 환자»는 마지막 폴백 en 으로 떨어져,
 *   러시아·카자흐 환자가 상담방과 만족도 설문을 **영어로** 받고 있었다.
 *   (같은 요청으로 공개경로 /telemedicine 은 ru·kk 로 정상이었다 = 감지 장치는 멀쩡했고
 *    이 경로만 그 분기를 안 탔다.)
 *
 * 핵심 타겟(러·카)이 새는 지점이라 언어별로 전수 고정한다 — 특히 카자흐어는
 * 브라우저 코드(kk)와 내부 코드(kz)가 달라 매핑이 빠지면 조용히 영어로 샌다(POSTMORTEMS #279 부류).
 */

import { test, expect } from "@playwright/test";

// 존재하지 않아도 방 껍데기는 그려진다(입장 판정은 클라·API 가 한다). <html lang> 검증엔 충분.
const ROOM = "/consultation/00000000-0000-0000-0000-000000000000";
const SURVEY = "/survey/e2e-lang-probe-token";

const htmlLang = (html: string) => html.match(/<html[^>]*\blang="([a-zA-Z-]+)"/)?.[1] ?? "(없음)";

test.describe("초대 링크 언어 — 쿠키 없는 첫 방문", () => {
  const cases: Array<{ al: string; expect: string; who: string }> = [
    { al: "ru-RU,ru;q=0.9", expect: "ru", who: "러시아어" },
    { al: "kk-KZ,kk;q=0.9,ru;q=0.8", expect: "kk", who: "카자흐어(kk→내부 kz→표기 kk)" },
    { al: "ko-KR,ko;q=0.9", expect: "ko", who: "한국어" },
    { al: "en-US,en;q=0.9", expect: "en", who: "영어" },
    { al: "fr-FR,fr;q=0.9", expect: "en", who: "미지원 언어 → 영어" },
  ];

  for (const c of cases) {
    test(`상담방: ${c.who} 브라우저 → lang="${c.expect}"`, async ({ playwright, baseURL }) => {
      // 쿠키가 남으면 다음 케이스가 오염된다 → 케이스마다 새 컨텍스트
      const ctx = await playwright.request.newContext({
        baseURL,
        extraHTTPHeaders: { "Accept-Language": c.al },
      });
      const res = await ctx.get(ROOM);
      expect(res.ok(), `${ROOM} 응답 실패(${res.status()})`).toBeTruthy();
      expect(htmlLang(await res.text())).toBe(c.expect);
      await ctx.dispose();
    });
  }

  test(`설문도 같은 규칙을 탄다 (러시아어 → lang="ru")`, async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { "Accept-Language": "ru-RU,ru;q=0.9" },
    });
    const res = await ctx.get(SURVEY);
    expect(htmlLang(await res.text())).toBe("ru");
    await ctx.dispose();
  });

  // ── 2026-09-05: 링크에 실린 ?lang — 메신저 미리보기 «봇»은 쿠키도 Accept-Language 도 안 보낸다(2026-08-31 실측:
  //    WhatsApp/TelegramBot UA 로 /claim 이 늘 영어 카드). 주소 안의 언어가 유일한 단서라 이 칸이 생겼다.
  //    순서 = 쿠키 → ?lang → Accept-Language → en (src/lib/i18n/guestLinkLang.ts).
  test("봇(헤더·쿠키 없음)도 ?lang=ru 면 러시아어로 그린다", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "Accept-Language": "" } });
    const res = await ctx.get(`${ROOM}?lang=ru`);
    expect(res.ok(), `${ROOM} 응답 실패(${res.status()})`).toBeTruthy();
    expect(htmlLang(await res.text())).toBe("ru");
    await ctx.dispose();
  });

  test("?lang=kk 도 내부 kz 로 매핑돼 카자흐어로 그린다(설문)", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "Accept-Language": "" } });
    const res = await ctx.get(`${SURVEY}?lang=kk`);
    expect(htmlLang(await res.text())).toBe("kk");
    await ctx.dispose();
  });

  test("?lang 이 브라우저 언어를 이긴다(러시아어 브라우저를 쓰는 카자흐 환자)", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "Accept-Language": "ru-RU,ru;q=0.9" } });
    const res = await ctx.get(`${ROOM}?lang=kz`);
    expect(htmlLang(await res.text())).toBe("kk");
    await ctx.dispose();
  });

  test("직접 고른 쿠키는 ?lang 보다 앞선다(한국인 코디가 환자 링크를 눌러도 화면은 한국어)", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Cookie: "healo_lang=ko" } });
    const res = await ctx.get(`${ROOM}?lang=ru`);
    expect(htmlLang(await res.text())).toBe("ko");
    await ctx.dispose();
  });

  test("이상한 ?lang 은 무시하고 브라우저 언어로", async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "Accept-Language": "ru-RU,ru;q=0.9" } });
    const res = await ctx.get(`${ROOM}?lang=xx`);
    expect(htmlLang(await res.text())).toBe("ru");
    await ctx.dispose();
  });

  test("직접 고른 언어(healo_lang 쿠키)가 브라우저 언어를 이긴다", async ({ playwright, baseURL }) => {
    // 러시아어 브라우저인데 화면에서 한국어를 골라 둔 사람 — 그 선택이 유지돼야 한다
    const ctx = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { "Accept-Language": "ru-RU,ru;q=0.9", Cookie: "healo_lang=ko" },
    });
    const res = await ctx.get(ROOM);
    expect(htmlLang(await res.text())).toBe("ko");
    await ctx.dispose();
  });
});
