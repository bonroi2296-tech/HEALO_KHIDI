"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { useToast } from "../../../src/components/Toast";

const supabase = createSupabaseBrowserClient();

const SESSION_TYPE_LABEL = {
  pre_consultation: "사전 상담",
  follow_up: "사후 관리",
  second_opinion: "세컨드 오피니언",
};

function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "-";
  }
}

export default function AdminUsersPage() {
  const toast = useToast();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null); // { user, consultations }
  const [detailLoading, setDetailLoading] = useState(false);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers: await authHeaders() });
      const result = await res.json();
      if (result.ok) setPatients(result.patients || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openDetail(id) {
    setDetailLoading(true);
    setDetail({ loading: true });
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(id)}`, { headers: await authHeaders() });
      const result = await res.json();
      if (result.ok) setDetail({ user: result.user, consultations: result.consultations });
      else { toast.error("불러오기 실패"); setDetail(null); }
    } catch {
      toast.error("불러오기 실패");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function patch(userId, action, extra = {}) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ userId, action, ...extra }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      toast.error(`실패: ${result.error || "unknown"}`);
      return false;
    }
    return true;
  }

  async function handleBan(user) {
    const ban = !user.banned;
    if (ban && !confirm(`${user.email} 계정을 비활성화할까요?\n(로그인 차단 — 계정·상담기록은 보존, 언제든 복구 가능)`)) return;
    if (await patch(user.id, ban ? "ban" : "unban")) {
      toast.success(ban ? "비활성화됨" : "활성화됨");
      setDetail((d) => (d?.user ? { ...d, user: { ...d.user, banned: ban } } : d));
      load();
    }
  }

  async function handleResetPw(user) {
    const pw = prompt(`${user.email} 새 임시 비밀번호 (최소 6자):`, "healo1234");
    if (!pw) return;
    if (pw.length < 6) { toast.error("최소 6자"); return; }
    if (await patch(user.id, "reset_password", { password: pw })) {
      toast.success(`비밀번호 재설정 완료 — 환자에게 전달: ${pw}`);
    }
  }

  const filtered = patients.filter(
    (p) => !search || (p.email || "").toLowerCase().includes(search.toLowerCase()) || (p.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">회원(환자) 관리</h1>
      <p className="text-sm text-gray-500 mb-6">
        가입 환자 목록과 상담 이력입니다. 삭제 대신 비활성화(소프트)만 가능 — 계정·기록은 보존됩니다.
      </p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="이메일·이름 검색"
        className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">표시할 환자가 없습니다.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => openDetail(p.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left gap-3"
            >
              <div className="min-w-0">
                <span className="font-semibold text-gray-900 text-sm">{p.full_name || p.email}</span>
                {p.full_name && <span className="text-xs text-gray-400 ml-2">{p.email}</span>}
                <div className="text-xs text-gray-400 mt-0.5">
                  {p.country || "국적 미상"} · 가입 {fmtDate(p.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2.5 py-0.5">
                  상담 {p.consultation_count}
                </span>
                {p.banned && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">
                    비활성
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            {detail.loading || detailLoading ? (
              <p className="text-sm text-gray-400">불러오는 중…</p>
            ) : detail.user ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{detail.user.full_name || detail.user.email}</h2>
                    <p className="text-xs text-gray-400">{detail.user.email}</p>
                  </div>
                  {detail.user.banned && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5">비활성</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                  <div><span className="text-gray-400">국적</span><div className="font-medium text-gray-900">{detail.user.country || "-"}</div></div>
                  <div><span className="text-gray-400">선호 언어</span><div className="font-medium text-gray-900">{detail.user.language || "-"}</div></div>
                  <div><span className="text-gray-400">가입일</span><div className="font-medium text-gray-900">{fmtDate(detail.user.created_at)}</div></div>
                  <div><span className="text-gray-400">최근 로그인</span><div className="font-medium text-gray-900">{fmtDate(detail.user.last_sign_in_at)}</div></div>
                </div>

                <h3 className="text-sm font-bold text-gray-900 mb-2">상담 이력 ({detail.consultations.length})</h3>
                {detail.consultations.length === 0 ? (
                  <p className="text-sm text-gray-400 mb-5">상담 기록이 없습니다.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 mb-5">
                    {detail.consultations.map((c) => (
                      <div key={c.id} className="px-3 py-2 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-900">{SESSION_TYPE_LABEL[c.session_type] || c.session_type}</span>
                          <span className="text-xs text-gray-400 ml-2">{fmtDate(c.scheduled_at)}</span>
                        </div>
                        <span className="text-xs text-gray-500">{c.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => handleBan(detail.user)} className={`px-4 py-2 rounded-lg text-sm font-bold ${detail.user.banned ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"}`}>
                    {detail.user.banned ? "활성화" : "비활성화"}
                  </button>
                  <button onClick={() => handleResetPw(detail.user)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 border border-gray-300 hover:bg-gray-50">
                    비밀번호 재설정
                  </button>
                  <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 ml-auto">닫기</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
