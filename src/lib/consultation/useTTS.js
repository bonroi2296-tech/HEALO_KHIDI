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
      const matchingVoice = voices.find((v) => v.lang.startsWith(langPrefix));
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
