'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n/LangContext';
import { t } from '@/lib/i18n';
import { BookOpen, ChevronDown, ChevronUp, Stethoscope, AlertTriangle, Utensils, Dumbbell, Brain, Leaf } from 'lucide-react';
import OrganIcon from '../../_components/OrganIcon';

// 표시 문구·가이드 본문은 전부 중앙 i18n 사전(patientEdu.*)으로 이동 — 이 파일엔 키만 남는다.
// value = OrganIcon 이름이자 i18n 키 조각(비표시 값). 라벨 = patientEdu.cancerTypes.<value>
export const CANCER_TYPES = [
  { value: 'stomach' },
  { value: 'breast' },
  { value: 'liver' },
  { value: 'lung' },
  { value: 'thyroid' },
];

// 암종 공통 섹션 5종 — 모든 암종 가이드가 같은 아이콘·색·순서를 공유
const SECTION_DEFS = [
  { key: 'treatment', icon: Stethoscope, color: 'text-blue-600 bg-blue-50' },
  { key: 'diet', icon: Utensils, color: 'text-green-700 bg-green-50' },
  { key: 'exercise', icon: Dumbbell, color: 'text-orange-600 bg-orange-50' },
  { key: 'warning', icon: AlertTriangle, color: 'text-red-700 bg-red-50' },
  { key: 'mental', icon: Brain, color: 'text-purple-600 bg-purple-50' },
];

// 모든 암종 공통: 양·한방 통합면역 케어 (면력한방병원 협진 모델) — 각 가이드 마지막에 붙는다
const INTEGRATIVE_SECTION = {
  icon: Leaf,
  color: 'text-teal-600 bg-teal-50',
  titleKey: 'patientEdu.integrative.title',
  bodyKey: 'patientEdu.integrative.body',
};

// 암종별 종합 가이드 — 콘텐츠는 patientEdu.guides.<암종>.<섹션>.title/.body 키로 참조
export const GUIDES = Object.fromEntries(
  CANCER_TYPES.map(({ value }) => [
    value,
    {
      titleKey: `patientEdu.guides.${value}.title`,
      sections: [
        ...SECTION_DEFS.map(({ key, icon, color }) => ({
          icon,
          color,
          titleKey: `patientEdu.guides.${value}.${key}.title`,
          bodyKey: `patientEdu.guides.${value}.${key}.body`,
        })),
        INTEGRATIVE_SECTION,
      ],
    },
  ])
);

