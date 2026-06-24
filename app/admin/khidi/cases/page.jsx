"use client";

/**
 * 케이스 관리 (코디/어드민)
 * 환자별 진행 상황(코디 설정) · 보험 정보 · 에이전시 배정. 에이전시·환자가 이 상태를 본다.
 */

import { useState, useEffect, useCallback } from "react";

// PO 결정(2026-06-24): 보험 입력·다중 병원배정은 현재 운영에 불필요(1개 병원이 전체 컨트롤).
// 코드는 보존하고 UI만 숨긴다 — 필요해지면 이 플래그만 true 로.
const SHOW_INSURANCE = false;
const SHOW_HOSPITAL_ASSIGN = false;

// 병원 리드 응답 상태 라벨/색 (병원이 파트너 화면에서 바꾼 값이 여기로 반영됨)
const HOSP_STATUS = {
  sent: { ko: "전송됨", cls: "bg-gray-100 text-gray-500" },
  viewed: { ko: "열람", cls: "bg-blue-50 text-blue-600" },
  replied: { ko: "회신함", cls: "bg-teal-50 text-teal-700" },
  converted: { ko: "치료 확정", cls: "bg-green-100 text-green-700" },
  rejected: { ko: "거절", cls: "bg-red-50 text-red-600" },
};

