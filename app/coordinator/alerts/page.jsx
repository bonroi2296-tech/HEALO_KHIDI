'use client';

/**
 * healwith: 코디네이터 증상 이상치 알림 화면 (FR-16)
 *
 * ⚠️ 의료 면책 고지:
 * 이 화면에 표시된 감지 결과는 의학적 진단이 아닙니다.
 * 코디네이터가 직접 환자 상태를 확인하고 필요 시 의료진에게 연결하세요.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useCoordinatorL, useDateLocale } from '@/lib/i18n/coordinator';
import { useDeepLinkParam } from '@/lib/hooks/useDeepLinkParam';
import { useLatestOnly } from '@/lib/hooks/useLatestOnly';
import { scrollBehavior } from '@/lib/a11y/prefersReducedMotion';
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

// 색상만 모듈 상수(언어 무관). 라벨은 컴포넌트에서 L로 해석.
const SEVERITY_STYLE = {
  critical: {
    bg: 'bg-red-100 text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-500',
    badge: 'bg-red-600 text-white',
  },
  high: {
    bg: 'bg-orange-100 text-orange-800',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500 text-white',
  },
  medium: {
    bg: 'bg-yellow-100 text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-500 text-white',
  },
  low: {
    bg: 'bg-green-100 text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500',
    badge: 'bg-green-500 text-white',
  },
};

export default function AlertsPage() {
  const L = useCoordinatorL();
  const dateLoc = useDateLocale();

  const SEVERITY_LABEL = {
    critical: L.alSeverityCritical,
    high: L.alSeverityHigh,
    medium: L.alSeverityMedium,
    low: L.alSeverityLow,
  };
  const ALERT_TYPE_LABEL = {
    fever_high: `🌡️ ${L.alTypeFeverHigh}`,
    pain_critical: `😣 ${L.alTypePainCritical}`,
    silence_long: `🔇 ${L.alTypeSilenceLong}`,
    symptom_worsening: `📈 ${L.alTypeSymptomWorsening}`,
    ai_risk: `🤖 ${L.alTypeAiRisk}`,
  };
  const FILTER_TABS = [
    { key: 'unacknowledged', label: L.alFilterUnacknowledged },
    { key: 'unresolved', label: L.alFilterUnresolved },
    { key: 'all', label: L.all },
  ];

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unacknowledged');
  const [severityFilter, setSeverityFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [resolveModal, setResolveModal] = useState(null); // { alertId }
  const [resolveNote, setResolveNote] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // 딥링크: 「증상 이상치」 알림이 `?alert=<id>` 로 보낸다. 이 화면이 그 값을 «안 읽어서»
  // 눌러도 목록만 열렸다 — 새로 만든 딥링크 검사(check:deeplinks)가 잡아낸 건이다(2026-08-28).
  // 기본 거름망이 '미확인'이라 이미 확인한 경보면 목록에 없다 → '전체'로 풀고 그 줄을 편다.
  //
  // ⚠️ 그 줄로 «데려가는» 건 시간으로 재면 안 된다. 첫판은 300ms 뒤에 찾게 했는데, 그 시점엔
  //    아직 조회가 안 끝나 그 줄이 화면에 없다 — 조용히 아무 일도 안 일어난다(같은 날 재점검에서
  //    발견). 목록이 «실제로 바뀐 뒤»에 찾는다.
  const pendingScrollRef = useRef(null);
  useDeepLinkParam('alert', (id) => {
    setFilter('all');
    setExpandedId(id);
    pendingScrollRef.current = id;
  });

  // ⚠️ 조회가 겹칠 수 있다(딥링크가 거름망을 바꾸는 순간, 사람이 거름망을 연타할 때).
  //    그때 «늦게 도착한 옛 응답»이 새 결과를 덮어써서 엉뚱한 목록이 남는다 → useLatestOnly 로 막는다.
  const beginRequest = useLatestOnly();
  const fetchAlerts = useCallback(async () => {
    const isLatest = beginRequest();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { if (isLatest()) setLoading(false); return; }

    try {
      let url = `/api/symptoms/alerts?status=${filter}&limit=100`;
      if (severityFilter) url += `&severity=${severityFilter}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!isLatest()) return; // 이미 지난 조회 — 버린다
      if (data.ok) {
        setAlerts(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
    if (isLatest()) setLoading(false);
  }, [filter, severityFilter, beginRequest]);

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

  // 딥링크로 지목된 경보가 «목록에 실제로 나타난 뒤»에 그 줄로 데려간다.
  // 아직 없으면 아무것도 안 하고, 다음 갱신에서 다시 본다(시간 재기 금지 — 위 주석 참고).
  useEffect(() => {
    const id = pendingScrollRef.current;
    if (!id) return;
    const el = document.getElementById(`alert-${id}`);
    if (!el) return;
    pendingScrollRef.current = null;
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  }, [alerts]);

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
            {L.alTitle}
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {L.alSubtitle}
          </p>
        </div>
        <button
          onClick={() => { fetchAlerts(); fetchUnreadCount(); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw size={14} />
          {L.refresh}
        </button>
      </div>

      {/* 의료 면책 고지 */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <Shield size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800">
          <strong>{L.alNoticeLabel}</strong> {L.alDisclaimer}
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
                  ? 'border-teal-600 text-teal-700'
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
          <option value="">{L.alAllSeverities}</option>
          <option value="critical">{L.alSeverityCritical}</option>
          <option value="high">{L.alSeverityHigh}</option>
          <option value="medium">{L.alSeverityMedium}</option>
          <option value="low">{L.alSeverityLow}</option>
        </select>
      </div>

      {/* 알림 목록 */}
      {alerts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-500 font-medium">{L.alEmptyTitle}</p>
          <p className="text-gray-500 text-sm mt-1">{L.alEmptyDesc}</p>
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
                id={`alert-${alert.id}`}
                className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${sStyle.border} ${isResolved ? 'opacity-60' : ''}`}
              >
                {/* 메인 행 */}
                <div className="flex items-start gap-3 p-4">
                  {/* severity dot */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${sStyle.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sStyle.bg}`}>
                        {SEVERITY_LABEL[alert.severity] || SEVERITY_LABEL.low}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {ALERT_TYPE_LABEL[alert.alert_type] || alert.alert_type}
                      </span>
                      {isResolved && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{L.alBadgeResolved}</span>
                      )}
                      {!isResolved && isAck && (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">{L.alBadgeAcknowledged}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {L.alPatient}: {alert.patient_id
                          ? `${alert.patient_id.slice(0, 8)}…`
                          : alert.inquiry_id != null
                            ? `${L.alInquiry} #${alert.inquiry_id}`
                            : L.alUnknown}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(alert.detected_at).toLocaleString(dateLoc)}
                      </span>
                      <span className="uppercase tracking-wide">
                        by {alert.detected_by === 'ai' ? '🤖 AI' : `📏 ${L.alDetectedByRule}`}
                      </span>
                    </div>

                    {/* 데이터 요약 */}
                    {alert.data && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {alert.data.reasoning
                          ? alert.data.reasoning
                          : alert.data.temperature
                            ? `${L.alTemperature} ${alert.data.temperature}℃`
                            : alert.data.pain_score
                              ? `${L.alPain} ${alert.data.pain_score}/10`
                              : alert.data.silence_days
                                ? L.alSilenceDays.replace('{days}', alert.data.silence_days)
                                : alert.data.delta
                                  ? L.alPainRise.replace('{delta}', alert.data.delta)
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
                        className="px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition disabled:opacity-50"
                      >
                        {actionLoading === alert.id ? L.processing : L.alAcknowledge}
                      </button>
                    )}
                    {!isResolved && (
                      <button
                        onClick={() => { setResolveModal({ alertId: alert.id }); setResolveNote(''); }}
                        className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition"
                      >
                        {L.alResolve}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-600 rounded-lg transition"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* 확장 상세 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                    <div className="text-xs">
                      <span className="font-medium text-gray-500 uppercase tracking-wide">{L.alDetectionData}</span>
                      <pre className="mt-1 text-gray-700 whitespace-pre-wrap font-mono text-[11px] bg-white border border-gray-200 rounded p-2">
                        {JSON.stringify(alert.data, null, 2)}
                      </pre>
                    </div>
                    {alert.acknowledged_at && (
                      <p className="text-xs text-gray-500">
                        {L.alAcknowledgedAt}: {new Date(alert.acknowledged_at).toLocaleString(dateLoc)}
                      </p>
                    )}
                    {alert.resolution_note && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">{L.alResolutionNote}:</span> {alert.resolution_note}
                      </p>
                    )}
                    {alert.resolved_at && (
                      <p className="text-xs text-gray-500">
                        {L.alResolvedAt}: {new Date(alert.resolved_at).toLocaleString(dateLoc)}
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
              <CheckCircle size={20} className="text-green-700" />
              {L.alResolveModalTitle}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {L.alResolveModalDesc}
            </p>
            <textarea
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              placeholder={L.alResolvePlaceholder}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleResolve}
                disabled={actionLoading === resolveModal.alertId}
                className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading === resolveModal.alertId ? L.processing : L.alResolveConfirm}
              </button>
              <button
                onClick={() => { setResolveModal(null); setResolveNote(''); }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                {L.alCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 면책 footer */}
      <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <AlertTriangle size={12} />
        <span>
          {L.alFooterDisclaimer}
        </span>
      </div>
    </div>
  );
}
