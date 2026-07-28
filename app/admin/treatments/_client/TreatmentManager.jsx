import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Save, Info, ChevronLeft, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
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
  // DynamicListInput / ImageUploader 는 부모에서 주입되어 아래 폼 JSX에서 직접 사용된다
  // (`<DynamicListInput/>`·`<ImageUploader/>`). prefix `_` 로 받으면 이름이 스코프에 없어
  // 폼 열 때 ReferenceError 로 크래시하므로 원래 이름 그대로 받는다 (POSTMORTEMS).
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
    // ⚠️ page.jsx 의 `emptyTreatmentForm` 과 **같은 필드 집합**을 유지해야 한다
    //    (둘이 어긋나면 입력칸은 있는데 저장이 안 되는 반쪽 상태가 된다 — #103).
    setTreatmentForm({
      title: '', desc: '', fullDescription: '', priceMin: '', priceMax: '',
      duration: '', recoveryTime: '', preparation: '', risks: '',
      benefits: [], tags: [], images: [], displayOrder: null, isPublished: true,
      i18n: {}
    });
    setShowForm(true);
  };

  const listPanel = (
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
        <p className="text-xs text-red-600 mb-2">Treatments error: {treatmentsError.message}</p>
      )}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">시술 목록</h2>
        {selectedHospitalId && (
          <button onClick={handleNew} className="bg-teal-700 text-white p-1 lg:p-1 rounded flex items-center gap-1 text-sm">
            <Plus size={14}/>
            <span className="lg:hidden">추가</span>
          </button>
        )}
      </div>
      {treatmentsList.map(t=>(
        <div key={t.id} onClick={()=>handleSelectTreatment(t)} className={`p-3 border-b lg:border-b cursor-pointer hover:bg-gray-50 rounded-lg lg:rounded-none mb-1 lg:mb-0 border lg:border-0 ${editingTreatmentId===t.id?'bg-teal-50 border-teal-300 lg:border-l-4 lg:border-l-teal-500':'border-gray-200 lg:border-gray-100'}`}>
          <div className="font-bold text-sm">{t.name}</div>
          <div className="text-xs text-teal-700">${t.price_min}</div>
        </div>
      ))}
    </>
  );

  const formPanel = (
    <>
      {!selectedHospitalId ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 lg:h-[calc(100vh-100px)] flex items-center justify-center">
          <div className="text-center text-gray-500">병원을 먼저 선택해주세요.</div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 lg:p-4 mb-4 rounded-t-2xl flex justify-between items-center shadow-sm">
            <h2 className="text-base lg:text-xl font-bold">{editingTreatmentId?'시술 정보 수정':'신규 시술 등록'}</h2>
            <div className="flex items-center gap-2 lg:gap-3">
              {editingTreatmentId && (
                <button 
                  onClick={()=>handleDelete('treatments', editingTreatmentId, ()=>fetchTreatments(selectedHospitalId))}
                  className="p-2 text-red-700 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={18}/>
                </button>
              )}
              <button 
                onClick={handleSaveTreatment} 
                disabled={loading}
                className="bg-teal-700 text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg font-bold shadow-md hover:bg-teal-800 transition flex items-center gap-2 disabled:opacity-50 text-sm lg:text-base"
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
                          className="text-sm text-teal-700 hover:underline flex items-center gap-1"
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
                <h3 className="text-sm font-bold text-gray-500">기본 정보</h3>
                <input placeholder="시술명 (영어/한글)" value={treatmentForm.title} onChange={e=>setTreatmentForm({...treatmentForm, title: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="number" placeholder="최소 가격 ($)" value={treatmentForm.priceMin} onChange={e=>setTreatmentForm({...treatmentForm, priceMin: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                  <input type="number" placeholder="최대 가격 ($)" value={treatmentForm.priceMax || ''} onChange={e=>setTreatmentForm({...treatmentForm, priceMax: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                  <input type="number" placeholder="표시 순서" value={treatmentForm.displayOrder || ''} onChange={e=>setTreatmentForm({...treatmentForm, displayOrder: e.target.value||null})} className="w-full p-2 border rounded text-sm"/>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="text-sm font-bold text-gray-700 flex-1">프론트 노출 여부</label>
                  <button type="button" onClick={()=>setTreatmentForm({...treatmentForm, isPublished: !treatmentForm.isPublished})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${treatmentForm.isPublished?'bg-teal-700':'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${treatmentForm.isPublished?'translate-x-6':'translate-x-1'}`}/>
                  </button>
                  <span className="text-xs text-gray-600 w-16">{treatmentForm.isPublished?'노출':'숨김'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500">설명</h3>
                <input placeholder="간략 설명 (카드용)" value={treatmentForm.desc} onChange={e=>setTreatmentForm({...treatmentForm, desc: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                <textarea placeholder="상세 설명 (페이지용)" rows="4" value={treatmentForm.fullDescription} onChange={e=>setTreatmentForm({...treatmentForm, fullDescription: e.target.value})} className="w-full p-2 border rounded text-sm"/>
              </div>

              {/* 치료 상세 — 실DB `treatments` 컬럼이자 환자 상세페이지에 그대로 표시되는 항목.
                  옛 미용시술 패널 4개(마취·시술시간·필요장비 / 회복기간 min·max / 부작용태그 /
                  보험·연간건수·성공률)는 실컬럼이 아니라 저장 자체를 깨뜨리고 있었다(#103). */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 flex items-center gap-2"><Clock size={16}/> 치료 상세</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">소요 시간</label>
                    <input placeholder="예: 1회 30분, 주 2회" value={treatmentForm.duration||''} onChange={e=>setTreatmentForm({...treatmentForm, duration: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">회복 기간</label>
                    <input placeholder="예: 3~14일" value={treatmentForm.recoveryTime||''} onChange={e=>setTreatmentForm({...treatmentForm, recoveryTime: e.target.value})} className="w-full border p-2 rounded text-sm"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">사전 준비사항</label>
                  <textarea placeholder="예: 검사 전 8시간 금식, 복용 중인 약 지참" rows="2" value={treatmentForm.preparation||''} onChange={e=>setTreatmentForm({...treatmentForm, preparation: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> 주의사항 · 부작용</label>
                  <textarea placeholder="예: 시술 후 음주·사우나 금지, 일시적 부기 가능" rows="2" value={treatmentForm.risks||''} onChange={e=>setTreatmentForm({...treatmentForm, risks: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                </div>
              </div>

              <DynamicListInput items={treatmentForm.benefits||[]} onAdd={t=>setTreatmentForm({...treatmentForm, benefits:[...(treatmentForm.benefits||[]),t]})} onRemove={i=>setTreatmentForm({...treatmentForm, benefits:(treatmentForm.benefits||[]).filter((_,x)=>x!==i)})} placeholder="주요 효과 (Benefit)"/>
              <DynamicListInput items={treatmentForm.tags||[]} onAdd={t=>setTreatmentForm({...treatmentForm, tags:[...(treatmentForm.tags||[]),t]})} onRemove={i=>setTreatmentForm({...treatmentForm, tags:(treatmentForm.tags||[]).filter((_,x)=>x!==i)})} placeholder="검색 태그"/>
              
              <label className="block text-sm font-bold text-gray-500 mt-2">시술 관련 이미지</label>
              <p className="text-xs text-teal-700 bg-teal-50 p-2 rounded-lg mb-2 flex items-center gap-2">
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
          {listPanel}
        </div>
        <div className="col-span-8 relative">
          {formPanel}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        {!showForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            {listPanel}
          </div>
        ) : (
          <div>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-1 text-sm text-gray-600 mb-3 hover:text-teal-700">
              <ChevronLeft size={16}/> 목록으로
            </button>
            {formPanel}
          </div>
        )}
      </div>
    </div>
  );
};
