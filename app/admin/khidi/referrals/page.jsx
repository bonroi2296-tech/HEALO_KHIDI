"use client";

/**
 * 양·한방 협진 의뢰/회신 워크플로우
 * 한방(참여기관) → 대학병원(협진) 의뢰를 기록·추적. 협진율 지표 + 협진 의뢰서 증빙.
 */

import { useState, useEffect, useCallback } from "react";

const STATUS_LABEL = {
  requested: { ko: "의뢰", cls: "bg-amber-50 text-amber-700" },
  accepted: { ko: "수락", cls: "bg-blue-50 text-blue-700" },
  completed: { ko: "협진 완료", cls: "bg-teal-50 text-teal-700" },
  declined: { ko: "반려", cls: "bg-gray-100 text-gray-600" },
  cancelled: { ko: "취소", cls: "bg-gray-100 text-gray-600" },
};

export default function ReferralsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState({ from_hospital_id: "", to_hospital_id: "", inquiry_id: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/khidi/referrals", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "오류"); return; }
      setData(json);
    } catch {
      setError("서버 연결 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.from_hospital_id || !form.to_hospital_id) { alert("의뢰 기관과 협진 병원을 선택하세요"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/khidi/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          from_hospital_id: form.from_hospital_id,
          to_hospital_id: form.to_hospital_id,
          inquiry_id: form.inquiry_id || null,
          reason: form.reason || null,
        }),
      });
      const json = await res.json();
      if (json.ok) { setForm({ from_hospital_id: "", to_hospital_id: "", inquiry_id: "", reason: "" }); await fetchData(); }
      else alert("생성 실패: " + (json.error ?? ""));
    } finally { setSubmitting(false); }
  };

  const setStatus = async (id, status) => {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/khidi/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.ok) await fetchData();
      else alert("변경 실패: " + (json.error ?? ""));
    } finally { setBusyId(null); }
  };

  const s = data?.summary;
  const hanbang = (data?.hospitals ?? []).filter((h) => h.kind === "한방(참여기관)");
  const univ = (data?.hospitals ?? []).filter((h) => h.kind === "대학병원(협진)");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">양·한방 협진 의뢰</h1>
        <p className="text-sm text-gray-500 mt-1">
          한방(참여기관) → 대학병원(협진) 의뢰를 기록·추적합니다. 협진율 지표와 협진 의뢰서 증빙으로 사용.
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-500">불러오는 중…</div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">{error}</div>
      ) : (
        <>
          {/* 협진율 요약 */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Kpi label="총 의뢰" value={s?.total ?? 0} />
            <Kpi label="유효 의뢰" value={s?.valid ?? 0} />
            <Kpi label="협진 완료" value={s?.completed ?? 0} />
            <Kpi label="협진율" value={`${s?.rate ?? 0}%`} highlight />
          </section>

          {/* 신규 의뢰 */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-3">신규 협진 의뢰</h2>
            <form onSubmit={create} className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-gray-500 text-xs">의뢰 기관 (한방)</span>
                <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.from_hospital_id} onChange={(e) => setForm({ ...form, from_hospital_id: e.target.value })}>
                  <option value="">선택</option>
                  {hanbang.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-gray-500 text-xs">협진 병원 (대학병원)</span>
                <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.to_hospital_id} onChange={(e) => setForm({ ...form, to_hospital_id: e.target.value })}>
                  <option value="">선택</option>
                  {univ.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-gray-500 text-xs">문의 ID (선택)</span>
                <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.inquiry_id} onChange={(e) => setForm({ ...form, inquiry_id: e.target.value })} placeholder="예: 3" />
              </label>
              <label className="text-sm">
                <span className="text-gray-500 text-xs">의뢰 사유</span>
                <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="예: 수술 협진 의뢰" />
              </label>
              <div className="sm:col-span-2">
                <button disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">
                  의뢰 등록
                </button>
              </div>
            </form>
          </section>

          {/* 의뢰 목록 */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-3">협진 의뢰 목록</h2>
            {(data?.referrals ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">의뢰가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {data.referrals.map((r) => {
                  const st = STATUS_LABEL[r.status] || { ko: r.status, cls: "bg-gray-100 text-gray-600" };
                  return (
                    <div key={r.id} className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800">
                            {r.from_hospital} <span className="text-gray-600">→</span> {r.to_hospital}
                          </div>
                          <div className="text-xs text-gray-500">
                            {r.patient} · {r.reason || "(사유 없음)"} · {new Date(r.requested_at).toLocaleDateString("ko-KR")}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.ko}</span>
                          {r.status === "requested" && (
                            <>
                              <Btn disabled={busyId === r.id} onClick={() => setStatus(r.id, "accepted")} cls="bg-blue-600 text-white hover:bg-blue-700">수락</Btn>
                              <Btn disabled={busyId === r.id} onClick={() => setStatus(r.id, "declined")} cls="bg-gray-200 text-gray-600 hover:bg-gray-300">반려</Btn>
                            </>
                          )}
                          {r.status === "accepted" && (
                            <Btn disabled={busyId === r.id} onClick={() => setStatus(r.id, "completed")} cls="bg-teal-700 text-white hover:bg-teal-800">협진 완료</Btn>
                          )}
                          {(r.status === "requested" || r.status === "accepted") && (
                            <Btn disabled={busyId === r.id} onClick={() => setStatus(r.id, "cancelled")} cls="bg-gray-100 text-gray-600 hover:bg-gray-200">취소</Btn>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, highlight }) {
  return (
    <div>
      <div className={`text-xl font-bold ${highlight ? "text-teal-700" : "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function Btn({ children, onClick, disabled, cls }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-40 transition ${cls}`}>
      {children}
    </button>
  );
}
