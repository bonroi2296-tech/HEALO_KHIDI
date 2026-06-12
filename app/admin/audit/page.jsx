"use client";

import { useState, useEffect } from "react";
import { AdminAuditPage } from "./_client/AdminAuditPage";
import { AdminGuideModal } from "../_components/AdminGuideModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export default function AuditLogsPage() {
  const [accessToken, setAccessToken] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      setAccessToken(token);
    };
    fetchToken();
  }, []);

  return (
    <div className="space-y-4">
      {showGuide && (
        <AdminGuideModal title="감사로그 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>관리자 및 시스템의 <strong>주요 행동 기록</strong>을 조회합니다. 로그인, API 호출, 데이터 변경 등이 기록되어 보안 감사·추적에 활용됩니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">사용법</h3>
            <p className="text-gray-600 text-sm">기간·액션·대상 등 필터로 로그를 좁혀서 볼 수 있습니다. 이상 행동이나 오류 추적 시 유용합니다.</p>
          </section>
        </AdminGuideModal>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          사용 가이드
        </button>
      </div>
      <AdminAuditPage authToken={accessToken} />
    </div>
  );
}
