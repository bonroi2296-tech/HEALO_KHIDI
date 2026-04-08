import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  escapeHtml,
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  isValidUuid,
  isValidNumericId,
  clampNumber,
} from './sanitize';

describe('sanitize', () => {
  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(stripHtml('<b>bold</b> text')).toBe('bold text');
      expect(stripHtml('no tags')).toBe('no tags');
    });
  });

  describe('escapeHtml', () => {
    it('escapes special characters', () => {
      expect(escapeHtml('<div class="a">')).toBe('&lt;div class=&quot;a&quot;&gt;');
      expect(escapeHtml("it's & done")).toBe("it&#x27;s &amp; done");
    });
  });

  describe('sanitizeString', () => {
    it('trims and strips HTML', () => {
      expect(sanitizeString('  <b>hello</b>  ')).toBe('hello');
    });

    it('limits length', () => {
      expect(sanitizeString('abcdefghij', 5)).toBe('abcde');
    });

    it('handles non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes string values recursively', () => {
      const result = sanitizeObject({ name: '<b>Test</b>', nested: { desc: '<i>hi</i>' } });
      expect(result.name).toBe('Test');
      expect(result.nested.desc).toBe('hi');
    });

    it('preserves non-string values', () => {
      const result = sanitizeObject({ count: 5, active: true, name: 'ok' });
      expect(result.count).toBe(5);
      expect(result.active).toBe(true);
    });
  });

  describe('sanitizeEmail', () => {
    it('validates correct emails', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizeEmail(' User@EXAMPLE.COM ')).toBe('user@example.com');
    });

    it('rejects invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBeNull();
      expect(sanitizeEmail('')).toBeNull();
      expect(sanitizeEmail(null)).toBeNull();
    });
  });

  describe('isValidUuid', () => {
    it('validates correct UUIDs', () => {
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('')).toBe(false);
      expect(isValidUuid(null)).toBe(false);
    });
  });

  describe('isValidNumericId', () => {
    it('validates positive integers', () => {
      expect(isValidNumericId(1)).toBe(true);
      expect(isValidNumericId('42')).toBe(true);
    });

    it('rejects invalid', () => {
      expect(isValidNumericId(0)).toBe(false);
      expect(isValidNumericId(-1)).toBe(false);
      expect(isValidNumericId('abc')).toBe(false);
    });
  });

  describe('clampNumber', () => {
    it('clamps within range', () => {
      expect(clampNumber(5, 1, 10, 1)).toBe(5);
      expect(clampNumber(0, 1, 10, 1)).toBe(1);
      expect(clampNumber(20, 1, 10, 1)).toBe(10);
    });

    it('uses fallback for NaN', () => {
      expect(clampNumber('abc', 1, 10, 5)).toBe(5);
      expect(clampNumber(undefined, 1, 10, 5)).toBe(5);
    });

    it('clamps null (Number(null)=0) to min', () => {
      expect(clampNumber(null, 1, 10, 5)).toBe(1);
    });
  });
});
