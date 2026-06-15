"use client";

/**
 * 에이전시 포털 — 의뢰한 환자들의 진행 상황을 확인.
 * 카자흐 현지 에이전시 요구: 병원 응답이 느려도 "지금 어느 단계인지" 가시화.
 */

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export default function AgencyPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (!token) { setError("login"); setLoading(false); return; }
        const res = await fetch("/api/agency/inquiries", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.status === 403) { setError("forbidden"); setLoading(false); return; }
        const json = await res.json();
        if (!json.ok) { setError(json.error ?? "오류"); setLoading(false); return; }
        setData(json);
      } catch { setError("서버 연결 실패"); } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Center>불러오는 중…</Center>;
  if (error === "login") return <Center>로그인이 필요합니다. <a className="text-teal-600 underline ml-1" href="/login">로그인</a></Center>;
  if (error === "forbidden") return <Center>에이전시 권한이 없는 계정입니다. 관리자에게 문의하세요.</Center>;
  if (error) return <Center className="text-red-500">{error}</Center>;

  const steps = data?.statusSteps?.filter((s) => s.order < 90) ?? [];
  const orderOf = (k) => data?.statusSteps?.find((s) => s.key === k)?.order ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{data?.agency?.name} · 환자 진행 현황</h1>
        <p className="text-sm text-gray-500 mt-1">의뢰하신 환자들의 현재 진행 단계입니다. 단계를 누르면 상세 이력이 보입니다.</p>
      </div>

      {(data?.cases ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">표시할 환자가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {data.cases.map((c) => {
            const curOrder = orderOf(c.case_status);
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <button onClick={() => setOpenId(openId === c.id ? null : c.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-semibold text-gray-800">
                      {c.name} · {c.nationality} · {c.cancer_type}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${c.case_status ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-400"}`}>
                      {c.case_status_label}
                    </span>
                  </div>
                  {/* 단계 진행 바 */}
                  <div className="flex items-center gap-1">
                    {steps.map((s) => (
                      <div key={s.key} className="flex-1 h-1.5 rounded-full"
                        style={{ background: s.order <= curOrder ? "#14b8a6" : "#e5e7eb" }} title={s.ko} />
                    ))}
                  </div>
                  {c.case_status_note && (
                    <p className="text-xs text-gray-500 mt-2">📌 {c.case_status_note}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {c.insurance_status && <span>보험: {c.insurance_status}</span>}
                    {c.case_status_updated_at && <span>업데이트 {new Date(c.case_status_updated_at).toLocaleDateString("ko-KR")}</span>}
                  </div>
                </button>

                {openId === c.id && c.timeline.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    {c.timeline.map((t, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="text-gray-400 text-xs w-20 shrink-0">{new Date(t.at).toLocaleDateString("ko-KR")}</span>
                        <span className="text-gray-700">
                          <b>{t.status_label}</b>{t.note ? ` — ${t.note}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {openId === c.id && c.timeline.length === 0 && (
                  <p className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">아직 기록된 진행 이력이 없습니다.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Center({ children, className = "" }) {
  return <div className={`max-w-3xl mx-auto px-4 py-24 text-center text-gray-500 ${className}`}>{children}</div>;
}
