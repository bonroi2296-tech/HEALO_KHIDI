import { test, expect } from "@playwright/test";

/**
 * 헤더가 «겹치지 않는가» — 러시아어·카자흐어 데스크톱.
 *
 * 왜 생겼나 (2026-07-29): 병원용 판(템플릿)을 만들다 우연히 발견했는데,
 * **실서비스 healwith.co.kr 러시아어·카자흐어 헤더가 1280~1440px 에서 깨져 있었다.**
 * 「Страховой гид」가 언어 선택기를 덮고 「Зарегистрироваться」(회원가입)가 잘려 있었다.
 * 러시아·CIS 가 주력 시장인데 그 언어 데스크톱 방문자 **전원**이 그 화면을 봤다.
 *
 * 원인: 헤더 왼쪽 묶음은 «줄어들되» 안의 항목이 `whitespace-nowrap` 이라 안 줄어
 *      오른쪽 묶음 위로 삐져나왔다. 상자는 안 겹치는데 «글자»가 겹치는 형태.
 *
 * ⚠️ 그래서 이 검사는 `getBoundingClientRect()` 만 보면 안 된다 — 그 값은
 *    `overflow: hidden` 으로 잘린 부분까지 포함해 돌려준다(내가 실제로 여기 속았다).
 *    조상들의 overflow 상자와 교집합을 낸 **「화면에 보이는 영역」**으로 겹침을 잰다.
 */

/**
 * ⚠️ 이 함수는 반드시 «함수 그대로» `page.evaluate()` 에 넘긴다.
 *    처음엔 문자열(`` `() => {...}` ``)로 넘겼는데, 문자열을 주면 Playwright 는 그걸
 *    **식(expression)으로 평가**한다 → 결과가 «함수 객체»라 직렬화가 안 돼 `undefined` 가 온다.
 *    그래서 첫 자동 검사가 `Cannot read properties of undefined (reading 'join')` 로 죽었다.
 */
function 겹침세기() {
  const 보이는영역 = (el: Element) => {
    const b = el.getBoundingClientRect();
    const box = { l: b.left, r: b.right, t: b.top, bo: b.bottom };
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = getComputedStyle(p);
      if (s.overflowX !== "visible" || s.overflowY !== "visible") {
        const pb = p.getBoundingClientRect();
        box.l = Math.max(box.l, pb.left);
        box.r = Math.min(box.r, pb.right);
        box.t = Math.max(box.t, pb.top);
        box.bo = Math.min(box.bo, pb.bottom);
      }
      p = p.parentElement;
    }
    return box;
  };
  const hdr = document.querySelector("header");
  if (!hdr) return ["헤더를 못 찾음"];
  const items = Array.from(hdr.querySelectorAll("a,button")).filter((e) => {
    const b = e.getBoundingClientRect();
    return b.width > 8 && b.height > 8 && (e as HTMLElement).offsetParent !== null;
  });
  const over: string[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].contains(items[j]) || items[j].contains(items[i])) continue;
      const a = 보이는영역(items[i]);
      const c = 보이는영역(items[j]);
      if (a.r <= a.l || c.r <= c.l) continue; // 완전히 잘린 것은 화면에 없다
      if (a.r > c.l + 1 && c.r > a.l + 1 && a.bo > c.t + 1 && c.bo > a.t + 1) {
        over.push(
          (items[i].textContent || "").trim().slice(0, 16) + " ✕ " + (items[j].textContent || "").trim().slice(0, 16),
        );
      }
    }
  }
  return over;
}

for (const lang of ["ru", "kz"]) {
  for (const width of [1280, 1366, 1440]) {
    test(`@smoke 헤더가 안 겹친다 — ${lang} ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/${lang}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("header", { timeout: 20000 });
      await page.waitForTimeout(800);

      const 겹침 = await page.evaluate(겹침세기);
      // 판정 함수가 값을 못 돌려주면 «통과»가 아니라 «검사 실패»다(빈 배열과 구분).
      expect(Array.isArray(겹침), "판정 함수가 배열을 못 돌려줬다 — 검사 자체가 안 돈 것").toBe(true);
      expect(겹침, `헤더 항목이 겹쳤다: ${겹침.join(" | ")}`).toEqual([]);

      // 「회원가입」 버튼이 오른쪽 끝에서 잘리지 않았는지 — 실제로 잘려 있었다.
      const 잘림 = await page.evaluate(() => {
        const hdr = document.querySelector("header");
        const btns = [...hdr!.querySelectorAll("a,button")].filter((e) => {
          const b = e.getBoundingClientRect();
          return b.width > 8 && b.height > 8 && (e as HTMLElement).offsetParent !== null;
        });
        const 오른쪽끝 = btns.reduce((m, e) => Math.max(m, e.getBoundingClientRect().right), 0);
        return Math.round(오른쪽끝 - window.innerWidth);
      });
      expect(잘림, "헤더 오른쪽 끝이 화면 밖으로 나갔다").toBeLessThanOrEqual(1);

      // 메뉴 항목이 잘려 반쪽 단어가 되지 않았는지.
      const 메뉴잘림 = await page.evaluate(() => {
        const n = document.querySelector("header nav");
        return n ? Math.max(0, n.scrollWidth - n.clientWidth) : 0;
      });
      expect(메뉴잘림, "메뉴가 잘려 단어가 반쪽으로 보인다").toBeLessThanOrEqual(1);
    });
  }
}
