/**
 * 토스트 알림 커스텀 훅
 */
import { useState, useCallback } from "react";

export interface ToastMessage {
  type: "success" | "error";
  message: string;
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}
