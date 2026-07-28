"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { redirect } from "next/navigation";
import { Building2, Save, Plus, X, ImageIcon, Globe, Clock, User, Stethoscope, Activity, Shield, UploadCloud, Loader2, Trophy, HelpCircle } from "lucide-react";
import { HOSPITAL_CONTENT_ENABLED } from "../_components/featureFlags";

export default function HospitalProfilePage() {
  // 공개 프론트 미연동 → 비활성. 메뉴에서 숨겼지만 직접 URL 접근도 차단.
  if (!HOSPITAL_CONTENT_ENABLED) redirect("/hospital");
  return <ProfileEditor />;
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
          <span key={i} className={`inline-flex items-center gap-1 ${colorClass} px-3 py-1 rounded-full text-xs font-medium`}>
            {item}
            <button onClick={() => onRemove(i)} className="hover:opacity-70"><X size={12}/></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),add())} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder={placeholder}/>
        <button onClick={add} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"><Plus size={16}/></button>
      </div>
    </div>
  );
}

function ProfileEditor() {
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const doctorFileRef = useRef(null);

  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [tags, setTags] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [medicalEquipment, setMedicalEquipment] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [operatingHours, setOperatingHours] = useState({ mon_fri: "", sat: "" });
  const [doctorProfile, setDoctorProfile] = useState({ name: "", title: "", image: "", school: "", years: "", specialties: [], heroMetric: { value: "99%", label: "만족도" } });
  const [galleryImages, setGalleryImages] = useState([]);
  const [faq, setFaq] = useState([]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/partner/profile");
      const data = await res.json();
      if (data.ok) {
        const h = data.hospital;
        setHospital(h);
        setDescription(h.description || "");
        setWebsite(h.website || "");
        setTags(h.tags || []);
        setAmenities(h.amenities || []);
        setLanguages(h.supported_languages || []);
        setSpecialties(h.specialties || []);
        setMedicalEquipment(h.medical_equipment || []);
        setCertifications(Array.isArray(h.certifications) ? h.certifications : []);
        setOperatingHours(h.operating_hours || { mon_fri: "", sat: "" });
        setFaq(Array.isArray(h.faq) ? h.faq : []);
        const legacyImages = Array.isArray(h.images) ? h.images : [];
        const newGallery = Array.isArray(h.gallery_images) ? h.gallery_images : [];
        const merged = [...new Set([...legacyImages, ...newGallery])];
        setGalleryImages(merged);
        const doc = h.doctor_profile || {};
        setDoctorProfile({
          name: doc.name || "", title: doc.title || "", image: doc.image || "",
          school: doc.school || "", years: doc.years || "",
          specialties: doc.specialties || [],
          heroMetric: doc.heroMetric || { value: "99%", label: "만족도" },
        });
      }
    } catch (err) {
      console.error("[Profile] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth("/api/partner/profile", {
        method: "PATCH",
        body: JSON.stringify({
          description,
          website,
          tags,
          amenities,
          supported_languages: languages,
          specialties,
          medical_equipment: medicalEquipment,
          certifications,
          operating_hours: operatingHours,
          images: galleryImages,
          gallery_images: galleryImages,
          doctor_profile: doctorProfile,
          faq,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setHospital(data.hospital);
        showToast("프로필이 저장되었습니다");
      } else {
        showToast("저장 실패: " + (data.error || "알 수 없는 오류"), "error");
      }
    } catch {
      showToast("저장 중 오류가 발생했습니다", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="text-center py-20 text-gray-500">
        <Building2 size={48} className="mx-auto mb-3 opacity-50" />
        <p>병원 정보를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-16 lg:top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-500 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Page header */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:top-0 z-10 bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-4 border-b border-gray-200/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg lg:text-2xl font-extrabold text-gray-900">병원 정보</h1>
            <p className="text-xs text-gray-500 mt-0.5">병원 프로필을 수정하세요</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-teal-800 transition flex items-center gap-2 disabled:opacity-50 text-sm shadow-sm">
            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 lg:p-8 space-y-5 mb-6">
        {/* Read-only info */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500">기본 정보 (수정 불가)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div><span className="text-gray-500">병원명:</span> <span className="text-gray-900 font-medium">{hospital.name}</span></div>
            <div><span className="text-gray-500">슬러그:</span> <span className="text-gray-900">{hospital.slug}</span></div>
            {hospital.location_kr && <div><span className="text-gray-500">주소:</span> <span className="text-gray-900">{hospital.location_kr}</span></div>}
            <div><span className="text-gray-500">공개 상태:</span> <span className={hospital.is_published ? "text-green-700 font-medium" : "text-gray-500"}>{hospital.is_published ? "공개" : "비공개"}</span></div>
          </div>
        </div>

        {/* Website */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500">웹사이트</h3>
          <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="https://..."/>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500">병원 소개</h3>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full p-2 border rounded text-sm" placeholder="병원에 대한 설명을 입력하세요..."/>
        </div>

        {/* Gallery Images */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-500">병원 갤러리 이미지</label>
          <p className="text-xs text-teal-700 bg-teal-50 p-2 rounded-lg flex items-center gap-2"><ImageIcon size={14}/> 권장: 800x800px (1:1 비율)</p>
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {galleryImages.map((url, idx) => (
                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img src={url} alt="gallery" className="w-full h-full object-cover"/>
                  <button onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))} className="absolute top-0.5 right-0.5 bg-red-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm"><X size={10}/></button>
                </div>
              ))}
            </div>
          )}
          <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={async(e) => { const url = await uploadImage(e.target.files[0]); if (url) setGalleryImages(prev => [...prev, url]); if (fileInputRef.current) fileInputRef.current.value = ""; }}/>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 hover:border-teal-500 transition cursor-pointer disabled:opacity-50">
            {uploading ? <Loader2 size={18} className="animate-spin"/> : <UploadCloud size={18}/>}
            {uploading ? "업로드 중..." : "이미지 업로드"}
          </button>
        </div>
        {/* Tags & Specialties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <div>
            <h3 className="text-sm font-bold text-teal-700 mb-2 flex items-center gap-1"><Globe size={14}/> 지원 언어</h3>
            <TagListEditor items={languages} onAdd={t => setLanguages([...languages, t])} onRemove={i => setLanguages(languages.filter((_, x) => x !== i))} placeholder="예: Korean, English" colorClass="bg-purple-50 text-purple-700"/>
          </div>
          <div>
            <h3 className="text-sm font-bold text-teal-700 mb-2 flex items-center gap-1"><Activity size={14}/> 편의시설</h3>
            <TagListEditor items={amenities} onAdd={t => setAmenities([...amenities, t])} onRemove={i => setAmenities(amenities.filter((_, x) => x !== i))} placeholder="예: 와이파이, 픽업" colorClass="bg-green-50 text-green-700"/>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500">이미지 및 태그</h3>
          <TagListEditor items={tags} onAdd={t => setTags([...tags, t])} onRemove={i => setTags(tags.filter((_, x) => x !== i))} placeholder="태그 입력 (예: 피부과)"/>
        </div>

        {/* Doctor Profile */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><User size={16}/> 대표 원장 프로필</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="이름 (영문/한글)" value={doctorProfile.name || ""} onChange={e => setDoctorProfile({ ...doctorProfile, name: e.target.value })} className="border p-2 rounded text-sm"/>
            <input placeholder="직함 (예: 대표원장)" value={doctorProfile.title || ""} onChange={e => setDoctorProfile({ ...doctorProfile, title: e.target.value })} className="border p-2 rounded text-sm"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="출신 학교 (예: 서울대)" value={doctorProfile.school || ""} onChange={e => setDoctorProfile({ ...doctorProfile, school: e.target.value })} className="border p-2 rounded text-sm"/>
            <input placeholder="경력 (예: 15년 이상)" value={doctorProfile.years || ""} onChange={e => setDoctorProfile({ ...doctorProfile, years: e.target.value })} className="border p-2 rounded text-sm"/>
          </div>
          <TagListEditor items={doctorProfile.specialties || []} onAdd={t => setDoctorProfile({ ...doctorProfile, specialties: [...(doctorProfile.specialties || []), t] })} onRemove={i => setDoctorProfile({ ...doctorProfile, specialties: (doctorProfile.specialties || []).filter((_, x) => x !== i) })} placeholder="전문 분야 (예: 코성형)" colorClass="bg-yellow-50 text-yellow-700"/>
          <div className="mt-2">
            <label className="text-xs text-gray-500 font-bold mb-1 block">원장님 프로필 사진</label>
            <p className="text-[10px] text-teal-700 mb-2">1:1 정방형 (400x400px) 필수</p>
            <div className="flex gap-2 items-center">
              {doctorProfile.image ? (
                <div className="relative group w-16 h-16 rounded-full overflow-hidden border">
                  <img src={doctorProfile.image} alt="doc" className="w-full h-full object-cover"/>
                  <button onClick={() => setDoctorProfile({ ...doctorProfile, image: "" })} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X size={16}/></button>
                </div>
              ) : (
                <div>
                  <input type="file" accept="image/*" ref={doctorFileRef} className="hidden" onChange={async(e) => { const url = await uploadImage(e.target.files[0]); if (url) setDoctorProfile(prev => ({ ...prev, image: url })); if (doctorFileRef.current) doctorFileRef.current.value = ""; }}/>
                  <button onClick={() => doctorFileRef.current?.click()} disabled={uploading} className="w-16 h-16 rounded-full border border-dashed flex items-center justify-center text-gray-500 cursor-pointer hover:bg-white hover:border-teal-500">
                    {uploading ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-teal-700 flex items-center gap-1"><Clock size={14}/> 운영 시간</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">평일</label>
              <input placeholder="09:00 - 18:00" value={operatingHours.mon_fri || ""} onChange={e => setOperatingHours({ ...operatingHours, mon_fri: e.target.value })} className="w-full border p-2 rounded text-sm"/>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">토요일</label>
              <input placeholder="09:00 - 13:00" value={operatingHours.sat || ""} onChange={e => setOperatingHours({ ...operatingHours, sat: e.target.value })} className="w-full border p-2 rounded text-sm"/>
            </div>
          </div>
        </div>

        {/* Specialties & Equipment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <div>
            <h3 className="text-sm font-bold text-teal-700 mb-2 flex items-center gap-1"><Stethoscope size={14}/> 진료과목</h3>
            <TagListEditor items={specialties} onAdd={t => setSpecialties([...specialties, t])} onRemove={i => setSpecialties(specialties.filter((_, x) => x !== i))} placeholder="예: 피부과, 성형외과" colorClass="bg-teal-50 text-teal-700"/>
          </div>
          <div>
            <h3 className="text-sm font-bold text-teal-700 mb-2 flex items-center gap-1"><Activity size={14}/> 의료 장비</h3>
            <TagListEditor items={medicalEquipment} onAdd={t => setMedicalEquipment([...medicalEquipment, t])} onRemove={i => setMedicalEquipment(medicalEquipment.filter((_, x) => x !== i))} placeholder="예: 3D CT, 레이저" colorClass="bg-orange-50 text-orange-700"/>
          </div>
        </div>

        {/* Certifications */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2"><Shield size={14}/> 인증 / 자격</h3>
          {certifications.map((cert, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white border rounded-lg p-2">
              <input placeholder="유형" value={cert.type || ""} onChange={e => { const c = [...certifications]; c[idx] = { ...c[idx], type: e.target.value }; setCertifications(c); }} className="flex-1 border p-1.5 rounded text-xs"/>
              <input placeholder="발급기관" value={cert.issuer || ""} onChange={e => { const c = [...certifications]; c[idx] = { ...c[idx], issuer: e.target.value }; setCertifications(c); }} className="flex-1 border p-1.5 rounded text-xs"/>
              <button onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X size={14}/></button>
            </div>
          ))}
          <button onClick={() => setCertifications([...certifications, { type: "", issuer: "" }])} className="text-teal-700 text-xs font-bold flex items-center gap-1 hover:underline">
            <Plus size={12}/> 인증 추가
          </button>
        </div>

        {/* FAQ */}
        <div className="space-y-3 bg-purple-50 p-4 rounded-xl border border-purple-100">
          <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2"><HelpCircle size={16}/> FAQ</h3>
          {faq.map((item, idx) => (
            <div key={idx} className="bg-white border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Q{idx + 1}</span>
                <button onClick={() => setFaq(faq.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X size={14}/></button>
              </div>
              <input placeholder="질문" value={item.question || ''} onChange={e => { const f = [...faq]; f[idx] = {...f[idx], question: e.target.value}; setFaq(f); }} className="w-full border p-2 rounded text-sm"/>
              <textarea placeholder="답변" rows="2" value={item.answer || ''} onChange={e => { const f = [...faq]; f[idx] = {...f[idx], answer: e.target.value}; setFaq(f); }} className="w-full border p-2 rounded text-sm"/>
            </div>
          ))}
          <button onClick={() => setFaq([...faq, {question: '', answer: ''}])} className="text-purple-600 text-xs font-bold flex items-center gap-1 hover:underline">
            <Plus size={12}/> FAQ 추가
          </button>
        </div>
      </div>

    </div>
  );
}
