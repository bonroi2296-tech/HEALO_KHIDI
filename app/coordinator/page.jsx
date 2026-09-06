'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList, Video, AlertTriangle,
  Clock, CheckCircle, ArrowRight, TrendingUp,
} from 'lucide-react';
import { kstDateTime, kstDateParts } from '@/lib/datetime/kst';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useCoordinatorL, useDateLocale } from '@/lib/i18n/coordinator';

export default function CoordinatorDashboard() {
  const router = useRouter();
  const L = useCoordinatorL();
  const dateLoc = useDateLocale();
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

        const nowKst = kstDateParts(new Date());
        const scheduled = consultations.filter(c => c.status === 'scheduled');
        const todayOnes = scheduled.filter(c => {
          if (!c.scheduled_at) return false;
          const p = kstDateParts(c.scheduled_at); // "오늘 상담" 판정도 KST 기준(직원 PC tz 무관)
          return p.year === nowKst.year && p.month === nowKst.month && p.day === nowKst.day;
        });

        // Fetch symptom alerts
        const alertRes = await fetch('/api/khidi/followup?urgency=high&limit=10', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const alertData = await alertRes.json();
        const urgentCount = alertData.ok ? (alertData.total || 0) : 0;
        // 열린 재진 요청(환자가 누른 것 + 시스템 제안) — 2026-09-06 사후관리 보드
        let openRequests = 0;
        try {
          const pcRes = await fetch('/api/coordinator/postcare?summary=1', { credentials: 'include' });
          const pc = await pcRes.json();
          if (pc.ok) openRequests = pc.summary?.openRequests || 0;
        } catch { /* 카드 하나가 대시보드를 죽이지 않게 */ }

        // Fetch 접수 문의 (inquiries) — '대기 인테이크'는 화상상담이 아니라 미처리 문의 수.
        const inboxRes = await fetch('/api/portal/inbox', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const inboxData = await inboxRes.json();
        const inquiries = inboxData.ok ? (inboxData.items || []) : [];
        // 종료(결과=이탈)된 문의는 받은함 «전체»에서도 빠진다 — 여기 숫자와 어긋나면 안 된다(2026-09-06).
        const pendingInquiries = inquiries.filter(
          i => !['matched', 'completed'].includes(i.status) && i.outcome !== 'lost'
        ).length;

        setStats({
          pendingIntakes: pendingInquiries,
          todayConsultations: todayOnes.length,
          // '예정 상담' = 앞으로 예정된(scheduled) 상담 전체. 예전엔 거의 안 쓰이는 status==='active'
          // 를 세어 항상 0에 가깝던 죽은 지표였음(2026-07-15 위생 정리).
          activePatients: scheduled.length,
          urgentAlerts: urgentCount,
          openRequests,
        });

        setUpcomingConsultations(scheduled.slice(0, 5));
      } catch (e) {
        console.error('Dashboard init error:', e);
      }
      setLoading(false);
    };
    init();
  }, [router]);

  // ⚠️ id 를 따로 둔 이유: 「오늘 상담」과 「예정 상담」은 **같은 주소**로 간다.
  //    예전엔 주소를 이름표(key)로 썼는데, 리액트는 이름표가 같으면 같은 칸으로 여겨
  //    둘 중 하나가 사라지거나 겹칠 수 있다(2026-08-05 PO 화면에서 실제 오류로 확인).
  //    새 칸을 넣을 땐 주소가 겹쳐도 되지만 id 는 겹치면 안 된다.
  const STAT_CARDS = [
    { id: 'pending-intakes', label: L.statPendingIntakes, value: stats.pendingIntakes, icon: ClipboardList, color: 'bg-blue-50 text-blue-600', href: '/coordinator/inbox' },
    { id: 'today-consult', label: L.statTodayConsult, value: stats.todayConsultations, icon: Video, color: 'bg-green-50 text-green-700', href: '/coordinator/consultations' },
    { id: 'scheduled-consult', label: L.statActivePatients, value: stats.activePatients, icon: Video, color: 'bg-purple-50 text-purple-600', href: '/coordinator/consultations' },
    { id: 'urgent-alerts', label: L.statUrgentAlerts, value: stats.urgentAlerts, icon: AlertTriangle, color: 'bg-red-50 text-red-700', href: '/coordinator/alerts' },
    { id: 'open-requests', label: L.statOpenRequests, value: stats.openRequests ?? 0, icon: Video, color: 'bg-teal-50 text-teal-700', href: '/coordinator/satisfaction' },
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
        <h1 className="text-2xl font-bold text-gray-900">{L.dashTitle}</h1>
        <p className="text-gray-500 text-sm mt-1">{L.dashSubtitle}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
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
          <h2 className="text-lg font-semibold">{L.upcomingConsult}</h2>
          <button
            onClick={() => router.push('/coordinator/consultations')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {L.viewAll}
          </button>
        </div>
        {upcomingConsultations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Video size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{L.noUpcoming}</p>
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
                      {c.session_type === 'pre_consultation' ? L.sessionPre :
                       c.session_type === 'follow_up' ? L.sessionFollow :
                       c.session_type === 'emergency' ? L.sessionEmergency : L.sessionGeneric}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.scheduled_at ? kstDateTime(c.scheduled_at, dateLoc, {
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
          onClick={() => router.push('/coordinator/consultations')}
          className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition text-left"
        >
          <Video size={20} className="text-green-700" />
          <div>
            <div className="font-semibold text-sm text-green-900">{L.qaSchedTitle}</div>
            <div className="text-xs text-green-700">{L.qaSchedDesc}</div>
          </div>
        </button>
        <button
          onClick={() => router.push('/coordinator/alerts')}
          className="flex items-center gap-3 p-4 bg-red-50 rounded-xl hover:bg-red-100 transition text-left"
        >
          <AlertTriangle size={20} className="text-red-600" />
          <div>
            <div className="font-semibold text-sm text-red-900">{L.statUrgentAlerts}</div>
            {/* red-50 배경 위 red-600 = 4.41:1 (AA 미달) → red-700 5.91:1 */}
            <div className="text-xs text-red-700">{L.qaAlertDesc}</div>
          </div>
        </button>
      </div>
    </div>
  );
}
