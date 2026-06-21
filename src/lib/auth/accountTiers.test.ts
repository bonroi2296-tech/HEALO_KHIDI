import { describe, it, expect } from "vitest";
import {
  ACCOUNT_TIERS,
  STAFF_TIERS,
  PARTNER_TIERS,
  AGENCY_BACKED_TIERS,
  ASSIGNABLE_TIERS,
  PARTNER_TYPES,
  resolveTier,
  tierFromPartnerType,
  partnerTypeLabel,
  type AccountTier,
} from "./accountTiers";
import { normalizeRole, getPrimaryRole, hasPermission } from "./roles";

describe("accountTiers — 단일 표준 일관성", () => {
  it("정확히 8개 계층을 정의한다", () => {
    expect(Object.keys(ACCOUNT_TIERS)).toHaveLength(8);
  });

  it("각 정의의 key 와 tier 필드가 일치한다", () => {
    for (const [key, def] of Object.entries(ACCOUNT_TIERS)) {
      expect(def.tier).toBe(key);
      expect(def.labelKo.length).toBeGreaterThan(0);
      expect(def.labelEn.length).toBeGreaterThan(0);
    }
  });

  it("스태프/파트너 계층 분류가 표준 안에 존재한다", () => {
    for (const t of [...STAFF_TIERS, ...PARTNER_TIERS, ...ASSIGNABLE_TIERS]) {
      expect(ACCOUNT_TIERS[t]).toBeDefined();
    }
  });

  it("agency 인프라 공유 계층은 partner_type 을 갖는다", () => {
    expect(AGENCY_BACKED_TIERS).toEqual(["overseas_agency", "overseas_medical"]);
    for (const t of AGENCY_BACKED_TIERS) {
      expect(ACCOUNT_TIERS[t].storage).toBe("agency_users");
      expect(PARTNER_TYPES).toContain(ACCOUNT_TIERS[t].partnerType);
    }
  });
});

describe("resolveTier — 인증 컨텍스트 → 계층 우선순위", () => {
  it("admin 이 최우선", () => {
    expect(resolveTier({ isAdmin: true, appRole: "coordinator" })).toBe("admin");
    expect(resolveTier({ appRole: "admin" })).toBe("admin");
  });
  it("스태프 역할", () => {
    expect(resolveTier({ appRole: "coordinator" })).toBe("coordinator");
    expect(resolveTier({ appRole: "doctor" })).toBe("doctor");
  });
  it("병원 담당자", () => {
    expect(resolveTier({ isHospitalUser: true })).toBe("domestic_hospital");
  });
  it("해외 파트너는 partner_type 으로 갈린다", () => {
    expect(resolveTier({ appRole: "agency", partnerType: "agency" })).toBe("overseas_agency");
    expect(resolveTier({ appRole: "agency", partnerType: "medical_institution" })).toBe("overseas_medical");
    expect(resolveTier({ isAgencyUser: true })).toBe("overseas_agency"); // 기본값
  });
  it("아무 역할 없으면 환자", () => {
    expect(resolveTier({})).toBe("patient");
  });
});

describe("partner_type 헬퍼", () => {
  it("tierFromPartnerType", () => {
    expect(tierFromPartnerType("medical_institution")).toBe("overseas_medical");
    expect(tierFromPartnerType("agency")).toBe("overseas_agency");
    expect(tierFromPartnerType(null)).toBe("overseas_agency");
  });
  it("partnerTypeLabel", () => {
    expect(partnerTypeLabel("medical_institution").ko).toBe("해외 의료기관");
    expect(partnerTypeLabel("agency").ko).toBe("해외 에이전시");
  });
});

describe("roles.ts — 레거시 호환", () => {
  it("옛 역할 이름을 표준으로 변환한다", () => {
    expect(normalizeRole("korean_hospital")).toBe("domestic_hospital");
    expect(normalizeRole("local_clinic")).toBe("overseas_medical");
    expect(normalizeRole("agent")).toBe("overseas_agency");
    expect(normalizeRole("agency")).toBe("overseas_agency");
    expect(normalizeRole("patient")).toBe("patient");
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("nonsense")).toBeNull();
  });

  it("getPrimaryRole 우선순위 (옛 이름 혼용 포함)", () => {
    const rec = (role: string): any => ({
      id: role, user_id: "u", role, language_preference: "ru", is_active: true,
    });
    expect(getPrimaryRole([rec("patient"), rec("admin")])).toBe("admin");
    expect(getPrimaryRole([rec("local_clinic"), rec("patient")])).toBe("overseas_medical");
    expect(getPrimaryRole([rec("korean_hospital")])).toBe("domestic_hospital");
  });

  it("hasPermission — admin 와일드카드 / 비활성 제외", () => {
    const rec = (role: string, is_active = true): any => ({
      id: role, user_id: "u", role, language_preference: "ru", is_active,
    });
    expect(hasPermission([rec("admin")], "anything:at:all")).toBe(true);
    expect(hasPermission([rec("patient")], "intake:create")).toBe(true);
    expect(hasPermission([rec("patient")], "treatment:record")).toBe(false);
    expect(hasPermission([rec("admin", false)], "anything")).toBe(false);
  });
});

// 타입 수준 확인: 모든 AccountTier 가 ACCOUNT_TIERS 에 존재
const _exhaustive: Record<AccountTier, true> = {
  guest: true, patient: true, coordinator: true, doctor: true, admin: true,
  domestic_hospital: true, overseas_agency: true, overseas_medical: true,
};
void _exhaustive;
