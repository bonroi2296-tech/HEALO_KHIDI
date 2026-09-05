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
import { MessageSquarePlus, Loader2, Pencil, Trash2, Check, X, Languages } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useDateLocale } from "@/lib/i18n/coordinator";
import { BY_PATIENT_LINK } from "@/lib/inquiry/patientMessages";

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
  const [editAt, setEditAt] = useState(null);   // 고치는 중인 줄(안정적 id 로 지목 — 시각은 겹칠 수 있다)
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

  // ── 한국어로 보기 ──
  // 환자가 러시아어로 보낸 글이 여기 그대로 뜬다.
  // 2026-09-04 PO: 「접수 후 추가 정보도 한글로 번역해줘」 → 누를 때만 바꾸던 것을
  //   «들어오면 알아서» 로 바꿨다. 코디는 한국인이라 러시아어 글은 매번 눌러야 읽혔고,
  //   그 한 번의 클릭이 「읽지 않고 넘어가는」 이유가 된다.
  //   원문이 필요하면 「원문 보기」로 되돌린다 — 판단은 원문으로 해야 하니 길은 남긴다.
  // 한글이 하나도 없는 줄만 대상으로 본다(이미 한국어인 줄을 보내면 값만 나간다).
  const [showTr, setShowTr] = useState(true);
  const [tmap, setTmap] = useState({});
  const [tBusy, setTBusy] = useState(false);
  const foreign = items.map((f) => f.text).filter((s) => s && !/[가-힣]/.test(s));
  const shown = (s) => (showTr && tmap[String(s || "").trim()]) || s;

  const fetchTranslations = useCallback(async (texts) => {
    if (!texts.length) return false;
    setTBusy(true);
    try {
      const res = await authFetch("/api/coordinator/notes/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: "ko", texts }),
      });
      const d = await res.json();
      if (d.ok && d.map && Object.keys(d.map).length) { setTmap((p) => ({ ...p, ...d.map })); return true; }
    } catch { /* 실패하면 원문 그대로 — 화면은 안 끊긴다 */ } finally {
      setTBusy(false);
    }
    return false;
  }, [authFetch]);

  // 외국어 글이 «새로 들어오면» 알아서 옮긴다. 이미 옮긴 줄은 다시 안 보낸다(번역 비용·응답시간).
  // 서버에 캐시가 있어(note_translations) 같은 글은 두 번째부터 공짜다.
  useEffect(() => {
    const todo = foreign.filter((s) => !tmap[String(s || "").trim()]);
    if (todo.length) fetchTranslations(todo);
    // foreign 은 매 렌더 새 배열이라 «내용»으로 비교한다 — 안 그러면 무한 재요청이 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foreign.join("|"), fetchTranslations]);

  async function toggleTranslate() {
    if (showTr) return setShowTr(false);
    const todo = foreign.filter((s) => !tmap[String(s || "").trim()]);
    if (todo.length) await fetchTranslations(todo);
    setShowTr(true);
  }

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

  async function saveEdit(key) {
    const t = editText.trim();
    if (t.length < 2) return;
    if (await send("PATCH", { at: key, text: t })) { setEditAt(null); setEditText(""); }
  }

  // 지우는 이유: 잘못 적으면 «의료진 화면에 그대로» 간다. 되돌릴 길이 있어야 한다.
  async function removeOne(key) {
    if (!window.confirm("이 추가 정보를 지웁니다. 의료진 화면에서도 사라집니다.")) return;
    await send("DELETE", { at: key });
  }

  const fmt = (iso) => { try { return new Date(iso).toLocaleString(loc || "ko-KR"); } catch { return iso; } };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-1.5 mb-1">
        <MessageSquarePlus size={15} className="text-teal-700" />
        <h3 className="text-sm font-semibold text-gray-800">접수 후 추가 정보</h3>
        {items.length > 0 && <span className="text-xs text-gray-500">({items.length})</span>}
        {/* 환자가 러시아어로 보낸 글을 한국어로 — 누를 때만, 두 번째부터는 부르지 않는다.
            환자 화면과 같은 저장표를 보므로 거기서 이미 옮긴 글이면 즉시 뜬다(2026-08-06 PO). */}
        {foreign.length > 0 && (
          <button
            type="button"
            onClick={toggleTranslate}
            disabled={tBusy}
            className="ml-auto inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {tBusy ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
            {showTr ? "원문 보기" : "한국어로 보기"}
          </button>
        )}
      </div>
      {showTr && (
        <p className="mb-1 text-[11px] text-gray-500">기계가 옮긴 글입니다 — 판단은 원문으로 하세요.</p>
      )}
      <p className="text-xs text-gray-500 mb-2.5">
        메신저·전화로 뒤늦게 들어온 환자 상태를 여기에 적으면 <b>소견 요청 화면에도 그대로 보입니다.</b>
      </p>

      {items.length > 0 && (
        <ul className="space-y-2 mb-3">
          {items.map((f, i) => (
            <li
              key={f.id || i}
              // 환자가 «직접» 보낸 글은 코디 메모와 색을 달리한다 — 같은 회색이면 환자 말이 메모 사이에 묻힌다
              // (2026-09-05: 환자 글이 이 목록에 있었는데 아무도 답을 안 했다).
              className={`rounded-lg border px-3 py-2 ${
                f.by === BY_PATIENT_LINK && !f.removedAt
                  ? "border-teal-200 bg-teal-50/60"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              {editAt === (f.id || f.at) ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button onClick={() => saveEdit(f.id || f.at)} disabled={busy || editText.trim().length < 2}
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
                  <p className={`text-sm whitespace-pre-wrap leading-relaxed ${f.removedAt ? "text-gray-500 line-through" : "text-gray-800"}`}>
                    {shown(f.text)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-gray-500">{fmt(f.at)} · {f.by}</p>
                    {f.by === BY_PATIENT_LINK && !f.removedAt && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                        환자가 직접 보냄 — 답이 필요할 수 있어요
                      </span>
                    )}
                    {/* 환자가 자기 화면에서 치운 글 — **여기선 안 사라진다.** 냈다가 지우고
                        «안 냈다»고 하는 걸 막으려면 낸 사실이 남아야 한다(2026-08-06 PO). */}
                    {f.removedAt && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        환자가 지움 {fmt(f.removedAt)}
                      </span>
                    )}
                    <button onClick={() => { setEditAt(f.id || f.at); setEditText(f.text); }} disabled={busy}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-teal-700 disabled:opacity-40">
                      <Pencil size={11} /> 고치기
                    </button>
                    <button onClick={() => removeOne(f.id || f.at)} disabled={busy}
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
