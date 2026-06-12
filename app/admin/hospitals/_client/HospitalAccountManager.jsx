"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Trash2, X, Loader2, Shield, Eye, Crown } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const ROLE_CONFIG = {
  owner: { label: "소유자", icon: Crown, color: "bg-amber-100 text-amber-700" },
  manager: { label: "관리자", icon: Shield, color: "bg-blue-100 text-blue-700" },
  viewer: { label: "조회자", icon: Eye, color: "bg-gray-100 text-gray-600" },
};

async function fetchAdminApi(url, options = {}) {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { ...options, headers, credentials: "include" });
}

export function HospitalAccountManager({ hospitals }) {
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("manager");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const loadAccounts = useCallback(async () => {
    if (!selectedHospitalId) {
      setAccounts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchAdminApi(`/api/admin/hospital-accounts?hospital_id=${selectedHospitalId}`);
      const data = await res.json();
      if (data.ok) setAccounts(data.accounts);
    } catch (err) {
      console.error("[HospitalAccounts] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedHospitalId]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  const handleAdd = async () => {
    if (!newEmail.trim() || !selectedHospitalId) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetchAdminApi("/api/admin/hospital-accounts", {
        method: "POST",
        body: JSON.stringify({
          hospital_id: selectedHospitalId,
          email: newEmail.trim(),
          role: newRole,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAccounts((prev) => [data.account, ...prev]);
        setNewEmail("");
        setShowAddForm(false);
      } else {
        setError(
          data.error === "already_registered"
            ? "이미 등록된 이메일입니다"
            : data.error || "등록 실패"
        );
      }
    } catch (_err) {
      setError("등록 중 오류가 발생했습니다");
    } finally {
      setAdding(false);
    }
  };

  const handleDeactivate = async (accountId) => {
    if (!confirm("이 담당자를 비활성화하시겠습니까?")) return;
    try {
      const res = await fetchAdminApi(`/api/admin/hospital-accounts?id=${accountId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      }
    } catch (err) {
      console.error("[HospitalAccounts] Deactivate error:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base lg:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-gray-400" />
            병원 계정 관리
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">병원별 담당자를 등록하여 Hospital Portal 접근 권한을 부여합니다</p>
        </div>
      </div>

      {/* Hospital Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">병원 선택</label>
        <select
          value={selectedHospitalId}
          onChange={(e) => setSelectedHospitalId(e.target.value)}
          className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">-- 병원을 선택하세요 --</option>
          {(hospitals || []).map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </div>

      {selectedHospitalId && (
        <>
          {/* Add button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
            >
              {showAddForm ? <X size={16} /> : <Plus size={16} />}
              {showAddForm ? "취소" : "담당자 추가"}
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">이메일</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="hospital@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">역할</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="owner">소유자</option>
                    <option value="manager">관리자</option>
                    <option value="viewer">조회자</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={handleAdd}
                disabled={adding || !newEmail.trim()}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
              >
                {adding && <Loader2 size={14} className="animate-spin" />}
                {adding ? "등록 중..." : "등록"}
              </button>
            </div>
          )}

          {/* Account List */}
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">등록된 담당자가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.filter((a) => a.is_active !== false).map((account) => {
                const rc = ROLE_CONFIG[account.role] || ROLE_CONFIG.manager;
                const RoleIcon = rc.icon;
                return (
                  <div
                    key={account.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rc.color}`}>
                        <RoleIcon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {account.email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${rc.color}`}>
                            {rc.label}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(account.created_at).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeactivate(account.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="비활성화"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
