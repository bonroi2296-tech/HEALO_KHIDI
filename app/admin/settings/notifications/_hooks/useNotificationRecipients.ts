/**
 * 알림 수신자 데이터 관리 커스텀 훅
 */
import { useState, useEffect, useCallback } from "react";
import type { Recipient } from "../_types";

export function useNotificationRecipients() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchRecipients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/notification-recipients");
      const data = await res.json();

      if (data.ok) {
        setRecipients(data.recipients || []);
        setError(null);
        setErrorCode(null);
      } else {
        setError(data.error || "Failed to load recipients");
        setErrorCode(data.errorCode || null);
      }
    } catch (err: any) {
      setError(err.message);
      setErrorCode("FETCH_ERROR");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleRecipient = useCallback(async (id: string, currentActive: boolean) => {
    const res = await fetch(`/api/admin/notification-recipients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentActive }),
    });

    const data = await res.json();
    
    if (data.ok) {
      await fetchRecipients();
      return { success: true };
    } else {
      return { success: false, error: data.error || "토글 실패" };
    }
  }, [fetchRecipients]);

  const deleteRecipient = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/notification-recipients/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    
    if (data.ok) {
      await fetchRecipients();
      return { success: true };
    } else {
      return { success: false, error: data.error || "삭제 실패" };
    }
  }, [fetchRecipients]);

  const updateRecipient = useCallback(async (id: string, updates: any) => {
    const res = await fetch(`/api/admin/notification-recipients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    
    if (data.ok) {
      await fetchRecipients();
      return { success: true };
    } else {
      return { success: false, error: data.error || data.detail || "수정 실패" };
    }
  }, [fetchRecipients]);

  const addRecipient = useCallback(async (body: any) => {
    const res = await fetch("/api/admin/notification-recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    
    if (data.ok) {
      await fetchRecipients();
      return { success: true };
    } else {
      const errorMsg = data.error || data.details?.join(", ") || "알 수 없는 오류";
      return { success: false, error: errorMsg };
    }
  }, [fetchRecipients]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  return {
    recipients,
    loading,
    error,
    errorCode,
    fetchRecipients,
    toggleRecipient,
    deleteRecipient,
    updateRecipient,
    addRecipient,
  };
}
