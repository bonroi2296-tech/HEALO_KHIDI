"use client";

/**
 * useStickToBottom — 채팅·자막기록 같은 «계속 쌓이는 목록»을 맨 아래에 붙여두는 훅.
 *
 * 2026-07-29 PO 제보 세 가지를 한 번에 고친다:
 *   ③ 패널을 닫았다 열면 스크롤이 맨 위 — 컨테이너가 새로 만들어지는데 아무도 안 내려줬다
 *      (게다가 채팅 탭엔 자동 스크롤이 아예 없었고 번역 탭에만 있었다).
 *   ⑩ 줄이 쌓이면 «지멋대로 올라갔다 내려갔다 춤춘다» — 새 줄마다 부드러운 스크롤
 *      애니메이션을 걸어서, 4초 폴링·자막이 겹칠 때마다 애니메이션이 서로를 덮어썼다.
 *   + 읽으려고 위로 올려놔도 다시 바닥으로 끌어내리던 것.
 *
 * 규칙: 바닥 근처면 따라 내려가고, 위로 올려놨으면 가만둔다. 열 때는 애니메이션 없이 즉시 바닥.
 *
 * ⚠️ 화면 컴포넌트(page.jsx) 안에 두지 않고 여기로 뺀 이유: 실통화 없이 검증할 수 있는
 *    유일한 층이라 단위시험을 붙이려고. (transcriptOrder.ts 와 같은 이유)
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** 바닥에서 이 거리(px) 안이면 «따라가는 중»으로 본다. 한 줄 높이보다 넉넉하게. */
export const STICK_THRESHOLD_PX = 120;

/**
 * 지금 «바닥을 따라가는 중»인가.
 * @param {{scrollHeight:number, scrollTop:number, clientHeight:number}} box
 */
export function shouldFollow(box, threshold = STICK_THRESHOLD_PX) {
  if (!box) return true; // 잴 수 없으면 따라간다(빈 목록·첫 렌더)
  const { scrollHeight = 0, scrollTop = 0, clientHeight = 0 } = box;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

/**
 * @param {any} dep — 이 값이 바뀌면 «새 줄이 왔다»로 보고 바닥으로 따라간다(목록 배열을 넘긴다).
 * @returns {{ setRef, onScroll, hasNew: boolean, jumpToBottom: () => void }}
 *   hasNew: 위로 올려 읽는 동안 새 줄이 쌓였다 → 화면에 «↓ 새 소식» 단추를 띄우는 근거.
 *   jumpToBottom: 그 단추를 눌렀을 때 바닥으로.
 */
export function useStickToBottom(dep) {
  const elRef = useRef(null);
  const stickRef = useRef(true);
  // 위로 올려 읽는 동안 새 줄이 왔는가.
  // 왜 필요한가(2026-07-29 실측): «읽는 중엔 안 끌어내린다»만 넣으면, 사용자는 아래에
  //   새 자막이 쌓이는 걸 모르고 **손으로 끝까지 내려야** 한다. PO 불만의 본질이 바로
  //   그 «다시 내려야 해»였다 — 안 끌어내리는 것만으론 절반만 고친 것이다.
  const [hasNew, setHasNew] = useState(false);

  // 콜백 ref: 패널을 열거나 탭을 바꿔 컨테이너가 «새로 붙는 순간» 바닥으로.
  // (효과로는 못 잡는다 — 컨테이너만 새로 생기고 목록 값은 안 바뀌기 때문)
  const setRef = useCallback((el) => {
    elRef.current = el;
    if (el) {
      stickRef.current = true;
      setHasNew(false);
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const onScroll = useCallback(() => {
    if (!elRef.current) return;
    const follow = shouldFollow(elRef.current);
    stickRef.current = follow;
    if (follow) setHasNew(false); // 손으로 바닥까지 내려왔으면 «못 본 줄»은 없다
  }, []);

  const jumpToBottom = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    stickRef.current = true;
    setHasNew(false);
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (stickRef.current) el.scrollTop = el.scrollHeight;
    else setHasNew(true);
  }, [dep]);

  return { setRef, onScroll, hasNew, jumpToBottom };
}
