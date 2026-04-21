"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Video,
  Phone,
  ChevronRight,
  Filter,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

const STATUS_FILTERS = [
  { key: "scheduled", label: "예정됨", color: "blue" },
  { key: "active", label: "진행 중", color: "green" },
  { key: "completed", label: "완료", color: "gray" },
  { key: "all", label: "전체", color: "purple" },
];

export default function DoctorConsultationsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("scheduled");

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;

        let url = "/api/khidi/consultation?limit=100";
        if (filter !== "all") url += `&status=${filter}`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.ok) setSessions(result.data || []);
      } catch (err) {
        console.error("[doctor/consultations]", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">원격협진</h1>
        <p className="text-gray-500 mt-2">내가 참여하는 상담 세션 목록</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        {STATUS_FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">로딩 중...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-semibold text-gray-700">
            해당 상태의 상담이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((c) => {
            const scheduled = new Date(c.scheduled_at);
            const isToday =
              scheduled.toDateString() === new Date().toDateString();
            return (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      c.status === "active"
                        ? "bg-green-100 text-green-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    <Video size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">
                        {c.hospitals?.name || "상담"}
                      </h3>
                      {c.partner_doctors?.name_ko && (
                        <span className="text-sm text-gray-600">
                          · Dr. {c.partner_doctors.name_ko}
                        </span>
                      )}
                      {isToday && c.status === "scheduled" && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                          오늘
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {scheduled.toLocaleDateString("ko-KR")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {scheduled.toLocaleTimeString("ko-KR", {
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
                  {(c.status === "scheduled" || c.status === "active") && (
                    <Link
                      href={`/consultation/${c.id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex-shrink-0"
                    >
                      <Phone size={16} />
                      {c.status === "active" ? "재진입" : "입장"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
