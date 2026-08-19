/**
 * 「글자가 상자 밖으로 잘렸나」 탐지기 — 화면 여러 곳에서 «같은 눈»으로 재려고 따로 뺐다.
 *
 * 원본은 e2e/content-clip-sweep.spec.ts 안에 있었고, 독립 리뷰 여러 번을 거치며 오탐을 걷어낸
 * 논리다(truncate·캐러셀·스크롤 영역 제외, 글자 자체의 흘러넘침까지 Range 로 실측).
 * 🛑 베껴 쓰지 마라 — 고칠 일이 있으면 여기 하나를 고쳐라. 두 벌이 되면 한쪽만 똑똑해진다.
 */
import type { Page } from "@playwright/test";

export type Clipped = { text: string; over: number; clipper: string };

export const clipScanner = () => {
  const bad: { text: string; over: number; clipper: string }[] = [];
  const isClipper = (el: Element) => {
    const o = getComputedStyle(el).overflowX;
    return o === "hidden" || o === "clip";
  };
  document.querySelectorAll("body *").forEach((el) => {
    const hasOwnText = [...el.childNodes].some(
      (n) => n.nodeType === 3 && (n.textContent || "").trim()
    );
    if (!hasOwnText) return;
    const txt = (el.textContent || "").trim();
    if (/^BESbswy/.test(txt)) return; // 폰트 로딩 감지 프로브
    if (el.closest(".gm-style") || el.closest('[aria-hidden="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // 가장 가까운 가로 클리핑 조상까지 올라가며 의도 패턴이면 중단
    let node: Element | null = el;
    let clipper: Element | null = null;
    while (node && node !== document.body) {
      const cls = typeof node.className === "string" ? node.className : "";
      if (/truncate|line-clamp|sr-only/.test(cls)) return;
      const cs = getComputedStyle(node);
      if (cs.transform !== "none") return; // 캐러셀/애니메이션 계열
      if (cs.position === "fixed") return;
      // 스크롤하라고 만든 영역(표 래퍼 등)은 잘림이 아니라 설계 (독립 리뷰 D1)
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") return;
      if (node !== el && isClipper(node)) {
        clipper = node;
        break;
      }
      node = node.parentElement;
    }
    // 잘림은 두 형태: ①요소 상자가 경계를 넘음(rect) ②nowrap 텍스트가 자기 상자 안에서
    // 옆으로 흘러넘침(ink overflow — rect는 안 넘지만 글자는 밖에 그려져 잘림). ②는
    // "자기 텍스트 노드"만 Range로 실측 — scrollWidth는 자손 상자까지 섞여 장식 자손이
    // 텍스트 조상 명의로 오탐됨 (독립 리뷰 D1·D2). overflow가 visible일 때만 의미 있음.
    let effRight = r.right;
    if (getComputedStyle(el).overflowX === "visible") {
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && (n.textContent || "").trim()) {
          const range = document.createRange();
          range.selectNodeContents(n);
          const tr = range.getBoundingClientRect();
          if (tr.right > effRight) effRight = tr.right;
        }
      }
    }
    // 중간 클리퍼가 없어도 body/html이 전역 overflow-x hidden(healo-tokens.css 모바일
    // 수평스크롤 방지) → 뷰포트 가장자리가 곧 클리핑 경계다 (독립 리뷰 C1 지적)
    let over: number;
    let clipperLabel: string;
    if (clipper) {
      const cr = clipper.getBoundingClientRect();
      over = Math.max(effRight - cr.right, cr.left - r.left);
      clipperLabel = (typeof clipper.className === "string" ? clipper.className : "").slice(0, 60);
    } else {
      over = Math.max(effRight - document.documentElement.clientWidth, -r.left);
      clipperLabel = "(viewport — body overflow-x hidden)";
    }
    if (over > 4) {
      bad.push({
        text: txt.replace(/\s+/g, " ").slice(0, 50),
        over: Math.round(over),
        clipper: clipperLabel,
      });
    }
  });
  return bad;
};

/** 이 페이지에서 잘린 곳을 찾아 돌려준다. 빈 배열이면 깨끗하다. */
export async function findClipped(page: Page): Promise<Clipped[]> {
  return page.evaluate(clipScanner);
}
