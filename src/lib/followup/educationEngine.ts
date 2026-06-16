/**
 * healwith: Patient Education Content Engine
 *
 * 암종별 × 단계별 × 카테고리별 교육 콘텐츠를 조회.
 * i18n JSONB 패턴으로 다국어 지원 (localize() 재사용).
 */

import type { FollowupPhase } from './scheduler';

export type EducationCategory = 'medication' | 'diet' | 'exercise' | 'warning_signs' | 'mental_health';

export interface EducationContent {
  id: string;
  cancer_type: string;
  phase: FollowupPhase;
  category: EducationCategory;
  title: string;
  body: string;
  i18n: Record<string, { title?: string; body?: string }>;
  created_at: string;
}

export interface LocalizedEducationContent {
  id: string;
  cancerType: string;
  phase: FollowupPhase;
  category: EducationCategory;
  title: string;
  body: string;
}

/**
 * i18n JSONB에서 해당 언어의 교육 콘텐츠를 추출.
 * 폴백: i18n[lang] → i18n.en → 원본(ko)
 */
export function localizeEducation(
  content: EducationContent,
  lang: string
): LocalizedEducationContent {
  const i18n = content.i18n || {};

  let title = content.title;
  let body = content.body;

  if (lang !== 'ko') {
    const langData = i18n[lang];
    if (langData?.title && langData?.body) {
      title = langData.title;
      body = langData.body;
    } else {
      const enData = i18n['en'];
      if (enData?.title && enData?.body) {
        title = enData.title;
        body = enData.body;
      }
    }
  }

  return {
    id: content.id,
    cancerType: content.cancer_type,
    phase: content.phase,
    category: content.category,
    title,
    body,
  };
}

/** 카테고리 라벨 (다국어) */
export const CATEGORY_LABELS: Record<EducationCategory, Record<string, string>> = {
  medication: {
    ko: '투약 안내', en: 'Medication Guide', ru: 'Руководство по лекарствам',
    zh: '用药指南', ja: '投薬ガイド', kz: 'Дәрі-дәрмек нұсқаулығы',
  },
  diet: {
    ko: '식단 관리', en: 'Diet Management', ru: 'Управление питанием',
    zh: '饮食管理', ja: '食事管理', kz: 'Тамақтану басқару',
  },
  exercise: {
    ko: '운동 가이드', en: 'Exercise Guide', ru: 'Руководство по упражнениям',
    zh: '运动指南', ja: '運動ガイド', kz: 'Жаттығу нұсқаулығы',
  },
  warning_signs: {
    ko: '경고 신호', en: 'Warning Signs', ru: 'Предупреждающие знаки',
    zh: '警告信号', ja: '警告サイン', kz: 'Ескерту белгілері',
  },
  mental_health: {
    ko: '정신건강', en: 'Mental Health', ru: 'Психическое здоровье',
    zh: '心理健康', ja: 'メンタルヘルス', kz: 'Психикалық денсаулық',
  },
};

/** 단계 라벨 (다국어) */
export const PHASE_LABELS: Record<FollowupPhase, Record<string, string>> = {
  week_1: { ko: '1주차', en: 'Week 1', ru: '1 неделя', zh: '第1周', ja: '1週目', kz: '1 апта' },
  week_2: { ko: '2주차', en: 'Week 2', ru: '2 неделя', zh: '第2周', ja: '2週目', kz: '2 апта' },
  month_1: { ko: '1개월', en: 'Month 1', ru: '1 месяц', zh: '第1月', ja: '1ヶ月', kz: '1 ай' },
  month_3: { ko: '3개월', en: 'Month 3', ru: '3 месяца', zh: '第3月', ja: '3ヶ月', kz: '3 ай' },
  month_6: { ko: '6개월', en: 'Month 6', ru: '6 месяцев', zh: '第6月', ja: '6ヶ月', kz: '6 ай' },
  year_1: { ko: '1년', en: 'Year 1', ru: '1 год', zh: '第1年', ja: '1年', kz: '1 жыл' },
};
