import React from 'react';
import { TrendingUp, DollarSign, Target, AlertCircle, Activity, Info, ArrowRightCircle } from 'lucide-react';
import { formatCurrencyUSD } from "@/lib/i18n/format";

export const AnalyticsTab = ({ analytics }) => (
  <div className="animate-in fade-in space-y-8">
    <div className="flex justify-between items-end border-b border-gray-200 pb-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Market Intelligence (시장 분석)</h1>
        <p className="text-gray-500 mt-2 text-sm max-w-xl leading-relaxed">
          실시간 <span className="font-bold text-gray-800">환자 수요 트렌드</span> 및 <span className="font-bold text-gray-800">시장 기회(Opportunity)</span> 분석 보고서입니다.<br/>
          미체결 수요를 확인하고 제휴 영업 우선순위를 선정하세요.
        </p>
      </div>
    </div>

    {/* KPI Cards: Market Level */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1: Volume */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-700"><TrendingUp size={24}/></div>
          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">+12% 성장</span>
        </div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">총 활성 문의 (Active Leads)</p>
        <p className="text-3xl font-black text-gray-900 mt-1">{analytics.totalLeads} 건</p>
        <p className="text-[11px] text-gray-400 mt-2">현재 유효한 환자 상담 수요</p>
      </div>

      {/* Card 2: Value (Reframed as Market Opportunity) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-700"><DollarSign size={24}/></div>
        </div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">시장 기회 총액 (Est. Opportunity)</p>
        <p className="text-3xl font-black text-gray-900 mt-1">
          {formatCurrencyUSD(analytics.totalRevenue, "en")}
        </p>
        <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
          <Info size={12}/> 문의당 평균 시술가 $3,500 기준
        </div>
      </div>

      {/* Card 3: Demand Spike */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-700"><Target size={24}/></div>
        </div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">최다 수요 카테고리</p>
        <p className="text-2xl font-black text-gray-900 mt-1 truncate">{analytics.topTreatment}</p>
        <p className="text-[11px] text-purple-600 font-bold mt-2 flex items-center gap-1">
          Action: 해당 분야 전문 병원 확보 시급
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 1. Unmet Demand & Opportunity (Leakage Analysis) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500"/> 
          기회 비용 및 수요 분석 (Opportunity Analysis)
        </h3>
        <p className="text-xs text-gray-500 mb-6">
          현재 발생 중인 수요가 어디로 흐르고 있는지 분석합니다. '미체결 수요'는 즉시 매출화 가능한 기회입니다.
        </p>
        
        <div className="overflow-hidden border border-gray-100 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
              <tr>
                <th className="py-3 px-4 text-left">타겟 병원 / 그룹</th>
                <th className="py-3 px-4 text-center">문의 수</th>
                <th className="py-3 px-4 text-right">잠재 매출 기회</th>
                <th className="py-3 px-4 text-left">대응 전략</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.hospitalOpportunities.map((h) => (
                <tr key={h.id} className={`hover:bg-gray-50 transition ${h.status === '기회 비용 (Missed)' ? 'bg-red-50/30' : ''}`}>
                  <td className="py-4 px-4">
                    <div className="font-bold text-gray-800">{h.name}</div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{h.status}</div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`font-bold px-2 py-1 rounded-md ${h.status==='기회 비용 (Missed)' ? 'text-red-600 bg-red-100' : 'text-gray-700 bg-gray-100'}`}>
                      {h.count}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-black text-gray-700">
                    {formatCurrencyUSD(h.marketValue, "en")}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center w-fit gap-1
                        ${h.status === '매칭 완료' ? 'bg-teal-50 text-teal-700 border-teal-100' : 
                          h.status === '기회 비용 (Missed)' ? 'bg-blue-50 text-blue-700 border-blue-100 cursor-pointer hover:bg-blue-100' : 
                          'bg-orange-50 text-orange-700 border-orange-100 cursor-pointer hover:bg-orange-100'}`}>
                      {h.action}
                      {h.status !== '매칭 완료' && <ArrowRightCircle size={10}/>}
                    </span>
                  </td>
                </tr>
              ))}
              {analytics.hospitalOpportunities.length === 0 && (
                <tr><td colSpan="4" className="py-8 text-center text-gray-400">데이터 수집 중...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Market Demand Trends */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Activity size={20} className="text-teal-700"/> 
          시장 수요 트렌드 (Market Trends)
        </h3>
        <p className="text-xs text-gray-500 mb-6">
          해외 환자들이 현재 가장 많이 찾고 있는 시술 카테고리입니다.
        </p>

        <div className="flex-1 space-y-6">
          {analytics.treatmentTrends.slice(0, 5).map((t, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-gray-800">{t.name}</span>
                <span className="text-teal-700">{t.percent}% 점유율</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div 
                  className="bg-teal-500 h-2.5 rounded-full shadow-sm" 
                  style={{ width: `${t.percent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-right">{t.count}건의 활성 문의</p>
            </div>
          ))}
          {analytics.treatmentTrends.length === 0 && <div className="text-center text-gray-400 py-10">데이터 대기 중...</div>}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-2"><Info size={14}/> Strategic Insight</p>
            <p className="text-[11px] text-blue-700 leading-snug">
              현재 <span className="font-bold">"{analytics.topTreatment}"</span> 카테고리의 수요가 시장을 주도하고 있습니다. 
              리드 이탈(Leakage)을 막기 위해 해당 분야 전문 파트너 병원을 최소 3곳 이상 확보하는 것을 권장합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
