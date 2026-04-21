"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  Info,
} from "lucide-react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export default function PatientConsultationsClient() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/khidi/consultation?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.ok) setSessions(result.data || []);
      } catch (err) {
        console.error("[patient/consultations]", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) =>
    ["completed", "cancelled", "no_show"].includes(s.status)
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">원격협진 이력</h1>
        <p className="text-gray-500 mt-2">
          한국 전문의와의 영상 상담 예약과 기록을 확인하세요.
        </p>
      </div>

      {/* Info card */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-3">
        <Info size={20} className="text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-teal-900">
          <p className="font-semibold mb-1">새 상담을 예약하고 싶으신가요?</p>
          <p className="text-teal-800 leading-relaxed">
            원격협진은 코디네이터가 예약을 잡아드립니다.{" "}
            <Link href="/inquiry" className="underline font-medium">
              상담 신청
            </Link>{" "}
            을 통해 증례 공유 후 의료진 매칭을 받으세요.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">로딩 중...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Video size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            아직 예약된 원격협진이 없습니다
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            상담 신청 → HEALO 코디네이터 매칭 → 원격 영상 상담 순으로 진행됩니다.
          </p>
          <Link
            href="/telemedicine"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700"
          >
            원격협진 안내 보기 <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                다가오는 상담 ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <ConsultationCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                지난 상담 ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((s) => (
                  <ConsultationCard key={s.id} session={s} past />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ConsultationCard({ session, past }) {
  const scheduled = new Date(session.scheduled_at);
  const isToday = scheduled.toDateString() === new Date().toDateString();
  const isSoon = isToday && scheduled.getTime() - Date.now() < 30 * 60 * 1000;

  return (
    <div
      className={`bg-white border rounded-2xl p-5 transition ${
        past
          ? "border-gray-200 opacity-75"
          : isSoon
          ? "border-teal-500 shadow-md"
          : "border-gray-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            past
              ? "bg-gray-100 text-gray-500"
              : isSoon
              ? "bg-teal-100 text-teal-700"
              : "bg-blue-100 text-blue-600"
          }`}
        >
          <Video size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">
              {session.hospitals?.name || "상담 세션"}
            </h3>
            {session.partner_doctors?.name_ko && (
              <span className="text-sm text-gray-600">
                Dr. {session.partner_doctors.name_ko}
                {session.partner_doctors.subspecialty && (
                  <span className="text-gray-400">
                    {" "}
                    · {session.partner_doctors.subspecialty}
                  </span>
                )}
              </span>
            )}
            {isSoon && (
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
                곧 시작
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {scheduled.toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
                weekday: "short",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {scheduled.toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {session.hospitals?.address && (
              <span className="flex items-center gap-1 text-xs truncate max-w-xs">
                <MapPin size={12} />
                {session.hospitals.address}
              </span>
            )}
          </div>
          {session.notes && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {session.notes}
            </p>
          )}
        </div>
        {!past && (
          <Link
            href={`/consultation/${session.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition flex-shrink-0"
          >
            <Phone size={16} />
            입장
          </Link>
        )}
      </div>
    </div>
  );
}
