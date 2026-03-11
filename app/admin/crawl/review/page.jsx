"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Check,
  X,
  SkipForward,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Building2,
  ArrowUpDown,
} from "lucide-react";
import { useToast } from "../../../../src/components/Toast";
import { AdminGuideModal } from "../../_components/AdminGuideModal";
import Link from "next/link";

const TABS = [
  { key: "new", label: "신규", color: "text-green-600 border-green-500", bg: "bg-green-50" },
  { key: "changed", label: "변경", color: "text-blue-600 border-blue-500", bg: "bg-blue-50" },
  { key: "closed", label: "폐업 의심", color: "text-red-600 border-red-500", bg: "bg-red-50" },
];

const PAGE_SIZE = 50;

export default function ReviewPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  const [job, setJob] = useState(null);
  const [counts, setCounts] = useState({});
  const [activeTab, setActiveTab] = useState("new");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterOptions, setFilterOptions] = useState({ types: [], regions: [] });
  const searchTimer = useRef(null);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/admin/crawl/jobs/${jobId}`);
      const data = await res.json();
      if (data.ok) {
        setJob(data.job);
        setCounts(data.counts || {});
      }
    } catch {
      toast.error("잡 정보 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [jobId, toast]);

  const fetchItems = useCallback(async () => {
    if (!jobId) return;
    setItemsLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeTab,
        reviewed: "false",
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (searchText) params.set("search", searchText);
      if (filterRegion) params.set("region", filterRegion);
      if (filterType) params.set("type", filterType);
      if (filterSpecialty) params.set("specialty", filterSpecialty);
      if (page === 0 && filterOptions.types.length === 0) params.set("withFilters", "true");

      const res = await fetch(`/api/admin/crawl/jobs/${jobId}/items?${params}`);
      const data = await res.json();
      if (data.ok) {
        setItems(data.items || []);
        // Use server count if available, otherwise fall back to job-level counts
        const serverTotal = data.total || 0;
        const hasActiveFilters = searchText || filterRegion || filterType || filterSpecialty;
        if (hasActiveFilters || serverTotal > 0) {
          setTotal(serverTotal);
        } else {
          // For unfiltered queries, use the known job-level count
          setTotal(counts[activeTab] || 0);
        }
        if (data.filterOptions) setFilterOptions(data.filterOptions);
      } else {
        console.error("[ReviewPage] items API error:", data.error);
        toast.error(data.error || "항목 로드 실패");
      }
    } catch (err) {
      console.error("[ReviewPage] fetch error:", err);
      toast.error("항목 로드 실패");
    } finally {
      setItemsLoading(false);
    }
  }, [jobId, activeTab, page, searchText, filterRegion, filterType, filterSpecialty, toast, filterOptions.types.length, counts]);

  useEffect(() => { fetchJob(); }, [fetchJob]);
  useEffect(() => {
    if (!loading) {
      setSelected(new Set());
      fetchItems();
    }
  }, [fetchItems, loading]);

  const handleSearch = (val) => {
    setSearchText(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(0); }, 400);
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setPage(0);
    setSelected(new Set());
  };

  const toggleItem = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const handleBatchAction = async (action) => {
    if (selected.size === 0) return toast.error("항목을 선택하세요");
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/crawl/jobs/${jobId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, item_ids: [...selected] }),
      });
      const data = await res.json();
      if (data.ok) {
        const label = action === "approve" ? "승인" : action === "reject" ? "거부" : "스킵";
        const successCount = data.approved ?? data.rejected ?? data.skipped ?? selected.size;
        toast.success(`${successCount}건 ${label} 완료`);
        if (data.errors?.length > 0) {
          console.error("[Review] approval errors:", data.errors);
          toast.error(`${data.errors.length}건 오류: ${data.errors[0]}`);
        }
        setSelected(new Set());
        fetchItems();
        fetchJob();
      } else {
        toast.error(data.error || "처리 실패");
      }
    } catch {
      toast.error("처리 중 오류");
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!jobId) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-gray-400">
        <p>jobId 파라미터가 필요합니다.</p>
        <Link href="/admin/crawl/pipeline" className="text-teal-600 hover:underline mt-2 inline-block">
          파이프라인으로 돌아가기
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-teal-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      {showGuide && (
        <AdminGuideModal title="검토 큐 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>크롤링 파이프라인에서 <strong>완료된 수집 작업</strong>의 결과를 검토하는 곳입니다. 신규 병원, 변경 감지, 폐업 의심 항목을 탭별로 보고, 승인하면 병원관리에 반영되거나 기존 병원이 업데이트됩니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">탭 의미</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>신규</strong>: DB에 없던 병원. 승인 시 병원관리에 새 레코드로 등록됩니다 (is_published=false).</li>
              <li><strong>변경</strong>: 기존 병원 정보가 바뀐 경우. 승인 시 해당 병원 데이터가 업데이트됩니다.</li>
              <li><strong>폐업 의심</strong>: 영업 중단 등으로 판단된 항목. 검토 후 거부하거나 병원관리에서 비공개 처리할 수 있습니다.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <p>항목을 선택한 뒤 「승인」하면 병원관리 쪽에 반영됩니다. 승인 후 병원관리에서 상세를 편집하고 공개할 수 있습니다.</p>
          </section>
        </AdminGuideModal>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/crawl/pipeline" className="text-gray-400 hover:text-gray-600 transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">검토 큐</h1>
            <span className="text-sm text-gray-400">
              {job?.source_id} · {new Date(job?.created_at).toLocaleString("ko-KR")}
            </span>
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
            onClick={() => { fetchJob(); fetchItems(); }}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <RefreshCw size={14} /> 새로고침
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="신규 병원" value={(counts.new || 0).toLocaleString()} sub="개" color="text-green-600 bg-green-50" />
        <StatCard label="변경 감지" value={(counts.changed || 0).toLocaleString()} sub="개" color="text-blue-600 bg-blue-50" />
        <StatCard label="폐업 의심" value={(counts.closed || 0).toLocaleString()} sub="개" color="text-red-600 bg-red-50" />
        <StatCard label="검토 완료" value={(counts.reviewed || 0).toLocaleString()} sub="개" color="text-gray-600 bg-gray-50" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => {
            const count = counts[tab.key] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => changeTab(tab.key)}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition ${
                  activeTab === tab.key ? tab.color : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                {tab.label} ({count.toLocaleString()})
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-[200px] max-w-[300px]">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="병원명 검색..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className="text-sm border-none outline-none bg-transparent flex-1"
            />
          </div>
          <select
            value={filterRegion}
            onChange={(e) => { setFilterRegion(e.target.value); setPage(0); }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
          >
            <option value="">전체 지역</option>
            {filterOptions.regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
          >
            <option value="">전체 종별</option>
            {filterOptions.types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="진료과목 필터..."
            value={filterSpecialty}
            onChange={(e) => { setFilterSpecialty(e.target.value); setPage(0); }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white w-[130px]"
          />
          {(searchText || filterRegion || filterType || filterSpecialty) && (
            <button
              onClick={() => { setSearchText(""); setFilterRegion(""); setFilterType(""); setFilterSpecialty(""); setPage(0); }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X size={12} /> 초기화
            </button>
          )}
          <div className="ml-auto text-xs text-gray-400">
            {total.toLocaleString()}건
          </div>
        </div>

        {/* Batch action bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selected.size === items.length && items.length > 0}
              onChange={selectAll}
              className="w-4 h-4 rounded border-gray-300 text-teal-600"
            />
            <span className="text-xs text-gray-500">
              {selected.size > 0 ? `${selected.size}건 선택` : "전체 선택"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBatchAction("approve")}
              disabled={processing || selected.size === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition disabled:opacity-40"
            >
              <Check size={12} /> 승인 → 병원관리
            </button>
            <button
              onClick={() => handleBatchAction("reject")}
              disabled={processing || selected.size === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition disabled:opacity-40"
            >
              <X size={12} /> 거부
            </button>
            <button
              onClick={() => handleBatchAction("skip")}
              disabled={processing || selected.size === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition disabled:opacity-40"
            >
              <SkipForward size={12} /> 스킵
            </button>
          </div>
        </div>

        {/* Table */}
        {itemsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-teal-500" size={24} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            검토 대기 항목이 없습니다
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b border-gray-200">
                  <th className="w-10 px-3 py-2.5"></th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 min-w-[200px]">병원명</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-[80px]">종별</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 min-w-[250px]">주소</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-[110px]">전화번호</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-[100px]">진료과목</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600 w-[50px]">의사</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-[100px]">홈페이지</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    item={item}
                    isSelected={selected.has(item.id)}
                    onToggle={() => toggleItem(item.id)}
                    tab={activeTab}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              {(page * PAGE_SIZE + 1).toLocaleString()}~{Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} / {total.toLocaleString()}건
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                처음
              </button>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
              >
                끝
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approval info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
        <strong>승인 시:</strong> 신규 병원은 <strong>병원관리</strong>에 새 레코드로 등록됩니다 (is_published=false).
        변경 감지는 해당 병원 정보를 업데이트하고, 폐업 의심은 비활성(is_active=false) 처리됩니다.
        승인 후 병원관리에서 상세 정보를 편집하고 공개할 수 있습니다.
      </div>
    </div>
  );
}

function TableRow({ item, isSelected, onToggle, tab }) {
  const d = item.data || {};
  const isChanged = tab === "changed";
  const diff = item.change_diff || {};

  return (
    <tr
      onClick={onToggle}
      className={`cursor-pointer transition ${
        isSelected ? "bg-teal-50/60" : "hover:bg-gray-50"
      }`}
    >
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600"
        />
      </td>
      <td className="px-3 py-2">
        <div className="font-medium text-gray-800 truncate max-w-[250px]" title={item.name}>
          {item.name}
        </div>
        {isChanged && diff.yadmNm && (
          <div className="text-[10px] text-blue-500 mt-0.5">
            ← {diff.yadmNm.old}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] whitespace-nowrap">
          {d.clCdNm || "-"}
        </span>
      </td>
      <td className="px-3 py-2 text-gray-600 truncate max-w-[300px]" title={d.addr}>
        {d.addr || d.location_kr || "-"}
        {isChanged && diff.addr && (
          <div className="text-[10px] text-blue-500 mt-0.5 truncate">
            ← {diff.addr.old}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
        {d.telno || d.phone || "-"}
      </td>
      <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]" title={d.dgsbjtCdNm}>
        {d.dgsbjtCdNm || "-"}
      </td>
      <td className="px-3 py-2 text-center text-gray-600">
        {d.drTotCnt || "-"}
      </td>
      <td className="px-3 py-2">
        {(d.hospUrl || d.website) ? (
          <a
            href={d.hospUrl || d.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-teal-600 hover:underline truncate block max-w-[100px]"
            title={d.hospUrl || d.website}
          >
            링크
          </a>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </td>
    </tr>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`rounded-xl p-3 text-center ${color}`}>
      <div className="text-xl font-bold">{value}<span className="text-xs font-normal opacity-60 ml-0.5">{sub}</span></div>
      <div className="text-[11px] mt-0.5 opacity-70">{label}</div>
    </div>
  );
}
