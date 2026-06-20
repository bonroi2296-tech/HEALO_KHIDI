"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Eye, Reply, CheckCircle, XCircle, Clock, Filter, X, ChevronDown, ChevronUp, Send } from "lucide-react";

const STATUS_CONFIG = {
  queued: { label: "대기", color: "bg-gray-100 text-gray-700", icon: Clock },
  sent: { label: "전송됨", color: "bg-blue-100 text-blue-700", icon: Send },
  viewed: { label: "조회됨", color: "bg-yellow-100 text-yellow-700", icon: Eye },
  replied: { label: "응답함", color: "bg-green-100 text-green-700", icon: Reply },
  converted: { label: "전환됨", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  rejected: { label: "거절", color: "bg-red-100 text-red-700", icon: XCircle },
  expired: { label: "만료", color: "bg-gray-100 text-gray-500", icon: Clock },
};

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "sent", label: "전송됨" },
  { value: "viewed", label: "조회됨" },
  { value: "replied", label: "응답함" },
  { value: "converted", label: "전환됨" },
  { value: "rejected", label: "거절" },
];

function fetchWithAuth(url, options = {}) {
  return import("@/lib/supabase/browser").then(({ createSupabaseBrowserClient }) => {
    const supabase = createSupabaseBrowserClient();
    return supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(url, { ...options, headers, credentials: "include" });
    });
  });
}

export default function HospitalLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetchWithAuth(`/api/partner/leads?${params}`);
      const data = await res.json();
      if (data.ok) {
        setLeads(data.leads);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("[Leads] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const handleOpenDetail = (lead) => {
    setSelectedLead(lead);
    setShowDetail(true);
    if (lead.status === "sent") {
      updateLeadStatus(lead.id, "viewed");
    }
  };

  const updateLeadStatus = async (leadId, status, extras = {}) => {
    try {
      const res = await fetchWithAuth(`/api/partner/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...extras }),
      });
      const data = await res.json();
      if (data.ok) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status, ...extras } : l)));
        if (selectedLead?.id === leadId) {
          setSelectedLead((prev) => ({ ...prev, status, ...extras }));
        }
      }
    } catch (err) {
      console.error("[Leads] Update error:", err);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="text-lg lg:text-2xl font-bold text-gray-900">리드 관리</h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-0.5">배정된 문의를 확인하고 응답하세요</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Filter size={14} className="text-gray-400" />
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {statusFilter ? "해당 상태의 리드가 없습니다" : "배정된 리드가 없습니다"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">
            총 {total}건 {statusFilter && `(${STATUS_FILTERS.find((f) => f.value === statusFilter)?.label})`}
          </p>
          <div className="space-y-3">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onClick={() => handleOpenDetail(lead)} />
            ))}
          </div>
        </>
      )}

      {showDetail && selectedLead && (
        <LeadDetailSheet
          lead={selectedLead}
          onClose={() => setShowDetail(false)}
          onUpdateStatus={updateLeadStatus}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, onClick }) {
  const inquiry = lead.normalized_inquiries;
  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.queued;
  const Icon = sc.icon;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition-all hover:border-blue-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${sc.color}`}>
              <Icon size={12} />
              {sc.label}
            </span>
            {inquiry?.treatment_slug && (
              <span className="text-xs text-gray-500 truncate">{inquiry.treatment_slug}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">
            {inquiry?.objective || "문의 내용"}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            {inquiry?.country && <span>{inquiry.country}</span>}
            {inquiry?.language && <span>{inquiry.language}</span>}
            <span>{new Date(lead.assigned_at).toLocaleDateString("ko-KR")}</span>
          </div>
        </div>
        <ChevronDown size={16} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

function LeadDetailSheet({ lead, onClose, onUpdateStatus }) {
  const inquiry = lead.normalized_inquiries;
  const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.queued;
  const Icon = sc.icon;
  const [notes, setNotes] = useState(lead.notes || "");
  const [priceMin, setPriceMin] = useState(lead.quoted_price_min || "");
  const [priceMax, setPriceMax] = useState(lead.quoted_price_max || "");
  const [saving, setSaving] = useState(false);

  const handleSaveQuote = async () => {
    setSaving(true);
    await onUpdateStatus(lead.id, "replied", {
      notes,
      quoted_price_min: priceMin ? Number(priceMin) : null,
      quoted_price_max: priceMax ? Number(priceMax) : null,
    });
    setSaving(false);
  };

  const statusActions = [];
  if (lead.status === "viewed") statusActions.push({ status: "replied", label: "응답 완료", color: "bg-green-600 hover:bg-green-700" });
  if (["replied", "viewed"].includes(lead.status)) statusActions.push({ status: "converted", label: "진료 전환", color: "bg-emerald-700 hover:bg-emerald-700" });
  if (!["converted", "rejected", "expired"].includes(lead.status)) statusActions.push({ status: "rejected", label: "거절", color: "bg-red-500 hover:bg-red-600" });

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
              <Icon size={14} />
              {sc.label}
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">문의 정보</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              {inquiry?.objective && (
                <div><span className="text-gray-500">목적:</span> <span className="text-gray-900 font-medium">{inquiry.objective}</span></div>
              )}
              {inquiry?.treatment_slug && (
                <div><span className="text-gray-500">시술:</span> <span className="text-gray-900">{inquiry.treatment_slug}</span></div>
              )}
              {inquiry?.country && (
                <div><span className="text-gray-500">국가:</span> <span className="text-gray-900">{inquiry.country}</span></div>
              )}
              {inquiry?.language && (
                <div><span className="text-gray-500">언어:</span> <span className="text-gray-900">{inquiry.language}</span></div>
              )}
              {inquiry?.source_type && (
                <div><span className="text-gray-500">출처:</span> <span className="text-gray-900">{inquiry.source_type}</span></div>
              )}
              <div className="text-xs text-gray-400 pt-1">
                배정일: {new Date(lead.assigned_at).toLocaleString("ko-KR")}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">견적/메모</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">최소 가격 (USD)</label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">최대 가격 (USD)</label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">메모</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="환자에 대한 메모를 입력하세요..."
                />
              </div>
              <button
                onClick={handleSaveQuote}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? "저장 중..." : "견적/메모 저장"}
              </button>
            </div>
          </div>

          {statusActions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">상태 변경</h3>
              <div className="flex flex-wrap gap-2">
                {statusActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={() => onUpdateStatus(lead.id, action.status)}
                    className={`${action.color} text-white px-4 py-2 rounded-lg text-sm font-medium transition`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
