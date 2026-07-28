import { test, expect, request } from "@playwright/test";

/**
 * 크롤러가 받는 원본 HTML 에 "페이지의 알맹이"가 실제로 들어있는지 검사한다.
 *
 * 왜 (반성문 #143): 아코디언 본문을 `{open && ...}` 로 조건부 렌더해 두면 **접힌 동안 DOM 에
 * 아예 없다.** 검색봇·AI 답변엔진은 아코디언을 열어보지 않으므로, 프로덕션 HTML 이
 * "제목만 있고 답이 없는 페이지"가 된다 — 2026-07-28 실측에서 `/faq`(답변 17개)와
 * 암종 상세(5축 설명 전부)가 그 상태였다. 브라우저로 보면 멀쩡해서 아무도 못 봤다.
 *
 * 다른 검사가 못 잡는 이유:
 *  · 기존 E2E 는 **렌더된 브라우저**를 보고, 심지어 `offsetParent === null`(숨김)을 건너뛴다
 *    → 접힌 콘텐츠는 처음부터 검사 대상 밖.
 *  · `check:content` 는 소스의 문자열/키만 본다 → "HTML 에 실렸는가"는 볼 수 없다.
 * 그래서 이 검사는 **브라우저 없이 HTTP 로 받은 원문**을 그대로 본다(= 크롤러와 같은 시야).
 *
 * 새 공개 페이지를 만들면 여기에 한 줄 추가할 것. 문구는 i18n 사전이 바뀌면 같이 갱신.
 */

// 각 페이지에서 "이게 없으면 알맹이가 빠진 것"인 문장 조각.
// 화면 어딘가에 반드시 보이는 본문에서 따온다(제목·버튼 라벨 말고 **본문**).
const PAGES: { path: string; mustContain: string[] }[] = [
  {
    path: "/en/faq",
    mustContain: [
      "medical concierge platform that helps", // service1 답변
      "interpretation", // 언어 관련 답변 본문
    ],
  },
  {
    path: "/ru/faq",
    mustContain: ["платформа медицинского консьержа"],
  },
  {
    path: "/en/treatments/lung",
    mustContain: [
      "Activates both cellular and humoral immunity", // ITCRN immunity 축 설명
      "Hyperthermia induces cancer cell death", // temperature 축 설명
    ],
  },
];

/**
 * 뚫린 가드 보강 — 같은 사각의 반대쪽.
 *
 * `i18n-no-korean-leak` 은 **렌더된 화면**을 보면서 `offsetParent === null`(숨김)을 건너뛴다.
 * 즉 «접혀 있는 한국어»는 그 검사에게 처음부터 안 보였다. 접힌 내용을 DOM 에 남기는 순간
 * 그 한국어가 크롤러에게 노출되므로, **원본 HTML 기준으로도** 한 번 더 본다.
 * (대상은 위 PAGES 로 한정 — 전 사이트 확대는 기존 누출 정리와 함께 별도로.)
 */
const NO_HANGUL_PATHS = ["/en/faq", "/ru/faq", "/en/treatments/lung"];
const HANGUL = /[가-힣]/;

function visibleText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}

for (const page of PAGES) {
  test(`@smoke @crawler ${page.path} — 크롤러가 받는 HTML 에 본문이 들어있다`, async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.get(page.path);
    expect(res.status(), `${page.path} 가 200 이 아님`).toBe(200);

    const text = visibleText(await res.text());
    for (const needle of page.mustContain) {
      expect(
        text,
        `\n[${page.path}] 크롤러가 받는 HTML 에 본문이 없습니다: "${needle}"\n` +
          `→ 아코디언/탭 내용을 {open && ...} 로 조건부 렌더하고 있지 않은지 확인하세요.\n` +
          `   접혀 있어도 DOM 에는 남기고 CSS(max-h-0 등)로만 감춰야 크롤러가 읽습니다.\n`
      ).toContain(needle);
    }
    await ctx.dispose();
  });
}

for (const path of NO_HANGUL_PATHS) {
  test(`@smoke @crawler ${path} — 크롤러가 받는 HTML 에 한글이 섞이지 않는다`, async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.get(path);
    expect(res.status()).toBe(200);

    const words = visibleText(await res.text())
      .split(" ")
      .filter((w) => HANGUL.test(w));

    expect(
      [...new Set(words)].slice(0, 20),
      `\n[${path}] 외국어 페이지의 HTML 본문에 한국어가 섞여 있습니다.\n` +
        `→ 번역이 없는 데이터를 그대로 렌더하고 있지 않은지 확인하세요(예: ITCRN_FRAMEWORK 의 evidence/methods).\n`
    ).toEqual([]);
    await ctx.dispose();
  });
}
