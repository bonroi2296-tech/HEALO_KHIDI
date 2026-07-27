"use client";

/**
 * 해외 파트너 관리 (어드민) — 해외 에이전시 + 해외 의료기관 등록 + 담당자 계정 발급.
 * 두 유형은 partner_type 으로만 구분하며 같은 /agency 포털·인프라를 공유한다.
 * 발급된 임시비번으로 파트너가 /agency 포털에 로그인해 의뢰 환자 진행상황 확인.
 */

import { useState, useEffect, useCallback } from "react";

export default function AgenciesAdmin() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", country: "", code: "", partner_type: "agency" });
  const [userForm, setUserForm] = useState({});
  const [issued, setIssued] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/khidi/agencies", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "오류"); return; }
      setAgencies(json.agencies || []);
    } catch { setError("서버 연결 실패"); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const createAgency = async (e) => {
    e.preventDefault();
    if (!form.name) { alert("기관명을 입력하세요"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/khidi/agencies", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.ok) { setForm({ name: "", country: "", code: "", partner_type: "agency" }); await fetchData(); }
      else alert("생성 실패: " + (json.error ?? ""));
    } finally { setBusy(false); }
  };

  const addUser = async (agencyId) => {
    const email = (userForm[agencyId] || "").trim();
    if (!email) { alert("이메일을 입력하세요"); return; }
    setBusy(true); setIssued(null);
    try {
      const res = await fetch("/api/admin/khidi/agencies", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ agency_id: agencyId, email }),
      });
      const json = await res.json();
      if (json.ok) {
        setIssued({ email: json.email, tempPassword: json.tempPassword, agency: json.agencyName });
        setUserForm({ ...userForm, [agencyId]: "" });
        await fetchData();
      } else alert("발급 실패: " + (json.error ?? ""));
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">해외 파트너 관리</h1>
        <p className="text-sm text-gray-500 mt-1">해외 에이전시·해외 의료기관을 등록하고 담당자 계정을 발급합니다. 로그인하면 에이전시는 /agency, 의료기관은 /clinic 포털에서 의뢰 환자 진행상황을 확인합니다.</p>
      </div>

      {issued && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 text-sm">
          <b>{issued.agency}</b> 담당자 계정 발급됨 — 에이전시에 전달하세요:
          <div className="mt-2 font-mono text-teal-800">
            이메일: {issued.email}<br />
            임시비번: {issued.tempPassword || "(기존 계정 — 비번 유지)"}
          </div>
          <div className="text-xs text-gray-500 mt-1">로그인: /login → 포털: 에이전시 /agency · 의료기관 /clinic (계정 유형에 따라 자동 이동)</div>
        </div>
      )}

      {/* 신규 해외 파트너 */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-3">신규 파트너 등록</h2>
        <form onSubmit={createAgency} className="grid sm:grid-cols-3 gap-3">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })}>
            <option value="agency">해외 에이전시</option>
            <option value="medical_institution">해외 의료기관</option>
          </select>
          <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="기관명"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="국가 (예: KZ)"
            value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="코드 (선택)"
            value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <div className="sm:col-span-3">
            <button disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">등록</button>
          </div>
        </form>
      </section>

      {/* 목록 */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">불러오는 중…</div>
      ) : error ? (
        <div className="py-8 text-center text-red-600">{error}</div>
      ) : agencies.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 파트너가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {agencies.map((a) => {
            const isClinic = a.partner_type === "medical_institution";
            return (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isClinic ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"}`}>{isClinic ? "해외 의료기관" : "해외 에이전시"}</span>
                    <span className="text-sm font-semibold text-gray-800">{a.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{a.country || "-"} · 담당자 {a.userCount}명{a.code ? ` · ${a.code}` : ""}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="담당자 이메일"
                  value={userForm[a.id] || ""} onChange={(e) => setUserForm({ ...userForm, [a.id]: e.target.value })} />
                <button disabled={busy} onClick={() => addUser(a.id)}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-800 text-white hover:bg-black disabled:opacity-40 shrink-0">계정 발급</button>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
