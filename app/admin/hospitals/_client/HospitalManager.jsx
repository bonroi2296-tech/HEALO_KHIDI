import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Loader2, Save, Globe, Coffee, Trophy, Info, User, X, ChevronLeft, Shield, Activity, Building, Star, Stethoscope, Calendar, HelpCircle, Search, Eye, EyeOff, ArrowUpDown, ChevronDown, MapPin, MessageCircle, Sparkles, Database, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { TranslationPanel } from '../../_shared/TranslationPanel';
import { HospitalOffersPreviewModal } from './HospitalOffersPreview';
import { AdminLoadingSkeleton } from '../../_components/AdminLoadingSkeleton';

const SORT_OPTIONS = [
  { value: 'name_asc', label: '이름 (A→Z)' },
  { value: 'name_desc', label: '이름 (Z→A)' },
  { value: 'newest', label: '최신 등록순' },
  { value: 'oldest', label: '오래된 순' },
  { value: 'doctor_count', label: '의사 수 많은 순' },
];

function useFilteredHospitals(hospitalsList, search, statusFilter, sortBy) {
  return useMemo(() => {
    let list = [...hospitalsList];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(h => {
        const name = (h.name || '').toLowerCase();
        const loc = (h.location_kr || h.location_en || '').toLowerCase();
        const tags = (h.tags || []).join(' ').toLowerCase();
        const specs = (h.specialties || []).join(' ').toLowerCase();
        return name.includes(q) || loc.includes(q) || tags.includes(q) || specs.includes(q);
      });
    }

    if (statusFilter === 'published') list = list.filter(h => h.is_published);
    else if (statusFilter === 'unpublished') list = list.filter(h => !h.is_published);

    switch (sortBy) {
      case 'name_asc': list.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'name_desc': list.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
      case 'newest': list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break;
      case 'oldest': list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); break;
      case 'doctor_count': list.sort((a, b) => (b.doctor_count || 0) - (a.doctor_count || 0)); break;
    }

    return list;
  }, [hospitalsList, search, statusFilter, sortBy]);
}

