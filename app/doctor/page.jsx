"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Clock, Users, Video, ChevronRight, Stethoscope } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export default function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [_pendingAdmissions, _setPendingAdmissions] = useState(0);
  const [todayConsultations, setTodayConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        setUser(sessionData.session.user);

        // 내 세션 리스트 (의사로 참여 중)
        const res = await fetch("/api/khidi/consultation?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!result.ok) return;

        const data = result.data || [];
        const today = new Date().toDateString();

        setUpcomingCount(data.filter((c) => c.status === "scheduled").length);
        setActiveCount(data.filter((c) => c.status === "active").length);
        setTodayConsultations(
          data
            .filter(
              (c) =>
                new Date(c.scheduled_at).toDateString() === today &&
                c.status !== "cancelled"
            )
            .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
        );
      } catch (err) {
        console.error("[doctor dashboard]", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">의료진 대시보드</h1>
        <p className="text-gray-500 mt-2">
          {user?.email || ""} 님, 오늘의 진료 일정입니다.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Calendar}
          label="예정된 상담"
          value={upcomingCount}
          color="blue"
        />
        <StatCard
          icon={Video}
          label="진행 중"
          value={activeCount}
          color="green"
        />
        <StatCard
          icon={Users}
          label="오늘 일정"
          value={todayConsultations.length}
          color="purple"
        />
      </div>

      {/* Today's consultations */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">오늘 상담 일정</h2>
          <Link
            href="/doctor/consultations"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            전체 보기 <ChevronRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : todayConsultations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p>오늘 예정된 상담이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayConsultations.map((c) => (
              <Link
                key={c.id}
                href={`/consultation/${c.id}`}
                className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition"
              >
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <Video size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {c.hospitals?.name || "상담"}{" "}
                    {c.partner_doctors?.name_ko && (
                      <span className="text-gray-500 font-normal">
                        · Dr. {c.partner_doctors.name_ko}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(c.scheduled_at).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="capitalize">{c.session_type}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "scheduled"
                          ? "bg-blue-100 text-blue-700"
                          : c.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Stethoscope size={20} className="text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">원격협진 진행 팁</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>상담 5분 전 입장해 영상/음성 테스트</li>
              <li>환자가 대기실에 있으면 상단 배너에 표시됩니다 — 승인 버튼으로 입장 허용</li>
              <li>MRI / CT 등 문서는 상담 중 실시간 공유 및 판독 가능</li>
              <li>상담 종료 후 임상 소견은 PATCH 로 저장 (자동 저장 지원)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}
      >
        <Icon size={20} />
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
