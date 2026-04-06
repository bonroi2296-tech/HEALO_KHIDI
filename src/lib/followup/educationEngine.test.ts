import { describe, it, expect } from 'vitest';
import { localizeEducation, CATEGORY_LABELS, PHASE_LABELS, type EducationContent } from './educationEngine';

const mockContent: EducationContent = {
  id: 'ed_1',
  cancer_type: 'stomach',
  phase: 'week_1',
  category: 'medication',
  title: '수술 후 1주차 투약 안내',
  body: '수술 후 처방된 항생제를 복용하세요.',
  i18n: {
    en: { title: 'Week 1 Medication Guide', body: 'Take prescribed antibiotics after surgery.' },
    ru: { title: 'Руководство по лекарствам на 1-ю неделю', body: 'Принимайте назначенные антибиотики.' },
  },
  created_at: '2026-04-06T00:00:00Z',
};

describe('educationEngine', () => {
  describe('localizeEducation', () => {
    it('returns Korean content for ko', () => {
      const result = localizeEducation(mockContent, 'ko');
      expect(result.title).toBe('수술 후 1주차 투약 안내');
      expect(result.body).toBe('수술 후 처방된 항생제를 복용하세요.');
    });

    it('returns English content for en', () => {
      const result = localizeEducation(mockContent, 'en');
      expect(result.title).toBe('Week 1 Medication Guide');
    });

    it('returns Russian content for ru', () => {
      const result = localizeEducation(mockContent, 'ru');
      expect(result.title).toBe('Руководство по лекарствам на 1-ю неделю');
    });

    it('falls back to English for missing language', () => {
      const result = localizeEducation(mockContent, 'zh');
      expect(result.title).toBe('Week 1 Medication Guide');
    });

    it('falls back to Korean when no i18n at all', () => {
      const noI18n = { ...mockContent, i18n: {} };
      const result = localizeEducation(noI18n, 'en');
      expect(result.title).toBe('수술 후 1주차 투약 안내');
    });

    it('preserves metadata fields', () => {
      const result = localizeEducation(mockContent, 'en');
      expect(result.id).toBe('ed_1');
      expect(result.cancerType).toBe('stomach');
      expect(result.phase).toBe('week_1');
      expect(result.category).toBe('medication');
    });
  });

  describe('CATEGORY_LABELS', () => {
    it('has all 5 categories', () => {
      expect(Object.keys(CATEGORY_LABELS)).toHaveLength(5);
    });

    it('has 6 languages for each category', () => {
      for (const cat of Object.values(CATEGORY_LABELS)) {
        expect(Object.keys(cat)).toEqual(expect.arrayContaining(['ko', 'en', 'ru', 'zh', 'ja', 'kz']));
      }
    });
  });

  describe('PHASE_LABELS', () => {
    it('has all 6 phases', () => {
      expect(Object.keys(PHASE_LABELS)).toHaveLength(6);
    });
  });
});
