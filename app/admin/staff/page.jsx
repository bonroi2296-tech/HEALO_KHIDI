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
  const [form, setForm] = useState({ name: "", email: "", role: "doctor" });
  const [submitting, setSubmitting] = useState(false);
  const [lastLink, setLastLink] = useState(null);

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("이메일을 입력하세요");
      return;
    }
    setSubmitting(true);
    setLastLink(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        toast.error(`실패: ${result.error || "unknown"}`);
        return;
      }
      toast.success(
        result.createdNew
          ? `${ROLE_LABEL[form.role]} 계정 생성 완료`
          : `기존 계정에 ${ROLE_LABEL[form.role]} 역할 부여 완료`
      );
      if (result.setupLink) setLastLink({ email: form.email, url: result.setupLink });
      setForm({ name: "", email: "", role: "doctor" });
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
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "처리 중…" : "계정 생성 / 역할 부여"}
        </button>
      </form>

      {/* 비번 설정 링크 (생성 직후 1회 표시) */}
      {lastLink && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-8">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {lastLink.email} 비밀번호 설정 링크 — 이 직원에게 전달하세요
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={lastLink.url}
              className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastLink.url);
                toast.success("복사됨");
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold"
            >
              복사
            </button>
          </div>
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
            <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white">
              <div>
                <span className="font-semibold text-gray-900 text-sm">
                  {s.full_name || s.email}
                </span>
                {s.full_name && <span className="text-xs text-gray-400 ml-2">{s.email}</span>}
              </div>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-2.5 py-0.5">
                {ROLE_LABEL[s.role] || s.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
