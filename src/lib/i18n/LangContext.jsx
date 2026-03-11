"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getLangCodeFromCookie } from "./index";

const LangContext = createContext("en");

export function LangProvider({ children }) {
  // 초기값은 항상 "en" — 서버/클라이언트 첫 렌더를 맞춰 하이드레이션 오류 방지.
  // 실제 언어는 마운트 후 useEffect에서 쿠키로 반영.
  const [langCode, setLangCode] = useState("en");
  useEffect(() => {
    setLangCode(getLangCodeFromCookie());
  }, []);
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
