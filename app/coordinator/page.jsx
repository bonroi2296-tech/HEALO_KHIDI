'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Video, Users, AlertTriangle,
  Clock, CheckCircle, ArrowRight, TrendingUp,
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function CoordinatorDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    pendingIntakes: 0,
    todayConsultations: 0,
    activePatients: 0,
    urgentAlerts: 0,
  });
  const [_recentIntakes, _setRecentIntakes] = useState([]);
  const [upcomingConsultations, setUpcomingConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const token = session.access_token;

      try {
        // Fetch consultations
        const consultRes = await fetch('/api/khidi/consultation?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const consultData = await consultRes.json();
        const consultations = consultData.ok ? (consultData.data || []) : [];

        const today = new Date().toDateString();
        const scheduled = consultations.filter(c => c.status === 'scheduled');
        const todayOnes = scheduled.filter(c => c.scheduled_at && new Date(c.scheduled_at).toDateString() === today);

        // Fetch symptom alerts
        const alertRes = await fetch('/api/khidi/followup?urgency=high&limit=10', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const alertData = await alertRes.json();
        const urgentCount = alertData.ok ? (alertData.total || 0) : 0;

        // Fetch 접수 문의 (inquiries) — '대기 인테이크'는 화상상담이 아니라 미처리 문의 수.
        const inboxRes = await fetch('/api/portal/inbox', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const inboxData = await inboxRes.json();
        const inquiries = inboxData.ok ? (inboxData.items || []) : [];
        const pendingInquiries = inquiries.filter(
          i => !['matched', 'completed'].includes(i.status)
        ).length;

        setStats({
          pendingIntakes: pendingInquiries,
          todayConsultations: todayOnes.length,
          activePatients: consultations.filter(c => c.status === 'active').length,
          urgentAlerts: urgentCount,
        });

        setUpcomingConsultations(scheduled.slice(0, 5));
      } catch (e) {
        console.error('Dashboard init error:', e);
      }
      setLoading(false);
    };
    init();
  }, [router]);

  const STAT_CARDS = [
    { label: '대기 인테이크', value: stats.pendingIntakes, icon: ClipboardList, color: 'bg-blue-50 text-blue-600', href: '/coordinator/inbox' },
    { label: '오늘 상담', value: stats.todayConsultations, icon: Video, color: 'bg-green-50 text-green-600', href: '/coordinator/consultations' },
    { label: '활성 환자', value: stats.activePatients, icon: Users, color: 'bg-purple-50 text-purple-600', href: '/coordinator/patients' },
    { label: '긴급 알림', value: stats.urgentAlerts, icon: AlertTriangle, color: 'bg-red-50 text-red-600', href: '/coordinator/alerts' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">코디네이터 대시보드</h1>
        <p className="text-gray-500 text-sm mt-1">환자 인테이크 접수, 의사 배정, 상담 스케줄링을 관리합니다.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => router.push(card.href)}
              className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon size={20} />
                </div>
                <ArrowRight size={16} className="text-gray-300" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-1">{card.label}</div>
            </button>
          );
        })}
      </div>

      {/* Upcoming Consultations */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">예정 상담</h2>
          <button
            onClick={() => router.push('/coordinator/consultations')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            전체 보기
          </button>
        </div>
        {upcomingConsultations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Video size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">예정된 상담이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingConsultations.map(c => (
              <div
                key={c.id}
                onClick={() => router.push(`/consultation/${c.id}`)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Video size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {c.session_type === 'pre_consultation' ? '사전상담' :
                       c.session_type === 'follow_up' ? '추후진료' :
                       c.session_type === 'emergency' ? '긴급상담' : '상담'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('ko-KR', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      }) : '-'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                    {c.patient_language?.toUpperCase() || 'RU'} → {c.doctor_language?.toUpperCase() || 'KO'}
                  </span>
                  <ArrowRight size={14} className="text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/coordinator/intakes')}
          className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition text-left"
        >
          <ClipboardList size={20} className="text-blue-600" />
          <div>
            <div className="font-semibold text-sm text-blue-900">인테이크 접수</div>
            <div className="text-xs text-blue-600">새 환자 접수 확인 및 의사 배정</div>
          </div>
        </button>
        <button
          onClick={() => router.push('/coordinator/consultations')}
          className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition text-left"
        >
          <Video size={20} className="text-green-600" />
          <div>
            <div className="font-semibold text-sm text-green-900">상담 스케줄링</div>
            <div className="text-xs text-green-600">화상 상담 일정 관리</div>
          </div>
        </button>
        <button
          onClick={() => router.push('/coordinator/alerts')}
          className="flex items-center gap-3 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition text-left"
        >
          <AlertTriangle size={20} className="text-red-600" />
          <div>
            <div className="font-semibold text-sm text-red-900">긴급 알림</div>
            <div className="text-xs text-red-600">고위험 증상 보고 확인</div>
          </div>
        </button>
      </div>
    </div>
  );
}
