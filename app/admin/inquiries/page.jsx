"use client";

import { useState, useEffect } from "react";
import { InquiryManager } from "./_client/InquiryManager";
import { AdminGuideModal } from "../_components/AdminGuideModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/Toast";
import { X } from "lucide-react";

const supabase = createSupabaseBrowserClient();

export default function InquiriesPage() {
  const toast = useToast();
  const [inquiries, setInquiries] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  // 문의 목록 조회 (마스킹됨)
  const fetchInquiries = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        console.warn('[InquiriesPage] No access token');
        return;
      }

      const response = await fetch('/api/admin/inquiries?limit=200&decrypt=false', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      const result = await response.json();

      if (result.ok) {
        setInquiries(result.inquiries || []);
      } else {
        console.error('[InquiriesPage] API failed:', result.error);
        toast.error(`문의 로딩 실패: ${result.error}`);
        setInquiries([]);
      }
    } catch (error) {
      console.error('[InquiriesPage] fetchInquiries error:', error);
      toast.error("문의 로딩 실패");
      setInquiries([]);
    }
  };


  // 첨부파일 미리보기
  const handleFileClick = async (storagePath) => {
    try {
      console.log('[InquiriesPage] Raw attachment path:', storagePath);

      if (!storagePath) {
        toast.error("첨부파일 경로가 없습니다.");
        return;
      }

      let cleanPath = storagePath;
      if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
      }

      console.log('[InquiriesPage] Cleaned path:', cleanPath);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch('/api/attachments/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ path: cleanPath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signed URL 생성 실패');
      }

      const data = await response.json();
      if (!data.signedUrl) {
        throw new Error('Signed URL이 반환되지 않았습니다.');
      }

      console.log('[InquiriesPage] Signed URL generated successfully');
      setPreviewError(false);
      setSelectedFile(data.signedUrl);
    } catch (err) {
      console.error('[InquiriesPage] handleFileClick exception:', err);
      toast.error("첨부파일 로드 실패");
    }
  };

  // 파일 타입 확인
  const getFileType = (url) => {
    const lowerUrl = url.toLowerCase().split('?')[0];
    if (lowerUrl.endsWith('.pdf')) return 'pdf';
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    return 'unknown';
  };

  const [showGuide, setShowGuide] = useState(false);

  // 첫 로드 시 문의 목록 조회
  useEffect(() => {
    fetchInquiries();
  }, []);

  return (
    <div>
      {showGuide && (
        <AdminGuideModal title="문의관리 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>사이트를 통해 접수된 <strong>고객 문의</strong>를 한곳에서 조회·관리합니다. 문의 내용, 첨부파일, 상태를 확인하고 필요 시 대화 스레드/플레이북 초안 생성으로 이어갈 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>목록에서 문의를 클릭하면 상세(이름, 이메일, 메시지, 첨부파일 등)를 볼 수 있습니다.</li>
              <li>첨부파일은 미리보기 또는 다운로드로 확인할 수 있습니다.</li>
              <li>「From Thread」: 이 문의를 기반으로 대화 스레드를 만들고 Playbook Draft를 생성합니다. 응대 패턴 개선·학습용으로 활용합니다.</li>
            </ul>
          </section>
          <section className="bg-teal-50 rounded-lg p-4">
            <h3 className="text-base font-semibold text-teal-800 mb-1">개인정보</h3>
            <p className="text-teal-700 text-sm">문의 데이터는 암호화·마스킹되어 저장될 수 있으며, 관리자만 복호화하여 조회할 수 있습니다.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>
      <InquiryManager
        inquiries={inquiries}
        fetchInquiries={fetchInquiries}
        handleFileClick={handleFileClick}
      />

      {/* 파일 미리보기 모달 */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-xl shadow-2xl w-full lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-base lg:text-lg">첨부파일 미리보기</h3>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-500 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {previewError ? (
                <div className="text-center text-red-500">
                  <p className="mb-4">파일을 불러올 수 없습니다.</p>
                  <a
                    href={selectedFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 underline hover:text-teal-700"
                  >
                    새 탭에서 열기
                  </a>
                </div>
              ) : (
                <>
                  {getFileType(selectedFile) === 'pdf' && (
                    <iframe
                      src={selectedFile}
                      className="w-full h-[600px] border"
                      title="PDF Preview"
                      onError={() => setPreviewError(true)}
                    />
                  )}
                  {getFileType(selectedFile) === 'image' && (
                    <img
                      src={selectedFile}
                      alt="Attachment"
                      className="max-w-full max-h-[600px] mx-auto"
                      onError={() => setPreviewError(true)}
                    />
                  )}
                  {getFileType(selectedFile) === 'unknown' && (
                    <div className="text-center">
                      <p className="mb-4">미리보기를 지원하지 않는 파일 형식입니다.</p>
                      <a
                        href={selectedFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition"
                      >
                        다운로드
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
