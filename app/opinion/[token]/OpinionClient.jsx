"use client";

/**
 * 전문의 세컨드 오피니언 — 계정 없는 의사용 소견 작성 화면.
 * 링크(토큰)만으로 케이스 임상요약·검사지를 보고, 명단에서 본인을 골라 소견을 남긴다.
 * 명단 밖이면 "그 외 의료진" — 의사는 이름 안 적어도 되고, 코디가 나중에 라벨한다.
 */

import { useEffect, useState } from "react";
import { FileText, Stethoscope, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { OPINION_ROSTER, OPINION_OTHER_KEY, OPINION_OTHER_LABEL } from "@/lib/opinions/roster";

export default function OpinionClient({ token }) {
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [requestNote, setRequestNote] = useState(null);
  const [error, setError] = useState("");

  const [doctorKey, setDoctorKey] = useState("");
  const [opinion, setOpinion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/opinions/${token}`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok || !data.ok) {
          setError(data.error === "rate_limited" ? "rate_limited" : "invalid_link");
        } else {
          setCaseData(data.case);
          setRequestNote(data.requestNote || null);
        }
      } catch {
        if (alive) setError("network");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const submit = async () => {
    if (!doctorKey || opinion.trim().length < 5 || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/opinions/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorKey, opinionText: opinion.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitError(
          data.error === "opinion_too_short" ? "소견 내용을 입력해 주세요."
          : data.error === "rate_limited" ? "잠시 후 다시 시도해 주세요."
          : "제출에 실패했습니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError("네트워크 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="text-center py-20">
          <p className="text-gray-900 font-semibold mb-1">
            {error === "rate_limited" ? "잠시 후 다시 시도해 주세요" : "링크가 유효하지 않습니다"}
          </p>
          <p className="text-sm text-gray-500">
            {error === "rate_limited"
              ? "요청이 많습니다. 잠시 뒤에 새로고침 해주세요."
              : "링크가 만료되었거나 잘못되었습니다. 담당 코디네이터에게 새 링크를 요청해 주세요."}
          </p>
        </div>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <div className="text-center py-20">
          <CheckCircle2 size={44} className="mx-auto mb-3 text-teal-600" />
          <p className="text-gray-900 font-semibold mb-1">소견이 제출되었습니다</p>
          <p className="text-sm text-gray-500">감사합니다. 담당 코디네이터가 확인합니다.</p>
        </div>
      </Shell>
    );
  }

  const c = caseData || {};
  return (
    <Shell>
      {/* AI 케이스 브리프 — 코디가 만들어둔 한국어 요약(원문이 러시아어 등이라도 이걸로 빠르게 파악) */}
      {c.brief && (
        <section className="bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-4">
          <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            케이스 요약 <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-200 text-amber-800">AI 초안 — 참고용</span>
          </h2>
          <p className="text-gray-900 font-medium leading-relaxed mb-2">{c.brief.overview}</p>
          {c.brief.request && (
            <p className="text-sm text-gray-700 mb-2"><span className="text-gray-400">환자가 원하는 것 </span>{c.brief.request}</p>
          )}
          {c.brief.points?.length > 0 && (
            <ul className="text-sm text-gray-700 list-disc pl-4 space-y-0.5 mb-2">
              {c.brief.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {c.brief.red_flags?.length > 0 && (
            <ul className="text-sm text-red-700 list-disc pl-4 space-y-0.5">
              {c.brief.red_flags.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </section>
      )}

      {/* 케이스 임상 요약 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">환자 / 임상 정보</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 mb-3">
          <span><span className="text-gray-400">환자</span> {c.patient}</span>
          {c.nationality && <span><span className="text-gray-400">국적</span> {c.nationality}</span>}
          {c.language && <span><span className="text-gray-400">언어</span> {c.language}</span>}
        </div>
        {(c.cancer_type || c.treatment_type) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {c.cancer_type && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">{c.cancer_type}</span>}
            {c.treatment_type && <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">{c.treatment_type}</span>}
          </div>
        )}
        {c.clinical?.length > 0 && (
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2 mb-3">
            {c.clinical.map((d, i) => (
              <div key={i} className="min-w-0">
                <dt className="text-[11px] text-gray-400">{d.label}</dt>
                <dd className="text-sm text-gray-900">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {c.message && (
          <div className="mb-3">
            <p className="text-[11px] text-gray-400 mb-1">환자 메시지</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg p-3 leading-relaxed">{c.message}</p>
          </div>
        )}
        {c.attachments?.length > 0 && (
          <div>
            <p className="text-[11px] text-gray-400 mb-1.5">첨부 의료기록 ({c.attachments.length})</p>
            <div className="space-y-3">
              {c.attachments.map((a, i) => (
                <div key={i}>
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-teal-700 hover:underline text-sm">
                      <FileText size={15} /> <span className="truncate">{a.name}</span> <span className="text-gray-400 text-xs">(원본)</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 text-sm"><FileText size={15} /> <span className="truncate">{a.name} (열람 불가)</span></div>
                  )}
                  {a.translated ? (
                    <TranslatedDocToggle doc={a.translated} />
                  ) : (
                    a.url && <p className="text-xs text-gray-400 mt-1">번역 실패 — 원본을 직접 확인해 주세요.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {requestNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-900 whitespace-pre-wrap">
          {requestNote}
        </div>
      )}

      {/* 소견 작성 */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">소견 작성</h2>

        <label className="block text-sm text-gray-600 mb-1.5">소견 주시는 분</label>
        <select
          value={doctorKey}
          onChange={(e) => setDoctorKey(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
        >
          <option value="" disabled>선택해 주세요</option>
          {OPINION_ROSTER.map((r) => (
            <option key={r.key} value={r.key}>{r.name}</option>
          ))}
          <option value={OPINION_OTHER_KEY}>{OPINION_OTHER_LABEL}</option>
        </select>

        <label className="block text-sm text-gray-600 mb-1.5">소견 내용</label>
        <textarea
          value={opinion}
          onChange={(e) => setOpinion(e.target.value)}
          rows={7}
          placeholder="검사지·상세를 보시고 소견을 남겨 주세요."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none mb-3"
        />

        {submitError && <p className="text-sm text-red-600 mb-3">{submitError}</p>}

        <button
          onClick={submit}
          disabled={!doctorKey || opinion.trim().length < 5 || submitting}
          className="w-full bg-teal-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-40"
        >
          {submitting ? "제출 중…" : "소견 제출"}
        </button>
      </section>
    </Shell>
  );
}

// 번역본이 길어서(검사지 여러 장) 기본은 접어두고 필요할 때 펼침.
function TranslatedDocToggle({ doc }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-teal-700 font-medium hover:underline"
      >
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        번역본 {open ? "접기" : "펼쳐 보기"}
      </button>
      {open && <TranslatedDocView doc={doc} />}
    </div>
  );
}

// 번역된 검사지(한국어) — 원문 항목명·수치는 그대로 두고 항목명만 번역한 표(요약 아님).
function TranslatedDocView({ doc }) {
  if (!doc?.sections?.length) return null;
  return (
    <div className="mt-1.5 border border-gray-100 rounded-lg bg-gray-50 p-2.5 space-y-2">
      {doc.docTypeShort && <p className="text-[11px] font-semibold text-gray-500">{doc.docType || doc.docTypeShort}</p>}
      {doc.sections.map((s, si) => (
        <div key={si}>
          {s.title && <p className="text-xs font-medium text-gray-600 mb-1">{s.title}</p>}
          {s.note && <p className="text-[11px] text-gray-400 mb-1">{s.note}</p>}
          {Array.isArray(s.columns) && Array.isArray(s.rows) && s.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="text-xs w-full border-collapse">
                <thead>
                  <tr>
                    {s.columns.map((col, ci) => (
                      <th key={ci} className="text-left text-gray-400 font-medium border-b border-gray-200 py-1 pr-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r, ri) => (
                    <tr key={ri}>
                      {(r?.cells || []).map((cell, ci) => (
                        <td key={ci} className="text-gray-800 py-1 pr-2 border-b border-gray-100 align-top">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {s.text && <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{s.text}</p>}
        </div>
      ))}
    </div>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg lg:max-w-[1400px] mx-auto px-5 lg:px-10 py-4 flex items-center gap-2">
          <Stethoscope size={18} className="text-teal-600" />
          <span className="font-semibold text-gray-900">전문의 소견 요청</span>
          <span className="ml-auto text-sm text-gray-400">healwith</span>
        </div>
      </header>
      <main className="max-w-lg lg:max-w-[1400px] mx-auto px-5 lg:px-10 py-5 lg:py-8">{children}</main>
    </div>
  );
}
