"use client";

// src/components/Toast.jsx
// Toast = 화면에 잠깐 나타났다 사라지는 알림 메시지
// alert() 대신 사용하는 더 예쁘고 사용자 친화적인 방법

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, Info, AlertCircle, X } from 'lucide-react';
import { getLangCodeFromCookie } from '../lib/i18n';

// Toast 타입: success(성공), error(에러), info(정보), warning(경고)
const ToastContext = createContext(null);
const MAX_TOASTS = 5;

// 토스트 UI 고정 문구 (6개 언어)
const TOAST_COPY = {
  ko: { notifications: "알림", dismissAll: "모두 닫기", close: "닫기" },
  en: { notifications: "Notifications", dismissAll: "Dismiss all", close: "Close" },
  ru: { notifications: "Уведомления", dismissAll: "Закрыть все", close: "Закрыть" },
  kz: { notifications: "Хабарламалар", dismissAll: "Барлығын жабу", close: "Жабу" },
  zh: { notifications: "通知", dismissAll: "全部关闭", close: "关闭" },
  ja: { notifications: "通知", dismissAll: "すべて閉じる", close: "閉じる" },
};

function safeMessage(msg) {
  if (msg == null) return "";
  if (typeof msg === "string") return msg;
  if (typeof msg === "object" && msg.message) return String(msg.message);
  try {
    return String(msg);
  } catch {
    return "Notification";
  }
}

// Toast Provider - 앱 전체에서 Toast를 사용할 수 있게 해주는 컴포넌트
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [lang, setLang] = useState("en");
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const c = TOAST_COPY[lang] || TOAST_COPY.en;

  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const persistent = type === "error";
    const newToast = { id, message: safeMessage(message), type };

    setToasts((prev) => {
      const next = [...prev, newToast];
      return next.slice(-MAX_TOASTS);
    });

    if (!persistent) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  // 참조 안정성 필수: 메모 없이 두면 매 렌더 새 객체가 나가서, useToast()를 deps에 쓰는
  // 화면(예: 코디 AI 상담 리드)의 useEffect가 렌더마다 재실행 → 무한 재요청 루프.
  const toast = useMemo(() => ({
    success: (message) => addToast(message, "success"),
    error: (message) => addToast(message, "error"),
    info: (message) => addToast(message, "info"),
    warning: (message) => addToast(message, "warning", 5000),
  }), [addToast]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, removeToast, removeAllToasts }}>
      {children}
      <div
        // ⚠️ `top-4`(16px) 만으로는 폰 앱에서 알림 상자가 «상태표시줄(시계·배터리) 밑에» 깔린다.
        //    2026-08-20 흉내기 실측: 안전영역 위쪽이 24px 인데 상자는 16px 에서 시작 → 8px 물림.
        //    노치·펀치홀 기기는 그 여백이 더 커서 더 많이 가려진다.
        className="fixed top-[calc(1rem+var(--healo-safe-top))] left-1/2 -translate-x-1/2 z-[200] space-y-2 pointer-events-none"
        role="region"
        aria-live="polite"
        aria-label={c.notifications}
      >
        {toasts.length > 2 && (
          <div className="pointer-events-auto flex justify-end">
            <button
              type="button"
              onClick={removeAllToasts}
              className="text-xs text-gray-500 hover:text-gray-700 bg-white/90 px-2 py-1 rounded border border-gray-200"
            >
              {c.dismissAll}
            </button>
          </div>
        )}
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} closeLabel={c.close} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// 개별 Toast 아이템 컴포넌트
const ToastItem = ({ toast, onRemove, closeLabel }) => {
  const { message, type } = toast;

  // 타입별 스타일 설정
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle2 size={20} className="text-green-700" />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <XCircle size={20} className="text-red-600" />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info size={20} className="text-blue-600" />,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertCircle size={20} className="text-yellow-600" />,
    },
  };

  const style = styles[type] || styles.info;

  const text = safeMessage(message);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        ${style.bg} ${style.border} ${style.text}
        border rounded-xl shadow-lg p-4 min-w-[300px] max-w-[400px]
        flex items-start gap-3 animate-in slide-in-from-right fade-in
        pointer-events-auto
      `}
    >
      <div className="shrink-0 mt-0.5" aria-hidden="true">{style.icon}</div>
      <div className="flex-1 text-sm font-medium whitespace-pre-line">{text}</div>
      <button
        type="button"
        aria-label={closeLabel || "Close"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(toast.id);
        }}
        className="shrink-0 p-1 hover:bg-black/5 rounded transition"
      >
        <X size={16} className={style.text} />
      </button>
    </div>
  );
};

// Hook - 다른 컴포넌트에서 쉽게 사용하기 위한 함수
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context.toast;
};
