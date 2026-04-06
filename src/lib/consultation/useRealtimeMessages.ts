'use client';

import { useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '../supabase/browser';

export interface RealtimeMessage {
  id: number;
  consultation_id: number;
  sender_id: string;
  sender_role: string;
  sender_name: string;
  message_text: string;
  created_at: string;
  is_edited?: boolean;
}

/**
 * Subscribe to real-time INSERT events on consultation_messages for a given consultation.
 * Calls onNewMessage whenever a new row is inserted by another participant.
 */
export function useRealtimeMessages(
  consultationId: string | number | null,
  onNewMessage: (msg: RealtimeMessage) => void,
) {
  const callbackRef = useRef(onNewMessage);
  callbackRef.current = onNewMessage;

  useEffect(() => {
    if (!consultationId) return;

    const supabase = createSupabaseBrowserClient();
    const channelName = `consultation-${consultationId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_messages',
          filter: `consultation_id=eq.${consultationId}`,
        },
        (payload) => {
          callbackRef.current(payload.new as RealtimeMessage);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId]);
}
