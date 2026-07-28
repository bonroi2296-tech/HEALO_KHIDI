"use client";

/**
 * 관리자 — 환자 데이터 삭제요청 처리 (GDPR Art.17 / PIPA)
 * 환자가 낸 삭제요청을 보고 처리(진행중/완료/거절). 실제 파기·익명화는 관리자가 수행 후
 * 완료 처리하며 메모(note)에 무엇을 파기/익명화했는지 남긴다.
 */

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

const STATUS_LABEL = {
  pending: "대기",
  processing: "처리중",
  completed: "완료",
  rejected: "거절",
};
const STATUS_TONE = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-gray-100 text-gray-600",
};

export default function DeletionRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);

  const token = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  };

  const load = async () => {
    setLoading(true);
    try {
      const t = await token();
      if (!t) { setMsg({ type: "err", text: "세션이 만료되었습니다. 다시 로그인하세요." }); setLoading(false); return; }
      const qs = filter ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/account/deletion-requests${qs}`, {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      const j = await res.json();
      if (j.ok) { setRows(j.requests || []); setMsg(null); }
      else setMsg({ type: "err", text: "목록을 불러오지 못했습니다." });
    } catch {
      setMsg({ type: "err", text: "연결 실패." });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const update = async (id, status) => {
    let note = null;
    if (status === "completed") {
      note = window.prompt("무엇을 파기·익명화했는지 메모(선택):", "환자 본인 요청에 따라 PII 익명화·소프트삭제 완료");
      if (note === null) return; // 취소
    } else if (status === "rejected") {
      note = window.prompt("거절 사유(선택):", "");
      if (note === null) return;
    }
    setBusy(id);
    try {
      const t = await token();
      const res = await fetch(`/api/admin/account/deletion-requests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ id, status, note }),
      });
      const j = await res.json();
      if (j.ok) { setMsg({ type: "ok", text: "처리되었습니다." }); await load(); }
      else setMsg({ type: "err", text: "처리 실패." });
    } catch {
      setMsg({ type: "err", text: "연결 실패." });
    } finally { setBusy(null); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">데이터 삭제 요청</h1>
      <p className="text-sm text-gray-500 mt-1">
        환자(정보주체)가 낸 데이터 삭제 요청(GDPR 제17조). 실제 파기·익명화는 소프트삭제로 수행한 뒤 «완료»로 처리하세요.
      </p>

      <div className="flex items-center gap-2 mt-5 mb-4">
        {["", "pending", "processing", "completed", "rejected"].map((s) => (
          <button key={s || "all"} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === s ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s ? STATUS_LABEL[s] : "전체"}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.type === "ok" ? "bg-teal-50 text-teal-800 border border-teal-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">삭제 요청이 없습니다.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {rows.map((r) => (
            <div key={r.id} className="p-4 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                    <span className="text-xs text-gray-600 tabular-nums">{new Date(r.requested_at).toLocaleString("ko-KR")}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">user_id: <span className="font-mono">{r.user_id}</span></div>
                  {r.reason && <div className="text-sm text-gray-700 mt-1">사유: {r.reason}</div>}
                  {r.note && <div className="text-xs text-gray-500 mt-1">처리메모: {r.note}</div>}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {r.status === "pending" && (
                    <button disabled={busy === r.id} onClick={() => update(r.id, "processing")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40">처리 시작</button>
                  )}
                  {(r.status === "pending" || r.status === "processing") && (
                    <>
                      <button disabled={busy === r.id} onClick={() => update(r.id, "completed")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">완료 처리</button>
                      <button disabled={busy === r.id} onClick={() => update(r.id, "rejected")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40">거절</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
