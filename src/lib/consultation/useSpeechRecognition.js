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
  // kk-KZ는 Chrome SpeechRecognition 미지원 → ru-RU 폴백
  kz: "ru-RU",
  zh: "zh-CN",
  ja: "ja-JP",
};

// STT 폴백 적용 후 실제 사용 언어 코드 반환
export function getEffectiveSttLang(lang) {
  if (lang === "kz") return "ru"; // 카자흐어 STT → 러시아어로 폴백
  return lang;
}

export function useSpeechRecognition({ language = "ko", onResult, onInterim, enabled = true }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  // 인앱 브라우저(카카오톡 등)는 webkitSpeechRecognition 이 존재해도 start 시
  // service-not-allowed 로 조용히 죽음 → 사용자에게 알릴 수 있게 실패 상태 노출
  const [failed, setFailed] = useState(false);
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);
  // 삼성 인터넷 등은 API 가 정의돼 있지만 start 직후 결과 없이 즉시 종료를 반복함
  // (에러도 안 냄) → "빠른 종료 3회 연속 + 결과 0" 이면 실질 미지원으로 판정
  const lastStartRef = useRef(0);
  const sawResultRef = useRef(false);
  const quickEndCountRef = useRef(0);

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

    recognition.onstart = () => {
      lastStartRef.current = Date.now();
    };

    recognition.onresult = (event) => {
      sawResultRef.current = true;
      quickEndCountRef.current = 0;
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
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed" ||
        event.error === "audio-capture"
      ) {
        setFailed(true);
        setIsListening(false);
        enabledRef.current = false; // 영구 실패 — 자동 재시작 중지
      }
    };

    recognition.onend = () => {
      // 결과 한 번도 없이 2.5초 내 종료가 3회 연속이면 실질 미지원으로 판정
      if (!sawResultRef.current && Date.now() - lastStartRef.current < 2500) {
        quickEndCountRef.current += 1;
        if (quickEndCountRef.current >= 3) {
          setFailed(true);
          setIsListening(false);
          enabledRef.current = false;
          return;
        }
      }
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
      // 초기 onresult 를 덮어쓰므로 "결과 봤음" 기록도 같이 유지해야
      // 빠른종료 휴리스틱이 정상 브라우저를 미지원으로 오판하지 않음
      sawResultRef.current = true;
      quickEndCountRef.current = 0;
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

  return { isListening, isSupported, failed, start, stop };
}
