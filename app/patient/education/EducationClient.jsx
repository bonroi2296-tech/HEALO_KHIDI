'use client';

import { useState, useEffect } from 'react';
import { getLangCodeFromCookie } from '../../../src/lib/i18n';

const CANCER_TYPES = [
  { value: 'stomach', label: { ko: '위암', en: 'Stomach Cancer', ru: 'Рак желудка', zh: '胃癌', ja: '胃がん', kz: 'Асқазан рагі' } },
  { value: 'breast', label: { ko: '유방암', en: 'Breast Cancer', ru: 'Рак молочной железы', zh: '乳腺癌', ja: '乳がん', kz: 'Сүт безі рагі' } },
  { value: 'liver', label: { ko: '간암', en: 'Liver Cancer', ru: 'Рак печени', zh: '肝癌', ja: '肝臓がん', kz: 'Бауыр рагі' } },
  { value: 'lung', label: { ko: '폐암', en: 'Lung Cancer', ru: 'Рак лёгких', zh: '肺癌', ja: '肺がん', kz: 'Өкпе рагі' } },
  { value: 'thyroid', label: { ko: '갑상선암', en: 'Thyroid Cancer', ru: 'Рак щитовидной железы', zh: '甲状腺癌', ja: '甲状腺がん', kz: 'Қалқанша без рагі' } },
];

const PHASES = [
  { value: 'week_1', label: { ko: '1주차', en: 'Week 1', ru: '1 неделя', zh: '第1周', ja: '1週目', kz: '1 апта' } },
  { value: 'week_2', label: { ko: '2주차', en: 'Week 2', ru: '2 неделя', zh: '第2周', ja: '2週目', kz: '2 апта' } },
  { value: 'month_1', label: { ko: '1개월', en: 'Month 1', ru: '1 месяц', zh: '第1月', ja: '1ヶ月', kz: '1 ай' } },
  { value: 'month_3', label: { ko: '3개월', en: 'Month 3', ru: '3 месяца', zh: '第3月', ja: '3ヶ月', kz: '3 ай' } },
  { value: 'month_6', label: { ko: '6개월', en: 'Month 6', ru: '6 месяцев', zh: '第6月', ja: '6ヶ月', kz: '6 ай' } },
  { value: 'year_1', label: { ko: '1년', en: 'Year 1', ru: '1 год', zh: '第1年', ja: '1年', kz: '1 жыл' } },
];

const CATEGORIES = [
  { value: 'medication', icon: '💊', label: { ko: '투약', en: 'Medication', ru: 'Лекарства', zh: '用药', ja: '投薬', kz: 'Дәрі' } },
  { value: 'diet', icon: '🥗', label: { ko: '식단', en: 'Diet', ru: 'Питание', zh: '饮食', ja: '食事', kz: 'Тамақ' } },
  { value: 'exercise', icon: '🏃', label: { ko: '운동', en: 'Exercise', ru: 'Упражнения', zh: '运动', ja: '運動', kz: 'Жаттығу' } },
  { value: 'warning_signs', icon: '⚠️', label: { ko: '경고 신호', en: 'Warning Signs', ru: 'Предупреждения', zh: '警告', ja: '警告', kz: 'Ескерту' } },
  { value: 'mental_health', icon: '🧠', label: { ko: '정신건강', en: 'Mental Health', ru: 'Психика', zh: '心理', ja: 'メンタル', kz: 'Психика' } },
];

