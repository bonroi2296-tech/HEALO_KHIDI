"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard, MessageSquare, Stethoscope, Clock, Eye, Reply, CheckCircle,
  XCircle, ArrowRight, Send, TrendingUp, CalendarDays, Calendar,
} from "lucide-react";
import { useHospitalContext } from "./_components/HospitalGateClient";

const STATUS_CONFIG = {
  queued: { label: "대기", color: "text-gray-600", icon: Clock },
  sent: { label: "전송됨", color: "text-blue-600", icon: Send },
  viewed: { label: "조회됨", color: "text-yellow-600", icon: Eye },
  replied: { label: "응답함", color: "text-green-600", icon: Reply },
  converted: { label: "전환됨", color: "text-emerald-700", icon: CheckCircle },
  rejected: { label: "거절", color: "text-red-500", icon: XCircle },
  expired: { label: "만료", color: "text-gray-400", icon: Clock },
};

function fetchWithAuth(url) {
  return import("@/lib/supabase/browser").then(({ createSupabaseBrowserClient }) => {
    const supabase = createSupabaseBrowserClient();
    return supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(url, { headers, credentials: "include" });
    });
  });
}

export default function HospitalDashboardPage() {
  const hospitalInfo = useHospitalContext();
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/partner/dashboard");
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
        setRecentLeads(data.recentLeads);
      }
    } catch (err) {
      console.error("[Dashboard] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg lg:text-2xl font-bold text-gray-900">
          안녕하세요, {hospitalInfo?.hospitalName || "병원"} 님
        </h1>
        <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
          병원 포털 대시보드에 오신 것을 환영합니다
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          icon={TrendingUp}
          label="전체 리드"
          value={stats?.totalLeads || 0}
          color="blue"
        />
        <StatCard
          icon={CalendarDays}
          label="오늘"
          value={stats?.todayLeads || 0}
          color="green"
        />
        <StatCard
          icon={Calendar}
          label="이번 주"
          value={stats?.weekLeads || 0}
          color="purple"
        />
        <StatCard
          icon={Stethoscope}
          label="시술 수"
          value={stats?.treatmentCount || 0}
          color="teal"
        />
      </div>

      {/* Status Breakdown */}
      {stats?.statusCounts && Object.keys(stats.statusCounts).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">상태별 리드</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(stats.statusCounts).map(([status, count]) => {
              const sc = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
              const Icon = sc.icon;
              return (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <Icon size={16} className={sc.color} />
                  <span className="text-gray-600">{sc.label}</span>
                  <span className="ml-auto font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Leads */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">최근 리드</h2>
          <Link
            href="/partner/leads"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            전체 보기 <ArrowRight size={12} />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            아직 배정된 리드가 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {recentLeads.map((lead) => {
              const inquiry = lead.normalized_inquiries;
              const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.queued;
              const Icon = sc.icon;
              return (
                <Link
                  key={lead.id}
                  href="/partner/leads"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 ${sc.color}`}>
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {inquiry?.objective || inquiry?.treatment_slug || "문의"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {inquiry?.country} · {new Date(lead.assigned_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${sc.color} flex-shrink-0`}>
                    {sc.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickLink
          href="/partner/leads"
          icon={MessageSquare}
          label="리드 관리"
          desc="배정된 문의 확인"
          color="blue"
        />
        <QuickLink
          href="/partner/profile"
          icon={LayoutDashboard}
          label="병원 정보"
          desc="프로필 수정"
          color="green"
        />
        <QuickLink
          href="/partner/treatments"
          icon={Stethoscope}
          label="시술 관리"
          desc="시술 추가/수정"
          color="purple"
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    teal: "bg-teal-50 text-teal-700",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon size={16} />
      </div>
      <p className="text-xl lg:text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, desc, color }) {
  const colors = {
    blue: "hover:border-blue-300 hover:bg-blue-50/50",
    green: "hover:border-green-300 hover:bg-green-50/50",
    purple: "hover:border-purple-300 hover:bg-purple-50/50",
  };

  return (
    <Link
      href={href}
      className={`bg-white rounded-xl border border-gray-200 p-4 transition-all ${colors[color]}`}
    >
      <Icon size={20} className="text-gray-400 mb-2" />
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{desc}</p>
    </Link>
  );
}
