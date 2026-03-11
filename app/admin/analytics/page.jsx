"use client";

import { useState, useEffect } from "react";
import { AnalyticsTab } from "./_client/AnalyticsTab";
import { AdminGuideModal } from "../_components/AdminGuideModal";
import { createSupabaseBrowserClient } from "../../../src/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

export default function AnalyticsPage() {
  const [showGuide, setShowGuide] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalLeads: 0,
    topTreatment: '-',
    hospitalOpportunities: [],
    treatmentTrends: []
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data: inquiries } = await supabase
        .from('inquiries')
        .select('treatment_type')
        .order('created_at', { ascending: false });

      if (inquiries) {
        const totalLeads = inquiries.length;
        const avgPrice = 3500;
        const totalRevenue = totalLeads * avgPrice;

        // Treatment trends
        const typeCounts = {};
        inquiries.forEach(i => {
          const type = i.treatment_type || 'Unknown';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const treatmentTrends = Object.entries(typeCounts)
          .map(([name, count]) => ({
            name,
            count,
            percent: Math.round((count / totalLeads) * 100)
          }))
          .sort((a, b) => b.count - a.count);

        const topTreatment = treatmentTrends[0]?.name || '-';

        setAnalytics({
          totalRevenue,
          totalLeads,
          topTreatment,
          hospitalOpportunities: [],
          treatmentTrends
        });
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-4">
      {showGuide && (
        <AdminGuideModal title="문의 현황(시장 분석) 가이드" onClose={() => setShowGuide(false)}>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">이 페이지는 무엇인가요?</h3>
            <p>고객 문의 데이터를 기반으로 <strong>시장 수요 트렌드</strong>와 <strong>기회(Opportunity)</strong>를 보여줍니다. 어떤 시술/카테고리가 많은지, 미체결 수요가 어디에 있는지 파악해 제휴 영업·운영에 활용할 수 있습니다.</p>
          </section>
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-2">지표 설명</h3>
            <p className="text-gray-600 text-sm">총 활성 문의 수, 추정 시장 기회 총액, 최다 수요 카테고리 등이 표시됩니다. 문의 유형별 비율과 트렌드를 확인해 병원·시술 확보 우선순위를 정하는 데 참고하세요.</p>
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
      <AnalyticsTab analytics={analytics} />
    </div>
  );
}
