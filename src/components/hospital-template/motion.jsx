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
 */
export function SnapRow({ children, className = "" }) {
  return (
    <div
      className={`flex gap-4 md:gap-5 overflow-x-auto pb-3 -mx-5 px-5 md:-mx-8 md:px-8 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
}
