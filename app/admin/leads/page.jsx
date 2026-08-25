"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { AdminGuideModal } from "../_components/AdminGuideModal";
import { RefreshCw, ChevronDown } from "lucide-react";
import { leadStatusLabel, leadStatusBadge, LEAD_STATUS_ORDER } from "@/lib/leads/leadStatus";

// ✅ Supabase는 세션 확인용으로만 사용
const supabase = createSupabaseBrowserClient();

// 상태 라벨·색은 병원 포털과 «같은 사전»을 본다(src/lib/leads/leadStatus.js).
// 2026-08-25 이전엔 여기 따로 있어서 병원 화면과 말이 달랐다(발송됨/전송됨 · 거부됨/거절).

export default function LeadsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("");
  const [total, setTotal] = useState(0);
  const [updatingLeadId, setUpdatingLeadId] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  // ========================================
  // 데이터 Fetch
  // ========================================

  const fetchLeads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error("세션이 만료되었습니다.");
        return;
      }

      // Query params 생성
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (hospitalFilter) params.append("hospital_id", hospitalFilter);
      params.append("limit", "100");

      const response = await fetch(`/api/admin/leads?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.ok) {
        console.log('[Leads] ✅ Loaded:', result.leads?.length || 0);
        setLeads(result.leads || []);
        setTotal(result.total || 0);
      } else {
        console.error('[Leads] ❌ API failed:', result.error);
        toast.error('리드 로딩 실패: ' + (result.detail || result.error));
      }
    } catch (error) {
      console.error('[Leads] ❌ Fetch exception:', error);
      toast.error('리드 로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) return;

      const response = await fetch('/api/admin/hospitals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.ok) {
        setHospitals(result.hospitals || []);
      }
    } catch (error) {
      console.error('[Leads] ❌ Fetch hospitals exception:', error);
    }
  };

  // ========================================
  // Status 업데이트
  // ========================================

  const handleStatusChange = async (leadId, newStatus) => {
    setUpdatingLeadId(leadId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error("세션이 만료되었습니다.");
        return;
      }

      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.ok) {
        toast.success('상태가 업데이트되었습니다.');
        await fetchLeads(); // 목록 새로고침
      } else {
        console.error('[Leads] Status update error:', result.error);
        toast.error('상태 업데이트 실패: ' + (result.detail || result.error));
      }
    } catch (error) {
      console.error('[Leads] Status update exception:', error);
      toast.error('상태 업데이트 실패');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // ========================================
  // Effects
  // ========================================

  useEffect(() => {
    fetchHospitals();
    fetchLeads();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, hospitalFilter]);

  // ========================================
  // Render
  // ========================================

  return (
    <div className="space-y-6">
      {showGuide && (
        <AdminGuideModal title="리드 관리 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>병원으로 <strong>할당된 리드(문의·상담 요청)</strong>의 현황을 보고, 상태를 업데이트합니다. 병원 담당자가 응답·전환했는지 추적할 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">상태 의미</h3>
            <p className="text-gray-600 text-sm">대기 → 발송됨 → 조회됨 → 응답함 → 치료 확정(또는 거부/만료). 필터로 상태·병원별로 목록을 좁힐 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <p>리드를 선택해 병원에 할당하거나, 상태를 변경할 수 있습니다. 새로고침으로 최신 목록을 불러옵니다.</p>
          </section>
        </AdminGuideModal>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">리드 관리</h1>
          <p className="text-xs lg:text-sm text-gray-500 mt-1">
            병원별 리드 할당 및 응답 현황 ({total}개)
          </p>
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
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium transition disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태 필터
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="">전체</option>
              {LEAD_STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {leadStatusLabel(value)}
                </option>
              ))}
            </select>
          </div>

          {/* Hospital Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              병원 필터
            </label>
            <select
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="">전체</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">리드가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">할당일시</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">병원</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">문의 정보</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">가격 (USD)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(lead.assigned_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{lead.hospital?.name || '알 수 없음'}</div>
                      <div className="text-xs text-gray-500">{lead.hospital?.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-900">{lead.inquiry?.treatment_slug || '-'}</div>
                      <div className="text-xs text-gray-500">
                        {lead.inquiry?.country && <span className="mr-2">🌍 {lead.inquiry.country}</span>}
                        {lead.inquiry?.language && <span>💬 {lead.inquiry.language}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${leadStatusBadge(lead.status)}`}>
                        {leadStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {lead.quoted_price_min && lead.quoted_price_max ? (
                        <div>${lead.quoted_price_min.toLocaleString()} - ${lead.quoted_price_max.toLocaleString()}</div>
                      ) : lead.quoted_price_min ? (
                        <div>${lead.quoted_price_min.toLocaleString()}+</div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        disabled={updatingLeadId === lead.id}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-50"
                      >
                        {LEAD_STATUS_ORDER.map((value) => (
                          <option key={value} value={value}>{leadStatusLabel(value)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile: Cards */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">리드가 없습니다.</div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{lead.hospital?.name || '알 수 없음'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{lead.inquiry?.treatment_slug || '-'}</div>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium border ${leadStatusBadge(lead.status)}`}>
                  {leadStatusLabel(lead.status)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(lead.assigned_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                <span>
                  {lead.quoted_price_min ? `$${lead.quoted_price_min.toLocaleString()}${lead.quoted_price_max ? ` - $${lead.quoted_price_max.toLocaleString()}` : '+'}` : '-'}
                </span>
              </div>
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                disabled={updatingLeadId === lead.id}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 outline-none disabled:opacity-50"
              >
                {LEAD_STATUS_ORDER.map((value) => (
                  <option key={value} value={value}>{leadStatusLabel(value)}</option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>

      {/* Stats (optional) */}
      {!loading && leads.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">상태 요약</h3>
          <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
            {LEAD_STATUS_ORDER.map((status) => {
              const count = leads.filter(l => l.status === status).length;
              return (
                <div key={status} className="text-center">
                  <div className={`text-lg lg:text-2xl font-bold ${count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{leadStatusLabel(status)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
