"use client";

/**
 * 알림에서 넘어온 딥링크(`?thread=`·`?inquiry=`·`?lead=`)를 «한 번만, 그러나 확실히» 처리한다.
 *
 * 왜 공용 부품이냐 (2026-08-28 독립 리뷰가 잡음):
 *   같은 코드를 화면 5곳에 손으로 베껴 넣었더니 **베낀 자리마다 다른 버그**가 났다.
 *   ① `window.location.search` 를 «마운트 때 한 번»만 읽으면, 이미 그 화면에 있는 사람이
 *      종(bell) 알림을 눌렀을 때 아무 일도 안 일어난다 — App Router 는 같은 주소의
 *      쿼리만 바뀌면 화면을 다시 만들지 않는다(주소만 바뀌고 화면은 그대로).
 *      → `useSearchParams()` 로 «값이 바뀌면» 다시 처리한다.
 *   ② 목록을 기다리느라 처리를 미루면서 「처리했다」 표시를 안 남기면, 한참 뒤 목록이 바뀔 때
 *      갑자기 서랍이 열린다(그리고 상태를 '열람'으로 바꿔버린다). → 표시는 «처리할 때» 남긴다.
 *   ③ 값이 그대로 주소·API 경로에 들어가면 `../../users` 같은 게 섞여 엉뚱한 API 를 부른다.
 *      → 모양이 안 맞는 값은 아예 버린다(기본: 영숫자·하이픈·밑줄 64자 이내).
 *
 * @param {string} name  읽을 쿼리 이름 (예: "thread")
 * @param {(value: string) => void} onValue  값이 왔을 때 할 일
 * @param {{ ready?: boolean, pattern?: RegExp }} [options]
 *   ready   — 목록 로딩처럼 «준비될 때까지» 미룰 조건 (기본 true)
 *   pattern — 허용할 값 모양 (기본 SAFE_ID)
 */

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/** 주소·API 경로에 그대로 넣어도 안전한 id 모양 (UUID·숫자·짧은 토큰). */
export const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** 숫자 id 전용 (문의 번호 등). */
export const NUMERIC_ID = /^[0-9]{1,18}$/;

export function useDeepLinkParam(name, onValue, options = {}) {
  const { ready = true, pattern = SAFE_ID } = options;
  const params = useSearchParams();
  const raw = params ? params.get(name) : null;
  const value = raw && pattern.test(raw) ? raw : null;

  const handledRef = useRef(null);
  const cbRef = useRef(onValue);
  // 렌더 «중»에 ref 를 건드리면 안 된다(React 규칙) → 효과 안에서 최신 함수로 갈아끼운다.
  // 이 효과가 아래 것보다 «먼저» 선언돼 있어야 첫 처리 때 최신 함수를 쓴다.
  useEffect(() => { cbRef.current = onValue; });

  useEffect(() => {
    if (!ready || !value) return;
    if (handledRef.current === value) return;
    handledRef.current = value; // 처리 «전»에 표시 — 늦게 다시 튀어나오지 않게
    cbRef.current(value);
  }, [value, ready]);
}
