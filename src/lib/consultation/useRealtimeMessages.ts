'use client';

import { useEffect, useRef } from 'react';
import { createSupabaseBrowserClient } from '../supabase/browser';

/**
 * 상담 채팅에 새 메시지가 들어왔음을 알리는 구독.
 *
 * ⚠️ **내용은 전달하지 않는다(신호만).** 대화 본문은 암호문으로 저장되고(POSTMORTEMS #102),
 *   realtime 페이로드는 DB 행 그대로라 브라우저가 복호화할 수 없다 — 키를 브라우저에 두면
 *   암호화의 의미가 없으므로 앞으로도 그럴 일은 없다.
 *   → 호출부는 이 신호를 받고 서버 API(GET /messages, 서버에서 복호화)로 다시 받아야 한다.
 *
 * 계정 사용자 전용 — 게스트는 RLS 상 구독 불가(호출부가 폴링으로 대체).
 */
export function useRealtimeMessages(
  consultationId: string | number | null,
  onNewMessage: () => void,
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
          // ⚠️ 실제 컬럼은 `session_id` 다. 예전엔 `consultation_id` 로 필터해서 이 구독이
          //    한 번도 안 걸렸다(리뷰 발견, 기존 버그 — 그래서 아무도 눈치 못 챔).
          filter: `session_id=eq.${consultationId}`,
        },
        () => {
          // ⚠️ **payload 내용은 쓰지 않는다.** 대화 본문은 이제 암호문으로 저장되고(#102),
          //    realtime 페이로드는 DB 행 그대로라 브라우저가 복호화할 수 없다(키도 없어야 맞다).
          //    그대로 화면에 쓰면 암호문이나 빈칸이 뜬다.
          //    → 여기서는 "새 메시지가 생겼다"는 **신호만** 전달하고, 본문은 호출부가
          //      서버 API(GET /messages, 서버에서 복호화)로 다시 받는다.
          callbackRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId]);
}
