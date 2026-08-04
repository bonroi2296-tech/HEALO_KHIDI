"use client";

/**
 * 코디 인박스 상세 — 「접수 후 추가 정보」 블록 (코디·어드민 전용).
 *
 * 왜 (2026-08-03, 문의 #60): 접수가 끝난 뒤에도 환자·에이전시가 계속 상태를 알려온다 —
 *   *"현재 온몸이 심하게 부어 있고, 허리 양쪽은 물이 든 주머니 같습니다"*.
 *   서류(첨부)로는 못 받는 내용이고, 코디 개인 메모에 적으면 **소견 주는 의료진에게 안 간다.**
 *   여기 적으면 소견 요청 화면에도 그대로 뜨고, AI 케이스 브리프도 다시 만들 때 이걸 읽는다.
 *
 * 본문은 환자 건강정보라 서버에서 암호화해 저장한다(첨부·인테이크와 같은 규칙).
 * 자체 완결형 — 부모는 한 줄만 삽입한다.
 */

import { useState, useEffect, useCallback } from "react";
import { MessageSquarePlus, Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useDateLocale } from "@/lib/i18n/coordinator";

async function authFetch(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

export default function FollowUpsSection({ inquiryId }) {
  const loc = useDateLocale();
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [editAt, setEditAt] = useState(null);   // 고치는 중인 줄(적힌 시각으로 찾는다)
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/follow-ups`);
      const d = await res.json();
      if (d.ok) setItems(d.followUps || []);
    } catch { /* 조용히 — 없으면 빈 목록 */ }
  }, [inquiryId]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    const t = text.trim();
    if (t.length < 2 || saving) return;
    setSaving(true); setErr("");
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const d = await res.json();
      if (!d.ok) {
        setErr(d.error === "text_too_long" ? "너무 깁니다(4,000자까지)." : "저장하지 못했습니다.");
        return;
      }
      setItems(d.followUps || []);
      setText("");
    } catch {
      setErr("저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function send(method, body) {
    setBusy(true); setErr("");
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/follow-ups`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.ok) { setErr("저장하지 못했습니다."); return false; }
      setItems(d.followUps || []);
      return true;
    } catch { setErr("저장하지 못했습니다."); return false; }
    finally { setBusy(false); }
  }

  async function saveEdit(at) {
    const t = editText.trim();
    if (t.length < 2) return;
    if (await send("PATCH", { at, text: t })) { setEditAt(null); setEditText(""); }
  }

  // 지우는 이유: 잘못 적으면 «의료진 화면에 그대로» 간다. 되돌릴 길이 있어야 한다.
  async function removeOne(at) {
    if (!window.confirm("이 추가 정보를 지웁니다. 의료진 화면에서도 사라집니다.")) return;
    await send("DELETE", { at });
  }

  const fmt = (iso) => { try { return new Date(iso).toLocaleString(loc || "ko-KR"); } catch { return iso; } };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-1.5 mb-1">
        <MessageSquarePlus size={15} className="text-teal-700" />
        <h3 className="text-sm font-semibold text-gray-800">접수 후 추가 정보</h3>
        {items.length > 0 && <span className="text-xs text-gray-500">({items.length})</span>}
      </div>
      <p className="text-xs text-gray-500 mb-2.5">
        메신저·전화로 뒤늦게 들어온 환자 상태를 여기에 적으면 <b>소견 요청 화면에도 그대로 보입니다.</b>
      </p>

      {items.length > 0 && (
        <ul className="space-y-2 mb-3">
          {items.map((f, i) => (
            <li key={i} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              {editAt === f.at ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button onClick={() => saveEdit(f.at)} disabled={busy || editText.trim().length < 2}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-teal-300 bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">
                      <Check size={12} /> 저장
                    </button>
                    <button onClick={() => { setEditAt(null); setEditText(""); }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
                      <X size={12} /> 취소
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{f.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-gray-500">{fmt(f.at)} · {f.by}</p>
                    <button onClick={() => { setEditAt(f.at); setEditText(f.text); }} disabled={busy}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-teal-700 disabled:opacity-40">
                      <Pencil size={11} /> 고치기
                    </button>
                    <button onClick={() => removeOne(f.at)} disabled={busy}
                      className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-700 disabled:opacity-40">
                      <Trash2 size={11} /> 지우기
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="예) 현재 온몸이 심하게 부어 있고, 허리 양쪽은 물이 든 주머니처럼 만지면 터질 것 같다고 합니다. (2026-08-03 왓츠앱)"
        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={add}
          disabled={text.trim().length < 2 || saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition disabled:opacity-40"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <MessageSquarePlus size={13} />} 추가
        </button>
        {err && <span className="text-xs text-red-700">{err}</span>}
        <span className="text-[11px] text-gray-500 ml-auto">저장할 때 암호화됩니다</span>
      </div>
    </div>
  );
}
