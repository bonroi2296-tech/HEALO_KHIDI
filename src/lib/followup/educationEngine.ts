/**
 * healwith: 환자 교육 콘텐츠(education_contents) 다국어 선택 — 단일 창구
 *
 * ⚠️ 2026-08-25 재작성: 이 파일은 «존재하지 않는 스키마»(i18n JSONB · phase · category 컬럼)를
 * 상대로 쓰여 있어서 **어디서도 안 불렸다**(자기 시험만 import). 실제 표는 언어별 컬럼
 * (title_ko/body_ko … title_ja/body_ja) + send_at_phase + content_type 이다.
 * 실표에 맞춰 다시 쓰고, 조회 API(app/api/khidi/education)와 사후관리 자동발송 cron 이
 * **같은 함수**를 쓴다 — 갈라지면 화면과 메일의 언어 폴백이 서로 달라진다.
 */

import type { FollowupPhase } from './scheduler';

export type EducationCategory = 'medication' | 'diet' | 'exercise' | 'warning_signs' | 'mental_health';

/** education_contents 언어 컬럼. kz = 카자흐어(메일 템플릿도 2026-09-06 부터 kz·kk 를 다 받는다 — 호출부 변환 불필요). */
export const EDUCATION_LANGS = ['ko', 'en', 'ru', 'kz', 'zh', 'ja'] as const;
export type EducationLang = (typeof EDUCATION_LANGS)[number];

/** DB 행(필요한 칸만). 언어 칸은 문자열 키로 읽는다. */
export interface EducationRow {
  id: string;
  cancer_type: string;
  send_at_phase: string;
  content_type: string;
  media_url?: string | null;
  is_published?: boolean | null;
  [langColumn: string]: unknown;
}

export interface LocalizedEducationContent {
  id: string;
  cancerType: string;
  phase: FollowupPhase | string;
  category: EducationCategory | string;
  lang: EducationLang;
  title: string;
  body: string;
  mediaUrl: string | null;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** 요청 언어 정규화 — 'kk'·'kz-KZ' 같은 변형을 표의 칸 이름으로 맞춘다. */
export function normalizeEducationLang(lang: string | null | undefined): EducationLang {
  const raw = String(lang || '').toLowerCase().split(/[-_]/)[0];
  if (raw === 'kk') return 'kz';
  return (EDUCATION_LANGS as readonly string[]).includes(raw) ? (raw as EducationLang) : 'ru';
}

/**
 * 행 → 요청 언어 본문. 폴백: 요청 언어 → 영어 → 한국어.
 * 제목·본문을 **따로** 폴백하지 않는다 — 제목만 러시아어, 본문은 한국어인 메일이 나가면
 * 환자는 그걸 «오류»로 읽는다. 둘 다 있는 언어를 통째로 고른다.
 */
export function localizeEducation(row: EducationRow, lang: string): LocalizedEducationContent {
  const want = normalizeEducationLang(lang);
  let picked: EducationLang = want;
  let title = str(row[`title_${want}`]);
  let body = str(row[`body_${want}`]);

  for (const fb of ['en', 'ko'] as const) {
    if (title && body) break;
    const t = str(row[`title_${fb}`]);
    const b = str(row[`body_${fb}`]);
    if (t && b) {
      picked = fb;
      title = t;
      body = b;
    }
  }

  return {
    id: row.id,
    cancerType: row.cancer_type,
    phase: row.send_at_phase,
    category: row.content_type,
    lang: picked,
    title,
    body,
    mediaUrl: str(row.media_url) || null,
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

export const categoryLabel = (category: string, lang: string): string =>
  CATEGORY_LABELS[category as EducationCategory]?.[normalizeEducationLang(lang)] || category;

export const phaseLabel = (phase: string, lang: string): string =>
  PHASE_LABELS[phase as FollowupPhase]?.[normalizeEducationLang(lang)] || phase;
