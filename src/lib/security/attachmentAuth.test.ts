/**
 * 테스트: attachmentAuth 유틸
 */
import { describe, it, expect } from 'vitest';
import { pathAuthorized } from './attachmentAuth';

describe('pathAuthorized', () => {
  it('attachments 배열에 path가 있으면 true 반환', () => {
    const attachments = [
      { path: 'inquiry/123/file1.pdf', name: 'file1.pdf' },
      { path: 'inquiry/123/file2.jpg', name: 'file2.jpg' },
    ];
    expect(pathAuthorized('inquiry/123/file1.pdf', attachments)).toBe(true);
  });

  it('attachments 배열에 path가 없으면 false 반환', () => {
    const attachments = [
      { path: 'inquiry/123/file1.pdf', name: 'file1.pdf' },
    ];
    expect(pathAuthorized('inquiry/123/other.pdf', attachments)).toBe(false);
  });

  it('빈 배열이면 false 반환', () => {
    expect(pathAuthorized('inquiry/123/file.pdf', [])).toBe(false);
  });

  it('attachments가 null이면 false 반환', () => {
    expect(pathAuthorized('inquiry/123/file.pdf', null)).toBe(false);
  });

  it('attachments가 undefined이면 false 반환', () => {
    expect(pathAuthorized('inquiry/123/file.pdf', undefined)).toBe(false);
  });

  it('attachments가 잘못된 형식이면 false 반환', () => {
    expect(pathAuthorized('inquiry/123/file.pdf', 'not-an-array')).toBe(false);
  });
});
