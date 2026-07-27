"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { redirect } from "next/navigation";
import { Stethoscope, Plus, Save, X, Eye, EyeOff, ArrowLeft, Pencil, Clock, AlertTriangle, UploadCloud, Loader2, Info } from "lucide-react";
import { HOSPITAL_CONTENT_ENABLED } from "../_components/featureFlags";

export default function HospitalTreatmentsPage() {
  // 공개 프론트 미연동 → 비활성. 메뉴에서 숨겼지만 직접 URL 접근도 차단.
  if (!HOSPITAL_CONTENT_ENABLED) redirect("/hospital");
  return <TreatmentsManager />;
}

function fetchWithAuth(url, options = {}) {
  return import("@/lib/supabase/browser").then(({ createSupabaseBrowserClient }) => {
    const supabase = createSupabaseBrowserClient();
    return supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      const headers = { ...(options.headers || {}) };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
      return fetch(url, { ...options, headers, credentials: "include" });
    });
  });
}

function TagListEditor({ items, onAdd, onRemove, placeholder, colorClass = "bg-blue-50 text-blue-700" }) {
  const [val, setVal] = useState("");
  const add = () => { const t = val.trim(); if (t && !items.includes(t)) { onAdd(t); setVal(""); } };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 ${colorClass} px-2.5 py-1 rounded-full text-xs font-medium`}>
            {item}
            <button onClick={() => onRemove(i)} className="hover:opacity-70"><X size={12}/></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder={placeholder}/>
        <button onClick={add} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><Plus size={16}/></button>
      </div>
    </div>
  );
}

const emptyForm = {
  name: "",
  description: "",
  full_description: "",
  price_min: "",
  price_max: "",
  currency: "USD",
  tags: [],
  benefits: [],
  images: [],
  // 실DB `treatments` 의 서술 필드(글자형). 옛 미용시술 스키마의 숫자형 min/max·
  // 부작용·마취·보험·성공률 필드는 실제 컬럼이 아니어서 저장 자체를 막고 있었다.
  duration: "",
  recovery_time: "",
  preparation: "",
  risks: "",
  is_published: false,
};

function TreatmentsManager() {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, "new" = create, id = edit
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [_newTag, _setNewTag] = useState("");

  const loadTreatments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/partner/treatments");
      const data = await res.json();
      if (data.ok) setTreatments(data.treatments);
    } catch (err) {
      console.error("[Treatments] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTreatments(); }, [loadTreatments]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setEditing("new");
  };

  const startEdit = (treatment) => {
    setForm({
      name: treatment.name || "",
      description: treatment.description || "",
      full_description: treatment.full_description || "",
      price_min: treatment.price_min || "",
      price_max: treatment.price_max || "",
      currency: treatment.currency || "USD",
      tags: treatment.tags || [],
      benefits: treatment.benefits || [],
      images: Array.isArray(treatment.images) ? treatment.images : [],
      duration: treatment.duration || "",
      recovery_time: treatment.recovery_time || "",
      preparation: treatment.preparation || "",
      risks: treatment.risks || "",
      is_published: treatment.is_published ?? false,
    });
    setEditing(treatment.id);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("시술명을 입력해주세요", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price_min: form.price_min ? Number(form.price_min) : null,
        price_max: form.price_max ? Number(form.price_max) : null,
      };

      let res;
      if (editing === "new") {
        res = await fetchWithAuth("/api/partner/treatments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetchWithAuth(`/api/partner/treatments?id=${editing}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.ok) {
        showToast(editing === "new" ? "시술이 추가되었습니다" : "시술이 수정되었습니다");
        setEditing(null);
        loadTreatments();
      } else {
        showToast("저장 실패: " + (data.error || ""), "error");
      }
    } catch (_err) {
      showToast("저장 중 오류가 발생했습니다", "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (treatment) => {
    try {
      const res = await fetchWithAuth(`/api/partner/treatments?id=${treatment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_published: !treatment.is_published }),
      });
      const data = await res.json();
      if (data.ok) {
        setTreatments((prev) =>
          prev.map((t) => (t.id === treatment.id ? { ...t, is_published: !t.is_published } : t))
        );
      }
    } catch (err) {
      console.error("[Treatments] Toggle error:", err);
    }
  };

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const uploadImage = async (file) => {
    if (!file) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetchWithAuth("/api/admin/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (result.ok) return result.url;
      showToast("이미지 업로드 실패", "error");
      return null;
    } catch {
      showToast("이미지 업로드 실패", "error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Form View
  if (editing !== null) {
    return (
      <div>
        {toast && (
          <div className={`fixed top-16 lg:top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "error" ? "bg-red-600 text-white" : "bg-green-500 text-white"
          }`}>
            {toast.message}
          </div>
        )}

        {/* Page header */}
        <div className="sticky top-14 lg:top-0 z-10 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-4 lg:pt-6 pb-4 border-b border-gray-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-white rounded-lg transition border border-gray-200 bg-white shadow-sm">
                <ArrowLeft size={16} />
              </button>
              <h1 className="text-lg lg:text-2xl font-extrabold text-gray-900">
                {editing === "new" ? "새 시술 추가" : "시술 수정"}
              </h1>
            </div>
            <button onClick={handleSave} disabled={saving} className="bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-800 transition flex items-center gap-2 disabled:opacity-50 text-sm shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-8 space-y-5 mb-6">
          {/* 기본 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500">기본 정보</h3>
            <input placeholder="시술명 (영어/한글) *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2 border rounded text-sm"/>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="number" placeholder="최소 가격 ($)" value={form.price_min} onChange={e => setForm({ ...form, price_min: e.target.value })} className="w-full p-2 border rounded text-sm"/>
              <input type="number" placeholder="최대 가격 ($)" value={form.price_max} onChange={e => setForm({ ...form, price_max: e.target.value })} className="w-full p-2 border rounded text-sm"/>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full p-2 border rounded text-sm">
                <option value="USD">USD</option>
                <option value="KRW">KRW</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-sm font-bold text-gray-700 flex-1">프론트 노출 여부</label>
              <button type="button" onClick={() => setForm({ ...form, is_published: !form.is_published })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_published ? 'bg-teal-700' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_published ? 'translate-x-6' : 'translate-x-1'}`}/>
              </button>
              <span className="text-xs text-gray-600 w-16">{form.is_published ? '노출' : '숨김'}</span>
            </div>
          </div>

          {/* 설명 */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500">설명</h3>
            <input placeholder="간략 설명 (카드용)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-2 border rounded text-sm"/>
            <textarea placeholder="상세 설명 (페이지용)" rows="4" value={form.full_description || ""} onChange={e => setForm({ ...form, full_description: e.target.value })} className="w-full p-2 border rounded text-sm"/>
          </div>

          {/* 이미지 */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-500">시술 관련 이미지</label>
            <p className="text-xs text-teal-700 bg-teal-50 p-2 rounded-lg flex items-center gap-2">
              <Info size={14}/> 권장: 800x800px (1:1 비율)
            </p>
            {(form.images || []).length > 0 && (
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {form.images.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                    <img src={url} alt="treatment" className="w-full h-full object-cover"/>
                    <button onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== idx) })} className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm"><X size={10}/></button>
                  </div>
                ))}
              </div>
            )}
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={async e => { const url = await uploadImage(e.target.files[0]); if (url) setForm(prev => ({ ...prev, images: [...(prev.images || []), url] })); if (fileInputRef.current) fileInputRef.current.value = ""; }}/>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 hover:border-teal-500 transition cursor-pointer disabled:opacity-50">
              {uploading ? <Loader2 size={18} className="animate-spin"/> : <UploadCloud size={18}/>}
              {uploading ? "업로드 중..." : "이미지 업로드"}
            </button>
          </div>

          {/* 치료 상세 — 환자 상세페이지에 그대로 표시되는 항목 */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2"><Clock size={16}/> 치료 상세</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">소요 시간</label>
                <input placeholder="예: 1회 30분, 주 2회" value={form.duration || ""} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full border p-2 rounded text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">회복 기간</label>
                <input placeholder="예: 3~14일" value={form.recovery_time || ""} onChange={e => setForm({ ...form, recovery_time: e.target.value })} className="w-full border p-2 rounded text-sm"/>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">사전 준비사항</label>
              <textarea placeholder="예: 검사 전 8시간 금식, 복용 중인 약 지참" rows="2" value={form.preparation || ""} onChange={e => setForm({ ...form, preparation: e.target.value })} className="w-full p-2 border rounded text-sm"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> 주의사항 · 부작용</label>
              <textarea placeholder="예: 시술 후 음주·사우나 금지, 일시적 부기 가능" rows="2" value={form.risks || ""} onChange={e => setForm({ ...form, risks: e.target.value })} className="w-full p-2 border rounded text-sm"/>
            </div>
          </div>

          {/* 주요 효과 & 태그 */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-bold text-gray-500 mb-1 block">주요 효과 (Benefits)</label>
              <TagListEditor items={form.benefits || []} onAdd={t => setForm({ ...form, benefits: [...(form.benefits || []), t] })} onRemove={i => setForm({ ...form, benefits: (form.benefits || []).filter((_, x) => x !== i) })} placeholder="주요 효과 추가..." colorClass="bg-green-50 text-green-700"/>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-500 mb-1 block">검색 태그</label>
              <TagListEditor items={form.tags || []} onAdd={t => setForm({ ...form, tags: [...(form.tags || []), t] })} onRemove={i => setForm({ ...form, tags: (form.tags || []).filter((_, x) => x !== i) })} placeholder="태그 추가..."/>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // List View
  return (
    <div>
      {toast && (
        <div className={`fixed top-16 lg:top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-500 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Page header */}
      <div className="sticky top-14 lg:top-0 z-10 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 pt-4 lg:pt-6 pb-4 border-b border-gray-200/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg lg:text-2xl font-extrabold text-gray-900">시술 관리</h1>
            <p className="text-xs text-gray-500 mt-0.5">시술을 추가하고 관리하세요</p>
          </div>
          <button onClick={startCreate} className="bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-800 transition flex items-center gap-2 text-sm shadow-sm">
            <Plus size={16} /> 새 시술 추가
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : treatments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-500 mb-6">
          <Stethoscope size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">등록된 시술이 없습니다</p>
          <button onClick={startCreate} className="mt-4 text-teal-700 text-sm font-medium hover:underline">
            첫 시술을 추가해보세요
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 mb-6">
          {treatments.map((treatment) => (
            <div
              key={treatment.id}
              className="p-4 lg:p-5 hover:bg-gray-50/50 transition cursor-pointer"
              onClick={() => startEdit(treatment)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{treatment.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      treatment.is_published ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {treatment.is_published ? <Eye size={10} /> : <EyeOff size={10} />}
                      {treatment.is_published ? "공개" : "비공개"}
                    </span>
                  </div>
                  {(treatment.price_min || treatment.price_max) && (
                    <p className="text-xs text-gray-600 mb-1.5">
                      {treatment.currency || "USD"} {treatment.price_min || "?"} ~ {treatment.price_max || "?"}
                    </p>
                  )}
                  {treatment.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {treatment.tags.map((tag, i) => (
                        <span key={i} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePublish(treatment); }}
                    className={`p-2 rounded-lg text-xs transition ${
                      treatment.is_published ? "text-teal-700 hover:bg-teal-50" : "text-gray-600 hover:bg-gray-100"
                    }`}
                    title={treatment.is_published ? "비공개로 변경" : "공개로 변경"}
                  >
                    {treatment.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(treatment); }}
                    className="p-2 rounded-lg text-gray-500 hover:bg-teal-50 hover:text-teal-700 transition"
                    title="수정"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
