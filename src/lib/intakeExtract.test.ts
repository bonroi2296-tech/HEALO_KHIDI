/**
 * 테스트: intakeExtract 유틸
 */
import { describe, it, expect } from 'vitest';
import { bodyPartFromText, contraindicationsAndFlagsFromMessage } from './intakeExtract';

describe('bodyPartFromText', () => {
  it('dental 키워드 추출', () => {
    expect(bodyPartFromText('I need a dental implant')).toBe('dental');
    expect(bodyPartFromText('tooth pain treatment')).toBe('dental');
  });

  it('nose 키워드 추출', () => {
    expect(bodyPartFromText('rhinoplasty surgery')).toBe('nose');
    expect(bodyPartFromText('nose job')).toBe('nose');
  });

  it('eye 키워드 추출', () => {
    expect(bodyPartFromText('double eyelid surgery')).toBe('eye');
    expect(bodyPartFromText('LASIK procedure')).toBe('eye');
  });

  it('키워드가 없으면 null 반환', () => {
    expect(bodyPartFromText('hello world')).toBe(null);
    expect(bodyPartFromText('')).toBe(null);
    expect(bodyPartFromText(null)).toBe(null);
  });
});

describe('contraindicationsAndFlagsFromMessage', () => {
  it('allergy 키워드 감지', () => {
    const result = contraindicationsAndFlagsFromMessage('I have an allergy to penicillin');
    expect(result.allergy).toBe(true);
    expect(result.contraindications).toContain('allergy');
  });

  it('medication 키워드 감지', () => {
    const result = contraindicationsAndFlagsFromMessage('Currently taking medication');
    expect(result.medications).toBe(true);
    expect(result.contraindications).toContain('medication');
  });

  it('키워드가 없으면 빈 배열 반환', () => {
    const result = contraindicationsAndFlagsFromMessage('I am healthy');
    expect(result.contraindications).toEqual([]);
    expect(result.allergy).toBe(false);
    expect(result.medications).toBe(false);
  });
});
