/**
 * 초대 링크 만료가 «미팅보다 먼저 죽는» 사고를 막는 회귀 테스트 (POSTMORTEM #129)
 */

import { describe, it, expect } from "vitest";
import {
  resolveInviteExpiry,
  POST_MEETING_GRACE_HOURS,
  MAX_LINK_LIFETIME_DAYS,
} from "./inviteExpiry";

const H = 60 * 60 * 1000;
const NOW = new Date("2026-07-24T02:55:00.000Z");

describe("resolveInviteExpiry", () => {
  it("예약시각이 없으면 기존 동작 그대로 (발급시각 + 요청시간)", () => {
    const r = resolveInviteExpiry({ now: NOW, expiresInHours: 72, scheduledAt: null });
    expect(r.expiresAt.toISOString()).toBe(new Date(NOW.getTime() + 72 * H).toISOString());
    expect(r.extendedForSchedule).toBe(false);
  });

  it("실제 사고 재현: 7/24 발급 + 72h 인데 미팅이 7/27 08:00Z → 만료가 미팅 이후여야 한다", () => {
    // 옛 동작: 만료 7/27 02:55Z = 미팅 5시간 전에 링크 사망
    const scheduledAt = "2026-07-27T08:00:00.000Z";
    const r = resolveInviteExpiry({ now: NOW, expiresInHours: 72, scheduledAt });

    expect(r.expiresAt.getTime()).toBeGreaterThan(new Date(scheduledAt).getTime());
    expect(r.extendedForSchedule).toBe(true);
    expect(r.expiresAt.toISOString()).toBe(
      new Date(new Date(scheduledAt).getTime() + POST_MEETING_GRACE_HOURS * H).toISOString()
    );
  });

  it("미팅이 요청 유효시간 안쪽이면 요청분을 줄이지 않는다", () => {
    // 미팅이 6시간 뒤인데 72h 링크를 요청 → 72h 유지
    const r = resolveInviteExpiry({
      now: NOW,
      expiresInHours: 72,
      scheduledAt: new Date(NOW.getTime() + 6 * H).toISOString(),
    });
    expect(r.expiresAt.toISOString()).toBe(new Date(NOW.getTime() + 72 * H).toISOString());
    expect(r.extendedForSchedule).toBe(false);
  });

  it("예약이 과거여도 요청분은 그대로 (음수 만료 금지)", () => {
    const r = resolveInviteExpiry({
      now: NOW,
      expiresInHours: 24,
      scheduledAt: new Date(NOW.getTime() - 10 * 24 * H).toISOString(),
    });
    expect(r.expiresAt.getTime()).toBe(NOW.getTime() + 24 * H);
    expect(r.extendedForSchedule).toBe(false);
  });

  it("잘못된 예약시각 문자열은 무시하고 요청분 사용", () => {
    const r = resolveInviteExpiry({ now: NOW, expiresInHours: 24, scheduledAt: "언젠가" });
    expect(r.expiresAt.getTime()).toBe(NOW.getTime() + 24 * H);
    expect(r.extendedForSchedule).toBe(false);
  });

  it("아주 먼 미래 상담은 상한(45일)에서 잘린다", () => {
    const r = resolveInviteExpiry({
      now: NOW,
      expiresInHours: 72,
      scheduledAt: new Date(NOW.getTime() + 200 * 24 * H).toISOString(),
    });
    expect(r.cappedByMaxLifetime).toBe(true);
    expect(r.expiresAt.getTime()).toBe(NOW.getTime() + MAX_LINK_LIFETIME_DAYS * 24 * H);
  });

  it("상한이 요청 유효시간을 거꾸로 줄이지는 않는다", () => {
    // 요청분(168h)은 상한(45일) 안쪽이므로 그대로여야 함
    const r = resolveInviteExpiry({ now: NOW, expiresInHours: 168, scheduledAt: null });
    expect(r.expiresAt.getTime()).toBe(NOW.getTime() + 168 * H);
    expect(r.cappedByMaxLifetime).toBe(false);
  });

  it("요청분 자체가 상한보다 길면(라우트 밖 호출) 요청분을 지키고 «잘렸다»고 보고하지 않는다", () => {
    const r = resolveInviteExpiry({ now: NOW, expiresInHours: 100 * 24, scheduledAt: null });
    expect(r.expiresAt.getTime()).toBe(NOW.getTime() + 100 * 24 * H);
    expect(r.cappedByMaxLifetime).toBe(false);
  });

  it("Date 객체로 넘긴 예약시각도 동일하게 동작한다", () => {
    const scheduled = new Date(NOW.getTime() + 10 * 24 * H);
    const r = resolveInviteExpiry({ now: NOW, expiresInHours: 72, scheduledAt: scheduled });
    expect(r.extendedForSchedule).toBe(true);
    expect(r.expiresAt.getTime()).toBe(scheduled.getTime() + POST_MEETING_GRACE_HOURS * H);
  });
});
