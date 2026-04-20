"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus, Save, Trash2, X, ChevronDown, ChevronUp,
  User, Building2, GripVertical, Eye, EyeOff, Search,
} from "lucide-react";

/* ═══════════════════════════════════════
   Admin Doctor & Branch Management
   ═══════════════════════════════════════ */

const STATUS_OPTIONS = [
  { value: "registered", label: "등록 완료", color: "bg-green-100 text-green-800" },
  { value: "preparing", label: "준비 중", color: "bg-amber-100 text-amber-800" },
  { value: "upcoming", label: "예정", color: "bg-gray-100 text-gray-700" },
];

function StatusBadge({ status }) {
  const opt = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[2];
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>;
}

// ─── Reusable array field editor ───
function ArrayEditor({ label, items, onChange }) {
  const addItem = () => onChange([...items, ""]);
  const updateItem = (i, v) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600">{label}</label>
        <button onClick={addItem} className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1">
          <Plus size={12} /> 추가
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={item}
            onChange={e => updateItem(i, e.target.value)}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-teal-300 focus:border-teal-400 outline-none"
            placeholder={`${label} ${i + 1}`}
          />
          <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-gray-400 italic">항목 없음</p>}
    </div>
  );
}

// ─── i18n Editor for name/position ───
function I18nEditor({ i18n, onChange }) {
  const langs = ["en", "ru", "kz", "zh", "ja"];
  const langLabels = { en: "English", ru: "Русский", kz: "Қазақша", zh: "中文", ja: "日本語" };
  const fields = ["name", "position"];

  const update = (lang, field, value) => {
    const next = { ...i18n };
    if (!next[lang]) next[lang] = {};
    next[lang][field] = value;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-600">다국어 이름/직위 번역</label>
      {langs.map(lang => (
        <div key={lang} className="bg-gray-50 rounded-lg p-3 space-y-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase">{langLabels[lang]}</span>
          {fields.map(f => (
            <input
              key={f}
              value={i18n?.[lang]?.[f] || ""}
              onChange={e => update(lang, f, e.target.value)}
              placeholder={f === "name" ? "이름" : "직위"}
              className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-teal-300 outline-none"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Branch Form ───
function BranchForm({ branch, onSave, onCancel }) {
  const [form, setForm] = useState(branch || {
    branch_code: "", name_ko: "", name_en: "",
    address_ko: "", address_en: "", phone: "", status: "registered", display_order: 0,
  });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="font-bold text-sm text-gray-800">{branch ? "지점 수정" : "새 지점 추가"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">코드 (영문)*</label>
          <input value={form.branch_code} onChange={e => set("branch_code", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="gangseo" />
        </div>
        <div>
          <label className="text-xs text-gray-500">상태</label>
          <select value={form.status} onChange={e => set("status", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">이름 (한글)*</label>
          <input value={form.name_ko} onChange={e => set("name_ko", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="면력한방병원 강서점" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Name (EN)</label>
          <input value={form.name_en || ""} onChange={e => set("name_en", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="Immune Hospital Gangseo" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">주소 (한글)</label>
        <input value={form.address_ko || ""} onChange={e => set("address_ko", e.target.value)}
          className="w-full text-sm border rounded-lg px-3 py-2 mt-1" />
      </div>
      <div>
        <label className="text-xs text-gray-500">Address (EN)</label>
        <input value={form.address_en || ""} onChange={e => set("address_en", e.target.value)}
          className="w-full text-sm border rounded-lg px-3 py-2 mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">전화번호</label>
          <input value={form.phone || ""} onChange={e => set("phone", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="02-XXXX-XXXX" />
        </div>
        <div>
          <label className="text-xs text-gray-500">정렬순서</label>
          <input type="number" value={form.display_order} onChange={e => set("display_order", parseInt(e.target.value) || 0)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => onSave(form)}
          className="flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition">
          <Save size={14} /> 저장
        </button>
        <button onClick={onCancel}
          className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
          취소
        </button>
      </div>
    </div>
  );
}

// ─── Doctor Form ───
function DoctorForm({ doctor, branches, onSave, onCancel }) {
  const [form, setForm] = useState(doctor || {
    branch_id: branches[0]?.id || "", name_ko: "", name_en: "",
    position_ko: "", position_en: "", photo_url: "", listing_photo_url: "",
    subspecialty: "", career: [], education: [], activities: [], publications: [], keywords: [],
    i18n: {}, display_order: 0, is_active: true,
  });
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 max-h-[80vh] overflow-y-auto">
      <h3 className="font-bold text-sm text-gray-800">{doctor ? "의료진 수정" : "새 의료진 추가"}</h3>

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">소속 지점*</label>
          <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1">
            {branches.map(b => <option key={b.id} value={b.id}>{b.name_ko}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">정렬순서</label>
          <input type="number" value={form.display_order} onChange={e => set("display_order", parseInt(e.target.value) || 0)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">이름 (한글)*</label>
          <input value={form.name_ko} onChange={e => set("name_ko", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="홍길동" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Name (EN)</label>
          <input value={form.name_en || ""} onChange={e => set("name_en", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="Dr. Hong Gil-dong" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">직위 (한글)</label>
          <input value={form.position_ko || ""} onChange={e => set("position_ko", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="대표원장" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Position (EN)</label>
          <input value={form.position_en || ""} onChange={e => set("position_en", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="Chief Director" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500">전문분야</label>
        <input value={form.subspecialty || ""} onChange={e => set("subspecialty", e.target.value)}
          className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="통합면역 대표원장" />
      </div>

      {/* Photos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">상세 사진 URL</label>
          <input value={form.photo_url || ""} onChange={e => set("photo_url", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="https://..." />
          {form.photo_url && (
            <img src={form.photo_url} alt="" className="w-20 h-20 object-cover rounded-lg mt-2 border" />
          )}
        </div>
        <div>
          <label className="text-xs text-gray-500">목록 사진 URL</label>
          <input value={form.listing_photo_url || ""} onChange={e => set("listing_photo_url", e.target.value)}
            className="w-full text-sm border rounded-lg px-3 py-2 mt-1" placeholder="https://..." />
          {form.listing_photo_url && (
            <img src={form.listing_photo_url} alt="" className="w-20 h-20 object-cover rounded-lg mt-2 border" />
          )}
        </div>
      </div>

      {/* Array fields */}
      <ArrayEditor label="경력" items={form.career || []} onChange={v => set("career", v)} />
      <ArrayEditor label="학력" items={form.education || []} onChange={v => set("education", v)} />
      <ArrayEditor label="활동" items={form.activities || []} onChange={v => set("activities", v)} />
      <ArrayEditor label="저서 및 논문" items={form.publications || []} onChange={v => set("publications", v)} />
      <ArrayEditor label="키워드 (예: #꼼꼼한)" items={form.keywords || []} onChange={v => set("keywords", v)} />

      {/* i18n */}
      <I18nEditor i18n={form.i18n || {}} onChange={v => set("i18n", v)} />

      {/* Active toggle */}
      <div className="flex items-center gap-3 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)}
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm text-gray-700">활성 상태</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button onClick={() => onSave(form)}
          className="flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition">
          <Save size={14} /> 저장
        </button>
        <button onClick={onCancel}
          className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition">
          취소
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Main Page
// ═══════════════════════════════════════
export default function AdminDoctorsPage() {
  const [tab, setTab] = useState("doctors"); // 'doctors' | 'branches'
  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [editingDoctor, setEditingDoctor] = useState(null);  // null | 'new' | doctor object
  const [editingBranch, setEditingBranch] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docRes, branchRes] = await Promise.all([
        fetch("/api/admin/doctors").then(r => r.json()),
        fetch("/api/admin/branches").then(r => r.json()),
      ]);
      if (docRes.ok) setDoctors(docRes.data || []);
      if (branchRes.ok) setBranches(branchRes.data || []);
      if (!docRes.ok && !branchRes.ok) setError("데이터를 불러올 수 없습니다");
    } catch (_e) {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Doctor CRUD ──
  const saveDoctor = async (form) => {
    try {
      const isNew = !form.id;
      const res = await fetch("/api/admin/doctors", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setEditingDoctor(null);
      fetchData();
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  const deleteDoctor = async (id) => {
    if (!confirm("이 의료진을 비활성화합니까?")) return;
    try {
      const res = await fetch(`/api/admin/doctors?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      fetchData();
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  // ── Branch CRUD ──
  const saveBranch = async (form) => {
    try {
      const isNew = !form.id;
      const res = await fetch("/api/admin/branches", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setEditingBranch(null);
      fetchData();
    } catch (e) {
      alert("저장 실패: " + e.message);
    }
  };

  const deleteBranch = async (id) => {
    if (!confirm("이 지점을 삭제합니까? (소속 의료진이 없어야 합니다)")) return;
    try {
      const res = await fetch(`/api/admin/branches?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      fetchData();
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  // ── Filtered doctors ──
  const filteredDoctors = doctors.filter(d => {
    const matchBranch = filterBranch === "all" || d.branch_id === filterBranch;
    const matchSearch = !search ||
      d.name_ko?.includes(search) ||
      d.name_en?.toLowerCase().includes(search.toLowerCase()) ||
      d.position_ko?.includes(search);
    return matchBranch && matchSearch;
  });

  const branchName = (branchId) => {
    const b = branches.find(b => b.id === branchId);
    return b?.name_ko || "미지정";
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">의료진 · 지점 관리</h1>
        <p className="text-sm text-gray-500 mt-1">파트너 병원 지점과 소속 의료진을 관리합니다</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("doctors")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${
            tab === "doctors" ? "bg-white text-teal-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <User size={14} className="inline mr-1.5" />의료진 ({doctors.length})
        </button>
        <button
          onClick={() => setTab("branches")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${
            tab === "branches" ? "bg-white text-teal-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Building2 size={14} className="inline mr-1.5" />지점 ({branches.length})
        </button>
      </div>

      {loading && (
        <div className="text-center py-20 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-3" />
          로딩 중...
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm mb-4">
          {error}
          <button onClick={fetchData} className="ml-3 underline">재시도</button>
        </div>
      )}

      {/* ═══════ DOCTORS TAB ═══════ */}
      {!loading && tab === "doctors" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="이름 · 직위 검색"
                  className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-teal-300 outline-none"
                />
              </div>
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2"
              >
                <option value="all">전체 지점</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name_ko}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setEditingDoctor("new")}
              className="flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition whitespace-nowrap"
            >
              <Plus size={14} /> 의료진 추가
            </button>
          </div>

          {/* Edit form (inline) */}
          {editingDoctor && (
            <DoctorForm
              doctor={editingDoctor === "new" ? null : editingDoctor}
              branches={branches}
              onSave={saveDoctor}
              onCancel={() => setEditingDoctor(null)}
            />
          )}

          {/* Doctor list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">사진</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">이름</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs hidden sm:table-cell">직위</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs hidden md:table-cell">지점</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs hidden lg:table-cell">경력</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">상태</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDoctors.map(doc => (
                  <tr key={doc.id} className={`hover:bg-gray-50 transition ${!doc.is_active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      {doc.listing_photo_url || doc.photo_url ? (
                        <img
                          src={doc.listing_photo_url || doc.photo_url}
                          alt={doc.name_ko}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User size={16} className="text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{doc.name_ko}</div>
                      {doc.name_en && <div className="text-xs text-gray-400">{doc.name_en}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{doc.position_ko || "-"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {branchName(doc.branch_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {(doc.career?.length || 0) + (doc.education?.length || 0)}건
                    </td>
                    <td className="px-4 py-3">
                      {doc.is_active ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <Eye size={10} /> 활성
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                          <EyeOff size={10} /> 비활성
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingDoctor(doc)}
                          className="text-xs text-teal-600 hover:text-teal-800 px-2 py-1 rounded hover:bg-teal-50 transition"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteDoctor(doc.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDoctors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      {search ? "검색 결과가 없습니다" : "등록된 의료진이 없습니다"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ BRANCHES TAB ═══════ */}
      {!loading && tab === "branches" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setEditingBranch("new")}
              className="flex items-center gap-1.5 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition"
            >
              <Plus size={14} /> 지점 추가
            </button>
          </div>

          {editingBranch && (
            <BranchForm
              branch={editingBranch === "new" ? null : editingBranch}
              onSave={saveBranch}
              onCancel={() => setEditingBranch(null)}
            />
          )}

          <div className="grid gap-4">
            {branches.map(branch => {
              const doctorCount = doctors.filter(d => d.branch_id === branch.id && d.is_active).length;
              return (
                <div key={branch.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Building2 size={18} className="text-teal-600" />
                        <h3 className="font-bold text-gray-900">{branch.name_ko}</h3>
                        <StatusBadge status={branch.status} />
                      </div>
                      {branch.name_en && <p className="text-sm text-gray-500 ml-8">{branch.name_en}</p>}
                      {branch.address_ko && <p className="text-xs text-gray-400 ml-8 mt-1">{branch.address_ko}</p>}
                      <div className="flex items-center gap-4 ml-8 mt-2">
                        <span className="text-xs text-gray-500">코드: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{branch.branch_code}</code></span>
                        <span className="text-xs text-gray-500">의료진: <strong className="text-teal-600">{doctorCount}</strong>명</span>
                        {branch.phone && <span className="text-xs text-gray-500">TEL: {branch.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingBranch(branch)}
                        className="text-xs text-teal-600 hover:text-teal-800 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => deleteBranch(branch.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {branches.length === 0 && (
              <div className="text-center py-12 text-gray-400">등록된 지점이 없습니다</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
