/**
 * E2E 전수검사: 러시아어·카자흐어 화면에 «영어 문장»이 새어나오지 않는지.
 *
 * 왜 따로 있나 (2026-09-06 실측): 자매 검사 `i18n-no-korean-leak.spec.ts` 는 «한글 누출»만 본다.
 * 폴백 체인이 lang → en → ko 라, 데이터 파일이 { ko, en } 두 칸만 들고 있으면 러시아어 화면엔
 * 한글이 아니라 **영어**가 뜬다 — 그 부류는 어느 검사도 안 잡았다. 실제로 /ru/hospitals/immune 에
 * 영어 줄 103개, 암종 상세에 치료법 설명·기전·근거 25칸, 한의학 FAQ 5문답이 영어로 떠 있었다.
 *
 * 판정(오탐을 안 내려고 좁게):
 *   · 보이는 텍스트 노드 중 키릴·한글이 «없고», 라틴 단어 2개 이상이며,
 *   · 그중 «소문자로 시작하는 단어»가 하나라도 있으면 «문장»으로 본다 → 누출.
 *   고유명사(의료진 이름·직위 — PO 결정 2026-07-27 영어 통일, 「Open Plaza」, 「Smart TV」)는
 *   단어마다 대문자로 시작하므로 안 걸린다. 전부 대문자(「AI NOTICE」)도 안 걸린다.
 *   문장은 반드시 소문자 단어를 품으므로(관사·동사) 이 규칙에 걸린다.
 *
 * ru 는 @smoke(신청서마다) · kz 는 야간 Full E2E 에서만(데이터는 같은 파일이라 ru 로 대부분 잡힌다).
 */
import { test, expect } from "@playwright/test";

// 의도적으로 영어로 두는 것 — 신중히 추가. 브랜드·플랫폼 이름·출처 표기.
const ALLOW: (string | RegExp)[] = [
  /^Photos by( Unsplash)?$/, // 교육 화면 사진 출처 — 링크 앞 텍스트 노드가 「Photos by」 로 잘려 온다
  /Republic of Korea$/, // 꼬리말 사업자 주소(법정 표기, 영어 고정) — 「Room 613, 385 Gangseo-ro, … Seoul, Republic of Korea」
  /^Room: /, // 원격협진 화면의 방 이름 예시 「Room: khidi-xxxx」
  /^© .+ All rights reserved\.$/, // 꼬리말 저작권 문구 — 외국어 화면은 로마자 법정 표기로 고정(src/lib/siteSettings.js 주석)
  /^healwith(\.co\.kr)?$/i, // 브랜드 «단독» 노드만 — 브랜드가 든 영어 문장까지 봐주면 안 된다(독립 리뷰)
  /^https?:\/\//,
  /@/, // 이메일
  /Wi-Fi|Smart TV/i,
  /Viscum album|Astragalus|Laennec|Melsmon/, // 학명·제품명
];

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
  "/education",
  "/insurance",
  "/partners",
  "/visa",
  "/inquiry",
  "/inquiry/referral",
  "/search",
  "/specialties/korean-medicine",
  "/cost-calculator",
];

// 소문자로 시작하는 라틴 단어를 품은 «문장»만 잡는다(위 주석). 단어 = 라틴 글자로 시작하는 토큰.
function isEnglishSentence(s: string): boolean {
  if (/[Ѐ-ӿ가-힣]/.test(s)) return false;
  // «/» 로도 가른다 — 「KRW/session」 이 한 토큰으로 묶여 «단어 2개 미만»으로 빠져나갔다(2026-09-06 zh·ja 스캔에서 발견).
  const words = s.split(/[\s\/]+/).filter((w) => /^[A-Za-z][A-Za-z'’\-&·.,:;()]*$/.test(w));
  if (words.length < 2) return false;
  return words.some((w) => /^[a-z]/.test(w));
}
function isAllowed(s: string) {
  return ALLOW.some((a) => (typeof a === "string" ? s.includes(a) : a.test(s)));
}

for (const [loc, tag] of [["ru", "@smoke "], ["kz", ""]] as const) {
  for (const route of ROUTES) {
    test(`${tag}@i18n-leak /${loc}${route === "/" ? "" : route} — ${loc} 화면에 영어 문장 누출 없음`, async ({ page }) => {
      const resp = await page.goto(`/${loc}${route === "/" ? "" : route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      // 빈 화면·오류 화면을 «누출 0건»으로 통과시키지 않는다(a11y-scan 과 같은 이유 — 독립 리뷰).
      expect(resp?.status() ?? 0, "화면이 열리지 않았다").toBeLessThan(400);
      const texts: string[] = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const out = new Set<string>();
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const el = n.parentElement as HTMLElement | null;
          if (!el) continue;
          if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
          // 숨김 제외 — offsetParent 는 position:fixed 요소(쿠키 띠·챗 단추)에서도 null 이라 쓰지 않는다
          if (el.getClientRects().length === 0) continue;
          const t = (n.textContent || "").trim();
          if (t) out.add(t.length > 120 ? t.slice(0, 120) + "…" : t);
        }
        return [...out];
      });
      expect(texts.length, "보이는 글자가 너무 적다 — 그려지지 않은 화면을 재고 있다").toBeGreaterThan(20);
      const real = texts.filter((s) => isEnglishSentence(s) && !isAllowed(s));
      expect(
        real,
        `\n[/${loc}${route}] ${loc} 화면에 영어 문장이 샜습니다 (${real.length}건) — 데이터 파일이 { ko, en } 두 칸뿐인지 보라:\n` +
          real.map((s) => "  • " + s).join("\n") + "\n",
      ).toEqual([]);
    });
  }
}
