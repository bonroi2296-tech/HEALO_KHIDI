"use client";

import { useEffect, useState } from "react";
import { AdminGuideModal } from "../_components/AdminGuideModal";

type InquiryRow = {
  id: number;
  email?: string | null;
  treatment_type?: string | null;
  message?: string | null;
};

export default function RagAdminPage() {
  const [showGuide, setShowGuide] = useState(false);
  const [normalizeText, setNormalizeText] = useState("");
  const [selectedInquiryId, setSelectedInquiryId] = useState<string>("");
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [normalizeResult, setNormalizeResult] = useState<any>(null);

  const [ingestSourceType, setIngestSourceType] = useState("treatment");
  const [ingestSourceId, setIngestSourceId] = useState("");
  const [ingestResult, setIngestResult] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLang, setSearchLang] = useState("en");
  const [searchResult, setSearchResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/rag/inquiries")
      .then((r) => r.json())
      .then((data) => setInquiries(data?.rows || []))
      .catch(() => setInquiries([]));
  }, []);

  const handleNormalize = async () => {
    setNormalizeResult(null);
    const payload: any = {};
    if (normalizeText.trim()) payload.text = normalizeText.trim();
    if (selectedInquiryId) payload.inquiry_id = Number(selectedInquiryId);
    const res = await fetch("/api/inquiry/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setNormalizeResult(data);
  };

  const handleIngest = async () => {
    setIngestResult(null);
    const payload: any = { sourceTypes: [ingestSourceType] };
    if (ingestSourceId.trim()) payload.source_id = ingestSourceId.trim();
    const res = await fetch("/api/rag/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setIngestResult(data);
  };

  const handleSearch = async () => {
    setSearchResult(null);
    const res = await fetch("/api/rag/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: searchQuery.trim(),
        lang: searchLang,
      }),
    });
    const data = await res.json();
    setSearchResult(data);
  };

  return (
    <div className="space-y-10">
      {showGuide && (
        <AdminGuideModal title="RAG 관리 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>AI 챗봇이 참조하는 <strong>RAG(검색 기반 생성)</strong>를 테스트·점검하는 도구입니다. 문의 정규화, 소스별 수집(ingest), 검색 결과를 직접 호출해 동작을 확인할 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">기능</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>정규화</strong>: 문의 텍스트 또는 기존 문의 ID로 정규화 API를 호출합니다.</li>
              <li><strong>수집(Ingest)</strong>: treatment 등 소스 타입·ID를 지정해 RAG 문서/캐릭을 생성·갱신합니다.</li>
              <li><strong>검색</strong>: 쿼리와 언어로 RAG 검색 API를 호출해 반환 청크를 확인합니다.</li>
            </ul>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">추가</h3>
            <p className="text-teal-700 text-sm">RAG 문서·Tier 관리는 좌측 메뉴 「RAG 문서/Tier」에서 할 수 있습니다.</p>
          </section>
        </AdminGuideModal>
      )}
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RAG 테스트</h1>
          <p className="text-gray-500 mt-2">정규화/수집/검색용 최소 도구</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </section>

      <section className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">A) 문의 정규화 테스트</h2>
        <textarea
          className="w-full border rounded-lg p-3"
          rows={4}
          placeholder="문의 내용을 붙여넣기..."
          value={normalizeText}
          onChange={(e) => setNormalizeText(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <select
            className="border rounded-lg p-2"
            value={selectedInquiryId}
            onChange={(e) => setSelectedInquiryId(e.target.value)}
          >
            <option value="">문의 폼 레코드 선택</option>
            {inquiries.map((row) => (
              <option key={row.id} value={row.id}>
                {row.id} {row.email ? `- ${row.email}` : ""}
              </option>
            ))}
          </select>
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700" onClick={handleNormalize}>
            정규화 실행
          </button>
        </div>
        <pre className="bg-gray-50 border rounded-lg p-4 overflow-auto text-xs">
          {normalizeResult ? JSON.stringify(normalizeResult, null, 2) : "—"}
        </pre>
      </section>

      <section className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">B) 수집(ingest) 테스트</h2>
        <div className="flex items-center gap-3">
          <select
            className="border rounded-lg p-2"
            value={ingestSourceType}
            onChange={(e) => setIngestSourceType(e.target.value)}
          >
            <option value="treatment">시술 (treatment)</option>
            <option value="hospital">병원 (hospital)</option>
            <option value="review">리뷰 (review)</option>
            <option value="normalized_inquiry">정규화 문의 (normalized_inquiry)</option>
          </select>
          <input
            className="border rounded-lg p-2 flex-1"
            placeholder="source_id (선택)"
            value={ingestSourceId}
            onChange={(e) => setIngestSourceId(e.target.value)}
          />
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700" onClick={handleIngest}>
            수집 실행
          </button>
        </div>
        <pre className="bg-gray-50 border rounded-lg p-4 overflow-auto text-xs">
          {ingestResult ? JSON.stringify(ingestResult, null, 2) : "—"}
        </pre>
      </section>

      <section className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">C) 검색 테스트</h2>
        <div className="flex items-center gap-3">
          <input
            className="border rounded-lg p-2 flex-1"
            placeholder="검색어..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="border rounded-lg p-2"
            value={searchLang}
            onChange={(e) => setSearchLang(e.target.value)}
          >
            <option value="en">en</option>
            <option value="ko">ko</option>
            <option value="ja">ja</option>
          </select>
          <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700" onClick={handleSearch}>
            검색
          </button>
        </div>
        <pre className="bg-gray-50 border rounded-lg p-4 overflow-auto text-xs">
          {searchResult ? JSON.stringify(searchResult, null, 2) : "—"}
        </pre>
      </section>
    </div>
  );
}
