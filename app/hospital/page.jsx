"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare, Clock, Eye, Reply, CheckCircle, XCircle, Send,
  ArrowRight, TrendingUp, Timer, Wallet, AlertCircle,
} from "lucide-react";
import { usePortalContext } from "../_components/PortalGate";

const STATUS_CONFIG = {
  queued: { label: "대기", color: "text-gray-600", icon: Clock },
  sent: { label: "전송됨", color: "text-blue-600", icon: Send },
  viewed: { label: "조회됨", color: "text-amber-600", icon: Eye },
  replied: { label: "응답함", color: "text-green-700", icon: Reply },
  converted: { label: "치료 확정", color: "text-emerald-700", icon: CheckCircle },
  rejected: { label: "거절", color: "text-red-600", icon: XCircle },
  expired: { label: "만료", color: "text-gray-500", icon: Clock },
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

// 분 단위 → 사람이 읽는 응답시간
function formatDuration(mins) {
  if (mins == null) return "—";
  if (mins < 60) return `${mins}분`;
  if (mins < 1440) return `${Math.round(mins / 60)}시간`;
  return `${Math.round(mins / 1440)}일`;
}

// 배정 시각 → "n일 대기" 형태 (응답 큐용)
function waitedSince(assignedAt) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(assignedAt).getTime()) / 60000));
  return formatDuration(mins);
}

export default function HospitalDashboardPage() {
  const hospitalInfo = usePortalContext();
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/partner/dashboard");
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
        setQueue(data.actionQueue || []);
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
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        <p className="text-sm text-gray-500">현황 불러오는 중…</p>
      </div>
    );
  }

  const pending = stats?.pendingCount || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg lg:text-2xl font-bold text-gray-900">
          안녕하세요, {hospitalInfo?.hospitalName || "병원"} 님
        </h1>
        <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
          진료 의뢰 현황과 응답 성과를 한눈에 확인하세요
        </p>
      </div>

      {/* 경영 KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* 응답 대기 — 가장 행동이 필요한 지표라 강조 */}
        <Link
          href="/hospital/leads"
          className={`rounded-xl border p-4 transition-all shadow-sm hover:shadow-md ${
            pending > 0
              ? "bg-teal-700 border-teal-600 text-white"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle size={16} className={pending > 0 ? "text-white" : "text-gray-500"} />
            <span className={`text-xs font-medium ${pending > 0 ? "text-teal-50" : "text-gray-500"}`}>응답 대기</span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${pending > 0 ? "text-white" : "text-gray-900"}`}>
            {pending}<span className="text-base font-medium ml-0.5">건</span>
          </p>
          <p className={`text-[11px] mt-0.5 ${pending > 0 ? "text-teal-50" : "text-gray-500"}`}>
            {pending > 0 ? "지금 응답이 필요해요" : "모두 처리됨"}
          </p>
        </Link>

        <KpiCard icon={TrendingUp} label="전환율" value={`${stats?.conversionRate || 0}`} unit="%"
          hint={`확정 ${stats?.statusCounts?.converted || 0} / 전체 ${stats?.totalLeads || 0}`} />

        <KpiCard icon={Timer} label="평균 첫 응답" value={formatDuration(stats?.avgResponseMinutes)} unit=""
          hint={stats?.avgResponseMinutes == null ? "응답 기록 없음" : "배정 → 첫 응답"} />

        <KpiCard icon={Wallet} label="확정 견적 합계" value={`$${(stats?.convertedValue || 0).toLocaleString()}`} unit=""
          hint="치료 확정 리드 기준" />
      </div>

      {/* 거래량 요약 */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm bg-white rounded-xl border border-gray-200 px-5 py-3.5">
        <VolumeStat label="전체 리드" value={stats?.totalLeads || 0} />
        <VolumeStat label="오늘" value={stats?.todayLeads || 0} />
        <VolumeStat label="이번 주" value={stats?.weekLeads || 0} />
        <VolumeStat label="이번 달" value={stats?.monthLeads || 0} />
      </div>

      {/* 응답 필요 큐 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <AlertCircle size={16} className="text-teal-600" /> 응답 필요
          </h2>
          <Link href="/hospital/leads" className="text-xs text-teal-700 hover:underline flex items-center gap-1">
            리드 관리 <ArrowRight size={12} />
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle size={28} className="mx-auto mb-2 text-emerald-700" />
            <p className="text-sm text-gray-500">응답 대기 중인 문의가 없습니다</p>
            <p className="text-xs text-gray-500 mt-0.5">새 진료 의뢰가 배정되면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((lead) => {
              const inquiry = lead.normalized_inquiries;
              const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.sent;
              const Icon = sc.icon;
              return (
                <Link
                  key={lead.id}
                  href="/hospital/leads"
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 ${sc.color}`}><Icon size={16} /></span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {inquiry?.objective || inquiry?.treatment_slug || "문의"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[inquiry?.country, inquiry?.language].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-amber-600 flex-shrink-0 tabular-nums">
                    {waitedSince(lead.assigned_at)} 대기
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 상태별 리드 */}
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
                  <span className="ml-auto font-semibold text-gray-900 tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, unit, hint }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={16} className="text-gray-500" />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">
        {value}{unit && <span className="text-base font-medium ml-0.5">{unit}</span>}
      </p>
      {hint && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

function VolumeStat({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-900 tabular-nums">{value}</span>
    </div>
  );
}
