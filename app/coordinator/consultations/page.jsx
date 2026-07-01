'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video, Calendar, Clock, Globe, User, Phone,
  Edit2, X, ChevronDown, Plus, CheckCircle,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/Toast';
import { CreateConsultationModal } from '@/components/consultation/CreateConsultationModal';

const SESSION_TYPE = {
  pre_consultation: '사전상담',
  follow_up: '추후진료',
  emergency: '긴급상담',
  diagnostic: '검사결과 검토',
};

const STATUS_STYLE = {
  scheduled: { label: '예정', color: 'bg-blue-100 text-blue-800' },
  active: { label: '진행 중', color: 'bg-green-100 text-green-800' },
  completed: { label: '완료', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-800' },
  no_show: { label: '무응답', color: 'bg-yellow-100 text-yellow-800' },
};

export default function CoordinatorConsultationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('scheduled');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      if (data.ok) setConsultations(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  // 상담 링크(초대 토큰 포함) 1개 발급 → API 응답 반환. 하나의 링크로 코디 입장 + 환자 공유 통일.
  const issueInvite = async (id) => {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('인증 오류 — 다시 로그인해주세요'); return null; }
    try {
      const res = await fetch(`/api/khidi/consultation/${id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        // 재접속마다 1회 차감 → 끊김 잦은 모바일 환경 고려해 넉넉하게 (admin 과 동일)
        body: JSON.stringify({ role: 'patient', expiresInHours: 72, maxUses: 20 }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`상담 링크 생성 실패: ${result.error || res.status}`);
        return null;
      }
      return result;
    } catch (err) {
      console.error('[issueInvite] error:', err);
      toast.error('상담 링크 생성 실패');
      return null;
    }
  };

  // 상담 시작 = 링크 하나로 통일: 코디도 이 초대 링크로 입장한다(로그인돼 있어 자동으로 staff 로 인식됨).
  //   → 코디 주소창에 뜨는 게 곧 '환자에게 그대로 보내면 되는 링크'. 편하게 바로 클립보드에도 복사.
  //   (링크 발급이 실패해도 코디는 계정으로 바로 입장하도록 폴백)
  const handleStart = async (id) => {
    const result = await issueInvite(id);
    if (!result?.inviteUrl) { router.push(`/consultation/${id}`); return; }
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success('상담 링크를 복사했어요 — 환자에게 붙여넣어 보내세요. 나는 지금 입장합니다');
    } catch { /* 클립보드 권한 없으면 조용히 패스 — 입장은 계속 */ }
    // 절대 URL(origin 포함) → 클라이언트 라우팅용 상대경로로
    router.push(result.inviteUrl.replace(/^https?:\/\/[^/]+/, ''));
  };

  // 상담 완료 처리 — status=completed 로 PATCH (KHIDI K-02 사전상담·K-04 사후관리 실적 집계).
  //   방의 '통화 나가기'는 상태를 안 바꾸므로(재입장 회귀 방지), 완료 기록은 이 staff 액션이 유일한 경로.
  const handleComplete = async (id) => {
    if (!confirm("이 상담을 '완료' 처리할까요?\n완료하면 발송된 초대 링크가 폐기되어 재입장할 수 없습니다.")) return;
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error('인증 오류 — 다시 로그인해주세요'); return; }
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
        toast.error(`완료 처리 실패: ${result.error || res.status}`);
        return;
      }
      toast.success('상담을 완료 처리했어요. (사전상담·사후관리 실적에 집계됩니다)');
      fetchData();
    } catch (err) {
      console.error('[handleComplete] error:', err);
      toast.error('완료 처리 실패');
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
          ? '상담 링크를 복사했고, 등록된 이메일로도 발송했습니다'
          : `상담 링크가 클립보드에 복사됐습니다 (만료: ${new Date(result.expiresAt).toLocaleString('ko-KR')})`
      );
    } catch {
      prompt('아래 링크를 복사해 환자에게 공유하세요:', result.inviteUrl);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상담 일정 관리</h1>
          <p className="text-gray-500 text-sm mt-1">원격 화상 상담 스케줄링 및 진행 관리</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          <Plus size={16} />
          새 상담 생성
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'scheduled', label: '예정' },
          { key: 'active', label: '진행 중' },
          { key: 'completed', label: '완료' },
          { key: 'all', label: '전체' },
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
          <p className="text-gray-500 font-medium">해당 상태의 상담이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consultations.map(c => {
            const isExpanded = expandedId === c.id;
            const status = STATUS_STYLE[c.status] || STATUS_STYLE.scheduled;
            const patient = c.cancer_patient_intakes?.[0];
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
                        <Video size={18} className={c.status === 'active' ? 'text-green-600' : 'text-blue-600'} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">
                          {patient?.first_name || 'Patient'} — {SESSION_TYPE[c.session_type] || c.session_type}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString('ko-KR') : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {c.scheduled_at ? new Date(c.scheduled_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe size={10} />
                            {c.patient_language?.toUpperCase()} → {c.doctor_language?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      <ChevronDown size={16} className={`text-gray-400 transition ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">환자</div>
                        <div className="text-sm font-medium">{patient?.first_name || '-'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">암종/병기</div>
                        <div className="text-sm font-medium">{patient?.cancer_type || '-'} / Stage {patient?.cancer_stage || '-'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">의사 배정</div>
                        <div className="text-sm font-medium">{c.doctor_id ? '배정완료' : '미배정'}</div>
                      </div>
                    </div>

                    {c.notes && (
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">메모</div>
                        <div className="text-sm text-gray-600">{c.notes}</div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 flex-wrap">
                      {(c.status === 'scheduled' || c.status === 'active') && (
                        <>
                          <button
                            onClick={() => handleStart(c.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition text-sm font-medium"
                            title="이 링크로 내가 입장하고, 같은 링크가 복사됩니다(환자에게 붙여넣어 전송)"
                          >
                            <Phone size={14} />
                            {c.status === 'active' ? '상담 재진입' : '상담 시작'}
                          </button>
                          <button
                            onClick={() => handleCopyLink(c.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                            title="입장 없이 환자에게 보낼 링크만 복사(+등록 이메일 발송) — 같은 링크"
                          >
                            🔗 환자 링크 복사
                          </button>
                          <button
                            onClick={() => handleComplete(c.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition text-sm font-medium"
                            title="상담을 '완료'로 기록 (사전상담·사후관리 실적 집계) — 초대 링크도 폐기"
                          >
                            <CheckCircle size={14} /> 상담 완료
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
            toast.success('상담 예약이 생성되었습니다');
          }}
        />
      )}
    </div>
  );
}
