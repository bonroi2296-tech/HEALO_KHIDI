'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ChevronDown, Stethoscope, Leaf, Shield,
  Activity, Clock, FileText, CheckCircle,
  Atom, Zap, Bot, Dna,
} from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';
import OrganIcon from '../_components/OrganIcon';

// 표시 문구는 전부 중앙 i18n 사전(treatmentsPage.*)에서 t()로 가져온다.
// organ = OrganIcon 이름이자 i18n 키 조각(비표시 값 — 그대로 유지).
// 각 암종은 양방(western) 3개·한방(eastern) 3개 항목을 가진다 (treatmentsPage.cancers.<organ>.western1..3 / eastern1..3).
export const CANCERS = [
  { organ: 'stomach' },
  { organ: 'breast' },
  { organ: 'liver' },
  { organ: 'lung' },
  { organ: 'thyroid' },
  { organ: 'colon' },
];

// 한국에서 받을 수 있는 선진 암 치료 — 제휴 병원 여부와 무관하게 「접수·연결 대행」으로 소개한다
// (우리는 외국인환자 유치 등록기관 A-2026-01-02-06761). 문구는 treatmentsPage.advanced.* i18n 키.
// 사실만 적고 결과·완치는 약속하지 않는다 — check:content 의료광고 금지문구 룰과 같은 선.
const ADVANCED_TREATMENTS = [
  { icon: Atom, key: 'heavyIon' },
  { icon: Zap, key: 'proton' },
  { icon: Bot, key: 'robot' },
  { icon: Shield, key: 'immuno' },
  { icon: Dna, key: 'precision' },
  { icon: Leaf, key: 'kmCare' },
];

const PROCESS_STEPS = [
  { icon: FileText, key: 'intake' },
  { icon: Stethoscope, key: 'matching' },
  { icon: Activity, key: 'consult' },
  { icon: Leaf, key: 'kmCare' },
  { icon: Shield, key: 'postCare' },
];

export default function TreatmentsClient() {
  const router = useRouter();
  const lang = useLang();
  const [expandedIdx, setExpandedIdx] = useState(-1);

  const tr = (key) => t(`treatmentsPage.${key}`, lang);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-700 to-emerald-700 text-white py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{tr('title')}</h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto">{tr('subtitle')}</p>
        </div>
      </section>

      {/* Process */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{tr('processTitle')}</h2>
        <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-0">
          {PROCESS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex-1 flex items-center">
                <div className="flex-1 text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Icon size={20} className="text-teal-700" />
                  </div>
                  <div className="font-bold text-sm mb-1">{tr(`process.${step.key}.label`)}</div>
                  <div className="text-xs text-gray-500">{tr(`process.${step.key}.desc`)}</div>
                </div>
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden md:block text-gray-300 px-1">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Cancer Cards */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4 space-y-4">
          {CANCERS.map((cancer, i) => {
            const isExpanded = expandedIdx === i;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Summary */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedIdx(isExpanded ? -1 : i)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-teal-600"><OrganIcon name={cancer.organ} className="w-9 h-9" /></span>
                      <div>
                        <h3 className="font-bold text-lg">{tr(`cancers.${cancer.organ}.type`)}</h3>
                        <p className="text-xs text-teal-700 font-medium mt-0.5">{tr(`cancers.${cancer.organ}.koreaStrength`)}</p>
                      </div>
                    </div>
                    <ChevronDown size={20} className={`text-gray-400 transition ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* 양방 */}
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Stethoscope size={16} className="text-blue-600" />
                          <h4 className="font-bold text-sm text-blue-900">{tr('westernTitle')}</h4>
                        </div>
                        <ul className="space-y-2">
                          {[1, 2, 3].map((n) => (
                            <li key={n} className="flex items-start gap-2 text-sm text-blue-800">
                              <CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />
                              {tr(`cancers.${cancer.organ}.western${n}`)}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 한방 */}
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Leaf size={16} className="text-emerald-700" />
                          <h4 className="font-bold text-sm text-emerald-900">{tr('easternTitle')}</h4>
                        </div>
                        <ul className="space-y-2">
                          {[1, 2, 3].map((n) => (
                            <li key={n} className="flex items-start gap-2 text-sm text-emerald-800">
                              <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                              {tr(`cancers.${cancer.organ}.eastern${n}`)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="text-center mt-5">
                      <button
                        onClick={() => router.push('/intake')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-semibold"
                      >
                        {tr('cta')} <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 한국에서 받을 수 있는 선진 암 치료 */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{tr('advanced.title')}</h2>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">{tr('advanced.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ADVANCED_TREATMENTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-teal-200 transition">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-teal-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base mb-1">{tr(`advanced.items.${item.key}.name`)}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-2">{tr(`advanced.items.${item.key}.desc`)}</p>
                    <p className="text-xs text-teal-700 font-medium">{tr(`advanced.items.${item.key}.where`)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 max-w-2xl mx-auto leading-relaxed">
          {tr('advanced.note')}
        </p>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/intake')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-semibold"
          >
            {tr('advanced.cta')} <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          {tr('bottomTitle')}
        </h2>
        <p className="text-gray-500 text-sm mb-6 max-w-lg mx-auto">
          {tr('bottomDesc')}
        </p>
        <button
          onClick={() => router.push('/intake')}
          className="bg-teal-700 text-white font-bold px-8 py-4 rounded-2xl shadow-md hover:bg-teal-800 hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
        >
          {tr('cta')} <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
