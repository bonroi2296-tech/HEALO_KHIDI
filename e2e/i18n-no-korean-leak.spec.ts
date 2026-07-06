/**
 * E2E 전수검사: 영어 화면에 한국어(한글)가 새어나오지 않는지 — "가장 확실한" 다국어 가드.
 *
 * 원리:
 * - LangContext 의 SSR·기본 lang = "en" (쿠키 없으면 클라이언트도 "en").
 * - 폴백 체인이 lang → en → ko 이므로, 영어 화면에 한글이 보인다는 건
 *   해당 텍스트가 "en 번역이 없는(=한국어만 박힌) 데이터/JSX"라는 뜻 → 누락 100% 포착.
 * - 출처가 i18n 키든, 데이터 파일의 raw 문자열이든(예: focusPrograms 칩 사고) 상관없이 잡는다.
 *   → check:content / check:i18n 의 사각지대(키를 안 거친 한국어)를 메운다.
 *
 * 실패 시: 어느 라우트의 어떤 한글 텍스트가 샜는지 그대로 출력 → 바로 고칠 수 있게.
 *
 * 적법한 한국어(영어 화면에도 의도적으로 남는 고유명사 등)는 ALLOW 에 등록.
 * 등록은 신중히 — 남용하면 가드가 무의미해진다.
 */
import { test, expect } from "@playwright/test";

// 영어 화면에서도 의도적으로 허용되는 한국어 (고유명사·로마자 병기 등). 신중히 추가.
const ALLOW: (string | RegExp)[] = [
  // 영어 문장 안 용어 병기(글로서리) — 정상. 예: "Korean Medicine (한방/韓方) is ..."
  "한방/韓方",
];

// 공개·사용자 대면 라우트 (토큰/인증 필요 페이지 제외)
const ROUTES = [
  "/",
  "/treatments",
  "/treatments/female",
  "/treatments/digest",
  "/treatments/liver",
  "/treatments/lung",
  "/treatments/thyroid",
  "/treatments/etc",
  "/hospitals",
  "/hospitals/immune",
  "/telemedicine",
  "/care-journey",
  "/faq",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
  "/medical-disclaimer",
  "/education",
  "/insurance",
  "/visa",
  "/inquiry",
  "/intake",
  "/search",
  "/specialties/korean-medicine",
];

const HANGUL = /[가-힣]/;

function isAllowed(snippet: string) {
  return ALLOW.some((a) => (typeof a === "string" ? snippet.includes(a) : a.test(snippet)));
}

for (const route of ROUTES) {
  test(`@smoke @i18n-leak ${route} — 영어 화면에 한글 누출 없음`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });

    // 본문(보이는 콘텐츠)의 텍스트 노드 중 한글 포함분 수집. <head> 메타는 제외(별도 이슈).
    const leaks: string[] = await page.evaluate(() => {
      const hangul = /[가-힣]/;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const out = new Set<string>();
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const el = n.parentElement as HTMLElement | null;
        // 숨김 요소(다른 언어 잔재 등) 제외 — 실제 보이는 것만
        if (el && el.offsetParent === null && el.tagName !== "BODY") continue;
        const t = (n.textContent || "").trim();
        if (t && hangul.test(t)) out.add(t.length > 120 ? t.slice(0, 120) + "…" : t);
      }
      return [...out];
    });

    const real = leaks.filter((s) => HANGUL.test(s) && !isAllowed(s));
    expect(real, `\n[${route}] 영어 화면에 한국어가 샜습니다 (${real.length}건):\n` + real.map((s) => "  • " + s).join("\n") + "\n").toEqual([]);
  });
}
