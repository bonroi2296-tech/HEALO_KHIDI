'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video, Calendar, Clock, Globe, User, Phone,
  Edit2, X, ChevronDown, Plus, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/Toast';
import { kstDate, kstTime } from '@/lib/datetime/kst';
import { CreateConsultationModal } from '@/components/consultation/CreateConsultationModal';
import { useBackofficeLang, useCoordinatorL, useDateLocale } from '@/lib/i18n/coordinator';
import { cancerTypeLabelL } from '@/lib/khidi/medicalLabels';
import { khidiCountState, KHIDI_COUNTED_TYPES } from '@/lib/khidi/countState';

// 상태 색상만 모듈 상수(언어 무관). 라벨은 컴포넌트에서 L로 해석.
const STATUS_COLOR = {
  scheduled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-yellow-100 text-yellow-800',
};

export default function CoordinatorConsultationsPage() {
  const router = useRouter();
  const toast = useToast();
  const L = useCoordinatorL();
  const lang = useBackofficeLang();
  const dateLoc = useDateLocale();
  const SESSION_LABEL = {
    pre_consultation: L.sessionPre, follow_up: L.sessionFollow,
    emergency: L.sessionEmergency, diagnostic: L.sessionDiagnostic,
  };
  const STATUS_LABEL = {
    scheduled: L.cStatusScheduled, active: L.cStatusActive, completed: L.cStatusCompleted,
    cancelled: L.cStatusCancelled, no_show: L.cStatusNoShow,
  };
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('scheduled');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [unclosedCount, setUnclosedCount] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    try {
      const url = filter === 'all'
        ? '/api/khidi/consultation?limit=100'
        : `/api/khidi/consultation?status=${filter}&limit=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.ok) {
        const rows = data.data || [];
        setConsultations(rows);
        const now = Date.now();
        setUnclosedCount(
          rows.filter(
            (c) =>
              KHIDI_COUNTED_TYPES.includes(c.session_type) &&
              c.status !== 'completed' &&
              c.status !== 'cancelled' &&
              c.scheduled_at &&
              new Date(c.scheduled_at).getTime() < now
          ).length
        );
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  // 소급 연결용 문의 목록 — 「문의 미연결」이 하나라도 있을 때만 불러온다(불필요한 조회 방지).
  const [inquiryOptions, setInquiryOptions] = useState([]);
  useEffect(() => {
    if (!consultations.some((c) => khidiCountState(c) === 'noLink')) return;
    if (inquiryOptions.length > 0) return;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        // 문의는 접근권한 규칙(RLS)상 서버만 읽을 수 있고 이름도 암호문 → 서버 picker 사용
        const res = await fetch('/api/admin/inquiries/picker', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = await res.json();
        // 응답 형태는 { ok, inquiries } — 상담 생성 모달과 동일한 창구를 쓴다.
        if (j.ok) setInquiryOptions(j.inquiries || []);
      } catch (e) { console.error(e); }
    })();
  }, [consultations, inquiryOptions.length]);

  // 이미 만든 상담을 나중에 문의와 잇는다 — 안 이으면 아무리 상담해도 실적이 0 이다.
  const linkInquiry = async (id, inquiryId) => {
    if (!inquiryId) return;
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error(L.toastAuthErr); return; }
    try {
      const res = await fetch(`/api/khidi/consultation/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inquiry_id: Number(inquiryId) }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) { toast.error(L.cLinkInquiryFail); return; }
      toast.success(L.cLinkInquiryDone);
      fetchData();
    } catch { toast.error(L.cLinkInquiryFail); }
  };

  // 「지난 날짜인데 아직 완료가 아닌」 집계 대상 상담 수.
  // ⚠️ 화면을 «그리는 중»에 현재 시각을 읽으면 안 된다(리액트 순수성 규칙 — 다시 그릴 때마다
  //    값이 달라져 결과가 불안정해진다). 그래서 목록을 받아온 그 순간 한 번 세어 상태로 들고 있는다.
  // 목록에 이미 있는 데이터로만 센다(추가 조회 없음) → 보고 있는 탭 기준이라 실제보다 적을 수 있다.

  // 상담 링크(초대 토큰 포함) 1개 발급 → API 응답 반환. 하나의 링크로 코디 입장 + 환자 공유 통일.
  const issueInvite = async (id) => {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error(L.toastAuthErr); return null; }
    try {
      const res = await fetch(`/api/khidi/consultation/${id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        // 회수 제한 없음(만료 전까지 무제한, PO 2026-07-15) — 안전선은 72h 만료 (admin 과 동일)
        body: JSON.stringify({ role: 'patient', expiresInHours: 72, maxUses: 0 }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`${L.toastLinkCreateFail}: ${result.error || res.status}`);
        return null;
      }
      return result;
    } catch (err) {
      console.error('[issueInvite] error:', err);
      toast.error(L.toastLinkCreateFail);
      return null;
    }
  };

  // 상담 시작 = 링크 하나로 통일: 코디도 이 초대 링크로 입장한다(로그인돼 있어 자동으로 staff 로 인식됨).
  //   → 코디 주소창에 뜨는 게 곧 '환자에게 그대로 보내면 되는 링크'. 편하게 바로 클립보드에도 복사.
  const handleStart = async (id) => {
    const result = await issueInvite(id);
    if (!result?.inviteUrl) {
      // ⚠️ 발급 실패 시 입장권 없는 맨주소로 조용히 입장하지 않는다 — 그 주소창을 복사해 공유하면
      //   받는 사람 전원이 "입장권 없음"에 막힘(2026-07-02 '남들만 안 됨' 함정, POSTMORTEMS #61 연관).
      toast.error(L.toastStartStopped);
      return;
    }
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success(L.toastStartCopied);
    } catch { /* 클립보드 권한 없으면 조용히 패스 — 입장은 계속 */ }
    // 절대 URL(origin 포함) → 클라이언트 라우팅용 상대경로로
    router.push(result.inviteUrl.replace(/^https?:\/\/[^/]+/, ''));
  };

  // 상담 완료 처리 — status=completed 로 PATCH (KHIDI K-02 사전상담·K-04 사후관리 실적 집계).
  //   방의 '통화 나가기'는 상태를 안 바꾸므로(재입장 회귀 방지), 완료 기록은 이 staff 액션이 유일한 경로.
  const handleComplete = async (id) => {
    if (!confirm(L.confirmComplete)) return;
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error(L.toastAuthErr); return; }
    try {
      const res = await fetch(`/api/khidi/consultation/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: 'completed', ended_at: new Date().toISOString() }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`${L.toastCompleteFail}: ${result.error || res.status}`);
        return;
      }
      toast.success(L.toastCompleted);
      fetchData();
    } catch (err) {
      console.error('[handleComplete] error:', err);
      toast.error(L.toastCompleteFail);
    }
  };

  // 링크만 복사(입장 없이 환자에게 먼저 보낼 때) — 위와 같은 종류의 링크.
  const handleCopyLink = async (id) => {
    const result = await issueInvite(id);
    if (!result?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success(
        result.emailSent
          ? L.toastCopiedEmailed
          : L.toastCopiedExpiry.replace('{time}', new Date(result.expiresAt).toLocaleString(dateLoc))
      );
    } catch {
      prompt(L.promptCopyShare, result.inviteUrl);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{L.consultTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">{L.consultSubtitle}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium"
        >
          <Plus size={16} />
          {L.consultNew}
        </button>
      </div>

      {/* 지난 상담인데 「완료」 안 누른 것 — 실적이 조용히 새는 지점이라 맨 위에 띄운다 (2026-07-29).
          왜: 완료 버튼은 원래 있었는데 «눌러야 한다는 걸» 화면이 알려주지 않았다.
          실측(2026-04~07): 사전상담 방 66개 중 완료 표시는 1개뿐이었다. */}
      {unclosedCount > 0 && (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3"
        >
          <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {L.cUnclosedTitle} ({unclosedCount})
            </p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{L.cUnclosedBody}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'scheduled', label: L.cStatusScheduled },
          { key: 'active', label: L.cStatusActive },
          { key: 'completed', label: L.cStatusCompleted },
          { key: 'all', label: L.all },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              filter === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : consultations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">{L.consultEmpty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map(c => {
            const isExpanded = expandedId === c.id;
            const statusColor = STATUS_COLOR[c.status] || STATUS_COLOR.scheduled;
            const statusLabel = STATUS_LABEL[c.status] || STATUS_LABEL.scheduled;
            const patient = c.cancer_patient_intakes?.[0];
            const countState = khidiCountState(c);
            return (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        c.status === 'active' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <Video size={18} className={c.status === 'active' ? 'text-green-700' : 'text-blue-600'} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">
                          {patient?.first_name || 'Patient'} — {SESSION_LABEL[c.session_type] || c.session_type}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {c.scheduled_at ? kstDate(c.scheduled_at, dateLoc) : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {c.scheduled_at ? kstTime(c.scheduled_at, dateLoc) : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe size={10} />
                            {c.patient_language?.toUpperCase()} → {c.doctor_language?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {countState && countState !== 'counted' && (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            // 빨강 = 공식 실적이 0 이 되는 경우(완료 미표시). 주황 = 실적엔 잡히되 유치 추적이 끊김.
                            countState === 'notCounted'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {countState === 'notCounted' ? L.cCountedNotCounted : L.cCountedNoLink}
                        </span>
                      )}
                      {countState === 'counted' && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-800">
                          {L.cCountedYes}
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                      <ChevronDown size={16} className={`text-gray-500 transition ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {/* 소급 연결 — 만들 때 문의를 안 골랐어도 여기서 이을 수 있다 (2026-07-29 신설).
                        그 전엔 서버 PATCH 가 inquiry_id 를 아예 안 받아 «영원히 못 고치는» 상태였다. */}
                    {countState === 'noLink' && (
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <label className="block text-xs font-semibold text-red-800 mb-1">
                          {L.cLinkInquiryLabel}
                        </label>
                        <select
                          defaultValue=""
                          onChange={(e) => linkInquiry(c.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">{L.cLinkInquiryPlaceholder}</option>
                          {inquiryOptions.map((inq) => (
                            <option key={inq.id} value={inq.id}>
                              #{inq.id} · {inq.name || '-'} · {inq.nationality || '?'} · {inq.cancer_type || '?'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">{L.fieldPatient}</div>
                        <div className="text-sm font-medium">{patient?.first_name || '-'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">{L.fieldCancerStage}</div>
                        <div className="text-sm font-medium">{patient?.cancer_type ? cancerTypeLabelL(patient.cancer_type, lang) : '-'} / Stage {patient?.cancer_stage || '-'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">{L.fieldDoctorAssign}</div>
                        <div className="text-sm font-medium">{c.doctor_id ? L.badgeAssigned : L.unassigned}</div>
                      </div>
                    </div>

                    {c.notes && (
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">{L.notes}</div>
                        <div className="text-sm text-gray-600">{c.notes}</div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 flex-wrap">
                      {(c.status === 'scheduled' || c.status === 'active') && (
                        <>
                          <button
                            onClick={() => handleStart(c.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition text-sm font-medium"
                            title={L.ttStart}
                          >
                            <Phone size={14} />
                            {c.status === 'active' ? L.btnReenter : L.btnStart}
                          </button>
                          <button
                            onClick={() => handleCopyLink(c.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                            title={L.ttCopyLink}
                          >
                            🔗 {L.btnCopyLink}
                          </button>
                          <button
                            onClick={() => handleComplete(c.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition text-sm font-medium"
                            title={L.ttComplete}
                          >
                            <CheckCircle size={14} /> {L.btnComplete}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 새 상담 예약 모달 (admin 과 동일한 공용 컴포넌트) */}
      {showCreateModal && (
        <CreateConsultationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData();
            toast.success(L.toastCreated);
          }}
        />
      )}
    </div>
  );
}
