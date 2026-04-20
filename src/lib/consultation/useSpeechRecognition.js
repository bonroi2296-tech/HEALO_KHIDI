/**
 * Real-time Speech Recognition Hook
 *
 * 브라우저 Web Speech API를 사용하여 음성을 실시간으로 텍스트로 변환합니다.
 * 한국어(ko-KR), 러시아어(ru-RU), 영어(en-US) 지원.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const LANG_MAP = {
  ko: "ko-KR",
  ru: "ru-RU",
  en: "en-US",
  kz: "kk-KZ",
  zh: "zh-CN",
  ja: "ja-JP",
};

export function useSpeechRecognition({ language = "ko", onResult, onInterim, enabled = true }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = LANG_MAP[language] || "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && onInterim) {
        onInterim(interimTranscript);
      }

      if (finalTranscript && onResult) {
        onResult(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("[STT] Error:", event.error);
      if (event.error === "not-allowed") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      if (enabledRef.current && recognitionRef.current) {
        try {
          recognition.start();
        } catch (_e) {
          // Already started
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (_e) {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [language]);

  // Update callbacks without recreating recognition
  useEffect(() => {
    if (!recognitionRef.current) return;
    const recognition = recognitionRef.current;

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && onInterim) {
        onInterim(interimTranscript);
      }
      if (finalTranscript && onResult) {
        onResult(finalTranscript);
      }
    };
  }, [onResult, onInterim]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (_e) {
      // Already started
    }
  }, []);

  const stop = useCallback(() => {
    enabledRef.current = false;
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (_e) {
      // ignore
    }
  }, []);

  return { isListening, isSupported, start, stop };
}
