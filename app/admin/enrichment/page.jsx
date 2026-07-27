"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  RefreshCw,
  Building2,
  Globe,
  Sparkles,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ImageIcon,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { AdminGuideModal } from "../_components/AdminGuideModal";

const SOURCE_META = {
  google: { label: "Google Places", icon: Globe, color: "text-blue-600 bg-blue-50" },
  kakao: { label: "Kakao Map", icon: MessageCircle, color: "text-yellow-600 bg-yellow-50" },
  ai: { label: "AI 생성", icon: Sparkles, color: "text-purple-600 bg-purple-50" },
};

export default function EnrichmentPage() {
  const toast = useToast();
  const [hospitals, setHospitals] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [manifest, setManifest] = useState([]);

  const [selectedSources, setSelectedSources] = useState(["google"]);
  const [filter, setFilter] = useState({
    is_published: undefined,
    is_partner: undefined,
    region: "",
    has_no_images: false,
  });
  const [batchLimit, setBatchLimit] = useState(10);

  const [running, setRunning] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [expandedResult, setExpandedResult] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  const fetchManifest = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/hospitals/enrich");
      if (res.ok) {
        const data = await res.json();
        setManifest(data.sources || []);
      }
    } catch {}
  }, []);

  const fetchHospitals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hospitals");
      if (res.ok) {
        const data = await res.json();
        setHospitals(data.hospitals || data || []);
      }
    } catch (_err) {
      toast.error("병원 목록 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifest();
    fetchHospitals();
  }, [fetchManifest, fetchHospitals]);

  const toggleSource = (id) => {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const filteredCount = hospitals.filter((h) => {
    if (filter.is_published !== undefined && h.is_published !== filter.is_published) return false;
    if (filter.is_partner !== undefined && h.is_partner !== filter.is_partner) return false;
    if (filter.region && !(h.location_kr || "").includes(filter.region)) return false;
    if (filter.has_no_images && h.thumbnail_image) return false;
    return true;
  }).length;

  const runBatch = async () => {
    if (selectedSources.length === 0) {
      toast.error("수집 소스를 1개 이상 선택하세요");
      return;
    }

    setRunning(true);
    setBatchResults(null);

    try {
      const res = await fetch("/api/admin/hospitals/enrich/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: selectedSources,
          filter: {
            ...(filter.is_published !== undefined ? { is_published: filter.is_published } : {}),
            ...(filter.is_partner !== undefined ? { is_partner: filter.is_partner } : {}),
            ...(filter.region ? { region: filter.region } : {}),
            ...(filter.has_no_images ? { has_no_images: true } : {}),
          },
          limit: batchLimit,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setBatchResults(data);
        toast.success(`${data.success}/${data.processed}건 수집 완료`);
      } else {
        toast.error(data.error || "배치 실행 실패");
      }
    } catch (_err) {
      toast.error("배치 실행 중 오류 발생");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {showGuide && (
        <AdminGuideModal title="데이터 보강 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>이미 등록된 <strong>병원</strong>에 대해 외부 소스(Google Places, Kakao 등)에서 주소·전화·영업시간·이미지·평점 등을 가져와 DB를 보강합니다. 수집 소스와 필터를 선택한 뒤 일괄 실행합니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>수집 소스: Google Places, Kakao 등 사용할 API를 선택합니다. (API 키 설정 필요)</li>
              <li>필터: 공개 여부·파트너 여부·지역·이미지 유무로 대상 병원을 좁힐 수 있습니다.</li>
              <li>배치 제한: 한 번에 처리할 병원 수를 제한해 API 한도를 지키세요.</li>
              <li>실행 후 결과 요약과 개별 병원 상세를 확인할 수 있습니다.</li>
            </ul>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">권장</h3>
            <p className="text-teal-700 text-sm">병원관리에서 먼저 병원을 등록한 뒤, 여기서 보강하면 해당 병원 정보가 풍부해집니다.</p>
          </section>
        </AdminGuideModal>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="text-teal-700" size={28} />
            데이터 수집
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            등록된 병원의 외부 데이터를 일괄 수집합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            사용 가이드
          </button>
          <button
            onClick={fetchHospitals}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            새로고침
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Source Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-teal-700" />
              수집 소스
            </h3>
            <div className="space-y-2">
              {manifest.map((src) => {
                const meta = SOURCE_META[src.id] || { label: src.name, icon: Database, color: "text-gray-600 bg-gray-50" };
                const Icon = meta.icon;
                const isSelected = selectedSources.includes(src.id);

                return (
                  <button
                    key={src.id}
                    onClick={() => src.available && toggleSource(src.id)}
                    disabled={!src.available}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${
                      isSelected
                        ? "border-teal-300 bg-teal-50"
                        : src.available
                        ? "border-gray-200 hover:border-gray-300 bg-white"
                        : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{meta.label}</div>
                      <div className="text-xs text-gray-500 truncate">{src.description}</div>
                    </div>
                    {isSelected && <CheckCircle2 size={18} className="text-teal-700 shrink-0" />}
                    {!src.available && (
                      <span className="text-xs text-red-500 shrink-0">키 없음</span>
                    )}
                  </button>
                );
              })}
              {manifest.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">소스 로딩 중...</p>
              )}
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Filter size={16} className="text-teal-700" />
              필터 조건
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">공개 상태</label>
                <select
                  value={filter.is_published === undefined ? "" : String(filter.is_published)}
                  onChange={(e) =>
                    setFilter((prev) => ({
                      ...prev,
                      is_published: e.target.value === "" ? undefined : e.target.value === "true",
                    }))
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="">전체</option>
                  <option value="true">공개</option>
                  <option value="false">비공개</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">제휴 여부</label>
                <select
                  value={filter.is_partner === undefined ? "" : String(filter.is_partner)}
                  onChange={(e) =>
                    setFilter((prev) => ({
                      ...prev,
                      is_partner: e.target.value === "" ? undefined : e.target.value === "true",
                    }))
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  <option value="">전체</option>
                  <option value="true">제휴 병원</option>
                  <option value="false">비제휴 병원</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">지역</label>
                <input
                  type="text"
                  placeholder="예: 강남, 서울, 부산"
                  value={filter.region}
                  onChange={(e) => setFilter((prev) => ({ ...prev, region: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filter.has_no_images}
                  onChange={(e) => setFilter((prev) => ({ ...prev, has_no_images: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <ImageIcon size={14} />
                이미지 없는 병원만
              </label>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">최대 처리 수</label>
                <select
                  value={batchLimit}
                  onChange={(e) => setBatchLimit(Number(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
                >
                  {[5, 10, 20, 30, 50].map((n) => (
                    <option key={n} value={n}>{n}건</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 text-sm text-gray-500">
                대상: <span className="font-medium text-gray-800">{filteredCount}</span>건 중{" "}
                <span className="font-medium text-teal-700">{Math.min(filteredCount, batchLimit)}</span>건 처리 예정
              </div>
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={runBatch}
            disabled={running || selectedSources.length === 0}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition ${
              running || selectedSources.length === 0
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-teal-700 hover:bg-teal-800 shadow-lg shadow-teal-200"
            }`}
          >
            {running ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                수집 진행 중...
              </>
            ) : (
              <>
                <Play size={18} />
                배치 수집 실행
              </>
            )}
          </button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          {!batchResults && !running && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Database size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">데이터 수집 준비</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                왼쪽에서 수집 소스와 필터 조건을 설정한 후 배치 수집을 실행하세요.
                Google Places, Kakao Map, AI 생성 등의 소스로 병원 데이터를 자동 보강합니다.
              </p>
            </div>
          )}

          {running && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Loader2 size={48} className="mx-auto text-teal-700 mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">수집 진행 중...</h3>
              <p className="text-sm text-gray-500">
                선택된 소스: {selectedSources.map((s) => SOURCE_META[s]?.label || s).join(", ")}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                소스와 병원 수에 따라 수 분이 소요될 수 있습니다
              </p>
            </div>
          )}

          {batchResults && !running && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-800">{batchResults.processed}</div>
                  <div className="text-xs text-gray-500 mt-1">총 처리</div>
                </div>
                <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{batchResults.success}</div>
                  <div className="text-xs text-gray-500 mt-1">성공</div>
                </div>
                <div className="bg-white rounded-xl border border-red-200 p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">{batchResults.failed}</div>
                  <div className="text-xs text-gray-500 mt-1">실패</div>
                </div>
              </div>

              {/* Results List */}
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                <div className="px-5 py-3 bg-gray-50 rounded-t-xl">
                  <h3 className="font-semibold text-gray-700 text-sm">수집 결과</h3>
                </div>
                {batchResults.results?.map((r, idx) => (
                  <div key={r.id || idx}>
                    <button
                      onClick={() => setExpandedResult(expandedResult === idx ? null : idx)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-left"
                    >
                      {r.success ? (
                        <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                      ) : (
                        <XCircle size={18} className="text-red-500 shrink-0" />
                      )}
                      <Building2 size={16} className="text-gray-500 shrink-0" />
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                        {r.name}
                      </span>
                      {r.sources && (
                        <span className="text-xs text-gray-500">
                          {r.sources.filter((s) => s.success).length}/{r.sources.length} 소스
                        </span>
                      )}
                      {expandedResult === idx ? (
                        <ChevronUp size={16} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-500" />
                      )}
                    </button>

                    {expandedResult === idx && (
                      <div className="px-5 pb-4 pt-1 bg-gray-50">
                        {r.error && (
                          <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
                            <AlertTriangle size={14} />
                            {r.error}
                          </div>
                        )}
                        {r.sources?.map((src) => {
                          const meta = SOURCE_META[src.source] || { label: src.source, color: "text-gray-600 bg-gray-50", icon: Database };
                          const Icon = meta.icon;
                          return (
                            <div
                              key={src.source}
                              className="flex items-center gap-3 py-1.5 text-sm"
                            >
                              <div className={`w-6 h-6 rounded flex items-center justify-center ${meta.color}`}>
                                <Icon size={12} />
                              </div>
                              <span className="text-gray-700 font-medium">{meta.label}</span>
                              {src.success ? (
                                <>
                                  <CheckCircle2 size={14} className="text-green-500" />
                                  <span className="text-xs text-gray-500">
                                    수집: {src.items?.join(", ") || "완료"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} className="text-red-500" />
                                  <span className="text-xs text-red-500">{src.error}</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