function HospitalListItem({ h, isActive, onClick }) {
  const locationText = h.location_kr || h.location_en || h.location || '';
  return (
    <div
      onClick={onClick}
      className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition ${
        isActive ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm flex-1 truncate">{h.name}</span>
        {h.is_partner && (
          <span className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded" title="제휴">제휴</span>
        )}
        {h.is_published ? (
          <span className="shrink-0 w-2 h-2 rounded-full bg-green-500" title="공개" />
        ) : (
          <span className="shrink-0 w-2 h-2 rounded-full bg-gray-300" title="비공개" />
        )}
      </div>
      <div className="text-xs text-gray-500 truncate mt-0.5">
        {locationText || ''}
      </div>
      {(h.specialties?.length > 0) && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {h.specialties.slice(0, 3).map((s, i) => (
            <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{s}</span>
          ))}
          {h.specialties.length > 3 && (
            <span className="text-[10px] text-gray-400">+{h.specialties.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

export const HospitalManager = ({
  hospitalsList,
  hospitalsListLoading = false,
  hospitalsError,
  handleEditHospital,
  editingHospitalId,
  setEditingHospitalId,
  hospitalForm,
  setHospitalForm,
  uploading,
  loading,
  handleSaveHospital,
  handleDelete,
  fetchHospitals,
  patchHospitalOffersFlags,
  offersFailureLogEnabled,
  uploadToSupabase,
  DynamicListInput,
  ImageUploader,
  AddressInput,
  toast,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [offersModalOpen, setOffersModalOpen] = useState(false);
  const [offersPayload, setOffersPayload] = useState(null);
  const [offersLoading, setOffersLoading] = useState(false);
  const [usePlaywright, setUsePlaywright] = useState(false);

  const POLL_INTERVAL_MS = 1000;
  const POLL_MAX_COUNT = 20;

  const requestOffersPreview = useCallback(async () => {
    if (!editingHospitalId) return;
    setOffersModalOpen(true);
    setOffersLoading(true);
    setOffersPayload(null);
    try {
      const res = await fetch(`/api/admin/hospitals/${editingHospitalId}/offers/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usePlaywright }),
      });
      const j = await res.json();
      if (!j.ok) {
        toast?.error?.(j.message || j.detail || j.error || '미리보기 생성 실패');
        setOffersLoading(false);
        return;
      }
      if (j.hint === 'no_website') {
        setOffersPayload({
          hospital_id: editingHospitalId,
          captured_at: new Date().toISOString(),
          sources: [],
          offers: [],
          hint: 'no_website',
          message: j.message || '병원에 웹사이트 URL이 등록되어 있지 않습니다.',
        });
        setOffersLoading(false);
        return;
      }
      const jobId = j.job_id;
      if (!jobId) {
        setOffersLoading(false);
        return;
      }
      let pollCount = 0;
      const poll = async () => {
        const r = await fetch(
          `/api/admin/hospitals/${editingHospitalId}/offers/preview?job_id=${encodeURIComponent(jobId)}`,
          { credentials: 'include' }
        );
        const data = await r.json();
        pollCount += 1;
        if (!data.ok) {
          setOffersPayload({
            hospital_id: editingHospitalId,
            captured_at: new Date().toISOString(),
            sources: [],
            offers: [],
            hint: 'job_error',
            message: data.error || '작업 조회 실패',
          });
          setOffersLoading(false);
          return;
        }
        if (data.status === 'done') {
          const offers = data.result_offers?.offers ?? [];
          const sources = (data.debug?.selected_pages ?? []).map((p) => ({ url: p.url, title: p.url }));
          setOffersPayload({
            hospital_id: editingHospitalId,
            captured_at: data.updated_at || new Date().toISOString(),
            sources,
            offers,
            crawl_metadata: data.debug ? { pages_fetched: data.debug.chunks_count, text_length: data.debug.total_chars } : undefined,
            debug: data.debug,
          });
          if (offers.length > 0) {
            setHospitalForm((prev) => ({
              ...prev,
              offers_auto_failed_at: null,
              offers_auto_fail_reason: null,
              offers_auto_skip: false,
            }));
          }
          setOffersLoading(false);
          return;
        }
        if (data.status === 'error') {
          setOffersPayload({
            hospital_id: editingHospitalId,
            captured_at: new Date().toISOString(),
            sources: [],
            offers: [],
            hint: 'job_error',
            message: data.error || '생성 중 오류가 발생했습니다.',
            debug: data.debug,
          });
          setOffersLoading(false);
          return;
        }
        if (pollCount >= POLL_MAX_COUNT) {
          setOffersPayload({
            hospital_id: editingHospitalId,
            job_id: jobId,
            timeout: true,
            message: '백그라운드 생성 중입니다. 잠시 후 다시 열어주세요.',
            sources: [],
            offers: [],
          });
          setOffersLoading(false);
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      };
      poll();
    } catch (e) {
      toast?.error?.('미리보기 요청 실패: ' + e?.message);
      setOffersLoading(false);
    }
  }, [editingHospitalId, usePlaywright, toast]);

  const retryOffersPoll = useCallback((jobId) => {
    if (!editingHospitalId || !jobId) return;
    setOffersLoading(true);
    let pollCount = 0;
    const poll = async () => {
      const r = await fetch(
        `/api/admin/hospitals/${editingHospitalId}/offers/preview?job_id=${encodeURIComponent(jobId)}`,
        { credentials: 'include' }
      );
      const data = await r.json();
      pollCount += 1;
      if (!data.ok || data.status === 'error') {
        setOffersPayload((prev) => ({
          ...prev,
          hint: 'job_error',
          message: data.error || '작업 조회 실패',
          timeout: false,
        }));
        setOffersLoading(false);
        return;
      }
      if (data.status === 'done') {
        const offers = data.result_offers?.offers ?? [];
        const sources = (data.debug?.selected_pages ?? []).map((p) => ({ url: p.url, title: p.url }));
        setOffersPayload({
          hospital_id: editingHospitalId,
          captured_at: data.updated_at || new Date().toISOString(),
          sources,
          offers,
          crawl_metadata: data.debug ? { pages_fetched: data.debug.chunks_count, text_length: data.debug.total_chars } : undefined,
          debug: data.debug,
        });
        setOffersLoading(false);
        return;
      }
      if (pollCount >= POLL_MAX_COUNT) {
        setOffersPayload((prev) => ({ ...prev, timeout: true }));
        setOffersLoading(false);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };
    poll();
  }, [editingHospitalId]);

  const filtered = useFilteredHospitals(hospitalsList, search, statusFilter, sortBy);

  const publishedCount = useMemo(() => hospitalsList.filter(h => h.is_published).length, [hospitalsList]);
  const unpublishedCount = hospitalsList.length - publishedCount;

  const handleSelectHospital = (h) => {
    handleEditHospital(h);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingHospitalId(null);
    setHospitalForm({ 
      name: '', location_kr: '', location_en: '', address_detail: '', website: '', description: '', 
      latitude: null, longitude: null, tags: [], images: [], thumbnailImage: '', galleryImages: [],
      languages: [], amenities: [], specialties: [], medicalEquipment: [],
      hoursMonFri: '', hoursSat: '', hoursSun: '', doctorName: '', doctorTitle: '', doctorImage: '', 
      doctorSchool: '', doctorYears: '', doctorSpecialties: [], 
      doctorMetricValue: '99%', doctorMetricLabel: '만족도',
      certifications: [], insuranceAccepted: false, insuranceTypes: [],
      annualSurgeryCount: '', establishmentDate: '', doctorCount: '',
      externalNaverRating: '', externalNaverCount: '', externalKakaoRating: '', externalKakaoCount: '',
      displayOrder: null, isPublished: true, isPartner: false,
      faq: [],
      i18n: {}
    });
    setShowForm(true);
  };

  const listToolbar = (
    <>
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="병원명, 주소, 진료과..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status filter pills */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md transition font-medium ${statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            전체 <span className="text-gray-400">{hospitalsList.length}</span>
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 ${statusFilter === 'published' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
          >
            <Eye size={11} /> 공개 <span className="text-gray-400">{publishedCount}</span>
          </button>
          <button
            onClick={() => setStatusFilter('unpublished')}
            className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 ${statusFilter === 'unpublished' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
          >
            <EyeOff size={11} /> 숨김 <span className="text-gray-400">{unpublishedCount}</span>
          </button>
        </div>

        {/* Sort dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 bg-white"
          >
            <ArrowUpDown size={11} />
            {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            <ChevronDown size={11} />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${sortBy === opt.value ? 'text-teal-600 font-bold' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result count */}
      {search && (
        <p className="text-xs text-gray-400">
          {filtered.length}건 검색됨 {filtered.length !== hospitalsList.length && `(전체 ${hospitalsList.length}건)`}
        </p>
      )}
    </>
  );

  return (
    <div className="animate-in fade-in">
      {/* Desktop: 2-column layout */}
      <div className="hidden lg:grid grid-cols-12 gap-8">
        {/* Left: Hospital List */}
        <div className="col-span-4 bg-white rounded-2xl border border-gray-200 h-[calc(100vh-100px)] flex flex-col">
          <div className="p-4 space-y-3 border-b border-gray-100 shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="font-bold">등록된 병원</h2>
              <button onClick={handleNew} className="bg-teal-600 text-white p-1 rounded">
                <Plus size={16}/>
              </button>
            </div>
            {listToolbar}
          </div>
          {process.env.NODE_ENV !== "production" && hospitalsError && (
            <p className="text-xs text-red-500 px-4 pt-2">Hospitals error: {hospitalsError.message}</p>
          )}
          <div className="overflow-y-auto flex-1">
            {hospitalsListLoading ? (
              <div className="p-4">
                <AdminLoadingSkeleton rows={6} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                {search ? '검색 결과가 없습니다' : '등록된 병원이 없습니다'}
              </div>
            ) : (
              filtered.map(h => (
                <HospitalListItem
                  key={h.id}
                  h={h}
                  isActive={editingHospitalId === h.id}
                  onClick={() => handleEditHospital(h)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Edit Form */}
        <div className="col-span-8 relative">
          <FormContent
            editingHospitalId={editingHospitalId}
            hospitalForm={hospitalForm}
            setHospitalForm={setHospitalForm}
            uploading={uploading}
            loading={loading}
            handleSaveHospital={handleSaveHospital}
            handleDelete={handleDelete}
            fetchHospitals={fetchHospitals}
            handleEditHospital={handleEditHospital}
            hospitalsList={hospitalsList}
            uploadToSupabase={uploadToSupabase}
            patchHospitalOffersFlags={patchHospitalOffersFlags}
            offersFailureLogEnabled={offersFailureLogEnabled}
            DynamicListInput={DynamicListInput}
            ImageUploader={ImageUploader}
            AddressInput={AddressInput}
            toast={toast}
            offersModalOpen={offersModalOpen}
            offersPayload={offersPayload}
            offersLoading={offersLoading}
            usePlaywright={usePlaywright}
            setUsePlaywright={setUsePlaywright}
            onRequestOffersPreview={requestOffersPreview}
            onRetryOffersPoll={retryOffersPoll}
            onCloseOffersModal={() => setOffersModalOpen(false)}
            onOffersApplyComplete={() => { setOffersModalOpen(false); setOffersPayload(null); fetchHospitals?.(); }}
          />
        </div>
      </div>

      {/* Mobile: Single column with toggle */}
      <div className="lg:hidden">
        {!showForm ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">등록된 병원</h2>
              <button onClick={handleNew} className="bg-teal-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm">
                <Plus size={14}/> 추가
              </button>
            </div>
            <div className="space-y-3 mb-3">
              {listToolbar}
            </div>
            {process.env.NODE_ENV !== "production" && hospitalsError && (
              <p className="text-xs text-red-500 mb-2">Hospitals error: {hospitalsError.message}</p>
            )}
            <div className="space-y-2">
              {hospitalsListLoading ? (
                <AdminLoadingSkeleton rows={5} />
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  {search ? '검색 결과가 없습니다' : '등록된 병원이 없습니다'}
                </div>
              ) : (
                filtered.map(h => (
                  <div key={h.id} onClick={()=>handleSelectHospital(h)} className={`p-3 rounded-lg border cursor-pointer active:bg-gray-100 ${editingHospitalId===h.id?'bg-teal-50 border-teal-300':'border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm flex-1 truncate">{h.name}</span>
                      {h.is_partner && (
                        <span className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">제휴</span>
                      )}
                      {h.is_published ? (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-green-500" />
                      ) : (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {h.location_kr || h.location_en || ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-1 text-sm text-gray-600 mb-3 hover:text-teal-600">
              <ChevronLeft size={16}/> 목록으로
            </button>
            <FormContent
              editingHospitalId={editingHospitalId}
              hospitalForm={hospitalForm}
              setHospitalForm={setHospitalForm}
              uploading={uploading}
              loading={loading}
              handleSaveHospital={handleSaveHospital}
              handleDelete={handleDelete}
              fetchHospitals={fetchHospitals}
              handleEditHospital={handleEditHospital}
              hospitalsList={hospitalsList}
              uploadToSupabase={uploadToSupabase}
              patchHospitalOffersFlags={patchHospitalOffersFlags}
              DynamicListInput={DynamicListInput}
              ImageUploader={ImageUploader}
              AddressInput={AddressInput}
              toast={toast}
              offersModalOpen={offersModalOpen}
              offersPayload={offersPayload}
              offersLoading={offersLoading}
              onRequestOffersPreview={requestOffersPreview}
              onRetryOffersPoll={retryOffersPoll}
              onCloseOffersModal={() => setOffersModalOpen(false)}
              onOffersApplyComplete={() => { setOffersModalOpen(false); setOffersPayload(null); fetchHospitals?.(); }}
              offersFailureLogEnabled={offersFailureLogEnabled}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const SOURCE_ICONS = { google: MapPin, kakao: MessageCircle, ai: Sparkles };

function EnrichmentPanel({ editingHospitalId, enrichmentLog, onComplete, toast }) {
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [running, setRunning] = useState(new Set());
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (!editingHospitalId) return;
    (async () => {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser');
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch('/api/admin/hospitals/enrich', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (json.ok && json.sources) {
          setSources(json.sources);
          setSelected(new Set(json.sources.filter(s => s.available).map(s => s.id)));
        }
      } catch {}
    })();
  }, [editingHospitalId]);

  const toggleSource = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRun = async () => {
    if (selected.size === 0) return toast.error('수집할 소스를 선택해주세요.');
    const ids = [...selected];
    setRunning(new Set(ids));
    try {
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser');
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('세션 만료'); return; }
      const res = await fetch(`/api/admin/hospitals/enrich?id=${editingHospitalId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: ids }),
      });
      const result = await res.json();
      if (result.ok) {
        const successes = (result.results || []).filter(r => r.success);
        const failures = (result.results || []).filter(r => !r.success);
        const parts = successes.flatMap(r => r.items || []);
        if (parts.length > 0) toast.success(`수집 완료: ${parts.join(', ')}`);
        if (failures.length > 0) {
          const failMsg = failures.map(f => `[${f.source}] ${f.error || '알 수 없는 오류'}`).join('\n');
          toast.error(`수집 실패:\n${failMsg}`);
        }
        onComplete?.(result.hospital);
      } else {
        toast.error(`수집 실패: ${result.detail || result.error || '서버 오류'}`);
      }
    } catch (err) {
      toast.error('수집 요청 실패: ' + err.message);
    } finally {
      setRunning(new Set());
      setPanelOpen(false);
    }
  };

  const isRunning = running.size > 0;

  if (!editingHospitalId) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition disabled:opacity-50"
      >
        {isRunning ? <Loader2 size={14} className="animate-spin"/> : <Database size={14}/>}
        {isRunning ? '수집 중...' : '데이터 수집'}
        <ChevronDown size={12} className={`transition ${panelOpen ? 'rotate-180' : ''}`}/>
      </button>
      {panelOpen && !isRunning && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">수집 소스 선택</div>
          <div className="space-y-2 mb-4">
            {sources.map(s => {
              const Icon = SOURCE_ICONS[s.id] || Database;
              const log = enrichmentLog?.[s.id];
              return (
                <label key={s.id} className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  !s.available ? 'opacity-40 pointer-events-none border-gray-100 bg-gray-50' :
                  selected.has(s.id) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSource(s.id)}
                    disabled={!s.available}
                    className="mt-0.5 rounded border-gray-300 text-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon size={13} className="text-gray-600"/>
                      <span className="text-sm font-bold text-gray-800">{s.name}</span>
                      {!s.available && <span className="text-[10px] text-red-500 font-medium">키 필요</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{s.description}</p>
                    {log && (
                      <div className="flex items-center gap-1 mt-1 text-[10px]">
                        {log.status === 'success' ? (
                          <CheckCircle2 size={10} className="text-green-500"/>
                        ) : log.status === 'failed' ? (
                          <XCircle size={10} className="text-red-500"/>
                        ) : (
                          <Clock size={10} className="text-gray-400"/>
                        )}
                        <span className="text-gray-400">
                          {log.last_run ? new Date(log.last_run).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '미수집'}
                        </span>
                        {log.items?.length > 0 && (
                          <span className="text-gray-400">· {log.items.slice(0,3).join(', ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <button
            onClick={() => { setPanelOpen(false); handleRun(); }}
            disabled={selected.size === 0}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            선택 소스 수집 시작 ({selected.size}개)
          </button>
        </div>
      )}
    </div>
  );
}

const REASON_MAX_COLLAPSED = 120;

function OffersFailureBanner({ hospitalForm, patchHospitalOffersFlags, onRequestOffersPreview }) {
  const [reasonExpanded, setReasonExpanded] = useState(false);
  const reason = hospitalForm.offers_auto_fail_reason || '알 수 없음';
  const isLong = reason.length > REASON_MAX_COLLAPSED;
  const showReason = reasonExpanded || !isLong ? reason : reason.slice(0, REASON_MAX_COLLAPSED) + '…';

  return (
    <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      {hospitalForm.offers_auto_skip && (
        <p className="font-medium">시술 자동생성 건너뜀으로 표시됨</p>
      )}
      {hospitalForm.offers_auto_failed_at && (
        <p className="mt-1">
          실패 ({hospitalForm.offers_auto_failed_at ? new Date(hospitalForm.offers_auto_failed_at).toLocaleString() : ''}): {showReason}
          {isLong && (
            <button type="button" onClick={() => setReasonExpanded((e) => !e)} className="ml-1 text-amber-600 hover:underline font-medium">
              {reasonExpanded ? '접기' : '더 보기'}
            </button>
          )}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!hospitalForm.offers_auto_skip}
            onChange={async (e) => {
              const skip = e.target.checked;
              if (patchHospitalOffersFlags) await patchHospitalOffersFlags({ offers_auto_skip: skip });
            }}
            className="rounded border-amber-300"
          />
          <span>다음에 시도하지 않음 (건너뛰기)</span>
        </label>
        {hospitalForm.offers_auto_skip && (
          <button
            type="button"
            onClick={async () => {
              if (patchHospitalOffersFlags) await patchHospitalOffersFlags({ offers_auto_skip: false });
              onRequestOffersPreview?.();
            }}
            className="px-2 py-1 text-sm font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 border border-teal-200 rounded"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

function FormContent({ editingHospitalId, hospitalForm, setHospitalForm, uploading, loading, handleSaveHospital, handleDelete, fetchHospitals, handleEditHospital, _hospitalsList, uploadToSupabase, patchHospitalOffersFlags, offersFailureLogEnabled, _DynamicListInput, _ImageUploader, _AddressInput, toast, offersModalOpen, offersPayload, offersLoading, usePlaywright, setUsePlaywright, onRequestOffersPreview, onRetryOffersPoll, onCloseOffersModal, onOffersApplyComplete }) {

  return (
    <div className="relative">
      {editingHospitalId && offersFailureLogEnabled === false && (
        <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          <p className="font-medium">시술 실패 로그 저장을 사용하려면</p>
          <p className="mt-1">Supabase SQL Editor에서 <code className="bg-blue-100 px-1 rounded">migrations/20260226_offers_auto_fail_log.sql</code> 파일 내용을 실행해 주세요. 적용 전에도 시술 자동생성은 동작합니다.</p>
        </div>
      )}
      <HospitalOffersPreviewModal
        open={offersModalOpen}
        onClose={onCloseOffersModal}
        payload={offersPayload}
        loading={offersLoading}
        onConfirmSave={onOffersApplyComplete}
        onRetryPoll={onRetryOffersPoll}
        hospitalId={editingHospitalId}
        toast={toast}
      />
        {(editingHospitalId && (hospitalForm.offers_auto_failed_at || hospitalForm.offers_auto_skip)) && (
          <OffersFailureBanner
            hospitalForm={hospitalForm}
            patchHospitalOffersFlags={patchHospitalOffersFlags}
            onRequestOffersPreview={onRequestOffersPreview}
          />
        )}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 lg:p-4 mb-4 rounded-t-2xl flex flex-wrap items-center justify-between gap-y-2 shadow-sm">
        <h2 className="text-base lg:text-xl font-bold shrink-0">{editingHospitalId?'병원 정보 수정':'신규 병원 등록'}</h2>
        <div className="flex items-center gap-2 lg:gap-3 flex-wrap justify-end min-w-0">
          {editingHospitalId && (
            <>
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer shrink-0" title="체크 시 처음부터 Playwright 사용 (수집 부족 시 자동 재시도하므로 선택).">
              <input type="checkbox" checked={!!usePlaywright} onChange={e=>setUsePlaywright?.(e.target.checked)} className="rounded" />
              처음부터 Playwright (선택)
            </label>
            <button
              type="button"
              onClick={async () => {
                if (hospitalForm.offers_auto_skip && patchHospitalOffersFlags) await patchHospitalOffersFlags({ offers_auto_skip: false });
                onRequestOffersPreview?.();
              }}
              disabled={offersLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition disabled:opacity-50 shrink-0"
              title="병원 웹사이트에서 대표 시술 최대 3개 자동 수집·미리보기"
            >
              {offersLoading ? <Loader2 size={14} className="animate-spin"/> : <Stethoscope size={14}/>}
              <span className="hidden sm:inline">{hospitalForm.offers_auto_skip ? '다시 시도' : '대표 시술 3개 자동 생성 (OCR 포함)'}</span>
              <span className="sm:hidden">{hospitalForm.offers_auto_skip ? '다시 시도' : '시술 자동생성'}</span>
            </button>
            </>
          )}
          <EnrichmentPanel
            editingHospitalId={editingHospitalId}
            enrichmentLog={hospitalForm._enrichmentLog}
            onComplete={async (hospital) => {
              if (hospital && handleEditHospital) {
                handleEditHospital(hospital);
              }
              fetchHospitals();
            }}
            toast={toast}
          />
          {editingHospitalId && (
            <button 
              onClick={()=>handleDelete('hospitals', editingHospitalId, fetchHospitals)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
              title="삭제"
            >
              <Trash2 size={18}/>
            </button>
          )}
          <button 
            onClick={handleSaveHospital} 
            disabled={loading}
            className="bg-teal-600 text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-lg font-bold shadow-md hover:bg-teal-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
          >
            {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-8 lg:h-[calc(100vh-180px)] overflow-y-auto">
        <div className="space-y-5 lg:space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400">기본 정보 (필수)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input type="text" placeholder="병원명 (영어/한국어)" value={hospitalForm.name} onChange={e=>setHospitalForm({...hospitalForm, name: e.target.value})} className="w-full p-2 border rounded text-sm"/>
              <input 
                type="number" 
                placeholder="표시 순서 (숫자 작을수록 앞)" 
                value={hospitalForm.displayOrder || ''} 
                onChange={e=>setHospitalForm({...hospitalForm, displayOrder: e.target.value ? e.target.value : null})} 
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-sm font-bold text-gray-700 flex-1">프론트 노출 여부</label>
              <button
                type="button"
                onClick={() => setHospitalForm({...hospitalForm, isPublished: !hospitalForm.isPublished})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  hospitalForm.isPublished ? 'bg-teal-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hospitalForm.isPublished ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-600 w-16">
                {hospitalForm.isPublished ? '노출' : '숨김'}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="text-sm font-bold text-gray-700 flex-1">HEALO 제휴 병원</label>
              <button
                type="button"
                onClick={() => setHospitalForm({...hospitalForm, isPartner: !hospitalForm.isPartner})}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  hospitalForm.isPartner ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hospitalForm.isPartner ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-600 w-16">
                {hospitalForm.isPartner ? '제휴' : '비제휴'}
              </span>
            </div>

            <AddressInput
              value={hospitalForm.location_kr || ''}
              onChange={(address) => setHospitalForm({ ...hospitalForm, location_kr: address })}
              onLocationSelect={(location) => {
                if (location) {
                  setHospitalForm(prev => ({
                    ...prev,
                    location_kr: location.koAddress || prev.location_kr,
                    location_en: location.enAddress || prev.location_en
                  }));
                  toast.success("주소가 입력되었습니다.");
                }
              }}
              placeholder="한국어 주소를 검색하세요"
              language="ko"
            />

            <input
              type="text"
              placeholder="영문 주소 (자동 입력됨, 필요 시 수정)"
              value={hospitalForm.location_en || ''}
              onChange={(e) => setHospitalForm({ ...hospitalForm, location_en: e.target.value })}
              className="w-full p-2 border rounded text-sm"
            />

            <input
              type="text"
              placeholder="상세 주소 (층/호수 등)"
              value={hospitalForm.address_detail || ''}
              onChange={(e) => setHospitalForm({ ...hospitalForm, address_detail: e.target.value })}
              className="w-full p-2 border rounded text-sm"
            />
            <input
              type="url"
              placeholder="웹사이트 (https://...)"
              value={hospitalForm.website || ''}
              onChange={(e) => setHospitalForm({ ...hospitalForm, website: e.target.value })}
              className="w-full p-2 border rounded text-sm"
            />

            <textarea placeholder="병원 소개 (상세 페이지용 설명)" value={hospitalForm.description} onChange={e=>setHospitalForm({...hospitalForm, description: e.target.value})} className="w-full p-2 border rounded text-sm" rows="3"/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <div>
              <h3 className="text-sm font-bold text-teal-600 mb-2 flex items-center gap-1"><Globe size={14}/> 지원 언어</h3>
              <DynamicListInput items={hospitalForm.languages} onAdd={t=>setHospitalForm({...hospitalForm, languages:[...hospitalForm.languages, t]})} onRemove={i=>setHospitalForm({...hospitalForm, languages:hospitalForm.languages.filter((_,x)=>x!==i)})} placeholder="예: 영어, 중국어"/>
            </div>
            <div>
              <h3 className="text-sm font-bold text-teal-600 mb-2 flex items-center gap-1"><Coffee size={14}/> 편의시설</h3>
              <DynamicListInput items={hospitalForm.amenities} onAdd={t=>setHospitalForm({...hospitalForm, amenities:[...hospitalForm.amenities, t]})} onRemove={i=>setHospitalForm({...hospitalForm, amenities:hospitalForm.amenities.filter((_,x)=>x!==i)})} placeholder="예: 와이파이, 픽업"/>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400">이미지 및 태그</h3>
            <DynamicListInput items={hospitalForm.tags} onAdd={t=>setHospitalForm({...hospitalForm, tags:[...hospitalForm.tags, t]})} onRemove={i=>setHospitalForm({...hospitalForm, tags:hospitalForm.tags.filter((_,x)=>x!==i)})} placeholder="태그 입력 (예: 피부과)"/>
            
            <label className="block text-sm font-bold text-gray-500 mt-2">병원 갤러리 이미지</label>
            <p className="text-xs text-teal-600 bg-teal-50 p-2 rounded-lg mb-2 flex items-center gap-2">
              <Info size={14}/> 클릭하여 대표 썸네일 선택 | 파일 업로드 또는 URL 직접 입력 가능
            </p>
            <ImageUploader 
              images={hospitalForm.images} 
              onUpload={async (file, url) => {
                if (url) {
                  setHospitalForm(prev => ({
                    ...prev,
                    images: [...prev.images, url],
                    thumbnailImage: prev.thumbnailImage || url,
                  }));
                  return;
                }
                const uploadedUrl = await uploadToSupabase(file);
                if (uploadedUrl) setHospitalForm(prev => ({
                  ...prev,
                  images: [...prev.images, uploadedUrl],
                  thumbnailImage: prev.thumbnailImage || uploadedUrl,
                }));
              }}
              onRemove={(idx) => setHospitalForm(prev => {
                const removed = prev.images[idx];
                const newImages = prev.images.filter((_, i) => i !== idx);
                return {
                  ...prev,
                  images: newImages,
                  thumbnailImage: prev.thumbnailImage === removed ? (newImages[0] || '') : prev.thumbnailImage,
                };
              })}
              uploading={uploading}
              thumbnailImage={hospitalForm.thumbnailImage}
              onThumbnailSelect={(url) => setHospitalForm(prev => ({...prev, thumbnailImage: url}))}
            />
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><User size={16}/> 대표 원장 프로필</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="이름 (영문/한글)" value={hospitalForm.doctorName} onChange={e=>setHospitalForm({...hospitalForm, doctorName: e.target.value})} className="border p-2 rounded text-sm"/>
              <input placeholder="직함 (예: 대표원장)" value={hospitalForm.doctorTitle} onChange={e=>setHospitalForm({...hospitalForm, doctorTitle: e.target.value})} className="border p-2 rounded text-sm"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="출신 학교 (예: 서울대)" value={hospitalForm.doctorSchool} onChange={e=>setHospitalForm({...hospitalForm, doctorSchool: e.target.value})} className="border p-2 rounded text-sm"/>
              <input placeholder="경력 (예: 15년 이상)" value={hospitalForm.doctorYears} onChange={e=>setHospitalForm({...hospitalForm, doctorYears: e.target.value})} className="border p-2 rounded text-sm"/>
            </div>
            <DynamicListInput items={hospitalForm.doctorSpecialties} onAdd={t=>setHospitalForm({...hospitalForm, doctorSpecialties:[...hospitalForm.doctorSpecialties, t]})} onRemove={i=>setHospitalForm({...hospitalForm, doctorSpecialties:hospitalForm.doctorSpecialties.filter((_,x)=>x!==i)})} placeholder="전문 분야 (예: 코성형)" icon={Trophy}/>
            
            <div className="mt-2">
              <label className="text-xs text-gray-400 font-bold mb-1 block">원장님 프로필 사진</label>
              <p className="text-[10px] text-teal-600 mb-2">1:1 정방형 (400x400px) 필수</p>
              <div className="flex gap-2 items-center">
                {hospitalForm.doctorImage ? (
                  <div className="relative group w-16 h-16 rounded-full overflow-hidden border">
                    <img src={hospitalForm.doctorImage} alt="doc" className="w-full h-full object-cover"/>
                    <button onClick={() => setHospitalForm({...hospitalForm, doctorImage: ''})} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><X size={16}/></button>
                  </div>
                ) : (
                  <div onClick={() => document.getElementById('doc-upload').click()} className="w-16 h-16 rounded-full border border-dashed flex items-center justify-center text-gray-400 cursor-pointer hover:bg-white hover:border-teal-500">
                    {uploading ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
                    <input id="doc-upload" type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async(e)=>{ const url=await uploadToSupabase(e.target.files[0]); if(url) setHospitalForm(prev=>({...prev, doctorImage: url})); }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-teal-600 flex items-center gap-1"><Calendar size={14}/> 운영 시간</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">평일</label>
                <input placeholder="AM 9:00 - PM 6:00" value={hospitalForm.hoursMonFri} onChange={e=>setHospitalForm({...hospitalForm, hoursMonFri: e.target.value})} className="w-full border p-2 rounded text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">토요일</label>
                <input placeholder="AM 9:00 - PM 1:00" value={hospitalForm.hoursSat} onChange={e=>setHospitalForm({...hospitalForm, hoursSat: e.target.value})} className="w-full border p-2 rounded text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">일요일</label>
                <input placeholder="휴무" value={hospitalForm.hoursSun} onChange={e=>setHospitalForm({...hospitalForm, hoursSun: e.target.value})} className="w-full border p-2 rounded text-sm"/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <div>
              <h3 className="text-sm font-bold text-teal-600 mb-2 flex items-center gap-1"><Stethoscope size={14}/> 진료과목</h3>
              <DynamicListInput items={hospitalForm.specialties || []} onAdd={t=>setHospitalForm({...hospitalForm, specialties:[...(hospitalForm.specialties||[]), t]})} onRemove={i=>setHospitalForm({...hospitalForm, specialties:(hospitalForm.specialties||[]).filter((_,x)=>x!==i)})} placeholder="예: 피부과, 성형외과"/>
            </div>
            <div>
              <h3 className="text-sm font-bold text-teal-600 mb-2 flex items-center gap-1"><Activity size={14}/> 의료 장비</h3>
              <DynamicListInput items={hospitalForm.medicalEquipment || []} onAdd={t=>setHospitalForm({...hospitalForm, medicalEquipment:[...(hospitalForm.medicalEquipment||[]), t]})} onRemove={i=>setHospitalForm({...hospitalForm, medicalEquipment:(hospitalForm.medicalEquipment||[]).filter((_,x)=>x!==i)})} placeholder="예: 3D CT, 레이저"/>
            </div>
          </div>

          <div className="space-y-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2"><Building size={16}/> 병원 통계</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">연간 시술 건수</label>
                <input type="number" placeholder="예: 5000" value={hospitalForm.annualSurgeryCount || ''} onChange={e=>setHospitalForm({...hospitalForm, annualSurgeryCount: e.target.value})} className="w-full border p-2 rounded text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">의료진 수</label>
                <input type="number" placeholder="예: 12" value={hospitalForm.doctorCount || ''} onChange={e=>setHospitalForm({...hospitalForm, doctorCount: e.target.value})} className="w-full border p-2 rounded text-sm"/>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">설립일</label>
                <input type="date" value={hospitalForm.establishmentDate || ''} onChange={e=>setHospitalForm({...hospitalForm, establishmentDate: e.target.value})} className="w-full border p-2 rounded text-sm"/>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-green-50 p-4 rounded-xl border border-green-100">
            <h3 className="text-sm font-bold text-green-900 flex items-center gap-2"><Shield size={16}/> 보험 정보</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700 flex-1">보험 적용 가능</label>
              <button type="button" onClick={()=>setHospitalForm({...hospitalForm, insuranceAccepted: !hospitalForm.insuranceAccepted})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hospitalForm.insuranceAccepted?'bg-green-600':'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hospitalForm.insuranceAccepted?'translate-x-6':'translate-x-1'}`}/>
              </button>
            </div>
            {hospitalForm.insuranceAccepted && (
              <DynamicListInput items={hospitalForm.insuranceTypes || []} onAdd={t=>setHospitalForm({...hospitalForm, insuranceTypes:[...(hospitalForm.insuranceTypes||[]), t]})} onRemove={i=>setHospitalForm({...hospitalForm, insuranceTypes:(hospitalForm.insuranceTypes||[]).filter((_,x)=>x!==i)})} placeholder="보험 유형 (예: 국민건강보험, 여행자보험)"/>
            )}
          </div>

          <div className="space-y-3 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
            <h3 className="text-sm font-bold text-yellow-900 flex items-center gap-2"><Star size={16}/> 외부 평점</h3>
            {hospitalForm._existingExternalRatings?.google && (
              <div className="bg-white p-3 rounded-lg border border-yellow-200 mb-2">
                <label className="text-xs font-bold text-gray-500 block mb-1">Google (자동 수집)</label>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400"/>
                    <span className="font-bold">{hospitalForm._existingExternalRatings.google.rating}</span>
                  </span>
                  <span className="text-gray-500">리뷰 {hospitalForm._existingExternalRatings.google.count}개</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">네이버</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.1" min="0" max="5" placeholder="평점 (0-5)" value={hospitalForm.externalNaverRating || ''} onChange={e=>setHospitalForm({...hospitalForm, externalNaverRating: e.target.value})} className="border p-2 rounded text-sm"/>
                  <input type="number" placeholder="리뷰 수" value={hospitalForm.externalNaverCount || ''} onChange={e=>setHospitalForm({...hospitalForm, externalNaverCount: e.target.value})} className="border p-2 rounded text-sm"/>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500">카카오</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" step="0.1" min="0" max="5" placeholder="평점 (0-5)" value={hospitalForm.externalKakaoRating || ''} onChange={e=>setHospitalForm({...hospitalForm, externalKakaoRating: e.target.value})} className="border p-2 rounded text-sm"/>
                  <input type="number" placeholder="리뷰 수" value={hospitalForm.externalKakaoCount || ''} onChange={e=>setHospitalForm({...hospitalForm, externalKakaoCount: e.target.value})} className="border p-2 rounded text-sm"/>
                </div>
              </div>
            </div>
          </div>

          {/* Google 리뷰 관리 */}
          {(hospitalForm.googleReviews?.length > 0) && (
            <div className="space-y-3 bg-orange-50 p-4 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2"><MessageCircle size={16}/> 리뷰 관리</h3>
                <span className="text-xs text-orange-600">{hospitalForm.googleReviews.length}개</span>
              </div>
              {hospitalForm.googleReviews.map((review, idx) => (
                <div key={idx} className={`bg-white p-3 rounded-lg border ${review._hidden ? 'border-red-200 opacity-50' : 'border-orange-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {review.authorPhoto ? (
                        <img src={review.authorPhoto} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer"/>
                      ) : (
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold">{review.author?.[0]}</div>
                      )}
                      <span className="text-xs font-bold text-gray-700">{review.author}</span>
                      <span className="text-[10px] text-gray-400">{review.time}</span>
                      <div className="flex text-yellow-400 gap-0.5">{[...Array(review.rating || 5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => {
                        const updated = [...hospitalForm.googleReviews];
                        updated[idx] = { ...updated[idx], _hidden: !updated[idx]._hidden };
                        setHospitalForm({ ...hospitalForm, googleReviews: updated });
                      }} className={`text-xs px-2 py-0.5 rounded ${review._hidden ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {review._hidden ? '표시' : '숨김'}
                      </button>
                      <button type="button" onClick={() => setHospitalForm({ ...hospitalForm, googleReviews: hospitalForm.googleReviews.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-600">
                        <X size={14}/>
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={review.text || ''}
                    onChange={(e) => {
                      const updated = [...hospitalForm.googleReviews];
                      updated[idx] = { ...updated[idx], text: e.target.value };
                      setHospitalForm({ ...hospitalForm, googleReviews: updated });
                    }}
                    rows={2}
                    className="w-full border border-gray-200 rounded text-xs p-2 resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2"><Calendar size={14}/> 인증 / 자격</h3>
            {(hospitalForm.certifications || []).map((cert, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white border rounded-lg p-2">
                <input placeholder="유형" value={cert.type||''} onChange={e=>{const c=[...(hospitalForm.certifications||[])]; c[idx]={...c[idx],type:e.target.value}; setHospitalForm({...hospitalForm, certifications:c});}} className="flex-1 border p-1.5 rounded text-xs"/>
                <input placeholder="발급기관" value={cert.issuer||''} onChange={e=>{const c=[...(hospitalForm.certifications||[])]; c[idx]={...c[idx],issuer:e.target.value}; setHospitalForm({...hospitalForm, certifications:c});}} className="flex-1 border p-1.5 rounded text-xs"/>
                <input type="date" value={cert.date||''} onChange={e=>{const c=[...(hospitalForm.certifications||[])]; c[idx]={...c[idx],date:e.target.value}; setHospitalForm({...hospitalForm, certifications:c});}} className="border p-1.5 rounded text-xs"/>
                <button onClick={()=>setHospitalForm({...hospitalForm, certifications:(hospitalForm.certifications||[]).filter((_,i)=>i!==idx)})} className="text-red-400 hover:text-red-600"><X size={14}/></button>
              </div>
            ))}
            <button type="button" onClick={()=>setHospitalForm({...hospitalForm, certifications:[...(hospitalForm.certifications||[]), {type:'',issuer:'',date:''}]})} className="text-teal-600 text-xs font-bold flex items-center gap-1 hover:underline">
              <Plus size={12}/> 인증 추가
            </button>
          </div>

          <div className="space-y-3 bg-purple-50 p-4 rounded-xl border border-purple-100">
            <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2"><HelpCircle size={16}/> FAQ</h3>
            {(hospitalForm.faq || []).map((item, idx) => (
              <div key={idx} className="bg-white border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Q{idx + 1}</span>
                  <button onClick={() => setHospitalForm({...hospitalForm, faq: (hospitalForm.faq||[]).filter((_, i) => i !== idx)})} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                </div>
                <input
                  placeholder="질문"
                  value={item.question || ''}
                  onChange={e => { const f = [...(hospitalForm.faq||[])]; f[idx] = {...f[idx], question: e.target.value}; setHospitalForm({...hospitalForm, faq: f}); }}
                  className="w-full border p-2 rounded text-sm"
                />
                <textarea
                  placeholder="답변"
                  rows="2"
                  value={item.answer || ''}
                  onChange={e => { const f = [...(hospitalForm.faq||[])]; f[idx] = {...f[idx], answer: e.target.value}; setHospitalForm({...hospitalForm, faq: f}); }}
                  className="w-full border p-2 rounded text-sm"
                />
              </div>
            ))}
            <button type="button" onClick={() => setHospitalForm({...hospitalForm, faq: [...(hospitalForm.faq||[]), {question: '', answer: ''}]})} className="text-purple-600 text-xs font-bold flex items-center gap-1 hover:underline">
              <Plus size={12}/> FAQ 추가
            </button>
          </div>

          <TranslationPanel
            i18n={hospitalForm.i18n || {}}
            onI18nChange={(newI18n) => setHospitalForm({...hospitalForm, i18n: newI18n})}
            type="hospital"
            entityId={editingHospitalId}
            toast={toast}
          />
        </div>
      </div>
    </div>
  );
}
