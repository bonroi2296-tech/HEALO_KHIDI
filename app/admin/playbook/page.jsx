"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, Plus, Check, X, RefreshCw, ChevronLeft, ChevronRight,
  Eye, EyeOff, Send, Tag, AlertTriangle
} from "lucide-react";
import { AdminGuideModal } from "../_components/AdminGuideModal";

const STATUS_TABS = [
  { value: "", label: "전체" },
  { value: "draft", label: "초안" },
  { value: "pending", label: "검토중" },
  { value: "approved", label: "승인됨" },
  { value: "rejected", label: "반려" },
];

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
};

const PAGE_SIZE = 30;

export default function PlaybookPage() {
  const [responses, setResponses] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ raw: "", tags: "", language: "en" });
  const [creating, setCreating] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const [approving, setApproving] = useState({});
  const [showGuide, setShowGuide] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/admin/playbook/responses?${params}`);
      const json = await res.json();
      if (json.ok) {
        setResponses(json.responses);
        setTotal(json.total);
      }
    } catch (e) {
      console.error("fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleCreate = async () => {
    if (!createForm.raw.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/playbook/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response_text_raw: createForm.raw,
          case_tags: createForm.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          language: createForm.language,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setShowCreate(false);
        setCreateForm({ raw: "", tags: "", language: "en" });
        fetchList();
      } else {
        alert(`등록 실패: ${json.error}`);
      }
    } catch {
      alert("등록 중 오류 발생");
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm("이 응대를 승인하고 RAG에 반영하시겠습니까?")) return;
    setApproving((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/admin/playbook/responses/${id}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.ok) {
        fetchList();
        alert(`승인 완료! RAG 문서 생성됨 (chunks: ${json.chunks_created})`);
      } else {
        alert(`승인 실패: ${json.error}`);
      }
    } catch {
      alert("승인 중 오류 발생");
    } finally {
      setApproving((p) => ({ ...p, [id]: false }));
    }
  };

  const selected = responses.find((r) => r.id === selectedId);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {showGuide && (
        <AdminGuideModal title="플레이북 관리 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p><strong>응대 원문(플레이북 응답)</strong>을 등록하고, PII 정제·검토·승인한 뒤 RAG에 반영하는 흐름을 관리합니다. 여기서 등록·승인된 응대는 응대 패턴(Playbook Patterns)과 RAG 검색에 활용됩니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>「응대 등록」으로 원문을 넣으면 서버에서 PII 마스킹 후 초안으로 저장됩니다.</li>
              <li>상태: 초안 → 검토중 → 승인/반려. 승인 시 응대 패턴으로 전달되거나 RAG에 반영될 수 있습니다.</li>
              <li>목록에서 항목을 선택해 상세를 보고 승인·반려할 수 있습니다.</li>
            </ul>
          </section>
        </AdminGuideModal>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">플레이북 관리</h1>
            <p className="text-sm text-gray-500">응대 등록 · PII 정제 · 승인 → RAG 반영</p>
          </div>
        </div>
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
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            응대 등록
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-semibold text-gray-800">새 응대 등록</h3>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[120px] resize-y"
            placeholder="응대 원문 (raw) — PII가 포함되어 있어도 서버에서 자동 마스킹됩니다"
            value={createForm.raw}
            onChange={(e) => setCreateForm((p) => ({ ...p, raw: e.target.value }))}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Case Tags (쉼표 구분)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="rhinoplasty, pricing, recovery"
                value={createForm.tags}
                onChange={(e) => setCreateForm((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-500 mb-1">Language</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                value={createForm.language}
                onChange={(e) => setCreateForm((p) => ({ ...p, language: e.target.value }))}
              >
                <option value="en">EN</option>
                <option value="ko">KO</option>
                <option value="ja">JA</option>
                <option value="zh">ZH</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createForm.raw.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-700 hover:bg-teal-700 text-white text-sm rounded-lg disabled:opacity-50 transition"
            >
              <Send size={14} />
              {creating ? "처리중..." : "등록"}
            </button>
          </div>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setOffset(0); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              statusFilter === tab.value
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={fetchList}
          className="px-2 py-1.5 text-gray-400 hover:text-gray-600 transition"
          title="새로고침"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="text-sm text-gray-500">총 {total}건</div>

      {/* List + Detail split */}
      <div className="flex gap-4">
        {/* List */}
        <div className={`${selectedId ? "w-1/2" : "w-full"} bg-white rounded-xl border border-gray-200 overflow-hidden transition-all`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">요약</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 w-16">Lang</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 w-20">Status</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 w-16">Score</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 w-28">Tags</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600 w-24">Date</th>
                <th className="px-3 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : responses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    등록된 응대가 없습니다
                  </td>
                </tr>
              ) : (
                responses.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                    className={`border-b border-gray-100 cursor-pointer transition ${
                      r.id === selectedId ? "bg-teal-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-2.5 max-w-[220px] truncate text-gray-800">
                      {r.response_text_sanitized?.slice(0, 60) || "..."}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono">{r.language}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono">{r.quality_score}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {(r.case_tags || []).slice(0, 2).map((t, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
                            {t}
                          </span>
                        ))}
                        {(r.case_tags || []).length > 2 && (
                          <span className="text-[10px] text-gray-400">+{r.case_tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("ko-KR") : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.status !== "approved" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(r.id); }}
                          disabled={approving[r.id]}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 transition"
                          title="승인"
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-1/2 bg-white rounded-xl border border-gray-200 p-5 space-y-4 sticky top-20 self-start max-h-[calc(100vh-10rem)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">상세 보기</h3>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                {selected.status}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                Score: {selected.quality_score}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {selected.language}
              </span>
              {(selected.case_tags || []).map((t, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1">
                  <Tag size={10} /> {t}
                </span>
              ))}
            </div>

            {/* Sanitize flags */}
            {selected.metadata?.sanitize_flags?.length > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">정제 플래그:</span>{" "}
                  {selected.metadata.sanitize_flags.join(", ")}
                </div>
              </div>
            )}

            {/* Raw/Sanitized toggle */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowRaw(false)}
                  className={`text-xs px-2 py-1 rounded ${!showRaw ? "bg-teal-100 text-teal-800 font-medium" : "text-gray-500"}`}
                >
                  Sanitized (학습용)
                </button>
                <button
                  onClick={() => setShowRaw(true)}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${showRaw ? "bg-red-100 text-red-800 font-medium" : "text-gray-500"}`}
                >
                  {showRaw ? <Eye size={12} /> : <EyeOff size={12} />}
                  Raw (관리자 전용)
                </button>
              </div>
              <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap leading-relaxed ${
                showRaw
                  ? "bg-red-50 border border-red-200 text-gray-800"
                  : "bg-gray-50 border border-gray-200 text-gray-700"
              }`}>
                {showRaw ? selected.response_text_raw : selected.response_text_sanitized}
              </div>
            </div>

            {/* Approve action */}
            {selected.status !== "approved" && (
              <button
                onClick={() => handleApprove(selected.id)}
                disabled={approving[selected.id]}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition"
              >
                <Check size={16} />
                {approving[selected.id] ? "승인 처리중..." : "승인 → RAG 반영"}
              </button>
            )}

            {selected.status === "approved" && selected.rag_document_id && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                RAG 문서 ID: <span className="font-mono">{selected.rag_document_id}</span>
                <br />
                승인 일시: {selected.approved_at ? new Date(selected.approved_at).toLocaleString("ko-KR") : "-"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600 px-3">{currentPage} / {totalPages}</span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
