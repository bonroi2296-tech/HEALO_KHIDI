"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminGuideModal } from "../_components/AdminGuideModal";
import { scrollToTopOnNarrow } from "@/lib/a11y/prefersReducedMotion";

const STATUS_OPTS = ["all", "draft", "approved", "rejected"];
const SCOPE_LABELS = { treatment: "Treatment", country: "Country", general: "General" };

export default function PlaybookPatternsPage() {
  const [patterns, setPatterns] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "all", language: "", q: "" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [approving, setApproving] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [extractThread, setExtractThread] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);

  // 폰(1단 배치): 상세가 목록 «아래»에 그려져 눌러도 화면이 안 바뀌던 것 — 위로 올려준다.
  const selectPattern = (p) => {
    setSelected(p);
    scrollToTopOnNarrow();
  };
  const [mergeSelection, setMergeSelection] = useState(new Set());
  const [merging, setMerging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const LIMIT = 20;

  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.language) params.set("language", filters.language);
      if (filters.q) params.set("q", filters.q);
      params.set("limit", LIMIT.toString());
      params.set("offset", (page * LIMIT).toString());
      const res = await fetch(`/api/admin/playbook/patterns?${params}`);
      const data = await res.json();
      if (data.ok) {
        setPatterns(data.patterns || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch patterns:", err);
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => { fetchPatterns(); }, [fetchPatterns]);

  const handleApprove = async (id) => {
    if (!confirm("이 패턴을 승인하고 RAG 문서로 등록하시겠습니까?")) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/playbook/patterns/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        alert(`승인 완료. RAG chunks ${data.chunks_created}개 생성됨`);
        fetchPatterns();
        if (selected?.id === id) setSelected(data.pattern);
      } else {
        const msg = data.gate_errors
          ? "품질 게이트 실패:\n" + data.gate_errors.join("\n")
          : "승인 실패: " + (data.error || "Unknown error");
        alert(msg);
        fetchPatterns();
      }
    } catch (_err) {
      alert("처리 중 오류가 발생했습니다");
    }
    setApproving(false);
  };

  const handleRetire = async (id) => {
    const reason = prompt("Retire 사유를 입력하세요 (선택):", "");
    if (reason === null) return;
    setRetiring(true);
    try {
      const res = await fetch(`/api/admin/playbook/patterns/${id}/retire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Manual retire" }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("패턴이 Retire 처리되었습니다");
        fetchPatterns();
        if (selected?.id === id) setSelected(null);
      } else {
        alert("Retire 실패: " + (data.error || "Unknown"));
      }
    } catch (_err) {
      alert("처리 중 오류가 발생했습니다");
    }
    setRetiring(false);
  };

  const handleExtract = async () => {
    if (!extractThread.trim()) return alert("Thread ID를 입력하세요");
    setExtracting(true);
    try {
      const res = await fetch("/api/admin/playbook/patterns/from-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: extractThread.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("패턴 추출 완료 (Draft)");
        setExtractThread("");
        fetchPatterns();
      } else {
        alert("추출 실패: " + (data.error || "Unknown error"));
      }
    } catch (_err) {
      alert("처리 중 오류가 발생했습니다");
    }
    setExtracting(false);
  };

  const toggleMergeItem = (id) => {
    setMergeSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleMerge = async () => {
    const ids = Array.from(mergeSelection);
    if (ids.length < 2) return alert("병합하려면 최소 2개를 선택하세요");
    const canonicalId = prompt(
      `대표 패턴 ID를 선택하세요:\n\n${ids.map((id) => {
        const p = patterns.find((pp) => pp.id === id);
        return `${id.slice(0, 8)}... — ${p?.user_intent?.slice(0, 40) || "?"}`;
      }).join("\n")}\n\n대표 ID 입력 (처음 8자 이상):`,
      ids[0]
    );
    if (!canonicalId) return;
    const matched = ids.find((i) => i.startsWith(canonicalId)) || canonicalId;
    const mergeIds = ids.filter((i) => i !== matched);
    if (mergeIds.length === 0) return alert("대표와 나머지를 구분할 수 없습니다");

    setMerging(true);
    try {
      const res = await fetch("/api/admin/playbook/patterns/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonical_id: matched, merge_ids: mergeIds }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`병합 완료: ${data.merged_count}개 → ${matched.slice(0, 8)}...`);
        setMergeMode(false);
        setMergeSelection(new Set());
        fetchPatterns();
      } else {
        alert("병합 실패: " + (data.error || "Unknown"));
      }
    } catch (_err) {
      alert("처리 중 오류가 발생했습니다");
    }
    setMerging(false);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-7xl mx-auto p-4">
      {showGuide && (
        <AdminGuideModal title="응대 패턴 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>챗봇이 참조하는 <strong>응대 패턴(Playbook Patterns)</strong>을 관리합니다. 각 패턴은 의도·범위·응답 템플릿·키 질문 등을 담고 있으며, 승인 시 RAG 문서로 등록되어 검색됩니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">주요 기능</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>승인</strong>: 패턴을 승인하면 RAG 청크가 생성되고 검색 대상이 됩니다.</li>
              <li><strong>퇴출(Retire)</strong>: 더 이상 사용하지 않는 패턴을 퇴출할 수 있습니다.</li>
              <li><strong>Thread에서 패턴 추출</strong>: 대화 스레드 ID로부터 새 패턴 초안을 추출합니다.</li>
              <li><strong>병합</strong>: 유사 패턴을 선택해 하나로 병합할 수 있습니다.</li>
            </ul>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">자동화</h3>
            <p className="text-teal-700 text-sm">「자동화」 메뉴에서 Daily Eval·Auto Improve·AB Finalize로 패턴 품질을 자동 평가·개선·승격할 수 있습니다.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Playbook Patterns</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            사용 가이드
          </button>
          <button
            onClick={() => { setMergeMode(!mergeMode); setMergeSelection(new Set()); }}
            className={`px-3 py-1.5 text-sm rounded ${mergeMode ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {mergeMode ? "병합 취소" : "병합 모드"}
          </button>
        </div>
      </div>

      {/* Extract from thread */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold mb-2">Thread에서 패턴 추출</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Chat Thread ID (UUID)"
            value={extractThread}
            onChange={(e) => setExtractThread(e.target.value)}
            className="flex-1 border rounded px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {extracting ? "추출 중..." : "패턴 추출"}
          </button>
        </div>
      </div>

      {/* Merge bar */}
      {mergeMode && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-orange-800">
            {mergeSelection.size}개 선택됨 — 체크박스로 패턴을 선택 후 "병합 실행"
          </span>
          <button
            onClick={handleMerge}
            disabled={merging || mergeSelection.size < 2}
            className="px-4 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {merging ? "병합 중..." : "병합 실행"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilters((f) => ({ ...f, status: s })); setPage(0); }}
              className={`px-3 py-1 rounded text-sm ${
                filters.status === s ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="검색 (intent/template)..."
          value={filters.q}
          onChange={(e) => { setFilters((f) => ({ ...f, q: e.target.value })); setPage(0); }}
          className="border rounded px-3 py-1 text-sm w-48"
        />
        <input
          type="text"
          placeholder="Language (en/ko)"
          value={filters.language}
          onChange={(e) => { setFilters((f) => ({ ...f, language: e.target.value })); setPage(0); }}
          className="border rounded px-3 py-1 text-sm w-28"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List — 폰에선 패턴을 고르면 접히고 상세만 보인다(합치기 모드일 땐 목록을 유지) */}
        <div className={`lg:col-span-2 ${selected && !mergeMode ? "hidden lg:block" : ""}`}>
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No patterns found</div>
          ) : (
            <div className="space-y-2">
              {patterns.map((p) => (
                <div
                  key={p.id}
                  onClick={() => !mergeMode && selectPattern(p)}
                  className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition ${
                    selected?.id === p.id && !mergeMode ? "ring-2 ring-indigo-500 bg-indigo-50" : ""
                  } ${!p.is_active && p.is_active !== undefined ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {mergeMode && (
                        <input
                          type="checkbox"
                          checked={mergeSelection.has(p.id)}
                          onChange={() => toggleMergeItem(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4"
                        />
                      )}
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                        p.status === "approved" ? "bg-green-100 text-green-800" :
                        p.status === "rejected" ? "bg-red-100 text-red-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {p.status}
                      </span>
                      {p.is_active === false && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">Retired</span>
                      )}
                      {p.canonical_id && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">Merged</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {SCOPE_LABELS[p.scope] || p.scope}
                      </span>
                      <span className="text-xs text-gray-600">{p.language}</span>
                    </div>
                    <span className={`text-xs ${p.quality_score < 70 ? "text-red-600 font-medium" : "text-gray-500"}`}>
                      Q: {p.quality_score}/100
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{p.user_intent}</p>
                  {p.treatment_slug && (
                    <span className="text-xs text-indigo-600">{p.treatment_slug}</span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40">Prev</button>
              <span className="text-sm text-gray-600">{page + 1} / {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className={`lg:col-span-1 ${selected && !mergeMode ? "" : "hidden lg:block"}`}>
          {selected ? (
            <div className="border rounded-lg p-4 bg-white sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  {/* 폰에서만 — 목록이 접혀 있어 되돌아갈 길이 필요하다 */}
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="lg:hidden shrink-0 -ml-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    ← 목록
                  </button>
                  <h3 className="text-sm font-bold">Pattern Detail</h3>
                </div>
                <div className="flex gap-1">
                  {selected.status === "draft" && selected.is_active !== false && (
                    <button
                      onClick={() => handleApprove(selected.id)}
                      disabled={approving}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {approving ? "승인 중..." : "승인"}
                    </button>
                  )}
                  {selected.is_active !== false && (
                    <button
                      onClick={() => handleRetire(selected.id)}
                      disabled={retiring}
                      className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      {retiring ? "처리 중..." : "Retire"}
                    </button>
                  )}
                </div>
              </div>

              {/* Quality gate failure */}
              {selected.quality_gate?.passed === false && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">품질 게이트 실패</p>
                  <ul className="text-xs text-red-600 list-disc list-inside">
                    {(selected.quality_gate.errors || []).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {selected.reject_reason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                  <p className="text-xs text-yellow-800">Reject: {selected.reject_reason}</p>
                </div>
              )}

              {selected.canonical_id && (
                <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-3">
                  <p className="text-xs text-orange-700">대표 패턴에 병합됨: <span className="font-mono">{selected.canonical_id.slice(0, 12)}...</span></p>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-gray-500 block">User Intent</label>
                  <p className="text-gray-800">{selected.user_intent}</p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block">Scope</label>
                  <p>{SCOPE_LABELS[selected.scope] || selected.scope}
                    {selected.treatment_slug && ` — ${selected.treatment_slug}`}
                    {selected.country && ` — ${selected.country}`}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block">Trigger</label>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-20">
                    {JSON.stringify(selected.trigger, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block">Key Questions</label>
                  <ul className="text-xs list-disc list-inside text-gray-700">
                    {(selected.key_questions || []).map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block">Response Structure</label>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-48">
                    {JSON.stringify(selected.response_structure, null, 2)}
                  </pre>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block">Response Template</label>
                  <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-40 overflow-auto">
                    {selected.response_template}
                  </pre>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block">Safety Notes</label>
                  <ul className="text-xs list-disc list-inside text-red-700">
                    {(selected.safety_notes || []).map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className={selected.quality_score < 70 ? "text-red-600 font-medium" : ""}>
                    Quality: {selected.quality_score}/100
                  </span>
                  {selected.is_active === false && <span className="text-gray-600">Retired</span>}
                  {selected.rag_document_id && <span className="text-green-700">RAG linked</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center text-gray-500 text-sm">
              패턴을 선택하면 상세 정보가 표시됩니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
