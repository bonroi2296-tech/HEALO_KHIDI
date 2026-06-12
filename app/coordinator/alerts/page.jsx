'use client';

/**
 * HEALO: 코디네이터 증상 이상치 알림 화면 (FR-16)
 *
 * ⚠️ 의료 면책 고지:
 * 이 화면에 표시된 감지 결과는 의학적 진단이 아닙니다.
 * 코디네이터가 직접 환자 상태를 확인하고 필요 시 의료진에게 연결하세요.
 */

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
} from 'lucide-react';

const SEVERITY_STYLE = {
  critical: {
    label: '긴급',
    bg: 'bg-red-100 text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-500',
    badge: 'bg-red-500 text-white',
  },
  high: {
    label: '높음',
    bg: 'bg-orange-100 text-orange-800',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500 text-white',
  },
  medium: {
    label: '보통',
    bg: 'bg-yellow-100 text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-500 text-white',
  },
  low: {
    label: '낮음',
    bg: 'bg-green-100 text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
    badge: 'bg-green-500 text-white',
  },
};

const ALERT_TYPE_LABEL = {
  fever_high: '🌡️ 고열 감지',
  pain_critical: '😣 통증 위험',
  silence_long: '🔇 장기 무입력',
  symptom_worsening: '📈 증상 급악화',
  ai_risk: '🤖 AI 위험 감지',
};

const FILTER_TABS = [
  { key: 'unacknowledged', label: '미확인' },
  { key: 'unresolved', label: '미해결' },
  { key: 'all', label: '전체' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unacknowledged');
  const [severityFilter, setSeverityFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [resolveModal, setResolveModal] = useState(null); // { alertId }
  const [resolveNote, setResolveNote] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    try {
      let url = `/api/symptoms/alerts?status=${filter}&limit=100`;
      if (severityFilter) url += `&severity=${severityFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setAlerts(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [filter, severityFilter]);

  // 미확인 뱃지 카운트 (별도 조회)
  const fetchUnreadCount = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch('/api/symptoms/alerts?status=unacknowledged&limit=1', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.ok) setUnreadCount(data.total || 0);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchUnreadCount();
  }, [fetchAlerts, fetchUnreadCount]);

  const handleAcknowledge = async (alertId) => {
    setActionLoading(alertId);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await fetch('/api/symptoms/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ alert_id: alertId, action: 'acknowledge' }),
      });
      await fetchAlerts();
      await fetchUnreadCount();
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async () => {
    if (!resolveModal) return;
    setActionLoading(resolveModal.alertId);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await fetch('/api/symptoms/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          alert_id: resolveModal.alertId,
          action: 'resolve',
          resolution_note: resolveNote.trim() || null,
        }),
      });
      setResolveModal(null);
      setResolveNote('');
      await fetchAlerts();
      await fetchUnreadCount();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            증상 이상치 알림
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            환자 증상 이상치를 AI·규칙으로 자동 감지한 결과입니다.
          </p>
        </div>
        <button
          onClick={() => { fetchAlerts(); fetchUnreadCount(); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* 의료 면책 고지 */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Shield size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800">
          <strong>안내:</strong> 이 화면의 감지 결과는 의학적 진단이 아닙니다.
          코디네이터가 직접 환자 상태를 확인하고 필요 시 의료진에게 연결하세요.
        </p>
      </div>

      {/* 필터 탭 */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setLoading(true); setFilter(tab.key); }}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                filter === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* severity 필터 */}
        <select
          value={severityFilter}
          onChange={e => { setSeverityFilter(e.target.value); setLoading(true); }}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 mb-1"
        >
          <option value="">모든 심각도</option>
          <option value="critical">긴급</option>
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </select>
      </div>

      {/* 알림 목록 */}
      {alerts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-500 font-medium">해당 조건의 알림이 없습니다</p>
          <p className="text-gray-400 text-sm mt-1">모든 환자 상태가 양호합니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const sStyle = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.low;
            const isExpanded = expandedId === alert.id;
            const isAck = !!alert.acknowledged_at;
            const isResolved = !!alert.resolved_at;

            return (
              <div
                key={alert.id}
                className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${sStyle.border} ${isResolved ? 'opacity-60' : ''}`}
              >
                {/* 메인 행 */}
                <div className="flex items-start gap-3 p-4">
                  {/* severity dot */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${sStyle.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sStyle.bg}`}>
                        {sStyle.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {ALERT_TYPE_LABEL[alert.alert_type] || alert.alert_type}
                      </span>
                      {isResolved && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">해결됨</span>
                      )}
                      {!isResolved && isAck && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">확인됨</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        환자: {alert.patient_id?.slice(0, 8)}…
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(alert.detected_at).toLocaleString('ko-KR')}
                      </span>
                      <span className="uppercase tracking-wide">
                        by {alert.detected_by === 'ai' ? '🤖 AI' : '📏 규칙'}
                      </span>
                    </div>

                    {/* 데이터 요약 */}
                    {alert.data && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {alert.data.reasoning
                          ? alert.data.reasoning
                          : alert.data.temperature
                            ? `체온 ${alert.data.temperature}℃`
                            : alert.data.pain_score
                              ? `통증 ${alert.data.pain_score}/10`
                              : alert.data.silence_days
                                ? `${alert.data.silence_days}일 무입력`
                                : alert.data.delta
                                  ? `통증 +${alert.data.delta}점 상승`
                                  : ''}
                      </p>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isResolved && !isAck && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={actionLoading === alert.id}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
                      >
                        {actionLoading === alert.id ? '처리 중…' : '확인'}
                      </button>
                    )}
                    {!isResolved && (
                      <button
                        onClick={() => { setResolveModal({ alertId: alert.id }); setResolveNote(''); }}
                        className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition"
                      >
                        해결
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* 확장 상세 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                    <div className="text-xs">
                      <span className="font-medium text-gray-500 uppercase tracking-wide">감지 데이터</span>
                      <pre className="mt-1 text-gray-700 whitespace-pre-wrap font-mono text-[11px] bg-white border border-gray-200 rounded p-2">
                        {JSON.stringify(alert.data, null, 2)}
                      </pre>
                    </div>
                    {alert.acknowledged_at && (
                      <p className="text-xs text-gray-500">
                        확인: {new Date(alert.acknowledged_at).toLocaleString('ko-KR')}
                      </p>
                    )}
                    {alert.resolution_note && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">해결 메모:</span> {alert.resolution_note}
                      </p>
                    )}
                    {alert.resolved_at && (
                      <p className="text-xs text-gray-500">
                        해결: {new Date(alert.resolved_at).toLocaleString('ko-KR')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 해결 모달 */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              알림 해결 처리
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              환자 상태 확인 후 조치 내용을 기록하세요. (선택사항)
            </p>
            <textarea
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              placeholder="예: 환자에게 연락하여 확인. 현재 안정 상태. 주치의에게 보고 완료."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleResolve}
                disabled={actionLoading === resolveModal.alertId}
                className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading === resolveModal.alertId ? '처리 중…' : '해결 완료'}
              </button>
              <button
                onClick={() => { setResolveModal(null); setResolveNote(''); }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 면책 footer */}
      <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
        <AlertTriangle size={12} />
        <span>
          감지 결과는 참고용입니다. 실제 의료적 판단은 반드시 면허 보유 의료 전문가가 수행해야 합니다.
        </span>
      </div>
    </div>
  );
}
