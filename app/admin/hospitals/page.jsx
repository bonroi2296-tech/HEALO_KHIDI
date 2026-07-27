"use client";

import { useState, useEffect, useRef } from "react";
import { HospitalManager } from "./_client/HospitalManager";
import { HospitalAccountManager } from "./_client/HospitalAccountManager";
import { AdminGuideModal } from "../_components/AdminGuideModal";
import { AdminLoadingSkeleton } from "../_components/AdminLoadingSkeleton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { AddressInput } from "@/components/AddressInput";
import { X, UploadCloud, Loader2, Building2, Users } from "lucide-react";

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

// Helper: ImageUploader (파일 업로드 + URL 입력 + 대표 썸네일 선택)
const ImageUploader = ({ images, onUpload, onRemove, uploading, thumbnailImage, onThumbnailSelect }) => {
  const fileInputRef = useRef(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await onUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleUrlAdd = () => {
    const url = urlInput.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      onUpload(null, url);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} disabled={uploading} className="hidden" id="file-upload-input" />
          <label onClick={() => fileInputRef.current.click()} className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 cursor-pointer hover:bg-gray-50 hover:border-teal-500 transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploading ? <Loader2 size={18} className="animate-spin"/> : <UploadCloud size={18}/>}
            {uploading ? "업로드 중..." : "파일 업로드 (JPG, PNG)"}
          </label>
        </div>
        <button type="button" onClick={() => setShowUrlInput(!showUrlInput)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 whitespace-nowrap">
          URL 추가
        </button>
      </div>
      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlAdd())}
            placeholder="https://example.com/image.jpg"
            className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <button type="button" onClick={handleUrlAdd} className="px-3 py-2 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800">추가</button>
        </div>
      )}
      {images.length > 0 && (
        <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1 max-w-[200px]' : images.length === 2 ? 'grid-cols-2 max-w-[320px]' : images.length <= 4 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-4 sm:grid-cols-5'}`}>
          {images.map((url, idx) => {
            const isThumbnail = thumbnailImage === url;
            return (
              <div key={idx} className={`relative group aspect-square rounded-lg overflow-hidden border-2 bg-gray-100 cursor-pointer ${isThumbnail ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200'}`} onClick={() => onThumbnailSelect?.(url)} title={url}>
                <img src={url} alt="upload" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {isThumbnail && (
                  <div className="absolute top-0.5 left-0.5 bg-teal-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">대표</div>
                )}
                <button onClick={(e) => { e.stopPropagation(); onRemove(idx); }} className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm">
                  <X size={10} />
                </button>
                {!isThumbnail && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition">클릭: 대표로 설정</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  {url.length > 60 ? url.slice(0, 30) + '...' + url.slice(-25) : url}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {thumbnailImage && !images.includes(thumbnailImage) && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
          현재 대표 이미지: <span className="text-teal-700 font-mono truncate inline-block max-w-[300px] align-bottom">{thumbnailImage}</span>
        </div>
      )}
    </div>
  );
};

