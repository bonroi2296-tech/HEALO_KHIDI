"use client";

import { useState, useEffect, useRef } from "react";
import { TreatmentManager } from "./_client/TreatmentManager";
import { AdminGuideModal } from "../_components/AdminGuideModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { X, UploadCloud, Loader2 } from "lucide-react";

// ✅ Supabase는 이미지 업로드와 세션 확인용으로만 사용
const supabase = createSupabaseBrowserClient();

// Helper: DynamicListInput
const DynamicListInput = ({ items, onAdd, onRemove, placeholder, icon: Icon }) => {
  const [newItem, setNewItem] = useState('');
  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          {Icon && <Icon size={16} className="absolute left-3 top-3 text-gray-500"/>}
          <input 
            type="text" 
            value={newItem} 
            onChange={(e) => setNewItem(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())} 
            className={`w-full p-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition ${Icon ? 'pl-10' : ''}`} 
            placeholder={placeholder} 
          />
        </div>
        <button type="button" onClick={handleAdd} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-lg font-bold text-sm transition">추가</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span key={idx} className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 border border-teal-100">
            {item} <button type="button" onClick={() => onRemove(idx)} className="hover:text-red-600"><X size={12}/></button>
          </span>
        ))}
      </div>
    </div>
  );
};

// Helper: ImageUploader
const ImageUploader = ({ images, onUpload, onRemove, uploading }) => {
  const fileInputRef = useRef(null);
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await onUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} disabled={uploading} className="hidden" id="file-upload-input" />
          <label onClick={() => fileInputRef.current.click()} className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-teal-500 transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploading ? <Loader2 size={18} className="animate-spin"/> : <UploadCloud size={18}/>}
            {uploading ? "업로드 중..." : "클릭하여 이미지 업로드 (JPG, PNG)"}
          </label>
        </div>
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {images.map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
              <img src={url} alt="upload" className="w-full h-full object-cover" />
              <button onClick={() => onRemove(idx)} className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TreatmentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [treatmentCounts, setTreatmentCounts] = useState({});
  const [treatmentsList, setTreatmentsList] = useState([]);
  const [treatmentsError, setTreatmentsError] = useState(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [editingTreatmentId, setEditingTreatmentId] = useState(null);
  // ponytail: 옛 미용시술 카탈로그 시절 필드(회복기간 min/max·부작용·마취·보험 등)는
  // 입력칸도 없이 payload 에만 남아 실DB 에 없는 컬럼으로 저장을 통째로 깨뜨리고 있었다.
  // 여기 있는 값 = 실제 `treatments` 컬럼만. (POSTMORTEMS #97 부류)
  const emptyTreatmentForm = {
    title: '', desc: '', fullDescription: '',
    priceMin: '', priceMax: '',
    duration: '', recoveryTime: '', preparation: '', risks: '',
    benefits: [], tags: [], images: [],
    displayOrder: null, isPublished: true,
    i18n: {}
  };
  const [treatmentForm, setTreatmentForm] = useState(emptyTreatmentForm);

  // ✅ Admin API를 통한 병원 목록 조회
  const fetchHospitals = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.error('[Treatments] No access token');
        return;
      }

      const response = await fetch('/api/admin/hospitals', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.ok) {
        // Sort: hospitals with treatments first
        const hospitals = result.hospitals || [];
        setHospitalsList(hospitals);

        // Fetch treatment counts per hospital
        try {
          const countRes = await fetch('/api/admin/treatments?counts_only=true', {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
          });
          const countData = await countRes.json();
          if (countData.ok && countData.counts) {
            setTreatmentCounts(countData.counts);
          }
        } catch {}
      }
    } catch (error) {
      console.error('[Treatments] ❌ Fetch hospitals exception:', error);
    }
  };

  // ✅ Admin API를 통한 시술 목록 조회
  const fetchTreatments = async (hId) => {
    if (!hId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.error('[Treatments] No access token');
        setTreatmentsError({ message: 'No access token' });
        setTreatmentsList([]);
        return;
      }

      const response = await fetch(`/api/admin/treatments?hospital_id=${hId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.ok) {
        console.log('[Treatments] ✅ Loaded:', result.treatments?.length || 0);
        setTreatmentsError(null);
        setTreatmentsList(result.treatments || []);
      } else {
        console.error('[Treatments] ❌ API failed:', result.error);
        setTreatmentsError({ message: result.error });
        setTreatmentsList([]);
      }
    } catch (error) {
      console.error('[Treatments] ❌ Fetch exception:', error);
      setTreatmentsError(error);
      setTreatmentsList([]);
    }
  };

  // ✅ Admin API를 통한 이미지 업로드 (브라우저에서 직접 Storage 접근 차단)
  const uploadToSupabase = async (file) => {
    if (!file) return null;
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error("세션이 만료되었습니다.");
        return null;
      }

      // FormData 생성
      const formData = new FormData();
      formData.append('file', file);

      // Admin API 호출
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();

      if (result.ok) {
        console.log('[Treatments] ✅ Image uploaded:', result.fileName);
        return result.url;
      } else {
        console.error('[Treatments] Upload error:', result.error);
        toast.error('이미지 업로드 실패: ' + (result.detail || result.error));
        return null;
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('이미지 업로드 실패');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleEditTreatment = (t) => {
    setEditingTreatmentId(t.id);
    const imagesArray = Array.isArray(t.images) ? t.images : (t.images ? [t.images] : []);
    setTreatmentForm({
      title: t.name || '',
      desc: t.description || '',
      fullDescription: t.full_description || '',
      priceMin: t.price_min || '',
      priceMax: t.price_max || '',
      duration: t.duration || '',
      recoveryTime: t.recovery_time || '',
      preparation: t.preparation || '',
      risks: t.risks || '',
      benefits: t.benefits || [],
      tags: t.tags || [],
      images: imagesArray,
      displayOrder: t.display_order,
      isPublished: t.is_published !== undefined ? t.is_published : true,
      i18n: t.i18n || {}
    });
  };

  // ✅ Admin API를 통한 시술 저장 (생성/수정)
  const handleSaveTreatment = async () => {
    if (!selectedHospitalId || !treatmentForm.title) return toast.error("병원 선택과 시술명은 필수입니다.");
    setLoading(true);
    
    const imagesArray = Array.isArray(treatmentForm.images) ? treatmentForm.images : (treatmentForm.images ? [treatmentForm.images] : []);
    
    // ✅ slug는 서버에서 자동 생성 (UPDATE시 기존 slug 유지)
    const payload = { 
      hospital_id: selectedHospitalId, 
      name: treatmentForm.title, 
      description: treatmentForm.desc, 
      full_description: treatmentForm.fullDescription, 
      price_min: Number(treatmentForm.priceMin) || 0,
      price_max: treatmentForm.priceMax ? Number(treatmentForm.priceMax) : null,
      duration: treatmentForm.duration || null,
      recovery_time: treatmentForm.recoveryTime || null,
      preparation: treatmentForm.preparation || null,
      risks: treatmentForm.risks || null,
      benefits: treatmentForm.benefits,
      tags: treatmentForm.tags,
      images: imagesArray,
      display_order: treatmentForm.displayOrder ? Number(treatmentForm.displayOrder) : null,
      is_published: treatmentForm.isPublished !== undefined ? treatmentForm.isPublished : true,
      i18n: treatmentForm.i18n || {}
    };
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error("세션이 만료되었습니다. 다시 로그인하세요.");
        return;
      }

      // ✅ CREATE vs UPDATE
      const url = editingTreatmentId 
        ? `/api/admin/treatments?id=${editingTreatmentId}` 
        : '/api/admin/treatments';
      const method = editingTreatmentId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.ok) {
        toast.success("시술 정보가 저장되었습니다! 💉");
        setEditingTreatmentId(null); 
        await fetchTreatments(selectedHospitalId);
        setTreatmentForm(emptyTreatmentForm); 
      } else {
        console.error('[Treatments] Save error:', result.error);
        toast.error("저장 실패: " + (result.detail || result.error));
      }
    } catch (err) { 
      console.error('[Treatments] Save exception:', err);
      toast.error("저장 실패");
    } finally { 
      setLoading(false); 
    }
  };

  // ✅ Admin API를 통한 시술 삭제
  const handleDelete = async (table, id, cb) => {
    if (!confirm("정말 삭제하시겠습니까? 복구할 수 없습니다.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error("세션이 만료되었습니다.");
        return;
      }

      const response = await fetch(`/api/admin/${table}?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const result = await response.json();

      if (result.ok) {
        toast.success("삭제되었습니다.");
        if (cb) cb();
      } else {
        console.error(`[Treatments] Delete error:`, result.error);
        toast.error("삭제 실패: " + (result.detail || result.error));
      }
    } catch (err) {
      console.error(`[Treatments] Delete exception:`, err);
      toast.error("삭제 실패");
    }
  };

  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchHospitals();
  }, []);

  return (
    <div className="space-y-4">
      {showGuide && (
        <AdminGuideModal title="시술관리 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>병원별 <strong>시술(트리트먼트) 카탈로그</strong>를 등록·수정·삭제합니다. 가격, 소요 시간, 부작용, 이미지 등 상세 정보를 넣으면 사용자에게 노출됩니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <p>먼저 병원을 선택한 뒤, 해당 병원의 시술 목록에서 신규 등록 또는 수정합니다. 시술명·설명·가격·이미지·태그·공개 여부 등을 편집할 수 있습니다.</p>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">권장</h3>
            <p className="text-teal-700 text-sm">병원관리에서 병원을 먼저 등록한 후, 여기서 해당 병원의 시술을 추가하세요.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>
      <TreatmentManager
      hospitalsList={hospitalsList}
      treatmentCounts={treatmentCounts}
      selectedHospitalId={selectedHospitalId}
      setSelectedHospitalId={setSelectedHospitalId}
      fetchTreatments={fetchTreatments}
      treatmentsList={treatmentsList}
      treatmentsError={treatmentsError}
      editingTreatmentId={editingTreatmentId}
      setEditingTreatmentId={setEditingTreatmentId}
      treatmentForm={treatmentForm}
      setTreatmentForm={setTreatmentForm}
      handleEditTreatment={handleEditTreatment}
      handleSaveTreatment={handleSaveTreatment}
      handleDelete={handleDelete}
      loading={loading}
      uploadToSupabase={uploadToSupabase}
      uploading={uploading}
      DynamicListInput={DynamicListInput}
      ImageUploader={ImageUploader}
    />
    </div>
  );
}
