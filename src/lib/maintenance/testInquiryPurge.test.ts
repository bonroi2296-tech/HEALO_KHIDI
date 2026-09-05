/**
 * 지우는 판정이라 «안 지워야 할 것을 지우지 않는가»를 먼저 잠근다.
 */
import { describe, it, expect } from "vitest";
import {
  isMachineMadeTestInquiry,
  isPurgeableNow,
  KEEP_INQUIRY_IDS,
  PURGE_AFTER_DAYS,
  type PurgeCandidate,
} from "./testInquiryPurge";

const NOW = Date.parse("2026-08-25T00:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const row = (over: Partial<PurgeCandidate> = {}): PurgeCandidate => ({
  id: 500,
  isTest: true,
  email: "e2e-referral@healo-test.invalid",
  source: "web",
  createdAt: daysAgo(60),
  ...over,
});

describe("기계가 만든 시험 문의 판정", () => {
  it("실환자 문의(is_test=false)는 절대 대상이 아니다", () => {
    expect(isMachineMadeTestInquiry(row({ isTest: false }))).toBe(false);
    // 주소가 시험용처럼 보여도 마찬가지
    expect(isMachineMadeTestInquiry(row({ isTest: false, email: "x@test.com" }))).toBe(false);
  });

  it("KEEP 목록은 무슨 일이 있어도 안 지운다", () => {
    for (const id of Object.keys(KEEP_INQUIRY_IDS).map(Number)) {
      expect(isMachineMadeTestInquiry(row({ id }))).toBe(false);
      expect(isPurgeableNow(row({ id }), NOW)).toBe(false);
    }
  });

  it("자동 검사·시험 계정 주소·AI 자가시험 승격분은 대상", () => {
    expect(isMachineMadeTestInquiry(row({ email: "probe@healo-test.invalid" }))).toBe(true);
    expect(isMachineMadeTestInquiry(row({ email: "referral-smoke@test.com" }))).toBe(true);
    expect(isMachineMadeTestInquiry(row({ email: "claude-verify@example.com" }))).toBe(true);
    expect(isMachineMadeTestInquiry(row({ email: "", source: "ai_agent" }))).toBe(true);
  });

  it("사람이 손으로 넣은 점검 문의는 대상이 아니다 (PO 결정 2026-08-25)", () => {
    for (const email of [
      "admin@healwith.co.kr",
      "moon@immunelab.co.kr",
      "bonroi2296@gmail.com",
      "qa-test@healwith.co.kr",
      "",
    ]) {
      expect(isMachineMadeTestInquiry(row({ email }))).toBe(false);
    }
  });

  it("자동 청소는 30일 지난 것만 — 오늘 검사 결과는 남겨 둔다", () => {
    expect(isPurgeableNow(row({ createdAt: daysAgo(PURGE_AFTER_DAYS + 1) }), NOW)).toBe(true);
    expect(isPurgeableNow(row({ createdAt: daysAgo(PURGE_AFTER_DAYS - 1) }), NOW)).toBe(false);
    expect(isPurgeableNow(row({ createdAt: "(깨진 값)" }), NOW)).toBe(false);
  });
});