const PAGE_LABELS = {
  title: { ko: '환자 교육 자료', en: 'Patient Education', ru: 'Обучение пациентов', zh: '患者教育', ja: '患者教育', kz: 'Науқас білімі' },
  subtitle: { ko: '암종별 맞춤 교육 콘텐츠', en: 'Cancer-specific education content', ru: 'Образовательные материалы по типу рака', zh: '按癌症类型的教育内容', ja: 'がん種別教育コンテンツ', kz: 'Рак түріне қарай білім беру мазмұны' },
  selectCancer: { ko: '암종 선택', en: 'Select Cancer Type', ru: 'Выберите тип рака', zh: '选择癌症类型', ja: 'がん種を選択', kz: 'Рак түрін таңдаңыз' },
  noContent: { ko: '해당 조건의 콘텐츠가 없습니다', en: 'No content found for this criteria', ru: 'Материалы не найдены', zh: '未找到相关内容', ja: 'コンテンツが見つかりません', kz: 'Мазмұн табылмады' },
  loading: { ko: '로딩 중...', en: 'Loading...', ru: 'Загрузка...', zh: '加载中...', ja: '読み込み中...', kz: 'Жүктелуде...' },
  allCategories: { ko: '전체', en: 'All', ru: 'Все', zh: '全部', ja: 'すべて', kz: 'Барлығы' },
};

export default function EducationClient() {
  const [lang, setLang] = useState('en');
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj[lang] || obj['en'] || '';

  const [cancerType, setCancerType] = useState('stomach');
  const [activePhase, setActivePhase] = useState('week_1');
  const [activeCategory, setActiveCategory] = useState(null);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cancerType) return;
    setLoading(true);

    const params = new URLSearchParams({ cancerType, lang });
    if (activePhase) params.set('phase', activePhase);
    if (activeCategory) params.set('category', activeCategory);

    fetch(`/api/khidi/education?${params}`)
      .then(r => r.json())
      .then(res => {
        if (res.ok) setContents(res.data);
        else setContents([]);
      })
      .catch(() => setContents([]))
      .finally(() => setLoading(false));
  }, [cancerType, activePhase, activeCategory, lang]);

  return (
    <main className="max-w-[900px] mx-auto px-4 py-6" aria-label={l(PAGE_LABELS.title)}>
      <h1 className="text-2xl md:text-[28px] font-bold mb-1">{l(PAGE_LABELS.title)}</h1>
      <p className="text-gray-500 mb-6">{l(PAGE_LABELS.subtitle)}</p>

      {/* Cancer Type Selector */}
      <fieldset className="mb-5 border-none p-0 m-0">
        <legend className="text-sm font-semibold block mb-1.5">{l(PAGE_LABELS.selectCancer)}</legend>
        <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label={l(PAGE_LABELS.selectCancer)}>
          {CANCER_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => setCancerType(ct.value)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                cancerType === ct.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {l(ct.label)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Phase Tabs */}
      <nav
        aria-label="Treatment phase"
        className="flex gap-1 mb-4 overflow-x-auto border-b-2 border-gray-100 pb-0.5 scrollbar-hide"
        role="tablist"
      >
        {PHASES.map(p => (
          <button
            key={p.value}
            role="tab"
            aria-selected={activePhase === p.value}
            onClick={() => setActivePhase(p.value)}
            className={`px-3.5 py-2 border-b-2 text-sm whitespace-nowrap transition-all ${
              activePhase === p.value
                ? 'font-bold text-blue-600 border-blue-600'
                : 'font-normal text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {l(p.label)}
          </button>
        ))}
      </nav>

      {/* Category Filter */}
      <div role="group" aria-label="Category filter" className="flex gap-1.5 mb-5 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full border text-[13px] transition-all ${
            !activeCategory
              ? 'bg-blue-50 text-blue-600 border-blue-200'
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {l(PAGE_LABELS.allCategories)}
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setActiveCategory(c.value)}
            className={`px-3 py-1.5 rounded-full border text-[13px] transition-all ${
              activeCategory === c.value
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {c.icon} {l(c.label)}
          </button>
        ))}
      </div>

      {/* Content Cards */}
      {loading ? (
        <p className="text-center text-gray-400 py-10">{l(PAGE_LABELS.loading)}</p>
      ) : contents.length === 0 ? (
        <p className="text-center text-gray-400 py-10">{l(PAGE_LABELS.noContent)}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {contents.map(item => {
            const cat = CATEGORIES.find(c => c.value === item.category);
            return (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xl">{cat?.icon}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
                    {cat ? l(cat.label) : item.category}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">{item.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
