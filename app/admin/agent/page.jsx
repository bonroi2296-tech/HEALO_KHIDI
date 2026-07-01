"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Users,
  TrendingUp,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EscalationQueue } from "./_components/EscalationQueue";
import { SymptomAlerts } from "./_components/SymptomAlerts";
import { AccuracyPanel } from "./_components/AccuracyPanel";

export default function AgentDashboardPage() {
  const [activeTab, setActiveTab] = useState("escalations");
  const [stats, setStats] = useState({
    pendingEscalations: 0,
    highRiskAlerts: 0,
    todayResolved: null,
    aiAccuracy: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch symptom reports with high risk
      const alertsRes = await fetch(
        "/api/khidi/followup?urgency=high&unreviewed=true&limit=1",
        { headers, credentials: "include" }
      );
      const alertsData = await alertsRes.json();

      // Fetch all intakes for pending count
      const intakesRes = await fetch(
        "/api/khidi/intake?limit=1",
        { headers, credentials: "include" }
      );
      const intakesData = await intakesRes.json();

      // AI 정확도: 실측 — ai_response_evaluations 최근 14일 평균 overall_score(0~1) → %.
      // (하드코딩 72% 잔재 제거. 평가 데이터가 없으면 가짜 숫자 대신 null → 화면에 "—")
      let aiAccuracy = null;
      try {
        const qualityRes = await fetch("/api/admin/khidi/ai-quality", {
          headers,
          credentials: "include",
        });
        const qualityData = await qualityRes.json();
        if (
          qualityData?.ok &&
          qualityData.summary?.total_count > 0 &&
          qualityData.summary?.avg_overall != null
        ) {
          aiAccuracy = Math.round(qualityData.summary.avg_overall * 100);
        }
      } catch {
        // 실패 시 null 유지 → "—"
      }

      setStats({
        pendingEscalations: intakesData.total || 0,
        highRiskAlerts: alertsData.total || 0,
        // '오늘 처리 완료' 실측 트래킹 파이프라인 아직 없음 → 가짜 0 대신 null("—").
        todayResolved: null,
        aiAccuracy,
      });
    } catch (error) {
      console.error("[AgentDashboard] Stats fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const tabs = [
    { id: "escalations", label: "에스컬레이션 큐", icon: MessageSquare },
    { id: "alerts", label: "증상 알림", icon: AlertTriangle },
    { id: "accuracy", label: "AI 정확도", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Human Agent 대시보드
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            KHIDI 암환자 상담 관리 · AI ↔ Human 상호학습
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageSquare className="text-orange-500" size={24} />}
          label="대기 중 에스컬레이션"
          value={stats.pendingEscalations}
          color="orange"
        />
        <StatCard
          icon={<AlertTriangle className="text-red-500" size={24} />}
          label="고위험 증상 알림"
          value={stats.highRiskAlerts}
          color="red"
        />
        <StatCard
          icon={<CheckCircle2 className="text-green-500" size={24} />}
          label="오늘 처리 완료"
          value={stats.todayResolved != null ? stats.todayResolved : "—"}
          color="green"
        />
        <StatCard
          icon={<Activity className="text-teal-700" size={24} />}
          label="AI 정확도"
          value={stats.aiAccuracy != null ? `${stats.aiAccuracy}%` : "—"}
          color="teal"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition flex-1 justify-center ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === "escalations" && <EscalationQueue />}
        {activeTab === "alerts" && <SymptomAlerts />}
        {activeTab === "accuracy" && <AccuracyPanel />}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const borderColors = {
    orange: "border-l-orange-400",
    red: "border-l-red-400",
    green: "border-l-green-400",
    teal: "border-l-teal-400",
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColors[color]} p-4`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
