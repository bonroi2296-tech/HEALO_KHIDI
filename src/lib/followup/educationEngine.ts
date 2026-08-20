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

// ============================================================
// 실제 표(education_contents) 조회 — 2026-08-20 추가
//
// 왜 새로 쓰나: 위 localizeEducation 은 i18n JSONB 한 칸을 전제하는데
// 실제 표는 언어마다 칸이 따로다(title_ru·body_ru·title_kz…). 그대로 이으면
// 조회가 통째로 실패한다(「없는 칸에 쓰기」와 같은 부류). 표 구조를 그대로 읽는다.
//
// db 를 인자로 받는 순수 함수 — server-only 를 안 물어서 단위시험에서 바로 부른다.
// ============================================================

/** 표의 한 줄 (education_contents) */
export interface EducationRow {
  id: string;
  cancer_type: string;
  content_type: string;
  send_at_phase: string;
  is_published?: boolean | null;
  [k: string]: any; // title_ko·body_ru 등 언어별 칸
}

/** 표 한 줄을 요청 언어로 고른다. 폴백: 요청어 → 영어 → 한국어 */
export function pickEducationLang(row: EducationRow, lang: string) {
  const pick = (kind: "title" | "body") =>
    row[`${kind}_${lang}`] || row[`${kind}_en`] || row[`${kind}_ko`] || "";
  return {
    id: row.id,
    cancerType: row.cancer_type,
    phase: row.send_at_phase,
    category: row.content_type,
    title: pick("title"),
    body: pick("body"),
  };
}

/**
 * 그 암종·그 단계의 교육 글을 현지어로 가져온다.
 * 암종별 글이 없으면 암종 무관(common) 글로 폴백 — 단계는 반드시 일치시킨다.
 */
export async function fetchEducationForPhase(
  db: any,
  cancerType: string | null | undefined,
  phase: string,
  lang = "ko"
) {
  const { data, error } = await db
    .from("education_contents")
    .select("*")
    .eq("send_at_phase", phase)
    .eq("is_published", true);
  if (error || !Array.isArray(data)) return [];

  const ct = (cancerType || "").trim().toLowerCase();
  const mine = ct ? data.filter((r: EducationRow) => (r.cancer_type || "").toLowerCase() === ct) : [];
  const common = data.filter((r: EducationRow) =>
    ["common", "all", "", null].includes((r.cancer_type || "").toLowerCase())
  );
  const rows = mine.length > 0 ? mine : common;
  return rows.map((r: EducationRow) => pickEducationLang(r, lang));
}
