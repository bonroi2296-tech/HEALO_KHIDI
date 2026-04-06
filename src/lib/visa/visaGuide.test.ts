import { describe, it, expect } from 'vitest';
import { getVisaInfo, getVisaChecklist, getAllVisaTypes } from './visaGuide';

describe('visaGuide', () => {
  describe('getVisaInfo', () => {
    it('recommends C-3-3 for short treatments (<=90 days)', () => {
      const { recommended } = getVisaInfo('ru', 30);
      expect(recommended.visaType).toBe('C-3-3');
    });

    it('recommends G-1-10 for long treatments (>90 days)', () => {
      const { recommended } = getVisaInfo('kz', 120);
      expect(recommended.visaType).toBe('G-1-10');
    });

    it('provides alternative for short stays', () => {
      const { alternative } = getVisaInfo('ru', 30);
      expect(alternative).toBeDefined();
      expect(alternative!.visaType).toBe('G-1-10');
    });

    it('no alternative for long stays', () => {
      const { alternative } = getVisaInfo('ru', 120);
      expect(alternative).toBeUndefined();
    });

    it('returns embassy info for supported nationalities', () => {
      const { embassy } = getVisaInfo('ru', 30);
      expect(embassy).toBeDefined();
      expect(embassy!.url).toContain('mofa.go.kr');
    });

    it('returns no embassy for unsupported nationalities', () => {
      const { embassy } = getVisaInfo('us', 30);
      expect(embassy).toBeUndefined();
    });
  });

  describe('getVisaChecklist', () => {
    it('returns checklist with all required documents for C-3-3', () => {
      const checklist = getVisaChecklist('C-3-3', 'en');
      expect(checklist.visaType).toBe('C-3-3');
      expect(checklist.documents.length).toBeGreaterThanOrEqual(5);
      expect(checklist.documents.every(d => d.name && d.description)).toBe(true);
    });

    it('G-1-10 has more documents than C-3-3', () => {
      const c33 = getVisaChecklist('C-3-3', 'en');
      const g110 = getVisaChecklist('G-1-10', 'en');
      expect(g110.documents.length).toBeGreaterThan(c33.documents.length);
    });

    it('returns localized content in Russian', () => {
      const checklist = getVisaChecklist('C-3-3', 'ru');
      expect(checklist.visaName).toContain('C-3-3');
      expect(checklist.description.toLowerCase()).toContain('виза');
    });

    it('returns localized content in Kazakh', () => {
      const checklist = getVisaChecklist('C-3-3', 'kz');
      expect(checklist.visaName).toContain('виза');
    });

    it('all documents start unchecked', () => {
      const checklist = getVisaChecklist('C-3-3', 'en');
      expect(checklist.documents.every(d => d.checked === false)).toBe(true);
    });
  });

  describe('getAllVisaTypes', () => {
    it('returns both visa types', () => {
      const types = getAllVisaTypes('en');
      expect(types).toHaveLength(2);
      expect(types.map(t => t.type)).toEqual(['C-3-3', 'G-1-10']);
    });
  });
});
