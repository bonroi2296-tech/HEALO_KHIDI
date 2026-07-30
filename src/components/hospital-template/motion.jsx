"use client";

/**
 * 판의 「움직임」 — 스크롤하면 요소가 떠오르며 나타난다.
 *
 * 왜 필요했나 (2026-07-28 PO: "계속 틀에 박혀 있는 톤"):
 *   상위 사이트 실측 — 유니성형외과(jp.uni114.com) `transition 33 · animation 9 · @keyframes 8`,
 *   ID병원 영문 `Swiper 199회`. **요즘 사이트는 화면이 살아 움직인다.**
 *   반면 내가 만든 판은 hover 말고는 움직임이 0이라, 잘 정리돼 있어도 «죽은 화면»으로 읽혔다.
 *
 * ⚠️ 라이브러리(AOS·GSAP·Swiper)를 넣지 않는다 — 판은 병원마다 복제되므로 무거워지면 안 된다.
 *   브라우저 기본 기능(IntersectionObserver + CSS transition)만으로 같은 효과를 낸다.
 *
 * ♿ `prefers-reduced-motion`(사용자가 「움직임 줄이기」를 켠 경우)이면 **애니메이션을 끈다.**
 *   의료 사이트라 어지럼증·전정장애 환자가 실제 방문자다. 이건 선택이 아니라 요건.
 */

import { useEffect, useRef, useState } from "react";

export function Reveal({ children, delay = 0, y = 24, className = "", as: Tag = "div", style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // 움직임 줄이기를 켠 사용자는 애니메이션 없이 바로 보인다.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    // 이미 화면에 있으면(첫 화면) 즉시 보여준다 — 관찰만 기다리면 히어로가 늦게 뜬다.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        // 넘겨받은 style 을 먼저 깔고 움직임 값을 덮는다 — 색·자간 같은 건 그대로 살리되
        // opacity/transform 은 이 컴포넌트가 관리해야 하므로 순서를 바꾸면 안 된다.
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * 가로로 넘기는 줄 — 격자 대신 «옆으로 흐르는» 배치.
 *
 * 상위 사이트가 Swiper 를 쓰는 자리를 **CSS scroll-snap** 으로 대신한다(라이브러리 0).
 * 격자만 반복하면 아래로 갈수록 같은 리듬이라 지루해지는데, 한 줄만 가로로 흐르게 해도
 * 화면에 리듬이 생긴다. 모바일에서는 원래 손가락으로 넘기는 게 자연스럽다.
 *
 * 🔴 **2026-07-30 수리 — 「더 있는 것처럼 보여주고 넘길 방법을 안 주는」 줄이었다.**
 *    PO 지적: *"이거 뭐 우측에 영상 더 보일것처럼 안보여주는건 뭐임?"*
 *    원인: 이 줄은 **스크롤바를 일부러 숨긴다**(`scrollbar-width:none`). 손가락으로 넘기는
 *    휴대폰에서는 맞는 선택인데, **마우스 쓰는 사람에겐 넘길 방법이 하나도 안 남는다** —
 *    화살표도 없고 스크롤바도 없고, 오른쪽 카드만 반쯤 잘려 보인다.
 *    그래서 「덜 만든 화면」이 아니라 **「고장난 화면」으로 읽힌다.** 애태우기만 하는 셈이다.
 *    → 화살표 단추를 붙였다. 다만 조건이 있다:
 *      ① **넘칠 때만 보인다.** 카드가 화면에 다 들어오는데 화살표가 있으면 그게 또 거짓말이다.
 *      ② 끝에 닿으면 그쪽 화살표는 사라진다(눌러도 안 되는 단추를 남기지 않는다).
 *      ③ 휴대폰(md 미만)에서는 안 그린다 — 손가락으로 넘기는 게 자연스럽고 화면도 좁다.
 *      ④ 「움직임 줄이기」를 켠 사용자는 부드러운 이동 없이 즉시 이동(어지럼증 배려).
 *      ⑤ 배경색이 섹션마다 달라(모래·흰색·남색) **그라데이션 페이드는 안 쓴다** — 색을 맞춰야 하는데
 *         한 번 틀리면 얼룩이 된다(휴대폰 메뉴에서 그 함정을 이미 겪었다). 흰 동그라미 단추로 간다.
 */
export function SnapRow({ children, className = "" }) {
  const ref = useRef(null);
  const [넘침, set넘침] = useState({ 왼쪽: false, 오른쪽: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* 「넘치나」를 **폭 계산이 아니라 카드 위치로** 판정한다.
       처음엔 `scrollLeft > 2` 로 했는데 **맨 처음 상태에서도 「이전」 화살표가 떠 있었다** —
       이 줄은 좌우 여백(`px-5 md:px-8`)이 있고 snap 이 걸려 있어 가만히 둬도 `scrollLeft` 가 32였다.
       눌러도 왼쪽에 아무것도 없는 화살표 = 이번에 고치려던 그 거짓말과 똑같은 종류다.
       그래서 «첫 카드가 왼쪽으로 잘렸나 / 마지막 카드가 오른쪽으로 잘렸나»를 직접 본다 —
       이게 사람 눈이 실제로 묻는 질문이고, 여백·snap·소수점에 안 흔들린다. */
    const 재기 = () => {
      const 카드 = el.children;
      if (!카드.length) return set넘침({ 왼쪽: false, 오른쪽: false });
      const 통 = el.getBoundingClientRect();
      const 첫 = 카드[0].getBoundingClientRect();
      const 끝 = 카드[카드.length - 1].getBoundingClientRect();
      set넘침({ 왼쪽: 첫.left < 통.left - 2, 오른쪽: 끝.right > 통.right + 2 });
    };
    재기();
    el.addEventListener("scroll", 재기, { passive: true });
    const ro = new ResizeObserver(재기);
    ro.observe(el);
    // 사진이 늦게 로드되면 폭이 바뀌므로 자식도 지켜본다.
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      el.removeEventListener("scroll", 재기);
      ro.disconnect();
    };
  }, [children]);

  const 밀기 = (방향) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    // 한 번에 «보이는 폭의 85%» — 카드 하나만 움직이면 답답하고, 한 화면을 다 넘기면 놓친 게 생긴다.
    el.scrollBy({ left: 방향 * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };

  const 단추 = "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10 h-11 w-11 items-center justify-center rounded-full bg-white text-[#16211C] shadow-[0_2px_12px_rgba(0,0,0,0.18)] transition hover:scale-105 active:scale-95";

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`flex gap-4 md:gap-5 overflow-x-auto pb-3 -mx-5 px-5 md:-mx-8 md:px-8 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      {넘침.왼쪽 && (
        <button type="button" onClick={() => 밀기(-1)} className={`${단추} left-0 md:-left-2`} aria-label="이전">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {넘침.오른쪽 && (
        <button type="button" onClick={() => 밀기(1)} className={`${단추} right-0 md:-right-2`} aria-label="다음">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
