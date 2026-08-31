'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ChevronDown, Stethoscope, Leaf, Shield,
  Activity, Clock, FileText, CheckCircle,
} from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import { localeHref } from '@/lib/i18n/config';
import { t } from '@/lib/i18n';
// 카드(위암·유방암…) → 암종 상세 페이지 주소. 매핑은 immuneCancerDetails 가 단일 SoR.
import { cancerDetailPath } from '@/lib/data/immuneCancerDetails';
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

const PROCESS_STEPS = [
  { icon: FileText, key: 'intake' },
  { icon: Stethoscope, key: 'matching' },
  { icon: Activity, key: 'consult' },
  { icon: Leaf, key: 'kmCare' },
  { icon: Shield, key: 'postCare' },
];

export default function TreatmentsClient() {
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

                {/* Detail
                    ⚠️ 접혀 있어도 DOM 에 남긴다 — 조건부 렌더({isExpanded && ...}) 금지.
                    양방·한방 치료 목록 36줄이 이 페이지의 실질 본문인데, 조건부로 두면 검색봇·AI 가
                    받는 HTML 에 한 글자도 안 들어간다(= 제목 6줄짜리 빈 페이지로 읽힘).
                    접기 방식은 암종 상세(CancerDetailClient)의 5축 아코디언과 같은 max-height —
                    한쪽만 고쳐지는 일이 없게 같은 패턴을 쓴다. 상한은 넉넉히(80rem, 러시아어가 가장 김).
                    aria-hidden: 접힌 동안 스크린리더가 읽지 않도록(크롤러는 무관). */}
                <div
                  aria-hidden={!isExpanded}
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-[80rem] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
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

                    {/* 「상세 보기」가 새로 붙었다(2026-08-31): 암종 상세 6쪽이 6개 언어로 이미
                        만들어져 있는데 사이트 안에서 그리로 가는 링크가 한 개도 없었다.
                        문구는 이미 6개 언어로 번역돼 있던 미사용 키(treatmentsPage.expandDetail)를 쓴다.
                        /intake 대신 /inquiry 를 직접 건 이유: /intake 는 /inquiry 로 308 되고 거기서
                        다시 /{언어}/inquiry 로 308 된다 — 사람에겐 같은 곳이지만 크롤러엔 이중 우회다. */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                      <Link
                        href={localeHref(cancerDetailPath(cancer.organ), lang)}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-teal-700 text-teal-700 rounded-xl hover:bg-teal-50 transition text-sm font-semibold"
                      >
                        {tr('expandDetail')} <ArrowRight size={14} />
                      </Link>
                      <Link
                        href={localeHref('/inquiry', lang)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-semibold"
                      >
                        {tr('cta')} <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
        <Link
          href={localeHref('/inquiry', lang)}
          className="bg-teal-700 text-white font-bold px-8 py-4 rounded-2xl shadow-md hover:bg-teal-800 hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
        >
          {tr('cta')} <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
