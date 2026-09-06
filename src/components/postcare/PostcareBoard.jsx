"use client";

/**
 * 사후관리 보드 — 코디·관리자 공용 (한국어, 직원 표준 언어)
 *
 * 왜 (2026-09-06): 환자가 낸 재진 요청·증상 기록·케이던스 알림을 «받는 자리»가 종 알림뿐이었다.
 * 세 칸: ①열린 재진 요청([상담 잡기]·[처리 완료]·[보류]) ②최근 30일 증상 기록(AI 상향 표시·근거 펼치기)
 *       ③방문 전 케이던스 기록(발송·지나감). 데이터는 /api/coordinator/postcare.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, PauseCircle, Loader2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cancerTypeLabelL } from "@/lib/khidi/medicalLabels";

const URG = {
  emergency: { label: "응급 의심", cls: "bg-red-100 text-red-800" },
  high: { label: "확인 필요", cls: "bg-orange-100 text-orange-800" },
  medium: { label: "주의", cls: "bg-amber-100 text-amber-800" },
  low: { label: "낮음", cls: "bg-gray-100 text-gray-600" },
};
const SRC = {
  patient_request: "환자가 요청",
  symptom: "증상 경보에서 제안",
  followup: "사후관리 차수",
  doctor: "의료진 권고",
  cadence: "케이던스",
};
const PHASE = { d3: "D+3 안부", d14: "D+14 다음 단계", d30: "D+30 근황" };

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PostcareBoard({ basePath = "/coordinator" }) {
  const [state, setState] = useState({ loading: true, data: null, inquiries: {}, summary: null, error: "" });
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState({});

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await fetch("/api/coordinator/postcare", { credentials: "include" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "load_failed");
      setState({ loading: false, data: j.data, inquiries: j.inquiries || {}, summary: j.summary, error: "" });
    } catch {
      setState((s) => ({ ...s, loading: false, error: "불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (id, status) => {
    setBusy(id);
    try {
      const res = await fetch("/api/coordinator/postcare", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const j = await res.json();
      if (res.ok && j.ok) await load();
    } finally { setBusy(""); }
  };

  const who = (inquiryId) => {
    if (inquiryId == null) return "계정 환자 · 문의 미연결"; // 로그인 환자 포털에서 남긴 기록(inquiry_id 없음)
    const q = state.inquiries?.[inquiryId];
    if (!q) return `#${inquiryId}`;
    return `#${inquiryId} ${q.name}${q.cancerType ? ` · ${cancerTypeLabelL(q.cancerType, "ko")}` : ""}${q.agency ? " · 에이전시 경유" : ""}`;
  };

  if (state.loading && !state.data) return <div className="py-12 text-center text-sm text-gray-500"><Loader2 className="mx-auto mb-2 animate-spin" size={18} />불러오는 중…</div>;
  if (state.error) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{state.error}</div>;

  const d = state.data || { requests: [], symptoms: [], cadence: [] };
  const openReqs = d.requests.filter((r) => r.status === "pending" || r.status === "proposed");
  const doneReqs = d.requests.filter((r) => !(r.status === "pending" || r.status === "proposed")).slice(0, 10);
  const s = state.summary || {};

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["열린 재진 요청", s.openRequests ?? 0, "text-teal-700"],
          ["30일 증상 기록", s.symptoms30d ?? 0, "text-gray-800"],
          ["그중 확인 필요", s.highSymptoms30d ?? 0, "text-orange-700"],
          ["케이던스 발송 / 지나감", `${s.cadenceSent30d ?? 0} / ${s.cadenceSkipped30d ?? 0}`, "text-gray-800"],
        ].map(([label, v, cls]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${cls}`}>{v}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">열린 재진 요청 <span className="text-sm font-normal text-gray-500">({openReqs.length})</span></h2>
          <button type="button" onClick={load} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"><RefreshCw size={12} /> 새로고침</button>
        </div>
        {openReqs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">열린 요청이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {openReqs.map((r) => (
              <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      <Link href={`${basePath}/inbox/${r.inquiryId}`} className="text-teal-700 hover:underline">{who(r.inquiryId)}</Link>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{SRC[r.source] || r.source} · 요청 {fmt(r.createdAt)} · 희망 {fmt(r.nextActionAt)}</p>
                    {r.reason && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">“{r.reason}”</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Link href={`/coordinator/consultations?inquiry=${r.inquiryId ?? ""}`} className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-800">
                      <CalendarPlus size={13} /> 상담 잡기
                    </Link>
                    <button type="button" disabled={busy === r.id} onClick={() => patch(r.id, "completed")} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      <CheckCircle2 size={13} /> 처리 완료
                    </button>
                    <button type="button" disabled={busy === r.id} onClick={() => patch(r.id, "dismissed")} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      <PauseCircle size={13} /> 보류
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {doneReqs.length > 0 && (
          <details className="mt-2 text-xs text-gray-500">
            <summary className="cursor-pointer">처리된 요청 최근 {doneReqs.length}건</summary>
            <ul className="mt-1 space-y-1">
              {doneReqs.map((r) => <li key={r.id}>{who(r.inquiryId)} · {SRC[r.source] || r.source} · {r.status} · {fmt(r.createdAt)}</li>)}
            </ul>
          </details>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold text-gray-900">최근 30일 증상 기록 <span className="text-sm font-normal text-gray-500">({d.symptoms.length})</span></h2>
        {d.symptoms.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">기록이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {d.symptoms.map((x) => {
              const u = URG[x.urgency] || URG.low;
              return (
                <li key={x.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${u.cls}`}>{u.label}</span>
                    {x.severity != null && <span className="text-gray-600">심각도 {x.severity}/10</span>}
                    {x.aiRaised && <span className="inline-flex items-center gap-1 text-orange-700"><AlertTriangle size={12} /> AI 가 상향</span>}
                    <span className="text-gray-500">{fmt(x.createdAt)}</span>
                    {x.inquiryId != null ? <Link href={`${basePath}/inbox/${x.inquiryId}`} className="ml-auto text-teal-700 hover:underline">{who(x.inquiryId)}</Link> : <span className="ml-auto text-gray-500">{who(null)}</span>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{x.text || "(내용 없음)"}</p>
                  {x.assessment && (
                    <button type="button" onClick={() => setOpen((o) => ({ ...o, [x.id]: !o[x.id] }))} className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
                      {open[x.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />} 판정 근거
                    </button>
                  )}
                  {open[x.id] && x.assessment && <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{x.assessment}</pre>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold text-gray-900">방문 전 케이던스 기록 <span className="text-sm font-normal text-gray-500">(30일 · 발송은 현재 꺼짐)</span></h2>
        {d.cadence.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">기록이 없습니다. 발송 기능은 PO 결정으로 꺼져 있습니다(`PRE_VISIT_FOLLOWUP_ENABLED`).</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
            {d.cadence.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 px-4 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === "sent" ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-600"}`}>{c.status === "sent" ? "발송" : "지나감"}</span>
                <span className="text-gray-700">{PHASE[c.phase] || c.phase}</span>
                {c.reason && <span className="text-xs text-gray-500">({c.reason})</span>}
                <span className="text-xs text-gray-500">{fmt(c.at)}</span>
                <Link href={`${basePath}/inbox/${c.inquiryId}`} className="ml-auto text-xs text-teal-700 hover:underline">{who(c.inquiryId)}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