// 섹션 유형(아이콘)별 큐레이션 이미지 — 랜덤 스톡 대신 유형 일관 이미지.
// 경고(AlertTriangle)·통합면역(Leaf) 섹션은 콜아웃 박스가 주인공이라 이미지 없음.
const SECTION_IMAGE = new Map([
  [Stethoscope, { src: 'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&auto=format&fit=crop&q=80', altKey: 'patientEdu.imageAlt.treatment' }],
  [Utensils, { src: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&auto=format&fit=crop&q=80', altKey: 'patientEdu.imageAlt.diet' }],
  [Dumbbell, { src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&auto=format&fit=crop&q=80', altKey: 'patientEdu.imageAlt.exercise' }],
  [Brain, { src: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80', altKey: 'patientEdu.imageAlt.mental' }],
]);

// body 텍스트(\n\n 블록·• 불릿·🔴🟡 경고·"소제목:") 를 구조화 렌더링
function StructuredBody({ text }) {
  if (!text) return null;
  const blocks = text.split('\n\n').map((b) => b.split('\n').filter((ln) => ln.trim()));
  return (
    <div className="space-y-4">
      {blocks.map((lines, bi) => {
        const head = lines[0] || '';
        const level = head.startsWith('🔴') ? 'urgent' : head.startsWith('🟡') ? 'caution' : null;
        if (level) return <Callout key={bi} level={level} title={head} lines={lines.slice(1)} />;
        return (
          <div key={bi} className="space-y-2">
            {lines.map((ln, li) => <BodyLine key={li} text={ln.trim()} />)}
          </div>
        );
      })}
    </div>
  );
}

function BodyLine({ text }) {
  if (text.startsWith('•')) {
    return (
      <div className="flex gap-2.5 text-sm md:text-[15px] text-gray-700 leading-relaxed">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
        <span>{text.replace(/^•\s*/, '')}</span>
      </div>
    );
  }
  if (text.endsWith(':') || text.endsWith('：')) {
    return <p className="text-sm md:text-[15px] font-semibold text-gray-900 pt-1">{text.replace(/[:：]$/, '')}</p>;
  }
  // "라벨: 설명" 한 줄 (en/ru "Week 1: ...", zh/ja 전각 "1週目：...") — 라벨 볼드
  const m = text.match(/^([^:：•]{1,22})[:：]\s*(.+)$/);
  if (m) {
    return (
      <p className="text-sm md:text-[15px] text-gray-700 leading-relaxed">
        <span className="font-semibold text-gray-900">{m[1]}</span> · {m[2]}
      </p>
    );
  }
  return <p className="text-sm md:text-[15px] text-gray-700 leading-relaxed">{text}</p>;
}

function Callout({ level, title, lines }) {
  const urgent = level === 'urgent';
  const box = urgent ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50';
  const titleColor = urgent ? 'text-red-700' : 'text-amber-700';
  const dot = urgent ? 'bg-red-500' : 'bg-amber-500';
  // 이모지(🔴🟡)는 UI 크롬 금지(DESIGN.md) → lucide 아이콘 + 컬러로 긴급도 표현
  const cleanTitle = title.replace(/^(?:🔴|🟡)\s*/u, '').replace(/[:：]$/, '');
  return (
    <div className={`rounded-xl border ${box} p-4`}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <AlertTriangle size={15} className={titleColor} />
        <p className={`text-sm font-bold ${titleColor}`}>{cleanTitle}</p>
      </div>
      <ul className="space-y-1.5">
        {lines.map((raw, i) => {
          const line = raw.trim();
          const bullet = line.startsWith('•');
          return (
            <li key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
              {bullet && <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}
              <span>{bullet ? line.replace(/^•\s*/, '') : line}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function EducationClient() {
  const lang = useLang();

  const [cancerType, setCancerType] = useState('stomach');
  // 진행상황 링크(/claim)에서 «내 암종 가이드»로 바로 들어오게 ?cancer= 를 읽는다(2026-09-06).
  // useSearchParams 는 Suspense 경계를 요구해 빌드를 깨뜨리므로 window 에서 읽는다.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('cancer');
      if (q && CANCER_TYPES.some((c) => c.value === q)) setCancerType(q);
    } catch { /* noop */ }
  }, []);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (idx) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 처음엔 전부 열려있게
  useEffect(() => {
    const guide = GUIDES[cancerType];
    if (guide) {
      const all = {};
      guide.sections.forEach((_, i) => { all[i] = true; });
      setExpandedSections(all);
    }
  }, [cancerType]);

  const guide = GUIDES[cancerType] || GUIDES.stomach;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8" aria-label={t('patientEdu.page.title', lang)}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-teal-700 mb-2">
          <BookOpen size={20} />
          <span className="text-sm font-semibold uppercase tracking-wide">{t("patientEdu.page.kicker", lang)}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t('patientEdu.page.title', lang)}</h1>
        <p className="text-gray-500">{t('patientEdu.page.subtitle', lang)}</p>
      </div>

      {/* Cancer Type Selector */}
      <div className="mb-8">
        <p className="text-sm font-medium text-gray-500 mb-3">{t('patientEdu.page.selectCancer', lang)}</p>
        <div className="flex gap-2 flex-wrap">
          {CANCER_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => setCancerType(ct.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                cancerType === ct.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                  : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <OrganIcon name={ct.value} className="w-5 h-5" />
              {t(`patientEdu.cancerTypes.${ct.value}`, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Sections */}
      <div className="space-y-4">
        {guide.sections.map((section, idx) => {
          const Icon = section.icon;
          const isOpen = expandedSections[idx] !== false;
          const img = SECTION_IMAGE.get(section.icon);

          return (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
              <button
                onClick={() => toggleSection(idx)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.color}`}>
                  <Icon size={20} />
                </div>
                <h2 className="text-base md:text-lg font-semibold text-gray-900 flex-1">
                  {t(section.titleKey, lang)}
                </h2>
                {isOpen ? (
                  <ChevronUp size={20} className="text-gray-500 shrink-0" />
                ) : (
                  <ChevronDown size={20} className="text-gray-500 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1">
                  {img && (
                    <div className="mb-5 rounded-xl overflow-hidden bg-gray-50">
                      <img
                        src={img.src}
                        alt={t(img.altKey, lang)}
                        className="w-full h-44 md:h-56 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <StructuredBody text={t(section.bodyKey, lang)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        {t('patientEdu.page.disclaimer', lang)}
      </div>

      {/* Photo Credit */}
      <p className="mt-4 text-center text-xs text-gray-500">
        Photos by{' '}
        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">
          Unsplash
        </a>
      </p>
    </main>
  );
}
