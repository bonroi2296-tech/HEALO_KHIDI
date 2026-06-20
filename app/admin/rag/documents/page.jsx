"use client";

import { useState, useEffect, useCallback } from "react";
import { Brain, RefreshCw, Save, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminGuideModal } from "../../_components/AdminGuideModal";

const TIER_LABELS = { 1: "Tier 1 — 공공/공식", 2: "Tier 2 — 제휴", 3: "Tier 3 — 공개수집" };
const TIER_COLORS = {
  1: "bg-emerald-100 text-emerald-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-gray-100 text-gray-600",
};
const PAGE_SIZE = 30;

export default function RagDocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterTier, setFilterTier] = useState("");
  const [filterSourceType, setFilterSourceType] = useState("");
  const [filterExpired, setFilterExpired] = useState("");
  const [searchQ, setSearchQ] = useState("");

  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState({});
  const [showGuide, setShowGuide] = useState(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    if (filterTier) params.set("trust_tier", filterTier);
    if (filterSourceType) params.set("source_type", filterSourceType);
    if (filterExpired) params.set("expired", filterExpired);
    if (searchQ.trim()) params.set("q", searchQ.trim());

    try {
      const res = await fetch(`/api/admin/rag/documents?${params}`);
      const json = await res.json();
      if (json.ok) {
        setDocs(json.documents);
        setTotal(json.total);
      }
    } catch (e) {
      console.error("fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [offset, filterTier, filterSourceType, filterExpired, searchQ]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleEdit = (id, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const handleSave = async (doc) => {
    const patch = edits[doc.id];
    if (!patch || Object.keys(patch).length === 0) return;

    setSaving((p) => ({ ...p, [doc.id]: true }));
    try {
      const body = {};
      if (patch.trust_tier !== undefined) body.trust_tier = Number(patch.trust_tier);
      if (patch.expires_at !== undefined) body.expires_at = patch.expires_at || null;
      if (patch.source_label !== undefined) body.source_label = patch.source_label || null;

      const res = await fetch(`/api/admin/rag/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.ok) {
        setDocs((prev) => prev.map((d) => (d.id === doc.id ? json.document : d)));
        setEdits((prev) => {
          const next = { ...prev };
          delete next[doc.id];
          return next;
        });
      } else {
        alert(`저장 실패: ${json.error || json.errors?.join(", ")}`);
      }
    } catch (_e) {
      alert("저장 중 오류 발생");
    } finally {
      setSaving((p) => ({ ...p, [doc.id]: false }));
    }
  };

  const isExpired = (d) => d.expires_at && new Date(d.expires_at) < new Date();
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasEdits = (id) => edits[id] && Object.keys(edits[id]).length > 0;

  return (
    <div className="space-y-4">
      {showGuide && (
        <AdminGuideModal title="RAG 문서/Tier 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>RAG 검색에 사용되는 <strong>문서(rag_documents)</strong>의 Trust Tier, 만료일(expires_at), 소스 라벨 등을 조회·편집합니다. Tier가 높을수록 검색 결과에서 우선 노출됩니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Trust Tier</h3>
            <p className="text-gray-600 text-sm">Tier 1(공공/공식) → Tier 2(제휴) → Tier 3(공개수집) 순으로 우선순위가 높습니다. 필터로 Tier·소스 타입·만료 여부별로 목록을 볼 수 있고, 저장하면 DB에 반영됩니다.</p>
          </section>
        </AdminGuideModal>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">RAG 문서 관리</h1>
            <p className="text-sm text-gray-500">Trust Tier 설정 · 만료 관리</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Trust Tier</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={filterTier}
              onChange={(e) => { setFilterTier(e.target.value); setOffset(0); }}
            >
              <option value="">전체</option>
              <option value="1">Tier 1 — 공공/공식</option>
              <option value="2">Tier 2 — 제휴</option>
              <option value="3">Tier 3 — 공개수집</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Source Type</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={filterSourceType}
              onChange={(e) => { setFilterSourceType(e.target.value); setOffset(0); }}
            >
              <option value="">전체</option>
              <option value="treatment">treatment</option>
              <option value="hospital">hospital</option>
              <option value="review">review</option>
              <option value="faq">faq</option>
              <option value="policy">policy</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">만료 상태</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={filterExpired}
              onChange={(e) => { setFilterExpired(e.target.value); setOffset(0); }}
            >
              <option value="">전체</option>
              <option value="false">유효</option>
              <option value="true">만료됨</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">검색</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm"
                placeholder="제목/내용 검색..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setOffset(0); fetchDocs(); } }}
              />
            </div>
          </div>
          <button
            onClick={() => { setOffset(0); fetchDocs(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-gray-500">
        총 {total}건 · 페이지 {currentPage} / {totalPages || 1}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">제목</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-16">Lang</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-24">Source</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-44">Trust Tier</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-40">Source Label</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-44">Expires At</th>
              <th className="text-left px-3 py-3 font-medium text-gray-600 w-36">Updated</th>
              <th className="px-3 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  문서가 없습니다
                </td>
              </tr>
            ) : (
              docs.map((doc) => {
                const e = edits[doc.id] || {};
                const tier = e.trust_tier !== undefined ? Number(e.trust_tier) : doc.trust_tier;
                const expired = isExpired(doc);
                return (
                  <tr
                    key={doc.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition ${expired ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-2.5 max-w-[280px] truncate" title={doc.title}>
                      {doc.title || <span className="text-gray-400 italic">제목 없음</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono">{doc.lang}</td>
                    <td className="px-3 py-2.5 text-xs">{doc.source_type}</td>
                    <td className="px-3 py-2.5">
                      <select
                        className={`rounded-lg px-2 py-1 text-xs font-medium border-0 cursor-pointer ${TIER_COLORS[tier]}`}
                        value={tier}
                        onChange={(ev) => handleEdit(doc.id, "trust_tier", ev.target.value)}
                      >
                        <option value={1}>Tier 1 — 공공/공식</option>
                        <option value={2}>Tier 2 — 제휴</option>
                        <option value={3}>Tier 3 — 공개수집</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        className="border border-gray-200 rounded px-2 py-1 text-xs w-full"
                        placeholder="출처 라벨"
                        value={e.source_label !== undefined ? e.source_label : (doc.source_label || "")}
                        onChange={(ev) => handleEdit(doc.id, "source_label", ev.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="datetime-local"
                        className="border border-gray-200 rounded px-2 py-1 text-xs w-full"
                        value={
                          e.expires_at !== undefined
                            ? e.expires_at
                            : doc.expires_at
                              ? doc.expires_at.slice(0, 16)
                              : ""
                        }
                        onChange={(ev) => handleEdit(doc.id, "expires_at", ev.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString("ko-KR") : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      {hasEdits(doc.id) && (
                        <button
                          onClick={() => handleSave(doc)}
                          disabled={saving[doc.id]}
                          className="p-1.5 bg-teal-700 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition"
                          title="저장"
                        >
                          <Save size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
          <span className="text-sm text-gray-600 px-3">
            {currentPage} / {totalPages}
          </span>
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