export default function CasesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [assignSel, setAssignSel] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/admin/khidi/cases", { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "오류"); return; }
      setData(json);
    } catch { setError("서버 연결 실패"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const steps = data?.statusSteps ?? [];
  const agencies = data?.agencies ?? [];
  const hospitals = data?.hospitals ?? [];
  const labelOf = (k) => steps.find((s) => s.key === k)?.ko || (k ? k : "미설정");

  const openEditor = (c) => {
    setOpenId(openId === c.id ? null : c.id);
    setAssignSel((c.assigned_hospitals ?? []).map((h) => h.id));
    setDraft({
      case_status: c.case_status || "",
      case_status_note: c.case_status_note || "",
      agency_id: c.agency_id || "",
      insurance_provider: c.insurance_provider || "",
      insurance_policy_no: c.insurance_policy_no || "",
      insurance_coverage: c.insurance_coverage || "",
      insurance_status: c.insurance_status || "",
    });
  };

  const toggleHospital = (id) =>
    setAssignSel((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));

  const assignHospitals = async (id) => {
    if (assignSel.length === 0) { alert("배정할 병원을 하나 이상 선택하세요."); return; }
    setAssigning(true);
    try {
      const res = await fetch("/api/coordinator/cases/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inquiry_id: id, hospital_ids: assignSel }),
      });
      const json = await res.json();
      if (json.ok) { await fetchData(); alert("병원에 배정했습니다. 병원 파트너 화면에 표시됩니다."); }
      else alert("배정 실패: " + (json.error ?? ""));
    } catch { alert("서버 연결 실패"); } finally { setAssigning(false); }
  };

  const save = async (id) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/khidi/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          inquiry_id: id,
          case_status: draft.case_status || null,
          case_status_note: draft.case_status_note || null,
          agency_id: draft.agency_id || null,
          insurance_provider: draft.insurance_provider || null,
          insurance_policy_no: draft.insurance_policy_no || null,
          insurance_coverage: draft.insurance_coverage || null,
          insurance_status: draft.insurance_status || null,
        }),
      });
      const json = await res.json();
      if (json.ok) { setOpenId(null); await fetchData(); }
      else alert("저장 실패: " + (json.error ?? ""));
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">케이스 관리</h1>
        <p className="text-sm text-gray-500 mt-1">
          환자별 진행 상황·보험·에이전시를 관리합니다. 여기서 설정한 진행 상황을 환자·에이전시가 확인합니다.
        </p>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-400">불러오는 중…</div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">{error}</div>
      ) : (data?.cases ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">케이스가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {data.cases.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl">
              <button onClick={() => openEditor(c)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {c.name} · {c.nationality} · {c.cancer_type}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {c.agency_name ? `에이전시: ${c.agency_name}` : "환자 직접 접수"}{c.case_status_note ? ` · ${c.case_status_note}` : ""}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${c.case_status ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-400"}`}>
                  {labelOf(c.case_status)}
                </span>
              </button>

              {openId === c.id && (
                <div className="border-t border-gray-100 p-4 grid sm:grid-cols-2 gap-3 bg-gray-50/50">
                  <label className="text-sm">
                    <span className="text-gray-500 text-xs">진행 상황</span>
                    <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      value={draft.case_status} onChange={(e) => setDraft({ ...draft, case_status: e.target.value })}>
                      <option value="">미설정</option>
                      {steps.map((s) => <option key={s.key} value={s.key}>{s.ko}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="text-gray-500 text-xs">에이전시 배정</span>
                    <select className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      value={draft.agency_id} onChange={(e) => setDraft({ ...draft, agency_id: e.target.value })}>
                      <option value="">미배정</option>
                      {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-2">
                    <span className="text-gray-500 text-xs">진행 메모 (환자·에이전시에게 표시: 예 "병원 검토 중, 3일 내 회신")</span>
                    <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                      value={draft.case_status_note} onChange={(e) => setDraft({ ...draft, case_status_note: e.target.value })} />
                  </label>
                  {SHOW_INSURANCE && (
                    <>
                      <label className="text-sm">
                        <span className="text-gray-500 text-xs">보험사</span>
                        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          value={draft.insurance_provider} onChange={(e) => setDraft({ ...draft, insurance_provider: e.target.value })} />
                      </label>
                      <label className="text-sm">
                        <span className="text-gray-500 text-xs">증권번호 (암호화 저장)</span>
                        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          value={draft.insurance_policy_no} onChange={(e) => setDraft({ ...draft, insurance_policy_no: e.target.value })} />
                      </label>
                      <label className="text-sm">
                        <span className="text-gray-500 text-xs">보장 범위</span>
                        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          value={draft.insurance_coverage} onChange={(e) => setDraft({ ...draft, insurance_coverage: e.target.value })} />
                      </label>
                      <label className="text-sm">
                        <span className="text-gray-500 text-xs">보험 처리 상태 (예: 확인 중 / 보장 / 미적용)</span>
                        <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 bg-white"
                          value={draft.insurance_status} onChange={(e) => setDraft({ ...draft, insurance_status: e.target.value })} />
                      </label>
                    </>
                  )}
                  {/* 국내 병원 배정 — 배정하면 병원 파트너 화면에 리드로 뜬다 */}
                  {SHOW_HOSPITAL_ASSIGN && (
                  <div className="sm:col-span-2 border-t border-gray-200 pt-3 mt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-gray-700 text-xs font-semibold">국내 병원 배정 (협진 의뢰)</span>
                    </div>
                    {(c.assigned_hospitals ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {c.assigned_hospitals.map((h) => (
                          <span key={h.id} className={`text-[11px] px-2 py-0.5 rounded-full ${HOSP_STATUS[h.status]?.cls || "bg-gray-100 text-gray-500"}`}>
                            {h.name}: {HOSP_STATUS[h.status]?.ko || h.status}
                            {(h.quoted_price_min != null || h.quoted_price_max != null) ? ` (견적 ${h.quoted_price_min ?? "?"}~${h.quoted_price_max ?? "?"})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 mb-1.5">배정할 병원을 선택해 "배정"하면 병원 파트너 화면에 뜨고, 병원이 회신하면 위 진행상황에 자동 반영됩니다.</p>
                    {hospitals.length === 0 ? (
                      <p className="text-xs text-gray-400">등록된 병원이 없습니다.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {hospitals.map((h) => {
                          const on = assignSel.includes(h.id);
                          return (
                            <button key={h.id} type="button" onClick={() => toggleHospital(h.id)}
                              className={`px-2.5 py-1 rounded-full text-xs border transition ${on ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-300 hover:border-teal-400"}`}>
                              {on ? "✓ " : ""}{h.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <button disabled={assigning || hospitals.length === 0} onClick={() => assignHospitals(c.id)}
                      className="mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
                      {assigning ? "배정 중…" : "선택 병원에 배정"}
                    </button>
                  </div>
                  )}

                  <div className="sm:col-span-2 flex gap-2">
                    <button disabled={saving} onClick={() => save(c.id)}
                      className="px-4 py-2 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">저장</button>
                    <button onClick={() => setOpenId(null)} className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-600 hover:bg-gray-200">닫기</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
