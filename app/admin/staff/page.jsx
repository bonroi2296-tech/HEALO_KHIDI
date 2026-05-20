"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";
import { useToast } from "../../../src/components/Toast";

const supabase = createSupabaseBrowserClient();

const ROLE_LABEL = { doctor: "의사", coordinator: "코디네이터" };

export default function AdminStaffPage() {
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", role: "doctor", password: "healo1234" });
  const [submitting, setSubmitting] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", { headers: await authHeaders() });
      const result = await res.json();
      if (result.ok) setStaff(result.staff || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRemove(s) {
    if (!confirm(`${s.full_name || s.email} 의 ${ROLE_LABEL[s.role] || s.role} 역할을 해제할까요?\n(계정·기록은 보존되며 드롭다운·권한에서만 제외됩니다)`)) return;
    try {
      const res = await fetch(`/api/admin/staff?userId=${encodeURIComponent(s.id)}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`실패: ${result.error || "unknown"}`);
        return;
      }
      toast.success("역할 해제 완료");
      load();
    } catch {
      toast.error("요청 실패");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("이메일을 입력하세요");
      return;
    }
    if (form.password.trim().length < 6) {
      toast.error("임시 비밀번호는 최소 6자 (예: healo1234)");
      return;
    }
    setSubmitting(true);
    setLastCreated(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        const msg = result.error === "password_too_short" ? "임시 비밀번호는 최소 6자" : result.error || "unknown";
        toast.error(`실패: ${msg}`);
        return;
      }
      toast.success(
        result.createdNew
          ? `${ROLE_LABEL[form.role]} 계정 생성 완료`
          : `기존 계정에 ${ROLE_LABEL[form.role]} 역할 부여 + 비번 재설정`
      );
      setLastCreated({ email: result.loginEmail, password: result.tempPassword });
      setForm({ name: "", email: "", role: "doctor", password: "healo1234" });
      load();
    } catch {
      toast.error("요청 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">직원 계정 관리</h1>
      <p className="text-sm text-gray-500 mb-8">
        의사·코디네이터 계정을 만들고 역할을 부여합니다. 생성된 계정은 비밀번호 설정 링크를
        해당 직원에게 전달하면 본인이 비밀번호를 정합니다.
      </p>

      {/* 생성 폼 */}
      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-5 md:p-6 mb-8 bg-white">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">이름</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 김의사"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">이메일 *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="staff@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">역할 *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="doctor">의사</option>
              <option value="coordinator">코디네이터</option>
            </select>
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <label className="block text-xs font-semibold text-gray-600 mb-1">임시 비밀번호 (최소 6자)</label>
          <input
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="healo1234"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-[11px] text-gray-400 mt-1">직원에게 이메일+이 비번을 전달하면 바로 로그인. 본인이 나중에 변경 가능.</p>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "처리 중…" : "계정 생성 / 역할 부여"}
        </button>
      </form>

      {/* 로그인 정보 (생성 직후 표시) — 직원에게 전달 */}
      {lastCreated && (
        <div className="border border-teal-200 bg-teal-50 rounded-xl p-4 mb-8">
          <p className="text-sm font-semibold text-teal-800 mb-3">
            아래 로그인 정보를 이 직원에게 전달하세요
          </p>
          <div className="bg-white border border-teal-200 rounded-lg p-3 font-mono text-sm space-y-1">
            <div>이메일: <span className="font-bold">{lastCreated.email}</span></div>
            <div>비밀번호: <span className="font-bold">{lastCreated.password}</span></div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`이메일: ${lastCreated.email}\n비밀번호: ${lastCreated.password}\n로그인: ${window.location.origin}/login`);
              toast.success("로그인 정보 복사됨");
            }}
            className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold"
          >
            로그인 정보 복사
          </button>
        </div>
      )}

      {/* 직원 목록 */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">등록된 직원</h2>
      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : staff.length === 0 ? (
        <p className="text-sm text-gray-400">아직 등록된 의사·코디네이터 계정이 없습니다.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white gap-3">
              <div className="min-w-0">
                <span className="font-semibold text-gray-900 text-sm">
                  {s.full_name || s.email}
                </span>
                {s.full_name && <span className="text-xs text-gray-400 ml-2">{s.email}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2.5 py-0.5">
                  {ROLE_LABEL[s.role] || s.role}
                </span>
                <button
                  onClick={() => {
                    setForm({ name: s.full_name || "", email: s.email, role: s.role, password: "healo1234" });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-teal-600 px-2 py-1"
                >
                  수정
                </button>
                <button
                  onClick={() => handleRemove(s)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1"
                >
                  역할 해제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
