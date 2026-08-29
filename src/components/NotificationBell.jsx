'use client';

/**
 * 인앱 알림 벨 (공용) — 환자(fixed 플로팅) + 직원 상단바(inline) 양쪽에서 사용.
 * notifications 테이블에 RLS(본인 select/update)가 걸려 있어 별도 서버 API 없이
 * 브라우저 Supabase 클라이언트로 직접 조회·읽음처리한다. 30초 폴링.
 * 발신은 서버의 sendInAppNotification / notifyStaffNewInquiry (@/lib/notifications/inApp).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';
import { resolveNotificationLink } from '@/lib/notifications/resolveLink';

// 상대 시간 (간단) — 외부 라이브러리 없이. 단위 라벨은 중앙 사전(notifBell.ago*).
function ago(iso, lang) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}${t('notifBell.agoDay', lang)}`;
  if (h > 0) return `${h}${t('notifBell.agoHour', lang)}`;
  if (m > 0) return `${m}${t('notifBell.agoMin', lang)}`;
  return `${Math.floor(s)}${t('notifBell.agoSec', lang)}`;
}

/**
 * @param {"fixed"|"inline"} variant - fixed: 우상단 플로팅(환자). inline: 상단바 안(직원).
 */
export default function NotificationBell({ variant = 'fixed' }) {
  const router = useRouter();
  // 렌더 중 쿠키 읽기 금지(서버='en' vs 브라우저='ko' → Hydration Error).
  // useLang 은 LangProvider(=ClientShell) 하위에서만 올바르다 — 밖이면 조용히 'en'.
  const lang = useLang();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const supabaseRef = useRef(null);

  const getClient = () => {
    if (!supabaseRef.current) supabaseRef.current = createSupabaseBrowserClient();
    return supabaseRef.current;
  };

  const load = useCallback(async () => {
    try {
      const supabase = getClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setItems([]); return; }
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, payload, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(15);
      setItems(data || []);
    } catch {
      // silent — 알림은 보조 기능, 실패해도 화면 안 깨지게
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  const markRead = async (ids) => {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, read_at: now } : n));
    try {
      await getClient().from('notifications').update({ read_at: now }).in('id', ids);
    } catch { /* 낙관적 업데이트 — 실패해도 다음 폴링에서 보정 */ }
  };

  const onItem = (n) => {
    if (!n.read_at) markRead([n.id]);
    setOpen(false);
    // payload 로 주소 보정 (옛 알림은 link 가 목록 주소라 «그 대화»로 못 갔다 — resolveLink.ts)
    const href = resolveNotificationLink(n);
    if (href) router.push(href);
  };

  const isInline = variant === 'inline';

  return (
    <div ref={panelRef} className={isInline ? 'relative' : 'fixed top-2.5 right-3 z-[60]'}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('notifBell.title', lang)}
        className={isInline
          ? 'relative p-2 rounded-full text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 transition-colors'
          : 'relative p-2 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm hover:bg-gray-50 transition'}
      >
        <Bell size={isInline ? 17 : 18} className={isInline ? '' : 'text-gray-600'} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* 폰에서는 «종 아이콘 기준»으로 붙이지 않는다 — 백오피스 상단바는 종 옆에 언어·로그아웃이
          더 있어 종이 화면 가운데쯤 온다. 그러면 320px 짜리 목록이 왼쪽 화면 밖으로 밀려나
          제목 앞글자가 잘린다(2026-08-04 PO 제보, 실측 왼끝 -49px).
          좁은 화면: 화면 양쪽 8px 만 남기고 펼친다. 넓은 화면(sm 이상): 기존처럼 종에 붙인다. */}
      {open && (
        <div className="fixed left-2 right-2 top-14 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[70]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">{t('notifBell.title', lang)}</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markRead(items.filter((n) => !n.read_at).map((n) => n.id))}
                  className="text-xs text-teal-700 hover:underline px-1.5"
                >
                  {t('notifBell.markAll', lang)}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={15} className="text-gray-500" />
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">{t('notifBell.empty', lang)}</div>
          ) : (
            <ul className="max-h-96 overflow-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onItem(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${n.read_at ? '' : 'bg-teal-50/40'}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read_at && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 truncate">{n.title}</div>
                        {n.body && <div className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</div>}
                        <div className="text-[10px] text-gray-500 mt-1">{ago(n.created_at, lang)}</div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
