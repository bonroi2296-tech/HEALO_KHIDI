'use client';

/**
 * 개선 요청함 — 코디네이터가 «그때그때 생각난 것»을 적어두는 칸 (2026-08-04 PO 제안).
 *
 * 왜: 화면을 쓰다 불편한 걸 발견해도 적을 데가 없어 말로 흘렀다. PO 도 어시스턴트도
 * 나중에 찾아볼 방법이 없었다. 여기 적으면 셋이 같은 목록을 본다.
 *
 * 어디서 적었는지(screen_path)는 자동으로 붙는다 — 「어느 화면인지」를 매번 설명 안 해도 되게.
 * 상태 도장(하는 중/완료)은 어드민만 — 고치는 쪽이 판정한다(창구에서 막는다).
 */

import { useState, useEffect, useCallback } from 'react';
import { MessageSquarePlus, Send, Loader2 } from 'lucide-react';
import { useCoordinatorL, useDateLocale } from '@/lib/i18n/coordinator';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const STATUS_STYLE = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  doing: 'bg-blue-50 text-blue-700 border-blue-200',
  done: 'bg-green-50 text-green-700 border-green-200',
  parked: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function StaffRequestsPage() {
  const L = useCoordinatorL();
  const locale = useDateLocale();
  const [items, setItems] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const authHeaders = useCallback(async () => {
    const { data } = await createSupabaseBrowserClient().auth.getSession();
    const token = data?.session?.access_token;
    setIsAdmin(data?.session?.user?.app_metadata?.role === 'admin');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/requests', { headers: await authHeaders() });
      const json = await res.json();
      if (json?.ok) setItems(json.items || []);
    } catch { /* 목록 실패는 화면을 깨지 않는다 — 적는 것이 본 기능 */ }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true); setMsg(null);
    try {
      const res = await fetch('/api/staff/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        // 어느 화면에서 적었는지 — 직전에 보던 화면이 더 쓸모 있다(여기 주소는 항상 같으니).
        body: JSON.stringify({ body: text, screenPath: sessionStorage.getItem('healo_last_path') || null }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'failed');
      setBody(''); setMsg({ ok: true, text: L.reqSent });
      setItems((prev) => [json.item, ...prev]);
    } catch {
      setMsg({ ok: false, text: L.reqFailed });
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      const res = await fetch('/api/staff/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json?.ok) setItems((prev) => prev.map((it) => (it.id === id ? json.item : it)));
    } catch { /* 실패해도 목록은 그대로 — 다음 새로고침에 맞춰진다 */ }
  };

  const label = (s) => ({ open: L.reqStatusOpen, doing: L.reqStatusDoing, done: L.reqStatusDone, parked: L.reqStatusParked }[s] || s);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{L.reqTitle}</h1>
        <p className="text-base text-gray-600">{L.reqLead}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-3">
        <label htmlFor="req-body" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <MessageSquarePlus size={18} className="text-blue-600" />
          {L.reqTitle}
        </label>
        <textarea
          id="req-body"
          className="w-full min-w-0 border border-gray-300 rounded-xl p-3 text-base"
          rows={4}
          maxLength={2000}
          placeholder={L.reqPlaceholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {msg ? (
            <span className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</span>
          ) : <span />}
          <button
            onClick={submit}
            disabled={!body.trim() || sending}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-base font-semibold hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {sending ? L.reqSending : L.reqSubmit}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-base text-gray-500 py-8 text-center">{L.reqEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base text-gray-900 whitespace-pre-wrap break-words min-w-0">{it.body}</p>
                <span className={`shrink-0 text-xs px-2 py-1 rounded-full border ${STATUS_STYLE[it.status] || STATUS_STYLE.open}`}>
                  {label(it.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {it.author_email || '—'} · {new Date(it.created_at).toLocaleString(locale)}
                {it.screen_path ? ` · ${L.reqOn} ${it.screen_path}` : ''}
              </p>
              {it.reply && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  <span className="font-semibold">{L.reqReply}</span> · {it.reply}
                </p>
              )}
              {isAdmin && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {['open', 'doing', 'done', 'parked'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(it.id, s)}
                      className={`text-xs px-3 py-1.5 rounded-full border min-h-[32px] ${it.status === s ? STATUS_STYLE[s] : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {label(s)}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
