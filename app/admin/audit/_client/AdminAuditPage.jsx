"use client";

import { useState, useEffect } from 'react';
import { Clock, Filter, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

// ✅ audit metadata whitelist (서버와 동일)
const AUDIT_METADATA_ALLOWED_KEYS = [
  "limit", "offset", "page", "status", "treatment_type", 
  "nationality", "sort_by", "sort_order", "decrypt", "include_normalized",
  "error", "reason", "path", "method"
];

/**
 * HEALO: 관리자 감사 로그 뷰어
 * 
 * 목적:
 * - 관리자 조회 활동 기록 확인
 * - 보안 감사 및 추적
 * 
 * 보안:
 * - PII 표시 금지 (inquiry_ids는 integer만)
 * - metadata는 sanitized된 것만 표시
 */
export const AdminAuditPage = ({ authToken }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;

  // 필터 상태
  const [filters, setFilters] = useState({
    action: '',
    admin_email: '',
    from_date: '',
    to_date: '',
  });

  const [showMetadata, setShowMetadata] = useState({});
  const [expandedInquiryIds, setExpandedInquiryIds] = useState({}); // ✅ inquiry_ids 전체 보기 토글

  // 로그 fetch
  const fetchLogs = async () => {
    if (!authToken) {
      console.error('[AdminAuditPage] No auth token');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      // 필터 추가
      if (filters.action) params.append('action', filters.action);
      if (filters.admin_email) params.append('admin_email', filters.admin_email);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      if (result.ok) {
        setLogs(result.logs || []);
        setTotal(result.total || 0);
      } else {
        console.error('[AdminAuditPage] API error:', result.error);
      }
    } catch (error) {
      console.error('[AdminAuditPage] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchLogs();
    }
  }, [page, authToken]);

  // 필터 적용
  const handleApplyFilters = () => {
    setPage(0); // 첫 페이지로 리셋
    fetchLogs();
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setFilters({
      action: '',
      admin_email: '',
      from_date: '',
      to_date: '',
    });
    setPage(0);
  };

  // 날짜 포맷 (KST)
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Seoul',
    });
  };

  // inquiry_ids 포맷 (요약)
  const formatInquiryIds = (ids, logId, isExpanded = false) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return '-';
    
    const MAX_PREVIEW = 3;
    
    // 전체 표시 또는 개수가 적으면 전체
    if (isExpanded || ids.length <= MAX_PREVIEW) {
      return ids.join(', ');
    }
    
    // 요약 표시: 처음 3개 + "… (총 N개)"
    const preview = ids.slice(0, MAX_PREVIEW).join(', ');
    const remaining = ids.length - MAX_PREVIEW;
    return `${preview}… (+${remaining})`;
  };

  // metadata toggle
  const toggleMetadata = (logId) => {
    setShowMetadata((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  // inquiry_ids toggle
  const toggleInquiryIds = (logId) => {
    setExpandedInquiryIds((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  // ✅ metadata sanitize (클라이언트 2차 방어) - 서버와 동일한 whitelist 사용
  const sanitizeMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object') return null;

    const sanitized = {};
    for (const key of Object.keys(metadata)) {
      if (AUDIT_METADATA_ALLOWED_KEYS.includes(key)) {
        sanitized[key] = metadata[key];
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Clock className="text-teal-600" />
          관리자 감사 로그
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          관리자 조회 활동 기록 ({total}건)
        </p>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-gray-600" />
          <span className="font-semibold text-gray-700">필터</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value="">전체</option>
              <option value="LIST_INQUIRIES">LIST_INQUIRIES</option>
              <option value="VIEW_INQUIRY">VIEW_INQUIRY</option>
              <option value="UPDATE_INQUIRY">UPDATE_INQUIRY</option>
              <option value="DELETE_INQUIRY">DELETE_INQUIRY</option>
              <option value="EXPORT_INQUIRIES">EXPORT_INQUIRIES</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Admin Email</label>
            <input
              type="text"
              value={filters.admin_email}
              onChange={(e) => setFilters({ ...filters, admin_email: e.target.value })}
              placeholder="admin@healo.com"
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
          >
            적용
          </button>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          로딩 중...
        </div>
      )}

      {/* 테이블 */}
      {!loading && (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                      Created At (KST)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                      Inquiry IDs
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                      Admin Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                      Metadata
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
                        감사 로그가 없습니다
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.inquiry_ids && log.inquiry_ids.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <span 
                              className="font-mono text-xs"
                              title={log.inquiry_ids.join(', ')} // ✅ hover tooltip
                            >
                              {formatInquiryIds(log.inquiry_ids, log.id, expandedInquiryIds[log.id])}
                            </span>
                            {log.inquiry_ids.length > 3 && (
                              <button
                                onClick={() => toggleInquiryIds(log.id)}
                                className="text-teal-600 hover:text-teal-800 text-xs underline"
                              >
                                {expandedInquiryIds[log.id] ? '접기' : '전체'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.admin_email}
                      </td>
                      <td className="px-4 py-3">
                        {log.metadata ? (
                          <button
                            onClick={() => toggleMetadata(log.id)}
                            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
                          >
                            {showMetadata[log.id] ? (
                              <>
                                <EyeOff size={14} /> 숨기기
                              </>
                            ) : (
                              <>
                                <Eye size={14} /> 보기
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        {showMetadata[log.id] && (() => {
                          const safeMetadata = sanitizeMetadata(log.metadata);
                          return safeMetadata ? (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 max-w-md overflow-auto">
                              <pre>{JSON.stringify(safeMetadata, null, 2)}</pre>
                            </div>
                          ) : (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500 italic">
                              메타데이터 없음
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-4">
              <div className="text-sm text-gray-600">
                Page {page + 1} of {totalPages} (Total: {total})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
