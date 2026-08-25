"use client";

/**
 * 코디 인박스 상세 — «이 암종을 진료하는 병원» 블록 (코디·어드민 전용, 읽기 전용).
 *
 * 왜 (2026-08-25): 공고 ICT ①의 마지막 동사가 「병원·의료진 매칭」인데, 매칭 창구
 *   (/api/khidi/matching)와 병원별 암종 등록 42건이 있어도 **부르는 화면이 하나도 없었다.**
 *   코디는 어느 병원이 이 암을 보는지 기억으로 골라 왔다.
 *
 * ⚠️ 순위·점수를 보여주지 않는다. 매칭 엔진은 연간 건수·성공률·평균 비용으로 점수를 내지만
 *   **운영 DB 에는 그 세 칸이 전부 비어 있다**(2026-08-25 실측: 42행 전부 null).
 *   비어 있는 값으로 만든 순위는 지어낸 순위다 — 실제로 있는 것(암종·치료법·전문의)만 적는다.
 *   병원에서 실적 자료를 받아 그 칸이 차면 그때 순위를 붙인다.
 *
 * 자체 완결형(부모는 한 줄만 삽입).
 */

import { useState, useEffect } from "react";
import { Building2, Loader2, Stethoscope } from "lucide-react";
import { cancerTypeLabelL } from "@/lib/khidi/medicalLabels";

// 병원이 등록한 치료법 코드 → 한국어. 코디 화면은 한국어 고정이라 여기 둔다
// (DB 실측 2026-08-25: 이 6가지가 전부다. 새 값이 생기면 코드 그대로 보인다 = 눈에 띈다).
const TREATMENT_KO = {
  surgery: "수술",
  chemotherapy: "항암화학요법",
  radiation: "방사선치료",
  targeted_therapy: "표적치료",
  immunotherapy: "면역치료",
  korean_medicine: "한방 협진",
};

export default function HospitalMatchSection({ cancerType }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    if (!cancerType) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/khidi/matching", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ cancerType, limit: 20 }),
        });
        const d = await res.json();
        if (!alive) return;
        if (d.ok) {
          // 실적 칸이 비어 있어 엔진 점수는 어느 병원이든 «똑같이 35점»으로 나온다(실측).
          // 그래서 점수순 정렬은 사실상 DB 반환 순서다 → 정렬 기준을 «있는 사실»로 바꾼다:
          // 전문의 등록 수 → 치료법 수 → 이름.
          const sorted = [...(d.matches || [])].sort((a, b) => {
            const dv = (b.capability?.specialized_doctors?.length || 0) - (a.capability?.specialized_doctors?.length || 0);
            if (dv) return dv;
            const tv = (b.capability?.treatment_types?.length || 0) - (a.capability?.treatment_types?.length || 0);
            if (tv) return tv;
            return String(a.hospitalName).localeCompare(String(b.hospitalName), "ko");
          });
          setItems(sorted);
        } else setErr("병원 목록을 불러오지 못했습니다.");
      } catch {
        if (alive) setErr("병원 목록을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [cancerType]);

  if (!cancerType) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-1">
        <Building2 size={16} className="text-teal-700" />
        {cancerTypeLabelL(cancerType, "ko")} 진료 가능 병원
        {items.length > 0 && <span className="text-gray-500 font-normal">({items.length})</span>}
      </h3>
      <p className="text-[11px] text-gray-500 mb-3">
        병원이 등록한 암종·치료법 기준입니다. 실적 자료가 없어 <b>순위는 매기지 않습니다</b>.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500 inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> 불러오는 중
        </p>
      ) : err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">이 암종으로 등록된 병원이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => {
            const cap = m.capability || {};
            const docs = cap.specialized_doctors || [];
            return (
              <li key={m.hospitalId} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-900">{m.hospitalName}</span>
                  {cap.is_verified && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">유치기관 등록</span>
                  )}
                </div>
                {(cap.treatment_types || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cap.treatment_types.map((tt) => (
                      <span key={tt} className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {TREATMENT_KO[tt] || tt}
                      </span>
                    ))}
                  </div>
                )}
                {docs.length > 0 && (
                  <p className="mt-1 text-[11px] text-gray-500 inline-flex items-center gap-1">
                    <Stethoscope size={12} />
                    전문의 {docs.length}명
                    {docs[0]?.name ? ` · ${docs[0].name}` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
