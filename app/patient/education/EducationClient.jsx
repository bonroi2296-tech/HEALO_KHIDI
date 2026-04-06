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
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }} aria-label={l(PAGE_LABELS.title)}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{l(PAGE_LABELS.title)}</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>{l(PAGE_LABELS.subtitle)}</p>

      {/* Cancer Type Selector */}
      <fieldset style={{ marginBottom: 20, border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 6 }}>{l(PAGE_LABELS.selectCancer)}</legend>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="radiogroup" aria-label={l(PAGE_LABELS.selectCancer)}>
          {CANCER_TYPES.map(ct => (
            <button
              key={ct.value}
              onClick={() => setCancerType(ct.value)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd',
                background: cancerType === ct.value ? '#2563eb' : '#fff',
                color: cancerType === ct.value ? '#fff' : '#333',
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
              }}
            >
              {l(ct.label)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Phase Tabs */}
      <nav aria-label="Treatment phase" style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', borderBottom: '2px solid #eee', paddingBottom: 2 }} role="tablist">
        {PHASES.map(p => (
          <button
            key={p.value}
            role="tab"
            aria-selected={activePhase === p.value}
            onClick={() => setActivePhase(p.value)}
            style={{
              padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: activePhase === p.value ? 700 : 400,
              color: activePhase === p.value ? '#2563eb' : '#666',
              borderBottom: activePhase === p.value ? '2px solid #2563eb' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            {l(p.label)}
          </button>
        ))}
      </nav>

      {/* Category Filter */}
      <div role="group" aria-label="Category filter" style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: '6px 12px', borderRadius: 20, border: '1px solid #ddd',
            background: !activeCategory ? '#f0f7ff' : '#fff',
            color: !activeCategory ? '#2563eb' : '#666',
            cursor: 'pointer', fontSize: 13,
          }}
        >
          {l(PAGE_LABELS.allCategories)}
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setActiveCategory(c.value)}
            style={{
              padding: '6px 12px', borderRadius: 20, border: '1px solid #ddd',
              background: activeCategory === c.value ? '#f0f7ff' : '#fff',
              color: activeCategory === c.value ? '#2563eb' : '#666',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            {c.icon} {l(c.label)}
          </button>
        ))}
      </div>

      {/* Content Cards */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#999', padding: 40 }}>{l(PAGE_LABELS.loading)}</p>
      ) : contents.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: 40 }}>{l(PAGE_LABELS.noContent)}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {contents.map(item => {
            const cat = CATEGORIES.find(c => c.value === item.category);
            return (
              <div
                key={item.id}
                style={{
                  padding: 20, borderRadius: 12, border: '1px solid #e5e7eb',
                  background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{cat?.icon}</span>
                  <span style={{ fontSize: 12, color: '#888', background: '#f3f4f6', padding: '2px 8px', borderRadius: 10 }}>
                    {cat ? l(cat.label) : item.category}
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
