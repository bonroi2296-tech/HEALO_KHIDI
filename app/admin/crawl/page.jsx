"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  Globe,
  MapPin,
  Phone,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Users,
  Star,
  Square,
  MinusSquare,
  MessageCircle,
  Check,
  Info,
  X,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { AdminGuideModal } from "../_components/AdminGuideModal";

const SOURCE_ICONS = {
  hira: Building2,
  google_places: Globe,
  kakao_local: MessageCircle,
  naver_local: Search,
};

const SOURCE_COLORS = {
  hira: "bg-blue-50 text-blue-600 border-blue-200",
  google_places: "bg-green-50 text-green-700 border-green-200",
  kakao_local: "bg-yellow-50 text-yellow-600 border-yellow-200",
  naver_local: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// 임포트 실패 사유 — API 는 보안 규칙(오류 원문 노출 금지)상 코드형만 주므로 여기서 한국어로 풀어 보여준다.
const IMPORT_REASON_LABELS = {
  lookup_failed: "중복 확인 조회 실패",
  duplicate_slug: "같은 주소(slug)의 병원이 이미 있음",
  duplicate_name: "같은 이름의 병원이 이미 있음",
  insert_failed: "DB 저장 실패 (서버 로그 확인)",
  unexpected_error: "알 수 없는 오류 (서버 로그 확인)",
};

const SOURCE_GUIDES = {
  hira: {
    name: "HIRA (건강보험심사평가원)",
    url: "https://opendata.hira.or.kr",
    summary: "대한민국 건강보험심사평가원이 제공하는 공식 요양기관 정보입니다. 전국 모든 의료기관의 인허가 정보, 인력 현황, 시설 정보를 포함합니다.",
    fields: {
      basic: {
        label: "기본 정보",
        items: [
          { field: "병원명", api: "yadmNm", desc: "건강보험에 등록된 공식 요양기관명입니다." },
          { field: "종별구분", api: "clCdNm", desc: "의료기관의 등급을 나타냅니다. 상급종합병원, 종합병원, 병원, 의원, 한의원, 치과의원 등으로 분류됩니다. 예: '상급종합'은 서울대병원급, '의원'은 동네 클리닉입니다." },
          { field: "진료과목", api: "dgsbjtCdNm", desc: "해당 기관이 운영하는 진료 과목명입니다. 내과, 외과, 성형외과 등이 표시됩니다." },
        ],
      },
      location: {
        label: "위치 정보",
        items: [
          { field: "주소", api: "addr", desc: "도로명 주소 또는 지번 주소 전체입니다." },
          { field: "위도/경도", api: "YPos, XPos", desc: "GPS 좌표입니다. 지도에 마커를 표시할 때 사용합니다." },
          { field: "시도/시군구/읍면동", api: "sidoCdNm, sgguCdNm, emdongNm", desc: "행정구역 분류입니다. 지역별 필터링에 활용됩니다." },
          { field: "우편번호", api: "postNo", desc: "우편번호입니다." },
        ],
      },
      contact: {
        label: "연락처",
        items: [
          { field: "전화번호", api: "telno", desc: "대표 전화번호입니다." },
          { field: "홈페이지", api: "hospUrl", desc: "병원 공식 홈페이지 URL입니다." },
        ],
      },
      medical: {
        label: "의료 인력 · 시설",
        items: [
          { field: "의사 총수", api: "drTotCnt", desc: "전문의, 일반의, 인턴, 레지던트를 포함한 전체 의사 수입니다." },
          { field: "전문의/일반의 수", api: "detyGdrCnt, detyGnlMdCnt", desc: "전문의와 일반의를 구분한 수입니다. 전문의 비율이 높을수록 전문성 지표로 활용 가능합니다." },
          { field: "인턴/레지던트 수", api: "detyIntnCnt, detyResdCnt", desc: "수련의 수입니다. 수련병원 여부를 판단하는 지표입니다." },
          { field: "치과의사/한방 의사", api: "sdrCnt, cmdcGdrCnt, cmdcGnlMdCnt", desc: "치과 및 한의학 전문 인력입니다." },
          { field: "간호사 수", api: "pnursCnt", desc: "간호인력 현황입니다. 간호등급 참고 지표로 활용됩니다." },
          { field: "병상 수", api: "hospBdCnt", desc: "허가 병상 수입니다. 기관 규모를 나타냅니다." },
          { field: "응급실(주/야간)", api: "emyDayYn, emyNgtYn", desc: "응급실 운영 여부입니다. Y/N으로 표시됩니다." },
        ],
      },
      extra: {
        label: "기타",
        items: [
          { field: "요양기관기호", api: "ykiho", desc: "HIRA 고유 식별 코드입니다. 장비 정보나 평가 결과 등 추가 API 조회에 사용됩니다." },
          { field: "개설일", api: "estbDd", desc: "의료기관 개설 날짜(YYYYMMDD)입니다. 운영 연차를 계산할 수 있습니다." },
          { field: "종별코드", api: "clCd", desc: "종별구분의 코드 값입니다. 01=상급종합, 11=종합, 21=병원, 28=요양, 31=의원 등" },
        ],
      },
    },
  },
  google_places: {
    name: "Google Places API",
    url: "https://developers.google.com/maps/documentation/places/web-service",
    summary: "Google Maps에 등록된 장소 정보입니다. 사용자 평점과 리뷰, 영업시간, 사진 등 소비자 관점의 데이터가 풍부합니다.",
    fields: {
      basic: {
        label: "기본 정보",
        items: [
          { field: "병원명", api: "displayName", desc: "Google Maps에 등록된 업체명입니다." },
        ],
      },
      location: {
        label: "위치 정보",
        items: [
          { field: "주소", api: "formattedAddress", desc: "Google이 포맷팅한 전체 주소입니다." },
          { field: "짧은 주소", api: "shortFormattedAddress", desc: "구/동 단위까지만 표시하는 축약 주소입니다." },
          { field: "위도/경도", api: "location.latitude/longitude", desc: "GPS 좌표입니다." },
        ],
      },
      contact: {
        label: "연락처 · 링크",
        items: [
          { field: "전화번호", api: "internationalPhoneNumber", desc: "국제 형식 또는 국내 형식의 전화번호입니다." },
          { field: "웹사이트", api: "websiteUri", desc: "병원 공식 웹사이트 URL입니다." },
          { field: "구글맵 링크", api: "googleMapsUri", desc: "Google Maps 상세 페이지 URL입니다. 사용자에게 직접 안내 시 유용합니다." },
        ],
      },
      rating: {
        label: "평점 · 리뷰",
        items: [
          { field: "평점", api: "rating", desc: "Google 사용자 평점입니다 (1.0~5.0). 병원 신뢰도 지표로 활용합니다." },
          { field: "리뷰 수", api: "userRatingCount", desc: "총 리뷰 개수입니다. 평점과 함께 신뢰도 판단에 사용됩니다." },
        ],
      },
      extra: {
        label: "기타",
        items: [
          { field: "영업시간", api: "regularOpeningHours", desc: "요일별 진료시간입니다. 정확도는 병원이 직접 등록했는지에 따라 다릅니다." },
          { field: "영업 상태", api: "businessStatus", desc: "OPERATIONAL(운영중), CLOSED_TEMPORARILY, CLOSED_PERMANENTLY 등입니다." },
          { field: "사진 수", api: "photos.length", desc: "등록된 사진 개수입니다. 사진이 많을수록 활발히 관리되는 곳입니다." },
          { field: "편집자 요약", api: "editorialSummary", desc: "Google 편집자가 작성한 간략 설명입니다. 모든 장소에 있지는 않습니다." },
          { field: "Place ID", api: "id", desc: "Google Place 고유 식별자입니다. 추후 상세 정보 조회에 사용됩니다." },
          { field: "장소 유형", api: "types", desc: "hospital, doctor, dentist, health 등 Google이 분류한 장소 유형입니다." },
        ],
      },
    },
  },
  kakao_local: {
    name: "Kakao Local Search API",
    url: "https://developers.kakao.com/docs/latest/ko/local/dev-guide",
    summary: "카카오맵 기반의 로컬 검색 데이터입니다. 한국 내 장소의 카테고리 분류와 좌표 정보가 정확합니다.",
    fields: {
      basic: {
        label: "기본 정보",
        items: [
          { field: "장소명", api: "place_name", desc: "카카오맵에 등록된 장소명입니다." },
        ],
      },
      location: {
        label: "위치 정보",
        items: [
          { field: "도로명주소", api: "road_address_name", desc: "도로명 주소입니다." },
          { field: "지번주소", api: "address_name", desc: "구주소(지번) 형태입니다. 도로명이 없는 곳에서 보조로 사용됩니다." },
          { field: "위도/경도", api: "y, x", desc: "WGS84 좌표입니다." },
        ],
      },
      contact: {
        label: "연락처 · 링크",
        items: [
          { field: "전화번호", api: "phone", desc: "전화번호입니다. 등록되지 않은 경우 빈 값입니다." },
          { field: "카카오맵 URL", api: "place_url", desc: "카카오맵 상세 페이지 링크입니다." },
        ],
      },
      medical: {
        label: "분류",
        items: [
          { field: "카테고리", api: "category_name", desc: "카카오의 카테고리 분류입니다. 예: '의료,건강 > 병원 > 성형외과'. 진료 분야를 자동 태깅하는 데 유용합니다." },
        ],
      },
      extra: {
        label: "기타",
        items: [
          { field: "카테고리코드", api: "category_group_code", desc: "HP8(병원), PM9(약국) 등 대분류 코드입니다." },
          { field: "Kakao ID", api: "id", desc: "카카오 장소 고유 ID입니다. 중복 체크에 활용됩니다." },
          { field: "검색거리", api: "distance", desc: "검색 중심좌표로부터의 거리(m)입니다. 반경 검색 시 참고됩니다." },
        ],
      },
    },
  },
  naver_local: {
    name: "Naver Local Search API",
    url: "https://developers.naver.com/docs/serviceapi/search/local/local.md",
    summary: "네이버 검색 기반의 로컬 업체 정보입니다. 네이버 플레이스에 등록된 업체 설명과 카테고리 정보를 제공합니다.",
    fields: {
      basic: {
        label: "기본 정보",
        items: [
          { field: "업체명", api: "title", desc: "네이버에 등록된 업체명입니다. HTML 태그가 포함될 수 있어 자동으로 제거합니다." },
        ],
      },
      location: {
        label: "위치 정보",
        items: [
          { field: "도로명주소", api: "roadAddress", desc: "도로명 주소입니다." },
          { field: "지번주소", api: "address", desc: "지번 주소입니다." },
          { field: "위도/경도", api: "mapy, mapx", desc: "KATECH 좌표를 WGS84로 변환한 GPS 좌표입니다." },
        ],
      },
      contact: {
        label: "연락처 · 링크",
        items: [
          { field: "전화번호", api: "telephone", desc: "전화번호입니다." },
          { field: "네이버 링크", api: "link", desc: "네이버 상세 페이지 URL입니다." },
        ],
      },
      medical: {
        label: "분류",
        items: [
          { field: "카테고리", api: "category", desc: "네이버의 카테고리 분류입니다. 예: '병원 > 성형외과 > 코성형'. 세부 진료 분야 태깅에 유용합니다." },
        ],
      },
      extra: {
        label: "기타",
        items: [
          { field: "설명", api: "description", desc: "업체 소개 텍스트입니다. 네이버 플레이스에 등록된 정보입니다." },
        ],
      },
    },
  },
};

export default function CrawlPage() {
  const toast = useToast();
  const [manifest, setManifest] = useState([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);

  // Search config — now arrays
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showGuide, setShowGuide] = useState(false);
  const [showPageGuide, setShowPageGuide] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [searchLimit, setSearchLimit] = useState(20);

  // Results
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchManifest = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/crawl");
      if (res.ok) {
        const data = await res.json();
        setManifest(data.sources || []);
      }
    } catch {
      toast.error("소스 목록 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchManifest(); }, [fetchManifest]);

  const sourceConfig = manifest.find((s) => s.id === selectedSource);

  const initFieldDefaults = useCallback((src) => {
    if (!src?.fields) return;
    setSelectedFields(src.fields.filter((f) => f.defaultOn).map((f) => f.key));
  }, []);

  const toggleField = (key) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleRegion = (key) => {
    setSelectedRegions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleSpec = (key) => {
    setSelectedSpecs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSearch = async () => {
    if (!selectedSource) return;
    setSearching(true);
    setResults(null);
    setSelectedItems(new Set());

    try {
      const res = await fetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: selectedSource,
          regions: selectedRegions.length > 0 ? selectedRegions : undefined,
          specialties: selectedSpecs.length > 0 ? selectedSpecs : undefined,
          fields: selectedFields.length > 0 ? selectedFields : undefined,
          keyword: keyword || undefined,
          limit: searchLimit,
          page: currentPage,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setResults(data);
        setStep(3);
        toast.success(`${data.items?.length || 0}건 검색 완료`);
      } else {
        toast.error(data.detail || data.error || "검색 실패");
      }
    } catch {
      toast.error("검색 중 오류 발생");
    } finally {
      setSearching(false);
    }
  };

  const toggleItem = (idx) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (!results?.items) return;
    const importable = results.items.map((item, idx) => ({ item, idx })).filter(({ item }) => !item._existsInDB);
    if (selectedItems.size === importable.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(importable.map(({ idx }) => idx)));
    }
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) return toast.error("임포트할 항목을 선택하세요");
    setImporting(true);
    const items = results.items.filter((_, idx) => selectedItems.has(idx));

    try {
      const res = await fetch("/api/admin/crawl", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportResult(data);
        setStep(4);
        toast.success(`${data.imported}건 등록 완료`);
      } else {
        toast.error(data.error || "임포트 실패");
      }
    } catch {
      toast.error("임포트 중 오류 발생");
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setSelectedSource(null);
    setSelectedRegions([]);
    setSelectedSpecs([]);
    setSelectedFields([]);
    setExpandedGroups(new Set());
    setKeyword("");
    setResults(null);
    setSelectedItems(new Set());
    setImportResult(null);
    setCurrentPage(1);
  };

  // ═══════════════════════════════════════════
  // STEP 1 — Source Selection
  // ═══════════════════════════════════════════
  if (step === 1) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {showPageGuide && (
          <AdminGuideModal title="데이터 크롤링 가이드" onClose={() => setShowPageGuide(false)}>
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
              <p>외부 공개 데이터(HIRA, Google Places, Kakao 등)에서 <strong>병원 정보를 검색·선택해 DB에 등록</strong>하는 도구입니다. 소스 선택 → 검색 조건 설정 → 결과에서 선택 → 수집/다운로드 순으로 진행합니다.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-2">흐름</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li><strong>1. 데이터 소스 선택</strong>: HIRA, Google Places 등 사용할 소스를 고릅니다. (API 키가 필요한 소스는 .env 설정 필요)</li>
                <li><strong>2. 검색 조건 설정</strong>: 지역·과목·수집 필드·키워드 등을 선택합니다. 「필드 가이드」로 각 소스 필드 설명을 볼 수 있습니다.</li>
                <li><strong>3. 검색 실행 후 결과</strong>: 조건에 맞는 항목을 선택해 DB 등록 또는 CSV 다운로드합니다.</li>
              </ol>
            </section>
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-2">파이프라인과의 관계</h3>
              <p className="text-gray-600 text-sm">정기 자동 수집은 <strong>크롤링 파이프라인</strong> 페이지에서 스케줄·수동 실행을 설정합니다. 이 페이지는 수동으로 한 번씩 검색·등록할 때 사용합니다.</p>
            </section>
          </AdminGuideModal>
        )}
        <Header onGuideClick={() => setShowPageGuide(true)} />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">1. 데이터 소스 선택</h2>
          <p className="text-sm text-gray-500 mb-6">병원 데이터를 수집할 외부 소스를 선택하세요</p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-teal-700" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {manifest.map((src) => {
                const Icon = SOURCE_ICONS[src.id] || Building2;
                const colorClass = SOURCE_COLORS[src.id] || "bg-gray-50 text-gray-600 border-gray-200";

                return (
                  <button
                    key={src.id}
                    onClick={() => {
                    if (!src.available) return;
                    setSelectedSource(src.id);
                    setSelectedRegions([]);
                    setSelectedSpecs([]);
                    initFieldDefaults(src);
                    setStep(2);
                    }}
                    disabled={!src.available}
                    className={`text-left p-5 rounded-xl border-2 transition ${
                      src.available
                        ? "border-gray-200 hover:border-teal-400 hover:shadow-md"
                        : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorClass}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{src.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{src.description}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                            지역 {src.regions?.length || 0}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                            과목 {src.specialties?.length || 0}
                          </span>
                        </div>
                        {!src.available && (
                          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            키 필요: {src.requiredEnvKeys.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 2 — Search Config (checkbox multi-select)
  // ═══════════════════════════════════════════
  if (step === 2 && sourceConfig) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        {showPageGuide && (
          <AdminGuideModal title="데이터 크롤링 가이드" onClose={() => setShowPageGuide(false)}>
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
              <p>외부 공개 데이터(HIRA, Google Places, Kakao 등)에서 <strong>병원 정보를 검색·선택해 DB에 등록</strong>하는 도구입니다.</p>
            </section>
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-2">흐름</h3>
              <p className="text-gray-600 text-sm">소스 선택 → 검색 조건(지역·과목·필드)·실행 → 결과에서 선택 후 DB 등록 또는 다운로드. 「필드 가이드」로 소스별 필드 설명을 볼 수 있습니다.</p>
            </section>
          </AdminGuideModal>
        )}
        <Header onGuideClick={() => setShowPageGuide(true)} />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">2. 검색 조건 설정</h2>
            <button onClick={resetAll} className="text-sm text-gray-500 hover:text-gray-700">← 소스 재선택</button>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium mb-6">
            {(() => { const Icon = SOURCE_ICONS[sourceConfig.id] || Building2; return <Icon size={16} />; })()}
            {sourceConfig.name}
          </div>

          {/* Regions — compact grid */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                지역
                {selectedRegions.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-teal-700">{selectedRegions.length}개 선택</span>
                )}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedRegions(sourceConfig.regions.map((r) => r.key))}
                  className="text-xs text-teal-700 hover:underline"
                >전체</button>
                <button
                  onClick={() => setSelectedRegions([])}
                  className="text-xs text-gray-500 hover:underline"
                >해제</button>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-1.5">
              {sourceConfig.regions?.map((r) => {
                const active = selectedRegions.includes(r.key);
                return (
                  <button
                    key={r.key}
                    onClick={() => toggleRegion(r.key)}
                    className={`px-2 py-1.5 rounded-md text-xs text-center transition ${
                      active
                        ? "bg-teal-700 text-white font-medium shadow-sm"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specialties — compact grid + detail panel */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                진료과목
                {selectedSpecs.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-blue-600">
                    {selectedSpecs.length}개 그룹 · {sourceConfig.specialties
                      .filter((s) => selectedSpecs.includes(s.key))
                      .reduce((sum, s) => sum + (s.subSpecialties?.length || 1), 0)}개 세부과목
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSpecs(sourceConfig.specialties.map((s) => s.key))}
                  className="text-xs text-teal-700 hover:underline"
                >전체</button>
                <button
                  onClick={() => setSelectedSpecs([])}
                  className="text-xs text-gray-500 hover:underline"
                >해제</button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
              {sourceConfig.specialties?.map((s) => {
                const active = selectedSpecs.includes(s.key);
                const inspecting = expandedGroups.has(s.key);
                const subs = s.subSpecialties || [];
                const hasSubs = subs.length > 1;

                return (
                  <div
                    key={s.key}
                    className={`flex items-stretch rounded-lg text-xs transition border overflow-hidden ${
                      active
                        ? "bg-blue-600 border-blue-600 shadow-sm"
                        : inspecting
                          ? "bg-blue-50 border-blue-300"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                    title={s.labelEn}
                  >
                    <button
                      onClick={() => toggleSpec(s.key)}
                      className={`flex-1 min-w-0 px-2.5 py-2 text-left truncate ${
                        active ? "text-white font-medium" : "text-gray-600"
                      }`}
                    >
                      {s.label}
                    </button>
                    {hasSubs && (
                      <button
                        onClick={() => setExpandedGroups((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.key)) next.delete(s.key);
                          else { next.clear(); next.add(s.key); }
                          return next;
                        })}
                        className={`flex items-center justify-center w-9 shrink-0 transition ${
                          active
                            ? "bg-blue-700 text-white hover:bg-blue-800 border-l border-blue-500"
                            : inspecting
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-l border-blue-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-l border-gray-200"
                        }`}
                        title={`세부과목 ${subs.length}개 보기`}
                      >
                        <span className="text-[11px] font-semibold leading-none">{subs.length}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sub-specialty detail panel */}
            {(() => {
              const expandedKey = [...expandedGroups][0];
              const group = expandedKey && sourceConfig.specialties?.find((s) => s.key === expandedKey);
              if (!group || (group.subSpecialties?.length || 0) <= 1) return null;

              return (
                <div className="mt-2 bg-blue-50/50 border border-blue-200 rounded-lg px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-blue-700">{group.label}</span>
                      <span className="text-xs text-blue-500">{group.labelEn}</span>
                      <span className="text-[10px] text-blue-400">{group.subSpecialties.length}개 세부과목</span>
                    </div>
                    <button
                      onClick={() => setExpandedGroups(new Set())}
                      className="text-xs text-gray-500 hover:text-gray-600"
                    >닫기</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.subSpecialties.map((sub) => (
                      <span
                        key={sub.code}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-blue-100 rounded-md text-xs text-gray-700"
                      >
                        <span className="text-blue-400 font-mono text-[10px]">{sub.code}</span>
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Fields — grouped by category */}
          {sourceConfig.fields?.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">수집 데이터 필드</label>
                  <button
                    onClick={() => setShowGuide(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition"
                  >
                    <BookOpen size={12} />
                    필드 가이드
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedFields(sourceConfig.fields.map((f) => f.key))}
                    className="text-xs text-teal-700 hover:underline"
                  >전체 선택</button>
                  <button
                    onClick={() => setSelectedFields(sourceConfig.fields.filter((f) => f.defaultOn).map((f) => f.key))}
                    className="text-xs text-blue-600 hover:underline"
                  >기본값</button>
                  <button
                    onClick={() => setSelectedFields([])}
                    className="text-xs text-gray-500 hover:underline"
                  >해제</button>
                </div>
              </div>

              {(() => {
                const CATEGORY_LABELS = {
                  basic: "기본 정보",
                  location: "위치 정보",
                  contact: "연락처",
                  medical: "의료 정보",
                  rating: "평점/리뷰",
                  extra: "기타",
                };
                const CATEGORY_COLORS = {
                  basic: "border-l-teal-500",
                  location: "border-l-blue-500",
                  contact: "border-l-green-500",
                  medical: "border-l-purple-500",
                  rating: "border-l-yellow-500",
                  extra: "border-l-gray-400",
                };
                const grouped = {};
                for (const f of sourceConfig.fields) {
                  if (!grouped[f.category]) grouped[f.category] = [];
                  grouped[f.category].push(f);
                }

                return (
                  <div className="space-y-3">
                    {Object.entries(grouped).map(([cat, fields]) => (
                      <div key={cat} className={`border-l-4 ${CATEGORY_COLORS[cat] || "border-l-gray-300"} bg-gray-50 rounded-r-lg px-4 py-3`}>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {CATEGORY_LABELS[cat] || cat}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {fields.map((f) => {
                            const active = selectedFields.includes(f.key);
                            return (
                              <button
                                key={f.key}
                                onClick={() => toggleField(f.key)}
                                title={f.description}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition ${
                                  active
                                    ? "bg-white border-teal-300 text-teal-700 font-medium shadow-sm"
                                    : "bg-white/60 border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                              >
                                <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                                  active ? "bg-teal-700 border-teal-600" : "border-gray-300"
                                }`}>
                                  {active && <Check size={10} className="text-white" />}
                                </div>
                                {f.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <p className="text-xs text-gray-500 mt-2">
                각 필드에 마우스를 올리면 원본 API 필드명을 볼 수 있습니다. 선택한 필드만 결과에 포함됩니다.
              </p>
            </div>
          )}

          {/* Keyword + Limit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">키워드 (선택)</label>
              <input
                type="text"
                placeholder="예: 강남, 연세, 아이디 ..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">최대 검색 수</label>
              <select
                value={searchLimit}
                onChange={(e) => setSearchLimit(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}건</option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4 text-sm text-gray-600">
            <span className="font-medium text-gray-800">검색 조합:</span>{" "}
            {selectedRegions.length || "전체"} 지역 × {selectedSpecs.length || "기본"} 과목
            {selectedRegions.length > 0 && selectedSpecs.length > 0 && (
              <span className="text-gray-500"> = {selectedRegions.length * selectedSpecs.length} API 호출</span>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={searching}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition ${
              searching ? "bg-gray-300 cursor-not-allowed" : "bg-teal-700 hover:bg-teal-800 shadow-lg shadow-teal-200"
            }`}
          >
            {searching ? (
              <><Loader2 size={18} className="animate-spin" /> 검색 중... (조합에 따라 수십 초 소요)</>
            ) : (
              <><Search size={18} /> 검색 실행</>
            )}
          </button>
        </div>

        {showGuide && (
          <FieldGuideModal sourceId={selectedSource} onClose={() => setShowGuide(false)} />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 3 — Results
  // ═══════════════════════════════════════════
  if (step === 3 && results) {
    const items = results.items || [];
    const importableCount = items.filter((i) => !i._existsInDB).length;
    const allImportableSelected = importableCount > 0 && selectedItems.size === importableCount;

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {showPageGuide && (
          <AdminGuideModal title="데이터 크롤링 가이드" onClose={() => setShowPageGuide(false)}>
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
              <p>외부 공개 데이터에서 병원 정보를 검색·선택해 DB에 등록하는 도구입니다. 결과에서 신규 항목을 선택해 등록하거나 CSV로 내보낼 수 있습니다.</p>
            </section>
          </AdminGuideModal>
        )}
        <Header onGuideClick={() => setShowPageGuide(true)} />

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              ← 검색 조건
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <span className="text-sm text-gray-700">
              로드 <span className="font-bold text-gray-900">{items.length}</span>건
            </span>
            <span className="text-sm">
              신규 <span className="font-bold text-green-700">{importableCount}</span> / 중복 <span className="font-bold text-orange-500">{items.length - importableCount}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleAll} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800">
              {allImportableSelected ? <MinusSquare size={16} /> : <CheckCircle2 size={16} />}
              {allImportableSelected ? "전체 해제" : "신규 전체 선택"}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedItems.size === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                importing || selectedItems.size === 0
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-teal-700 text-white hover:bg-teal-800"
              }`}
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              선택 임포트 ({selectedItems.size}건)
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {items.map((item, idx) => {
            const exists = item._existsInDB;
            const isSelected = selectedItems.has(idx);

            return (
              <div
                key={idx}
                onClick={() => !exists && toggleItem(idx)}
                className={`flex items-center gap-4 px-5 py-3 cursor-pointer transition ${
                  exists ? "bg-orange-50/50 cursor-default" : isSelected ? "bg-teal-50/50" : "hover:bg-gray-50"
                }`}
              >
                <div className={exists ? "text-gray-300" : ""}>
                  {exists ? (
                    <XCircle size={20} className="text-orange-400" />
                  ) : isSelected ? (
                    <CheckCircle2 size={20} className="text-teal-700" />
                  ) : (
                    <Square size={20} className="text-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${exists ? "text-gray-500 line-through" : "text-gray-800"}`}>
                      {item.name}
                    </span>
                    {exists && <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full">이미 등록됨</span>}
                    {item._meta?.rating && (
                      <span className="text-xs flex items-center gap-0.5 text-yellow-600">
                        <Star size={12} fill="currentColor" /> {item._meta.rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {item.location_kr && <span className="flex items-center gap-1 truncate max-w-[280px]"><MapPin size={11} /> {item.location_kr}</span>}
                    {item.phone && <span className="flex items-center gap-1"><Phone size={11} /> {item.phone}</span>}
                    {item.doctor_count && <span className="flex items-center gap-1"><Users size={11} /> {item.doctor_count}명</span>}
                    {item.website && (
                      <a
                        href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-teal-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={11} /> 웹사이트
                      </a>
                    )}
                  </div>
                  {item.specialties?.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {item.specialties.map((s, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="shrink-0 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{item._sourceId}</span>
              </div>
            );
          })}

          {items.length === 0 && <div className="py-12 text-center text-gray-600">검색 결과가 없습니다</div>}
        </div>

        {results.hasMore && (
          <div className="flex justify-center">
            <button
              onClick={() => { setCurrentPage((p) => p + 1); handleSearch(); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              다음 페이지 <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 4 — Import Results
  // ═══════════════════════════════════════════
  if (step === 4 && importResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {showPageGuide && (
          <AdminGuideModal title="데이터 크롤링 가이드" onClose={() => setShowPageGuide(false)}>
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
              <p>외부 공개 데이터에서 병원 정보를 검색·선택해 DB에 등록하는 도구입니다. 등록 결과 요약을 확인한 뒤, 병원관리에서 상세를 편집할 수 있습니다.</p>
            </section>
          </AdminGuideModal>
        )}
        <Header onGuideClick={() => setShowPageGuide(true)} />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">임포트 결과</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-800">{importResult.total}</div>
              <div className="text-xs text-gray-500 mt-1">총 요청</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-700">{importResult.imported}</div>
              <div className="text-xs text-gray-500 mt-1">등록 성공</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
              <div className="text-xs text-gray-500 mt-1">실패/중복</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            {importResult.results?.map((r, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {r.success ? <CheckCircle2 size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-red-600 shrink-0" />}
                <span className="flex-1 font-medium text-gray-700 truncate">{r.name}</span>
                {r.success ? (
                  <span className="text-xs text-green-700">/{r.slug}</span>
                ) : (
                  <span className="text-xs text-red-600">{IMPORT_REASON_LABELS[r.reason] || r.reason}</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={resetAll} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
              새로 검색
            </button>
            <a href="/admin/hospitals" className="flex-1 py-2.5 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 transition text-center">
              병원 관리로 이동
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function FieldGuideModal({ sourceId, onClose }) {
  const guide = SOURCE_GUIDES[sourceId];
  if (!guide) return null;

  const CATEGORY_DOT = {
    basic: "bg-teal-700",
    location: "bg-blue-500",
    contact: "bg-green-500",
    medical: "bg-purple-500",
    rating: "bg-yellow-500",
    extra: "bg-gray-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600" />
              필드 가이드
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{guide.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-800">{guide.summary}</p>
            <a
              href={guide.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
            >
              <ExternalLink size={11} />
              공식 API 문서 보기
            </a>
          </div>

          {/* Categories */}
          {Object.entries(guide.fields).map(([catKey, cat]) => (
            <div key={catKey}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_DOT[catKey] || "bg-gray-400"}`} />
                <h4 className="text-sm font-bold text-gray-800">{cat.label}</h4>
              </div>
              <div className="space-y-2">
                {cat.items.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{item.field}</span>
                      <code className="text-[11px] text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded font-mono">{item.api}</code>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ onGuideClick }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Search className="text-teal-700" size={28} />
          병원 데이터 크롤링
        </h1>
        <p className="text-sm text-gray-500 mt-1">외부 공개 데이터에서 병원 정보를 검색하고 선택적으로 DB에 등록합니다</p>
      </div>
      <div className="flex items-center gap-2">
        {onGuideClick && (
          <button
            type="button"
            onClick={onGuideClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            사용 가이드
          </button>
        )}
        <a
          href="/admin/crawl/pipeline"
          className="px-3 py-2 text-sm text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition font-medium"
        >
          파이프라인
        </a>
      </div>
    </div>
  );
}
