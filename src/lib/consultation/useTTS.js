/**
 * Text-to-Speech Hook
 *
 * 번역된 텍스트를 브라우저 TTS로 음성 재생합니다.
 */

import { useCallback, useRef, useState } from "react";

const LANG_MAP = {
  ko: "ko-KR",
  ru: "ru-RU",
  en: "en-US",
  kz: "kk-KZ",
  zh: "zh-CN",
  ja: "ja-JP",
};

export function useTTS({ language = "en" }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const speak = useCallback(
    (text) => {
      if (!text || typeof window === "undefined" || !window.speechSynthesis) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANG_MAP[language] || "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1;

      // Try to find a voice for the target language
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = LANG_MAP[language]?.split("-")[0] || "en";
      // ⚠️ getVoices() 는 목록이 «채워지는 도중»에 부르면 lang 이 없는 항목을 줄 수 있다.
      //    보호가 없으면 여기서 예외가 나 읽어주기가 통째로 죽는다(2026-08-28 실측: 간헐 발생).
      const matchingVoice = voices.find((v) => v?.lang?.startsWith(langPrefix));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const isSupported =
    typeof window !== "undefined" && !!window.speechSynthesis;

  return { speak, stop, isSpeaking, isSupported };
}
