"use client";

/**
 * useNotifications
 *
 * Supabase Realtime 채널로 본인 알림을 실시간 구독한다.
 * - auth.uid() = user_id 인 row만 수신 (RLS 보장)
 * - 미읽음 카운트 반환
 * - markAsRead / markAllRead 제공
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  payload: Record<string, unknown> | null;
  priority: "low" | "normal" | "high" | "urgent";
  read_at: string | null;
  created_at: string;
}

export interface UseNotificationsReturn {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const PAGE_SIZE = 20;

export function useNotifications(): UseNotificationsReturn {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null>(null);
  const userIdRef = useRef<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  // ── 초기 목록 로드 ─────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setItems([]);
        setLoading(false);
        return;
      }
      userIdRef.current = session.user.id;

      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (!error && data) {
        setItems(data as Notification[]);
      }
    } catch (_e) {
      // 무시
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // ── Realtime 구독 ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !mounted) return;

      const uid = session.user.id;
      userIdRef.current = uid;

      // 초기 로드
      await fetchNotifications();

      // Realtime 채널 구독
      const channel = supabase
        .channel(`notifications:${uid}`)
        .on(
          "postgres_changes" as any,
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload: any) => {
            if (!mounted) return;
            const newItem = payload.new as Notification;
            setItems((prev) => [newItem, ...prev].slice(0, PAGE_SIZE));
          }
        )
        .on(
          "postgres_changes" as any,
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload: any) => {
            if (!mounted) return;
            const updated = payload.new as Notification;
            setItems((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
          }
        )
        .subscribe();

      channelRef.current = channel;
    })();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, fetchNotifications]);

  // ── 단건 읽음 처리 ─────────────────────────────────────────
  const markAsRead = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      // 낙관적 업데이트
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
      );
      await (supabase as any)
        .from("notifications")
        .update({ read_at: now })
        .eq("id", id);
    },
    [supabase]
  );

  // ── 전체 읽음 처리 ─────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await (supabase as any)
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", uid)
      .is("read_at", null);
  }, [supabase]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  return {
    items,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
    refetch: fetchNotifications,
  };
}
