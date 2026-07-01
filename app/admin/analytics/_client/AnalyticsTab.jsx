import React from 'react';
import { TrendingUp, Target, Activity, Info } from 'lucide-react';

// 가짜 매출(문의수×3500)·항상 빈 '기회 비용' 표·하드코딩 '+12% 성장' 배지는 제거(POSTMORTEMS #57 후속,
// 피벗 전 디렉토리 사업 잔재 + DESIGN.md '가짜 숫자 금지'). 실데이터(문의 수·최다 카테고리·시술별 분포)만 표시.
export const AnalyticsTab = ({ analytics }) => (
  <div className="animate-in fade-in space-y-8">
    <div className="flex justify-between items-end border-b border-gray-200 pb-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">문의 수요 트렌드</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-xl leading-relaxed">
          환자 문의를 기반으로 어떤 <span className="font-bold text-gray-800">시술·암종 수요</span>가 많은지 보여줍니다.<br/>
          수요가 몰리는 분야의 <span className="font-bold text-gray-800">제휴 병원 확보</span> 우선순위를 정하는 데 참고하세요.
        </p>
      </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Card 1: Volume */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="p-3 bg-teal-50 rounded-xl text-teal-700 w-fit mb-4"><TrendingUp size={24}/></div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">총 활성 문의 (Active Leads)</p>
        <p className="text-3xl font-black text-gray-900 mt-1 tabular-nums">{analytics.totalLeads} 건</p>
        <p className="text-[11px] text-gray-400 mt-2">현재까지 접수된 환자 상담 수요</p>
      </div>

      {/* Card 2: Top Demand Category */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="p-3 bg-purple-50 rounded-xl text-purple-700 w-fit mb-4"><Target size={24}/></div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">최다 수요 카테고리</p>
        <p className="text-2xl font-black text-gray-900 mt-1 truncate">{analytics.topTreatment}</p>
        <p className="text-[11px] text-purple-600 font-bold mt-2 flex items-center gap-1">
          Action: 해당 분야 전문 병원 확보 시급
        </p>
      </div>
    </div>

    {/* Market Demand Trends */}
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
      <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
        <Activity size={20} className="text-teal-700"/>
        시술 종류별 수요 분포
      </h3>
      <p className="text-xs text-gray-500 mb-6">
        해외 환자들이 현재 가장 많이 찾고 있는 시술·암종 카테고리입니다.
      </p>

      <div className="flex-1 space-y-6">
        {analytics.treatmentTrends.slice(0, 8).map((t, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-gray-800">{t.name}</span>
              <span className="text-teal-700 tabular-nums">{t.percent}% 점유율</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-teal-700 h-2.5 rounded-full shadow-sm"
                style={{ width: `${t.percent}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-right tabular-nums">{t.count}건의 활성 문의</p>
          </div>
        ))}
        {analytics.treatmentTrends.length === 0 && <div className="text-center text-gray-400 py-10">아직 문의 데이터가 없습니다.</div>}
      </div>

      {analytics.topTreatment && analytics.topTreatment !== "-" && analytics.treatmentTrends.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-2"><Info size={14}/> 참고</p>
            <p className="text-[11px] text-blue-700 leading-snug">
              현재 <span className="font-bold">"{analytics.topTreatment}"</span> 카테고리의 수요가 가장 많습니다.
              리드 이탈을 막으려면 해당 분야 전문 파트너 병원을 최소 3곳 이상 확보하는 것을 권장합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
);
