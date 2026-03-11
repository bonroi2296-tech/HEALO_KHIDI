import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Save, Info, ChevronLeft, Shield, Activity, Clock, AlertTriangle, Image, DollarSign, X, ExternalLink } from 'lucide-react';
import { TranslationPanel } from '../../_shared/TranslationPanel';

export const TreatmentManager = ({
  hospitalsList,
  treatmentCounts = {},
  selectedHospitalId,
  setSelectedHospitalId,
  fetchTreatments,
  treatmentsList,
  treatmentsError,
  editingTreatmentId,
  setEditingTreatmentId,
  treatmentForm,
  setTreatmentForm,
  handleEditTreatment,
  handleSaveTreatment,
  handleDelete,
  loading,
  uploadToSupabase,
  uploading,
  DynamicListInput,
  ImageUploader,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [treatmentSources, setTreatmentSources] = useState([]);
  const [showEvidenceUrls, setShowEvidenceUrls] = useState(false);

  useEffect(() => {
    if (!editingTreatmentId) {
      setTreatmentSources([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/treatments/${editingTreatmentId}/sources`, { credentials: 'include' });
        const data = await res.json();
        if (!cancelled && data?.ok && Array.isArray(data.sources)) setTreatmentSources(data.sources);
        else if (!cancelled) setTreatmentSources([]);
      } catch {
        if (!cancelled) setTreatmentSources([]);
      }
    })();
    return () => { cancelled = true; };
  }, [editingTreatmentId]);

  const handleSelectTreatment = (t) => {
    handleEditTreatment(t);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingTreatmentId(null);
    setTreatmentForm({ 
      title: '', desc: '', fullDescription: '', priceMin: '', priceMax: '',
      recoveryTimeMin: '', recoveryTimeMax: '', sideEffects: [], sideEffectsDetail: '', precautions: [],
      anesthesiaType: '', surgeryDurationMin: '', surgeryDurationMax: '', requiredEquipment: [],
      insuranceCoverage: false, insuranceCoverageDetail: '', annualProcedureCount: '', successRate: '',
      benefits: [], tags: [], images: [], displayOrder: null, isPublished: true,
      beforeAfterImages: [], priceIncludes: [],
      i18n: {}
    });
    setShowForm(true);
  };

  const ListPanel = () => (
    <>
      <select
        className="w-full border p-2 rounded mb-4 text-sm"
        value={selectedHospitalId}
        onChange={e=>{setSelectedHospitalId(e.target.value); fetchTreatments(e.target.value);}}
      >
        <option value="">병원을 먼저 선택하세요</option>
        {hospitalsList
          .filter(h => treatmentCounts[h.id] > 0)
          .map(h=><option key={h.id} value={h.id}>{h.name} ({treatmentCounts[h.id]}건)</option>)}
      </select>
      {process.env.NODE_ENV !== "production" && treatmentsError && (
        <p className="text-xs text-red-500 mb-2">Treatments error: {treatmentsError.message}</p>
      )}
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold">시술 목록</h2>
        {selectedHospitalId && (
          <button onClick={handleNew} className="bg-teal-600 text-white p-1 lg:p-1 rounded flex items-center gap-1 text-sm">
            <Plus size={14}/>
            <span className="lg:hidden">추가</span>
          </button>
        )}
      </div>
      {treatmentsList.map(t=>(
        <div key={t.id} onClick={()=>handleSelectTreatment(t)} className={`p-3 border-b lg:border-b cursor-pointer hover:bg-gray-50 rounded-lg lg:rounded-none mb-1 lg:mb-0 border lg:border-0 ${editingTreatmentId===t.id?'bg-teal-50 border-teal-300 lg:border-l-4 lg:border-l-teal-500':'border-gray-200 lg:border-gray-100'}`}>
          <div className="font-bold text-sm">{t.name}</div>
          <div className="text-xs text-teal-600">${t.price_min}</div>
        </div>
      ))}
    </>
  );

  const FormPanel = () => (
    <>
      {!selectedHospitalId ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 lg:h-[calc(100vh-100px)] flex items-center justify-center">
          <div className="text-center text-gray-400">병원을 먼저 선택해주세요.</div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 lg:p-4 mb-4 rounded-t-2xl flex justify-between items-center shadow-sm">
            <h2 className="text-base lg:text-xl font-bold">{editingTreatmentId?'시술 정보 수정':'신규 시술 등록'}</h2>
            <div className="flex items-center gap-2 lg:gap-3">
              {editingTreatmentId && (
                <button 
                  onClick={()=>handleDelete('treatments', editingTreatmentId, ()=>fetchTreatments(selectedHospitalId))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={18}/>
                </button>
              )}
              <button 
                onClick={handleSaveTreatment} 
                disabled={loading}
                className="bg-teal-600 text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg font-bold shadow-md hover:bg-teal-700 transition flex items-center gap-2 disabled:opacity-50 text-sm lg:text-base"
              >
                {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-8 lg:h-[calc(100vh-180px)] overflow-y-auto">
            {treatmentSources.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-teal-50 border border-teal-200">
                <button
                  type="button"
                  onClick={() => setShowEvidenceUrls((v) => !v)}
                  className="text-xs font-bold text-teal-800 uppercase flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={12} /> 근거 보기 {showEvidenceUrls ? '접기' : '펼치기'}
                </button>
                {showEvidenceUrls && (
                  <ul className="mt-2 space-y-1">
                    {treatmentSources.flatMap((ts) => (ts.sources || []).map((s, i) => (
                      <li key={`${ts.id}-${i}`}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-teal-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={10} />
                          {s.title || s.url}
                        </a>
                      </li>
                    ))).slice(0, 2)}
                  </ul>
                )}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400">기본 정보</h3>
                <input placeholder="시술명 (영어/한글)" value={treatmentForm.title} onChange={e=>setTreatmentForm({...treatmentForm, title: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="number" placeholder="최소 가격 ($)" value={treatmentForm.priceMin} onChange={e=>setTreatmentForm({...treatmentForm, priceMin: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                  <input type="number" placeholder="최대 가격 ($)" value={treatmentForm.priceMax || ''} onChange={e=>setTreatmentForm({...treatmentForm, priceMax: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                  <input type="number" placeholder="표시 순서" value={treatmentForm.displayOrder || ''} onChange={e=>setTreatmentForm({...treatmentForm, displayOrder: e.target.value||null})} className="w-full p-2 border rounded text-sm"/>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="text-sm font-bold text-gray-700 flex-1">프론트 노출 여부</label>
                  <button type="button" onClick={()=>setTreatmentForm({...treatmentForm, isPublished: !treatmentForm.isPublished})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${treatmentForm.isPublished?'bg-teal-600':'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${treatmentForm.isPublished?'translate-x-6':'translate-x-1'}`}/>
                  </button>
                  <span className="text-xs text-gray-600 w-16">{treatmentForm.isPublished?'노출':'숨김'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400">설명</h3>
                <input placeholder="간략 설명 (카드용)" value={treatmentForm.desc} onChange={e=>setTreatmentForm({...treatmentForm, desc: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                <textarea placeholder="상세 설명 (페이지용)" rows="4" value={treatmentForm.fullDescription} onChange={e=>setTreatmentForm({...treatmentForm, fullDescription: e.target.value})} className="w-full p-2 border rounded text-sm"/>
              </div>

              <div className="space-y-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2"><Clock size={16}/> 시술 정보</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">마취 방식</label>
                    <select value={treatmentForm.anesthesiaType||''} onChange={e=>setTreatmentForm({...treatmentForm, anesthesiaType: e.target.value})} className="w-full border p-2 rounded text-sm">
                      <option value="">선택하세요</option>
                      <option value="local">국소마취</option>
                      <option value="sedation">수면마취</option>
                      <option value="general">전신마취</option>
                      <option value="none">마취 없음</option>
                      <option value="topical">도포마취</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">시술 시간 (최소, 분)</label>
                    <input type="number" placeholder="예: 30" value={treatmentForm.surgeryDurationMin||''} onChange={e=>setTreatmentForm({...treatmentForm, surgeryDurationMin: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">시술 시간 (최대, 분)</label>
                    <input type="number" placeholder="예: 60" value={treatmentForm.surgeryDurationMax||''} onChange={e=>setTreatmentForm({...treatmentForm, surgeryDurationMax: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Activity size={12}/> 필요 장비</h4>
                  <DynamicListInput items={treatmentForm.requiredEquipment||[]} onAdd={t=>setTreatmentForm({...treatmentForm, requiredEquipment:[...(treatmentForm.requiredEquipment||[]),t]})} onRemove={i=>setTreatmentForm({...treatmentForm, requiredEquipment:(treatmentForm.requiredEquipment||[]).filter((_,x)=>x!==i)})} placeholder="예: 레이저, 초음파"/>
                </div>
              </div>

              <div className="space-y-3 bg-orange-50 p-4 rounded-xl border border-orange-100">
                <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2"><Clock size={16}/> 회복 정보</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">최소 회복기간 (일)</label>
                    <input type="number" placeholder="예: 3" value={treatmentForm.recoveryTimeMin||''} onChange={e=>setTreatmentForm({...treatmentForm, recoveryTimeMin: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">최대 회복기간 (일)</label>
                    <input type="number" placeholder="예: 14" value={treatmentForm.recoveryTimeMax||''} onChange={e=>setTreatmentForm({...treatmentForm, recoveryTimeMax: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-red-50 p-4 rounded-xl border border-red-100">
                <h3 className="text-sm font-bold text-red-900 flex items-center gap-2"><AlertTriangle size={16}/> 부작용 / 주의사항</h3>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">부작용 태그</label>
                  <DynamicListInput items={treatmentForm.sideEffects||[]} onAdd={t=>setTreatmentForm({...treatmentForm, sideEffects:[...(treatmentForm.sideEffects||[]),t]})} onRemove={i=>setTreatmentForm({...treatmentForm, sideEffects:(treatmentForm.sideEffects||[]).filter((_,x)=>x!==i)})} placeholder="예: 부기, 멍"/>
                </div>
                <textarea placeholder="부작용 상세 설명" rows="2" value={treatmentForm.sideEffectsDetail||''} onChange={e=>setTreatmentForm({...treatmentForm, sideEffectsDetail: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">주의사항</label>
                  <DynamicListInput items={treatmentForm.precautions||[]} onAdd={t=>setTreatmentForm({...treatmentForm, precautions:[...(treatmentForm.precautions||[]),t]})} onRemove={i=>setTreatmentForm({...treatmentForm, precautions:(treatmentForm.precautions||[]).filter((_,x)=>x!==i)})} placeholder="예: 음주 금지, 사우나 금지"/>
                </div>
              </div>

              <div className="space-y-3 bg-green-50 p-4 rounded-xl border border-green-100">
                <h3 className="text-sm font-bold text-green-900 flex items-center gap-2"><Shield size={16}/> 보험 / 통계</h3>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 flex-1">보험 적용 가능</label>
                  <button type="button" onClick={()=>setTreatmentForm({...treatmentForm, insuranceCoverage: !treatmentForm.insuranceCoverage})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${treatmentForm.insuranceCoverage?'bg-green-600':'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${treatmentForm.insuranceCoverage?'translate-x-6':'translate-x-1'}`}/>
                  </button>
                </div>
                {treatmentForm.insuranceCoverage && (
                  <input placeholder="보험 상세 (예: 국민건강보험 일부 적용)" value={treatmentForm.insuranceCoverageDetail||''} onChange={e=>setTreatmentForm({...treatmentForm, insuranceCoverageDetail: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">연간 시술 건수</label>
                    <input type="number" placeholder="예: 1200" value={treatmentForm.annualProcedureCount||''} onChange={e=>setTreatmentForm({...treatmentForm, annualProcedureCount: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">성공률 (%)</label>
                    <input type="number" step="0.1" min="0" max="100" placeholder="예: 98.5" value={treatmentForm.successRate||''} onChange={e=>setTreatmentForm({...treatmentForm, successRate: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                  </div>
                </div>
              </div>

              <DynamicListInput items={treatmentForm.benefits||[]} onAdd={t=>setTreatmentForm({...treatmentForm, benefits:[...(treatmentForm.benefits||[]),t]})} onRemove={i=>setTreatmentForm({...treatmentForm, benefits:(treatmentForm.benefits||[]).filter((_,x)=>x!==i)})} placeholder="주요 효과 (Benefit)"/>
              <DynamicListInput items={treatmentForm.tags||[]} onAdd={t=>setTreatmentForm({...treatmentForm, tags:[...(treatmentForm.tags||[]),t]})} onRemove={i=>setTreatmentForm({...treatmentForm, tags:(treatmentForm.tags||[]).filter((_,x)=>x!==i)})} placeholder="검색 태그"/>
              
              <label className="block text-sm font-bold text-gray-500 mt-2">시술 관련 이미지</label>
              <p className="text-xs text-teal-600 bg-teal-50 p-2 rounded-lg mb-2 flex items-center gap-2">
                <Info size={14}/> 권장: 800x800px (1:1 비율)
              </p>
              <ImageUploader 
                images={treatmentForm.images||[]} 
                onUpload={async (file) => {
                  const url = await uploadToSupabase(file);
                  if (url) setTreatmentForm(prev => ({...prev, images: [...(prev.images||[]), url]}));
                }}
                onRemove={(idx) => setTreatmentForm(prev => ({...prev, images: (prev.images||[]).filter((_, i) => i !== idx)}))}
                uploading={uploading}
              />

              <div className="space-y-3 bg-violet-50 p-4 rounded-xl border border-violet-100 mt-4">
                <h3 className="text-sm font-bold text-violet-900 flex items-center gap-2"><Image size={16}/> Before / After 이미지</h3>
                {(treatmentForm.beforeAfterImages || []).map((item, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                      <button onClick={() => setTreatmentForm({...treatmentForm, beforeAfterImages: (treatmentForm.beforeAfterImages||[]).filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                    </div>
                    <input placeholder="Before 이미지 URL" value={item.before || ''} onChange={e => { const arr = [...(treatmentForm.beforeAfterImages||[])]; arr[idx] = {...arr[idx], before: e.target.value}; setTreatmentForm({...treatmentForm, beforeAfterImages: arr}); }} className="w-full border p-2 rounded text-xs"/>
                    <input placeholder="After 이미지 URL" value={item.after || ''} onChange={e => { const arr = [...(treatmentForm.beforeAfterImages||[])]; arr[idx] = {...arr[idx], after: e.target.value}; setTreatmentForm({...treatmentForm, beforeAfterImages: arr}); }} className="w-full border p-2 rounded text-xs"/>
                    <input placeholder="설명 (선택)" value={item.caption || ''} onChange={e => { const arr = [...(treatmentForm.beforeAfterImages||[])]; arr[idx] = {...arr[idx], caption: e.target.value}; setTreatmentForm({...treatmentForm, beforeAfterImages: arr}); }} className="w-full border p-2 rounded text-xs"/>
                  </div>
                ))}
                <button type="button" onClick={() => setTreatmentForm({...treatmentForm, beforeAfterImages: [...(treatmentForm.beforeAfterImages||[]), {before: '', after: '', caption: ''}]})} className="text-violet-600 text-xs font-bold flex items-center gap-1 hover:underline">
                  <Plus size={12}/> Before/After 추가
                </button>
              </div>

              <div className="space-y-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-4">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2"><DollarSign size={16}/> 가격 포함 항목</h3>
                <DynamicListInput items={treatmentForm.priceIncludes||[]} onAdd={t=>setTreatmentForm({...treatmentForm, priceIncludes:[...(treatmentForm.priceIncludes||[]),t]})} onRemove={i=>setTreatmentForm({...treatmentForm, priceIncludes:(treatmentForm.priceIncludes||[]).filter((_,x)=>x!==i)})} placeholder="예: 상담, 마취, 사후관리"/>
              </div>

              <TranslationPanel
                i18n={treatmentForm.i18n || {}}
                onI18nChange={(newI18n) => setTreatmentForm({...treatmentForm, i18n: newI18n})}
                type="treatment"
                entityId={editingTreatmentId}
              />
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="animate-in fade-in">
      {/* Desktop */}
      <div className="hidden lg:grid grid-cols-12 gap-8">
        <div className="col-span-4 bg-white rounded-2xl border border-gray-200 p-4 h-[calc(100vh-100px)] overflow-y-auto">
          <ListPanel />
        </div>
        <div className="col-span-8 relative">
          <FormPanel />
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        {!showForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <ListPanel />
          </div>
        ) : (
          <div>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-1 text-sm text-gray-600 mb-3 hover:text-teal-600">
              <ChevronLeft size={16}/> 목록으로
            </button>
            <FormPanel />
          </div>
        )}
      </div>
    </div>
  );
};
