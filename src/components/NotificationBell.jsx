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
import { getLangCodeFromCookie } from '@/lib/i18n';

const T = {
  title: { ko: '알림', en: 'Notifications', ru: 'Уведомления', kz: 'Хабарламалар', zh: '通知', ja: '通知' },
  empty: { ko: '새 소식이 없습니다', en: 'No notifications yet', ru: 'Пока нет уведомлений', kz: 'Әзірге хабарлама жоқ', zh: '暂无通知', ja: 'お知らせはありません' },
  markAll: { ko: '모두 읽음', en: 'Mark all read', ru: 'Прочитать все', kz: 'Бәрін оқу', zh: '全部已读', ja: 'すべて既読' },
};

// 상대 시간 (간단) — 외부 라이브러리 없이
function ago(iso, lang) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  const u = lang === 'ko' ? ['초', '분', '시간', '일'] : ['s', 'm', 'h', 'd'];
  if (d > 0) return `${d}${u[3]}`;
  if (h > 0) return `${h}${u[2]}`;
  if (m > 0) return `${m}${u[1]}`;
  return `${Math.floor(s)}${u[0]}`;
}

/**
 * @param {"fixed"|"inline"} variant - fixed: 우상단 플로팅(환자). inline: 상단바 안(직원).
 */
export default function NotificationBell({ variant = 'fixed' }) {
  const router = useRouter();
  const lang = getLangCodeFromCookie?.() || 'en';
  const l = (o) => o?.[lang] || o?.en || '';
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
        .select('id, type, title, body, link, read_at, created_at')
        .order('created_at', { ascending: false })
        .limit(15);
      setItems(data || []);
    } catch {
      // silent — 알림은 보조 기능, 실패해도 화면 안 깨지게
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
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
    if (n.link) router.push(n.link);
  };

  const isInline = variant === 'inline';

  return (
    <div ref={panelRef} className={isInline ? 'relative' : 'fixed top-2.5 right-3 z-[60]'}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={l(T.title)}
        className={isInline
          ? 'relative p-2 rounded-full text-slate-600 hover:text-teal-700 hover:bg-teal-200/70 transition-colors'
          : 'relative p-2 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm hover:bg-gray-50 transition'}
      >
        <Bell size={isInline ? 17 : 18} className={isInline ? '' : 'text-gray-600'} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-11 right-0 w-80 max-w-[88vw] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-[70]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">{l(T.title)}</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markRead(items.filter((n) => !n.read_at).map((n) => n.id))}
                  className="text-xs text-teal-700 hover:underline px-1.5"
                >
                  {l(T.markAll)}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">{l(T.empty)}</div>
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
                        <div className="text-[10px] text-gray-400 mt-1">{ago(n.created_at, lang)}</div>
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
