import { describe, it, expect } from "vitest";
import {
  hasReachableContact,
  pickHandoffConfirm,
  HANDOFF_CONFIRM,
  HANDOFF_NEED_CONTACT,
} from "./contactGate";

const ACTIVE_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"];

describe("hasReachableContact — 코디가 연락할 수단이 있나", () => {
  it("이메일·전화·로그인계정 중 하나라도 있으면 true", () => {
    expect(hasReachableContact({ guest_email: "enc..." })).toBe(true);
    expect(hasReachableContact({ guest_phone: "enc..." })).toBe(true);
    expect(hasReachableContact({ user_id: "usr_1" })).toBe(true);
  });

  it("연락처·계정 전혀 없는 익명이면 false (= 거짓 접수완료 금지 대상)", () => {
    expect(hasReachableContact({})).toBe(false);
    expect(hasReachableContact({ guest_email: null, guest_phone: null, user_id: null })).toBe(false);
    expect(hasReachableContact(null)).toBe(false);
    expect(hasReachableContact(undefined)).toBe(false);
  });
});

describe("pickHandoffConfirm — 연락 가능 여부로 접수 멘트 분기", () => {
  it("연락 가능하면 '접수완료'(HANDOFF_CONFIRM)", () => {
    expect(pickHandoffConfirm("ko", true)).toBe(HANDOFF_CONFIRM.ko);
  });

  it("연락 불가하면 '연락처 요청'(HANDOFF_NEED_CONTACT) — 거짓 접수완료 금지", () => {
    const msg = pickHandoffConfirm("ko", false);
    expect(msg).toBe(HANDOFF_NEED_CONTACT.ko);
    // 핵심: 연락처 없을 때 "접수됐어요/접수됐"이라는 거짓 확정 문구가 나오면 안 됨
    expect(msg).not.toContain("접수됐");
  });

  it("미지원 언어는 en 폴백", () => {
    expect(pickHandoffConfirm("xx", true)).toBe(HANDOFF_CONFIRM.en);
    expect(pickHandoffConfirm("xx", false)).toBe(HANDOFF_NEED_CONTACT.en);
  });

  it("활성 6개 언어(ko·en·ru·kz·zh·ja) 멘트가 양쪽 맵에 다 존재", () => {
    for (const lang of ACTIVE_LANGS) {
      expect(HANDOFF_CONFIRM[lang], `CONFIRM.${lang}`).toBeTruthy();
      expect(HANDOFF_NEED_CONTACT[lang], `NEED_CONTACT.${lang}`).toBeTruthy();
    }
  });
});
