/**
 * 회귀 시험 — 역할을 「통합 참여 링크(guest)」로 통일하면서 **언어가 한국어로 뒤집히지 않게**.
 *
 * 2026-07-31: 역할 6종을 없애려다 발견 — 역할은 권한이 아니라 «기본 언어»를 정하고 있었다.
 * 스태프 화면이 예전엔 role='patient' 로 링크를 뽑았는데 'guest' 로 바꾸는 순간,
 * guest 를 환자로 안 보면 러시아 환자에게 한국어 화면·한국어 리마인더가 나간다.
 */

import { describe, it, expect } from "vitest";
import { isPatientSideRole, defaultLangForRole } from "./inviteRole";

describe("초대 역할 → 기본 언어", () => {
  it("통합 링크(guest)는 환자와 같게 본다 — 이게 깨지면 러시아 환자가 한국어를 본다", () => {
    expect(isPatientSideRole("guest")).toBe(true);
    expect(defaultLangForRole("guest", "ru")).toBe("ru");
    expect(defaultLangForRole("guest", "kz")).toBe("kz");
  });

  it("환자 역할은 그대로 환자 언어", () => {
    expect(defaultLangForRole("patient", "ru")).toBe("ru");
  });

  it("상담에 환자 언어가 안 정해져 있으면 러시아어", () => {
    expect(defaultLangForRole("guest", null)).toBe("ru");
    expect(defaultLangForRole("patient", undefined)).toBe("ru");
  });

  it("의료진·코디는 한국어", () => {
    for (const r of ["doctor", "coordinator", "translator", "observer"]) {
      expect(isPatientSideRole(r)).toBe(false);
      expect(defaultLangForRole(r, "ru")).toBe("ko");
    }
  });

  it("역할이 비어 있어도 안 터진다", () => {
    expect(defaultLangForRole(null, "ru")).toBe("ko");
    expect(defaultLangForRole(undefined, "ru")).toBe("ko");
  });
});
