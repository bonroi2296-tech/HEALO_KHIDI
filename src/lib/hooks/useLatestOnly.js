"use client";

/**
 * 「늦게 도착한 옛 응답이 새 결과를 덮는 것」을 막는 자물쇠.
 *
 * 왜 부품으로 빼나 (2026-08-28):
 *   목록 화면에서 거름망을 바꾸면 조회가 겹친다. 먼저 보낸 요청이 늦게 오면 그 «옛» 결과가
 *   새 목록을 덮어써서, 화면엔 「전체」가 눌려 있는데 목록은 옛 것이 남는다. 오류가 안 떠서
 *   사람은 「원래 이만큼인가 보다」로 읽는다.
 *   딥링크가 «자동으로» 거름망을 바꾸는 자리를 만들면서 이 겹침이 «항상» 일어나게 됐고,
 *   같은 순번 코드를 화면마다 손으로 베끼다 보니 자물쇠가 없었다. 한 곳에 두고 시험으로 잠근다.
 *
 * 쓰는 법:
 *   const beginRequest = useLatestOnly();
 *   async function load() {
 *     const isLatest = beginRequest();
 *     const data = await fetch(...);
 *     if (!isLatest()) return;   // 이미 지난 조회 — 버린다
 *     setRows(data);
 *   }
 */

import { useState } from "react";

/**
 * 순번 자물쇠(리액트와 무관한 순수 함수 — 시험 대상).
 * @returns {() => (() => boolean)} begin() 을 부르면 «내가 아직 최신인가»를 묻는 함수를 돌려준다.
 */
export function createLatestGate() {
  let seq = 0;
  return function begin() {
    const mine = ++seq;
    return () => mine === seq;
  };
}

/**
 * 화면에서 쓰는 훅. 다시 그려져도 자물쇠는 그대로 유지된다.
 * (렌더 «중»에 ref 를 건드리면 안 된다는 리액트 규칙 때문에 useState 의 「처음 한 번만」 초기화를 쓴다.)
 */
export function useLatestOnly() {
  const [begin] = useState(createLatestGate);
  return begin;
}
