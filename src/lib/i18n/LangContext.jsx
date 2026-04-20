"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { getLangCodeFromCookie } from "./index";

const LangContext = createContext("en");

// React 19 권장: useSyncExternalStore 로 외부 상태(cookie) 동기화.
// useEffect + setState 로 초기화하던 구 패턴은 cascading rerender 경고 대상.
// SSR 첫 렌더는 snapshot(=server)='en' 으로 안정적, 클라이언트 hydration 후 cookie 값 반영.
function subscribeLangChange(callback) {
  if (typeof window === "undefined") return () => {};
  // cookie 변경 이벤트는 브라우저 표준이 없어 커스텀 이벤트 + storage 이벤트로 대체
  window.addEventListener("storage", callback);
  window.addEventListener("healo:langchange", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("healo:langchange", callback);
  };
}
function getClientLang() {
  return getLangCodeFromCookie() || "en";
}
function getServerLang() {
  return "en";
}

export function LangProvider({ children }) {
  const langCode = useSyncExternalStore(subscribeLangChange, getClientLang, getServerLang);
  return (
    <LangContext.Provider value={langCode}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const lang = useContext(LangContext);
  return lang || "en";
}
