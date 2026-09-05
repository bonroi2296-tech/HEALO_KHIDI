import { describe, it, expect } from 'vitest';
import {
  localizeEducation,
  normalizeEducationLang,
  categoryLabel,
  CATEGORY_LABELS,
  PHASE_LABELS,
  type EducationRow,
} from './educationEngine';

/** 실표(education_contents) 모양 그대로 — 언어별 컬럼. */
const row: EducationRow = {
  id: 'ed_1',
  cancer_type: 'stomach',
  send_at_phase: 'week_1',
  content_type: 'medication',
  is_published: true,
  media_url: null,
  title_ko: '수술 후 투약 안내',
  body_ko: '처방된 항생제를 복용하세요.',
  title_en: 'Medication Guide',
  body_en: 'Take prescribed antibiotics.',
  title_ru: 'Руководство по лекарствам',
  body_ru: 'Принимайте назначенные антибиотики.',
};

describe('educationEngine', () => {
  it('요청 언어 본문을 고른다', () => {
    expect(localizeEducation(row, 'ru').title).toBe('Руководство по лекарствам');
    expect(localizeEducation(row, 'ko').body).toBe('처방된 항생제를 복용하세요.');
  });

  it('없는 언어는 영어 → 한국어 순으로 내려간다', () => {
    expect(localizeEducation(row, 'zh').lang).toBe('en');
    const koOnly = { ...row, title_en: '', body_en: '' };
    expect(localizeEducation(koOnly, 'zh').lang).toBe('ko');
  });

  it('제목·본문을 언어별로 쪼개 섞지 않는다 (반쪽 번역 메일 방지)', () => {
    // 러시아어 제목만 있고 본문이 비면 → 러시아어를 버리고 영어 한 벌로 간다
    const halfRu = { ...row, body_ru: '' };
    const out = localizeEducation(halfRu, 'ru');
    expect(out.lang).toBe('en');
    expect(out.title).toBe('Medication Guide');
    expect(out.body).toBe('Take prescribed antibiotics.');
  });

  it('kk / kz-KZ 는 표의 kz 칸으로 맞춘다', () => {
    expect(normalizeEducationLang('kk')).toBe('kz');
    expect(normalizeEducationLang('kz-KZ')).toBe('kz');
    expect(normalizeEducationLang(null)).toBe('ru');
  });

  it('메타 칸을 그대로 넘긴다', () => {
    const out = localizeEducation(row, 'en');
    expect(out).toMatchObject({ id: 'ed_1', cancerType: 'stomach', phase: 'week_1', category: 'medication' });
  });

  it('라벨은 5개 분류 × 6개 언어', () => {
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(5);
    for (const cat of Object.values(CATEGORY_LABELS)) {
      expect(Object.keys(cat)).toEqual(expect.arrayContaining(['ko', 'en', 'ru', 'zh', 'ja', 'kz']));
    }
    expect(Object.keys(PHASE_LABELS)).toHaveLength(6);
    expect(categoryLabel('diet', 'kk')).toBe(CATEGORY_LABELS.diet.kz);
  });
});
