import { useState } from 'react';
import { useDeepLinkParam, NUMERIC_ID } from '@/lib/hooks/useDeepLinkParam';
import { RefreshCw, Paperclip, Eye, X, Loader2, BookOpen } from 'lucide-react';
import { formatDate } from "@/lib/i18n/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export const InquiryManager = ({ inquiries, fetchInquiries, handleFileClick }) => {

  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [translationResult, setTranslationResult] = useState(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [resolvingPlaybook, setResolvingPlaybook] = useState(false);
  
  const handleViewDetail = async (inquiryId) => {
    setLoadingDetail(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        alert('⚠️ 세션이 만료되었습니다. 다시 로그인해주세요.');
        return;
      }
      
      const response = await fetch(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.ok) {
        setSelectedInquiry(result.inquiry);
      } else {
        alert(`상세 조회 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('[InquiryManager] Detail fetch error:', error);
      alert('상세 조회 중 오류가 발생했습니다.');
    } finally {
      setLoadingDetail(false);
    }
  };
  
  // 딥링크: 「📬 새 문의 #N」 알림에서 `?inquiry=<id>` 로 들어오면 그 문의 상세를 바로 연다.
  // (예전엔 목록 주소만 줘서, 알림을 눌러도 «그 문의»를 사람이 눈으로 찾아야 했다 — 2026-08-28)
  // ⚠️ 문의 번호는 «숫자만» — 이 값이 그대로 API 경로에 들어가므로 모양을 먼저 거른다.
  useDeepLinkParam('inquiry', (id) => handleViewDetail(id), { pattern: NUMERIC_ID });

  const closeDetailModal = () => {
    setSelectedInquiry(null);
    setTranslationResult(null);
  };
  
  const handleExperimentalTranslation = async () => {
    if (!selectedInquiry?.message) {
      alert('번역할 메시지가 없습니다.');
      return;
    }
    
    setLoadingTranslation(true);
    setTranslationResult(null);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        alert('⚠️ 세션이 만료되었습니다. 다시 로그인해주세요.');
        return;
      }
      
      const response = await fetch('/api/admin/experimental/translate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text: selectedInquiry.message,
          sourceLang: 'en',
          targetLang: 'ko',
        }),
      });
      
      const result = await response.json();
      
      if (result.ok) {
        setTranslationResult(result.result);
      } else {
        alert(`번역 실패: ${result.error}`);
      }
    } catch (error) {
      console.error('[InquiryManager] Translation error:', error);
      alert('번역 중 오류가 발생했습니다.');
    } finally {
      setLoadingTranslation(false);
    }
  };

  const handleResolvePlaybook = async () => {
    if (!selectedInquiry) return;
    if (!confirm('이 문의를 기반으로 대화 스레드를 생성하고 Playbook Draft를 만드시겠습니까?')) return;
    
    setResolvingPlaybook(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) { alert('세션 만료'); return; }
      const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
      const opts = { headers, credentials: 'include' };

      const threadRes = await fetch('/api/admin/chat/threads', {
        method: 'POST', ...opts,
        body: JSON.stringify({
          inquiry_id: selectedInquiry.id,
          subject: selectedInquiry.treatment_type || 'Inquiry Thread',
        }),
      });
      const threadJson = await threadRes.json();
      if (!threadJson.ok) { alert(`스레드 생성 실패: ${threadJson.error}`); return; }
      const threadId = threadJson.thread.id;

      if (selectedInquiry.message) {
        await fetch(`/api/admin/chat/threads/${threadId}/messages`, {
          method: 'POST', ...opts,
          body: JSON.stringify({ actor_type: 'patient', message_text: selectedInquiry.message }),
        });
      }

      const resolveRes = await fetch(`/api/admin/chat/threads/${threadId}/resolve`, {
        method: 'POST', ...opts,
      });
      const resolveJson = await resolveRes.json();
      if (!resolveJson.ok) { alert(`Resolve 실패: ${resolveJson.error}`); return; }

      // 플레이북 화면은 2026-07-24 메뉴 정리로 비활성(미사용·실DB 0행) — 자동 이동하지 않는다.
      // 초안은 /admin/playbook 주소 직접 입력으로 확인 가능(라우트 보존).
      alert(`Playbook Draft 생성 완료! (Score: ${resolveJson.quality_score})`);
      closeDetailModal();
    } catch (e) {
      console.error('[InquiryManager] Resolve error:', e);
      alert('처리 중 오류 발생');
    } finally {
      setResolvingPlaybook(false);
    }
  };

  const StatusBadge = ({ status }) => (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${
      status === 'pending' ? 'bg-amber-100 text-amber-700' :
      status === 'received' ? 'bg-blue-100 text-blue-700' :
      status === 'completed' ? 'bg-green-100 text-green-700' :
      status === 'normalized' ? 'bg-emerald-100 text-emerald-700' :
      status === 'blocked' ? 'bg-orange-100 text-orange-700' :
      status === 'error' ? 'bg-red-100 text-red-700' :
      'bg-gray-100 text-gray-700'
    }`}>
      {status || 'received'}
    </span>
  );

  const InquiryRow = ({ item }) => (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 lg:px-6 py-3 lg:py-4 text-gray-500 text-sm">
        {formatDate(item.created_at, "en")}
      </td>
      <td className="px-4 lg:px-6 py-3 lg:py-4">
        <div className="font-bold text-gray-500">
          {item.first_name} {item.last_name}
          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">마스킹</span>
          {item.is_test && (
            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">시험</span>
          )}
        </div>
        <div className="text-xs text-gray-500">{item.email}</div>
      </td>
      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-600">
        <div>{item.treatment_type}</div>
        <div className="text-xs text-gray-500">{item.contact_method}</div>
      </td>
      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-600">
        <div>{item.nationality || '-'}</div>
        <div className="text-xs mt-1">
          <StatusBadge status={item.status} />
        </div>
      </td>
      <td className="px-4 lg:px-6 py-3 lg:py-4">
        <button
          onClick={() => handleViewDetail(item.id)}
          className="flex items-center gap-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-700 text-white text-xs rounded-lg transition"
          disabled={loadingDetail}
        >
          <Eye size={14} />
          상세보기
        </button>
      </td>
    </tr>
  );

  const InquiryCard = ({ item }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold text-gray-600 text-sm">
            {item.first_name} {item.last_name}
            <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">마스킹</span>
            {item.is_test && (
              <span className="ml-1.5 text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">시험</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{item.email}</div>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDate(item.created_at, "en")}</span>
        <span>{item.nationality || '-'}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-700 font-medium">{item.treatment_type || '-'}</span>
          {item.contact_method && (
            <span className="text-gray-500 ml-2 text-xs">({item.contact_method})</span>
          )}
        </div>
        <button
          onClick={() => handleViewDetail(item.id)}
          className="flex items-center gap-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-700 text-white text-xs rounded-lg transition"
          disabled={loadingDetail}
        >
          <Eye size={14} />
          상세
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold">고객 문의 현황</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] lg:text-xs text-gray-500">
            🔒 목록은 마스킹됩니다
          </span>
          <button onClick={fetchInquiries} aria-label="문의 목록 새로고침" className="p-1.5 hover:bg-gray-100 rounded-lg"><RefreshCw size={18}/></button>
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="hidden lg:block bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-6 py-3">날짜</th>
              <th className="px-6 py-3">고객 정보</th>
              <th className="px-6 py-3">관심 분야</th>
              <th className="px-6 py-3">국가/상태</th>
              <th className="px-6 py-3">액션</th>
            </tr>
          </thead>
          <tbody>{inquiries.map(i => <InquiryRow key={i.id} item={i}/>)}</tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div className="lg:hidden space-y-3">
        {inquiries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">문의가 없습니다.</div>
        ) : (
          inquiries.map(i => <InquiryCard key={i.id} item={i}/>)
        )}
      </div>
      
      {/* Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white rounded-t-2xl lg:rounded-xl shadow-2xl w-full lg:max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 lg:p-6 border-b bg-gradient-to-r from-teal-50 to-blue-50 rounded-t-2xl lg:rounded-t-xl">
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-gray-800">Inquiry Detail</h2>
                <p className="text-[10px] lg:text-xs text-red-600 mt-1">
                  ⚠️ 이 조회는 감사 로그에 기록됩니다
                </p>
              </div>
              <button onClick={closeDetailModal} className="text-gray-500 hover:text-gray-600 transition p-1">
                <X size={22} />
              </button>
            </div>
            
            <div className="p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">ID</label>
                  <div className="text-sm text-gray-800 break-all">{selectedInquiry.id}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Created At</label>
                  <div className="text-sm text-gray-800">{formatDate(selectedInquiry.created_at, "en")}</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-teal-700 mb-3 flex items-center gap-2">
                  <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs">복호화됨</span>
                  개인정보
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold">First Name</label>
                    <div className="text-sm text-gray-800">{selectedInquiry.first_name || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold">Last Name</label>
                    <div className="text-sm text-gray-800">{selectedInquiry.last_name || '-'}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 uppercase font-bold">Email</label>
                    <div className="text-sm text-gray-800 break-all">{selectedInquiry.email || '-'}</div>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 uppercase font-bold">Message</label>
                  <button
                    onClick={handleExperimentalTranslation}
                    disabled={loadingTranslation || !selectedInquiry.message}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs rounded-lg transition disabled:opacity-50"
                  >
                    {loadingTranslation ? (
                      <><Loader2 size={12} className="animate-spin" /> 번역 중...</>
                    ) : (
                      '🔬 번역 실험'
                    )}
                  </button>
                </div>
                <div className="mt-2 p-3 lg:p-4 bg-gray-50 rounded-lg text-sm text-gray-800 max-h-40 overflow-y-auto">
                  {selectedInquiry.message || '-'}
                </div>
              </div>
              
              {translationResult && (
                <div className="border-t pt-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 lg:p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-purple-700">🔬 번역 비교</h3>
                      <span className="text-[10px] lg:text-xs text-purple-600 italic">자동 번역</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-purple-600 font-bold uppercase">Model A</label>
                        <div className="mt-1 p-3 bg-white rounded border border-purple-200 text-sm text-gray-800">
                          {translationResult.translationA}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-purple-600 font-bold uppercase">Model B</label>
                        <div className="mt-1 p-3 bg-white rounded border border-purple-200 text-sm text-gray-800">
                          {translationResult.translationB}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 pt-3 border-t border-purple-200 text-[10px] lg:text-xs text-purple-600">
                      ⚠️ 실험용 번역 결과입니다. DB에 저장되지 않습니다.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-bold text-gray-600 mb-3">추가 정보</h3>
                <div className="grid grid-cols-2 gap-3 lg:gap-4 text-xs">
                  <div>
                    <label className="text-gray-500 uppercase font-bold">Treatment Type</label>
                    <div className="text-gray-800">{selectedInquiry.treatment_type || '-'}</div>
                  </div>
                  <div>
                    <label className="text-gray-500 uppercase font-bold">Contact Method</label>
                    <div className="text-gray-800">{selectedInquiry.contact_method || '-'}</div>
                  </div>
                  <div>
                    <label className="text-gray-500 uppercase font-bold">Nationality</label>
                    <div className="text-gray-800">{selectedInquiry.nationality || '-'}</div>
                  </div>
                  <div>
                    <label className="text-gray-500 uppercase font-bold">Status</label>
                    <div className="text-gray-800">{selectedInquiry.status || '-'}</div>
                  </div>
                </div>
              </div>
              
              {selectedInquiry.attachment && (
                <div className="border-t pt-4">
                  <label className="text-xs text-gray-500 uppercase font-bold">Attachment</label>
                  <button
                    onClick={() => handleFileClick(selectedInquiry.attachment)}
                    className="mt-2 flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
                  >
                    <Paperclip size={14} />
                    파일 보기
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-4 lg:p-6 border-t bg-gray-50 flex justify-between rounded-b-xl">
              <button
                onClick={handleResolvePlaybook}
                disabled={resolvingPlaybook}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm transition disabled:opacity-50"
              >
                {resolvingPlaybook ? (
                  <><Loader2 size={14} className="animate-spin" /> 처리중...</>
                ) : (
                  <><BookOpen size={14} /> Resolve & Playbook Draft</>
                )}
              </button>
              <button
                onClick={closeDetailModal}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      
      {loadingDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl flex items-center gap-3">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-sm font-bold">복호화 중...</span>
          </div>
        </div>
      )}
    </div>
  );
};