export default function HospitalsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [hospitalsError, setHospitalsError] = useState(null);
  const [activeTab, setActiveTab] = useState("hospitals"); // "hospitals" | "accounts"
  const [showGuide, setShowGuide] = useState(false);
  const [editingHospitalId, setEditingHospitalId] = useState(null);
  const emptyHospitalForm = { 
    name: '', location_kr: '', location_en: '', address_detail: '', description: '', 
    latitude: null, longitude: null,
    tags: [], images: [], thumbnailImage: '', galleryImages: [],
    languages: [], amenities: [], specialties: [], medicalEquipment: [],
    hoursMonFri: '', hoursSat: '', hoursSun: '',
    doctorName: '', doctorTitle: '', doctorImage: '', 
    doctorSchool: '', doctorYears: '', doctorSpecialties: [], 
    doctorMetricValue: '99%', doctorMetricLabel: '만족도',
    certifications: [],
    insuranceAccepted: false, insuranceTypes: [],
    annualSurgeryCount: '', establishmentDate: '', doctorCount: '',
    externalNaverRating: '', externalNaverCount: '',
    externalKakaoRating: '', externalKakaoCount: '',
    _existingExternalRatings: {},
    googleReviews: [],
    displayOrder: null,
    isPublished: true,
    isPartner: false,
    faq: [],
    i18n: {}
  };
  const [hospitalForm, setHospitalForm] = useState(emptyHospitalForm);
  const [offersFailureLogEnabled, setOffersFailureLogEnabled] = useState(null); // null=미확인, true/false
  const [hospitalsListLoading, setHospitalsListLoading] = useState(true); // 목록 최초 로딩

  // ✅ 시술 실패 로그용 DB 컬럼 존재 여부 (마이그레이션 미적용 시 안내용)
  const fetchOffersSchemaCheck = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/hospitals/offers-schema", {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok) setOffersFailureLogEnabled(!!data.offersFailureLogEnabled);
    } catch {
      setOffersFailureLogEnabled(false);
    }
  };

  // ✅ Admin API를 통한 병원 목록 조회
  const fetchHospitals = async () => {
    setHospitalsListLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.error('[Hospitals] No access token');
        setHospitalsError({ message: 'No access token' });
        setHospitalsList([]);
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
        console.log('[Hospitals] ✅ Loaded:', result.hospitals?.length || 0);
        setHospitalsError(null);
        setHospitalsList(result.hospitals || []);
      } else {
        console.error('[Hospitals] ❌ API failed:', result.error);
        setHospitalsError({ message: result.error });
        setHospitalsList([]);
      }
    } catch (error) {
      console.error('[Hospitals] ❌ Fetch exception:', error);
      setHospitalsError(error);
      setHospitalsList([]);
    } finally {
      setHospitalsListLoading(false);
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
        console.log('[Hospitals] ✅ Image uploaded:', result.fileName);
        return result.url;
      } else {
        console.error('[Hospitals] Upload error:', result.error);
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

  const handleEditHospital = (h) => {
    setEditingHospitalId(h.id);
    const doc = h.doctor_profile || {};
    const rawImages = Array.isArray(h.images) ? h.images : (h.images ? [h.images] : []);
    const galleryArr = Array.isArray(h.gallery_images) ? h.gallery_images : [];
    const allImgs = [h.thumbnail_image, ...rawImages, ...galleryArr].filter(Boolean);
    const imagesArray = [...new Set(allImgs)];
    console.log("[handleEditHospital]", h.name, "images:", imagesArray.length, "gallery:", galleryArr.length, "website:", h.website);
    const ext = h.external_ratings || {};
    const ins = h.insurance_details || {};
    setHospitalForm({
      name: h.name || '',
      location_kr: h.location_kr || '',
      location_en: h.location_en || '',
      address_detail: h.address_detail || '',
      website: h.website || '',
      description: h.description || '',
      latitude: h.latitude,
      longitude: h.longitude,
      tags: h.tags || [],
      images: imagesArray,
      thumbnailImage: h.thumbnail_image || '',
      galleryImages: Array.isArray(h.gallery_images) ? h.gallery_images : [],
      languages: h.supported_languages || [],
      amenities: h.amenities || [],
      specialties: h.specialties || [],
      medicalEquipment: h.medical_equipment || [],
      hoursMonFri: h.operating_hours?.mon_fri || '',
      hoursSat: h.operating_hours?.sat || '',
      hoursSun: h.operating_hours?.sun || '',
      doctorName: doc.name || '',
      doctorTitle: doc.title || '',
      doctorImage: doc.image || '',
      doctorSchool: doc.school || '',
      doctorYears: doc.years || '',
      doctorSpecialties: doc.specialties || [],
      doctorMetricValue: doc.heroMetric?.value || '99%',
      doctorMetricLabel: doc.heroMetric?.label || '만족도',
      certifications: Array.isArray(h.certifications) ? h.certifications : [],
      insuranceAccepted: h.insurance_accepted || false,
      insuranceTypes: ins.types || [],
      annualSurgeryCount: h.annual_surgery_count || '',
      establishmentDate: h.establishment_date || '',
      doctorCount: h.doctor_count || '',
      externalNaverRating: ext.naver?.rating || '',
      externalNaverCount: ext.naver?.count || '',
      externalKakaoRating: ext.kakao?.rating || '',
      externalKakaoCount: ext.kakao?.count || '',
      _existingExternalRatings: h.external_ratings || {},
      googleReviews: Array.isArray(ext.google_reviews) ? ext.google_reviews : [],
      displayOrder: h.display_order,
      isPublished: h.is_published !== undefined ? h.is_published : true,
      isPartner: h.is_partner ?? false,
      faq: Array.isArray(h.faq) ? h.faq : [],
      i18n: h.i18n || {},
      _enrichmentLog: h.enrichment_log || {},
      offers_auto_failed_at: h.offers_auto_failed_at || null,
      offers_auto_fail_reason: h.offers_auto_fail_reason || null,
      offers_auto_skip: h.offers_auto_skip ?? false,
    });
  };

  // ✅ Admin API를 통한 병원 저장 (생성/수정)
  const handleSaveHospital = async () => {
    if (!hospitalForm.name) return toast.error("병원명은 필수입니다.");
    setLoading(true);
    
    const imagesRaw = Array.isArray(hospitalForm.images) ? hospitalForm.images : (hospitalForm.images ? [hospitalForm.images] : []);
    const imagesArray = [...new Set(imagesRaw.filter(Boolean))];
    const selectedThumbnail = hospitalForm.thumbnailImage || imagesArray[0] || null;
    const galleryForSave = imagesArray.filter(url => url !== selectedThumbnail);
    
    const externalRatings = {};
    if (hospitalForm.externalNaverRating || hospitalForm.externalNaverCount) {
      externalRatings.naver = { rating: Number(hospitalForm.externalNaverRating) || 0, count: Number(hospitalForm.externalNaverCount) || 0 };
    }
    if (hospitalForm.externalKakaoRating || hospitalForm.externalKakaoCount) {
      externalRatings.kakao = { rating: Number(hospitalForm.externalKakaoRating) || 0, count: Number(hospitalForm.externalKakaoCount) || 0 };
    }

    const payload = {
      name: hospitalForm.name, 
      location_kr: hospitalForm.location_kr?.trim() || null,
      location_en: hospitalForm.location_en?.trim() || null,
      address_detail: hospitalForm.address_detail?.trim() || null,
      website: hospitalForm.website?.trim() || null,
      description: hospitalForm.description, 
      latitude: hospitalForm.latitude, 
      longitude: hospitalForm.longitude,
      tags: hospitalForm.tags, 
      images: imagesArray,
      thumbnail_image: selectedThumbnail,
      gallery_images: galleryForSave,
      supported_languages: hospitalForm.languages, 
      amenities: hospitalForm.amenities,
      specialties: hospitalForm.specialties,
      medical_equipment: hospitalForm.medicalEquipment,
      operating_hours: hospitalForm.hoursMonFri
        ? { mon_fri: hospitalForm.hoursMonFri, sat: hospitalForm.hoursSat || null, sun: hospitalForm.hoursSun || null }
        : null,
      doctor_profile: hospitalForm.doctorName
        ? { 
            name: hospitalForm.doctorName, 
            title: hospitalForm.doctorTitle, 
            image: hospitalForm.doctorImage, 
            school: hospitalForm.doctorSchool, 
            years: hospitalForm.doctorYears, 
            specialties: hospitalForm.doctorSpecialties, 
            heroMetric: { value: hospitalForm.doctorMetricValue, label: hospitalForm.doctorMetricLabel } 
          }
        : null,
      certifications: hospitalForm.certifications,
      insurance_accepted: hospitalForm.insuranceAccepted,
      insurance_details: hospitalForm.insuranceTypes.length > 0 ? { types: hospitalForm.insuranceTypes } : null,
      annual_surgery_count: hospitalForm.annualSurgeryCount ? Number(hospitalForm.annualSurgeryCount) : null,
      establishment_date: hospitalForm.establishmentDate || null,
      doctor_count: hospitalForm.doctorCount ? Number(hospitalForm.doctorCount) : null,
      external_ratings: {
        ...(hospitalForm._existingExternalRatings || {}),
        ...externalRatings,
        google_reviews: hospitalForm.googleReviews || [],
      },
      display_order: hospitalForm.displayOrder ? Number(hospitalForm.displayOrder) : null,
      is_published: hospitalForm.isPublished !== undefined ? hospitalForm.isPublished : true,
      is_partner: hospitalForm.isPartner ?? false,
      faq: (hospitalForm.faq || []).filter(item => item && (item.question?.trim() || item.answer?.trim())),
      i18n: hospitalForm.i18n || {}
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error("세션이 만료되었습니다. 다시 로그인하세요.");
        return;
      }

      // ✅ CREATE vs UPDATE
      const url = editingHospitalId 
        ? `/api/admin/hospitals?id=${editingHospitalId}` 
        : '/api/admin/hospitals';
      const method = editingHospitalId ? 'PATCH' : 'POST';

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
        toast.success("병원 정보가 저장되었습니다! 🏥");
        setEditingHospitalId(null); 
        await fetchHospitals();
        setHospitalForm(emptyHospitalForm);
      } else {
        console.error('[Hospitals] Save error:', result.error, result.detail, result.errors);
        toast.error("저장 실패: " + (result.detail || result.error));
      }
    } catch (err) { 
      console.error('[Hospitals] Save exception:', err);
      toast.error("저장 실패");
    } finally { 
      setLoading(false); 
    }
  };

  // ✅ 시술 자동생성 실패/건너뛰기 플래그만 PATCH (다시 시도·건너뛰기 체크 시)
  const patchHospitalOffersFlags = async (body) => {
    if (!editingHospitalId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("세션이 만료되었습니다.");
        return;
      }
      const response = await fetch(`/api/admin/hospitals?id=${editingHospitalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.ok) {
        await fetchHospitals();
        if (body.offers_auto_skip !== undefined)
          setHospitalForm((prev) => ({ ...prev, offers_auto_skip: body.offers_auto_skip }));
        if (body.offers_auto_failed_at !== undefined)
          setHospitalForm((prev) => ({ ...prev, offers_auto_failed_at: body.offers_auto_failed_at }));
        if (body.offers_auto_fail_reason !== undefined)
          setHospitalForm((prev) => ({ ...prev, offers_auto_fail_reason: body.offers_auto_fail_reason }));
      } else {
        toast.error("반영 실패: " + (result.detail || result.error));
      }
    } catch (err) {
      console.error("[Hospitals] patchOffersFlags exception:", err);
      toast.error("반영 실패");
    }
  };

  // ✅ Admin API를 통한 병원 삭제
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
        console.error(`[Hospitals] Delete error:`, result.error);
        toast.error("삭제 실패: " + (result.detail || result.error));
      }
    } catch (err) {
      console.error(`[Hospitals] Delete exception:`, err);
      toast.error("삭제 실패");
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (activeTab === "hospitals") fetchOffersSchemaCheck();
  }, [activeTab]);

  return (
    <div className="space-y-4">
      {showGuide && (
        <AdminGuideModal title="병원관리 · 사용 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>healwith에 등록된 <strong>병원 정보</strong>를 관리하고, 각 병원에 <strong>담당자(계정)</strong>를 붙여 Hospital Portal(파트너 페이지) 접근 권한을 부여하는 곳입니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">탭 1: 병원 관리</h3>
            <p>병원 목록 조회, 신규 등록, 수정, 삭제를 합니다. 병원명·주소·진료시간·의료진·이미지·태그·공개 여부(is_published) 등을 편집할 수 있습니다. 공개된 병원만 사용자에게 노출됩니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">탭 2: 계정 관리 (병원 담당자)</h3>
            <p>병원을 선택한 뒤, 그 병원의 <strong>담당자(이메일)</strong>를 등록합니다. 등록된 담당자는 해당 병원으로 로그인해 Hospital Portal에서 리드 확인·시술 관리 등을 할 수 있습니다. 역할(소유자/관리자/조회자)로 권한을 나눌 수 있습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li><strong>소유자</strong>: 해당 병원에 대한 최고 권한</li>
              <li><strong>관리자</strong>: 편집·담당자 추가 등</li>
              <li><strong>조회자</strong>: 조회만 가능</li>
            </ul>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">권장 순서</h3>
            <p className="text-teal-700 text-sm">1) 병원 관리에서 병원을 등록/편집하고 공개 처리 → 2) 계정 관리에서 해당 병원을 선택해 담당자 이메일을 추가합니다. 담당자는 동일 이메일로 회원가입되어 있어야 합니다.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("hospitals")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            activeTab === "hospitals" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-700"
          }`}
        >
          <Building2 size={16} />
          병원 관리
        </button>
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
            activeTab === "accounts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-700"
          }`}
        >
          <Users size={16} />
          계정 관리
        </button>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>

      {activeTab === "hospitals" ? (
        <HospitalManager
          hospitalsList={hospitalsList}
          hospitalsListLoading={hospitalsListLoading}
          hospitalsError={hospitalsError}
          handleEditHospital={handleEditHospital}
          editingHospitalId={editingHospitalId}
          setEditingHospitalId={setEditingHospitalId}
          hospitalForm={hospitalForm}
          setHospitalForm={setHospitalForm}
          uploading={uploading}
          loading={loading}
          handleSaveHospital={handleSaveHospital}
          handleDelete={handleDelete}
          fetchHospitals={fetchHospitals}
          patchHospitalOffersFlags={patchHospitalOffersFlags}
          offersFailureLogEnabled={offersFailureLogEnabled}
          uploadToSupabase={uploadToSupabase}
          DynamicListInput={DynamicListInput}
          ImageUploader={ImageUploader}
          AddressInput={AddressInput}
          toast={toast}
        />
      ) : (
        <HospitalAccountManager hospitals={hospitalsList} />
      )}
    </div>
  );
}
