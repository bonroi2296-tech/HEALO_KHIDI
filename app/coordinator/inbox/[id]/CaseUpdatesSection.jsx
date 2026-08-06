"use client";

/**
 * 코디 인박스 상세 — «환자에게 보이는 소식» (코디·어드민 전용).
 *
 * 왜 (2026-08-05 PO, 문의 #60 이대서울병원 문의건): *"코디네이터가 코멘트를 남기게 해줬으면"*.
 *   아래 「진행 단계」의 메모 칸은 **한 칸이라 덮어쓴다** — 오늘 「이대서울병원에 문의했습니다」를
 *   적고 모레 「회신 왔습니다」를 적으면 앞의 것이 사라진다. 여기 적는 소식은 **한 건씩 쌓이고**
 *   환자 화면 「지나온 기록」에 단계 이력과 시간순으로 섞여 뜬다.
 *
 * ⚠️ 적는 즉시 환자가 읽는다 — 「보이기」 스위치가 없다. 내부용 메모는 위 「코디 메모」 칸에.
 *
 * 자체 완결형(부모 CoordinatorInboxDetailClient 는 한 줄만 삽입).
 */

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Loader2, Trash2, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { DOC_LANG_LABEL } from "@/lib/documents/sharedDocMeta";

// ponytail: 문구는 한국어 고정 — 옆 블록들과 같다.

async function authFetch(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(url, { ...options, headers });
}

function fmt(iso) {
  try { return new Date(iso).toLocaleString("ko-KR"); } catch { return iso; }
}

export default function CaseUpdatesSection({ inquiryId, patientLang }) {
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState([]);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/updates`);
      const data = await res.json();
      if (data.ok) setUpdates(data.updates || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (data.ok) { setBody(""); await load(); }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm("이 소식을 지웁니다. 환자 화면에서도 사라집니다.")) return;
    setBusyId(u.id);
    try {
      const res = await authFetch(`/api/coordinator/inquiries/${inquiryId}/updates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId: u.id }),
      });
      const data = await res.json();
      if (data.ok) await load();
    } catch { /* silent */ } finally {
      setBusyId("");
    }
  };

  const langName = patientLang ? DOC_LANG_LABEL[patientLang] || patientLang : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
        <MessageSquare size={16} className="text-teal-700" /> 환자에게 보이는 소식
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        「이대서울병원에 문의했습니다」처럼 <b>중간에 알릴 일</b>을 적습니다. 적는 즉시 환자가 받은
        진행상황 링크의 「지나온 기록」에 뜨고, <b>한 건씩 쌓입니다</b>(아래 「진행 단계」 메모는 한 칸이라
        덮어쓰입니다). 내부용 메모는 위 「코디 메모」 칸에 적으세요 — 그건 환자에게 안 나갑니다.
        {langName && (
          <>
            {" "}
            <b>이 환자가 읽는 언어는 {langName}</b> 입니다 — 그 언어로 적어 주세요.
          </>
        )}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="예: 이대서울병원에 진료 가능 여부를 문의했습니다. 회신 오는 대로 알려드릴게요."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={add}
          disabled={saving || !body.trim()}
          className="inline-flex h-fit shrink-0 items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          알리기
        </button>
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={15} className="animate-spin" /> 불러오는 중…
        </div>
      ) : updates.length > 0 ? (
        <ul className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {updates.map((u) => (
            <li key={u.id} className="flex items-start gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{u.body}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">{fmt(u.created_at)} · 환자에게 보임</p>
              </div>
              <button
                type="button"
                onClick={() => remove(u)}
                disabled={busyId === u.id}
                className="shrink-0 p-1 text-gray-500 hover:text-red-600 disabled:opacity-50"
                aria-label="소식 지우기"
              >
                {busyId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-500">아직 남긴 소식이 없습니다.</p>
      )}
    </div>
  );
}
