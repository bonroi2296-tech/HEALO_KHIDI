"use client";

/**
 * 중간평가 증빙 산출물
 * 상담기록(사전상담·사후관리)·협진 의뢰서를 기간별로 모아 보고 CSV 로 내려받는다.
 * 평가 증빙(120건·협진실적) 제출용.
 */

import { useState, useEffect, useCallback } from "react";

const RANGES = [
  { key: "90", label: "최근 90일", days: 90 },
  { key: "180", label: "최근 180일", days: 180 },
  { key: "365", label: "최근 1년", days: 365 },
];

function toCsv(rows) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
function download(filename, text) {
  // 한글 깨짐 방지 BOM
  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function EvidencePage() {
  const [rangeKey, setRangeKey] = useState("90");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 90;
      const to = new Date();
      const from = new Date(to.getTime() - days * 86400000);
      const qs = `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
      const res = await fetch(`/api/admin/khidi/evidence?${qs}`, { credentials: "include", cache: "no-store" });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "오류"); return; }
      setData(json);
    } catch { setError("서버 연결 실패"); } finally { setLoading(false); }
  }, [rangeKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">증빙 산출물</h1>
          <p className="text-sm text-gray-500 mt-1">상담기록·협진 의뢰서를 모아 CSV로 내려받습니다 (중간평가 증빙용).</p>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRangeKey(r.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                rangeKey === r.key ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-400">불러오는 중…</div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">{error}</div>
      ) : (
        <>
          {/* 성과지표 증빙 요약 */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4">성과지표 증빙 요약</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Kpi label="사전상담+사후관리" value={`${s?.consult_care_total ?? 0} / 120`} highlight />
              <Kpi label="사전상담 완료" value={s?.pre_consult_done ?? 0} />
              <Kpi label="사후관리 완료" value={s?.followup_done ?? 0} />
              <Kpi label="협진율" value={`${s?.referral_rate ?? 0}%`} />
            </div>
            <p className="text-xs text-gray-400 mt-4">
              유치 건수·만족도 증빙은 <a className="text-teal-700 underline" href="/admin/khidi/conversion">유치 전환 상세</a> ·{" "}
              <a className="text-teal-700 underline" href="/admin/khidi/satisfaction">환자 만족도</a> 페이지 참조.
            </p>
          </section>

          {/* 상담기록 */}
          <EvidenceTable
            title="상담기록 (사전상담·사후관리)"
            rows={data?.consultations ?? []}
            onDownload={() => download(`상담기록_${today}.csv`, toCsv(data?.consultations))}
          />

          {/* 협진 의뢰서 */}
          <EvidenceTable
            title="협진 의뢰서"
            rows={data?.referrals ?? []}
            onDownload={() => download(`협진의뢰서_${today}.csv`, toCsv(data?.referrals))}
          />
        </>
      )}
    </div>
  );
}

function EvidenceTable({ title, rows, onDownload }) {
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter((h) => h !== "id") : [];
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-700">{title} <span className="text-gray-400 font-normal">({rows.length})</span></h2>
        <button onClick={onDownload} disabled={rows.length === 0}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40">
          CSV 다운로드
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">데이터 없음</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                {headers.map((h) => <th key={h} className="py-2 px-2 font-medium whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-b border-gray-50">
                  {headers.map((h) => <td key={h} className="py-2 px-2 text-gray-700 whitespace-nowrap">{r[h]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 50 && <p className="text-xs text-gray-400 mt-2">표는 50건까지 표시 — 전체는 CSV로 받으세요.</p>}
        </div>
      )}
    </section>
  );
}

function Kpi({ label, value, highlight }) {
  return (
    <div>
      <div className={`text-xl font-bold ${highlight ? "text-teal-700" : "text-gray-900"}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
