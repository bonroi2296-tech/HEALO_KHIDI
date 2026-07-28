import { describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * 테넌트 설정의 **안전 계약**을 지키는 테스트.
 *
 * 핵심 명제 하나: **`NEXT_PUBLIC_TENANT` 를 안 켜면 healwith 는 지금과 100% 동일해야 한다.**
 * 이게 깨지면 B2B 실험이 실서비스를 다치게 한다 — 그래서 값 비교가 아니라 «문자열 동일성»까지 본다.
 *
 * ⚠️ 모듈이 import 시점에 env 를 읽으므로(`SITE_INFO`), 테넌트를 바꿔 보는 테스트는
 *    반드시 `vi.resetModules()` 후 동적 import 해야 한다. 안 그러면 첫 import 값이 굳어 통과한다
 *    (= 죽은 테스트). 아래 «가짜 통과 방지» 케이스가 그걸 확인한다.
 */

const ORIGINAL = process.env.NEXT_PUBLIC_TENANT;

async function loadTenant(tenantKey?: string) {
  const { vi } = await import("vitest");
  vi.resetModules();
  if (tenantKey === undefined) delete process.env.NEXT_PUBLIC_TENANT;
  else process.env.NEXT_PUBLIC_TENANT = tenantKey;
  return import("./index.js");
}

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_TENANT;
  else process.env.NEXT_PUBLIC_TENANT = ORIGINAL;
});

describe("테넌트 — 기본값 안전 계약", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_TENANT;
  });

  it("설정이 없으면 healwith 다", async () => {
    const m = await loadTenant(undefined);
    expect(m.activeTenantKey()).toBe("healwith");
    expect(m.isDefaultTenant()).toBe(true);
  });

  it("모르는 값이면 조용히 healwith 로 떨어진다 (오타로 사이트가 죽지 않게)", async () => {
    const m = await loadTenant("존재하지-않는-병원");
    expect(m.activeTenantKey()).toBe("healwith");
    expect(m.isDefaultTenant()).toBe(true);
  });

  it("기본 테넌트에서 브랜드 치환은 원본을 «그대로» 돌려준다", async () => {
    const m = await loadTenant(undefined);
    const samples = [
      "healwith 는 한국 체류 중 통역 서비스를 제공합니다",
      "About healwith",
      "healwith provides interpretation support",
      "문의: admin@healwith.co.kr",
      "",
    ];
    for (const s of samples) {
      // 값이 같은 정도가 아니라 «같은 문자열»이어야 한다.
      expect(m.applyTenantBrand(s, "ko")).toBe(s);
      expect(m.applyTenantBrand(s, "en")).toBe(s);
    }
  });

  it("기본 테넌트의 법인정보는 healwith 실제 값 그대로다", async () => {
    const m = await loadTenant(undefined);
    const legal = m.getTenant().legal;
    expect(legal.serviceName).toBe("healwith");
    expect(legal.operatedBy).toBe("Bonroi");
    expect(legal.businessRegistrationNumber).toBe("463-35-00902");
    expect(legal.foreignPatientAttractionRegistration).toBe("A-2026-01-02-06761");
    expect(legal.contactEmail).toBe("admin@healwith.co.kr");
    expect(legal.copyrightKo).toBe("© healwith(힐위드). All rights reserved.");
  });

  it("문자열이 아닌 값은 손대지 않는다", async () => {
    const m = await loadTenant("immune");
    expect(m.applyTenantBrand(null as never, "ko")).toBe(null);
    expect(m.applyTenantBrand(undefined as never, "ko")).toBe(undefined);
    expect(m.applyTenantBrand(42 as never, "ko")).toBe(42);
  });
});

describe("테넌트 — 면력 목업으로 전환했을 때", () => {
  it("언어마다 다른 이름으로 갈린다", async () => {
    const m = await loadTenant("immune");
    expect(m.tenantBrandName("ko")).toBe("면력한방병원");
    expect(m.tenantBrandName("en")).toBe("Immune Hospital");
    expect(m.tenantBrandName("ru")).toBe("Иммунная Клиника");
    expect(m.tenantBrandName("kz")).toBe("Иммундық клиника");
  });

  it("모르는 언어는 영어 이름으로 폴백한다", async () => {
    const m = await loadTenant("immune");
    expect(m.tenantBrandName("vi")).toBe("Immune Hospital");
  });

  it("사전 문구 안의 브랜드명이 그 언어 이름으로 바뀐다", async () => {
    const m = await loadTenant("immune");
    expect(m.applyTenantBrand("About healwith", "en")).toBe("About Immune Hospital");
    expect(m.applyTenantBrand("healwith 소개", "ko")).toBe("면력한방병원 소개");
    expect(m.applyTenantBrand("healwith помогает", "ru")).toBe("Иммунная Клиника помогает");
  });

  it("🔒 도메인(healwith.co.kr)은 건드리지 않는다 — 없는 주소를 안내하면 안 되므로", async () => {
    const m = await loadTenant("immune");
    expect(m.applyTenantBrand("메일: admin@healwith.co.kr", "ko")).toBe("메일: admin@healwith.co.kr");
    expect(m.applyTenantBrand("https://healwith.co.kr/faq", "en")).toBe("https://healwith.co.kr/faq");
    // 브랜드명과 도메인이 한 문장에 같이 있으면 이름만 바뀐다.
    expect(m.applyTenantBrand("healwith 는 healwith.co.kr 에서", "ko")).toBe(
      "면력한방병원 는 healwith.co.kr 에서",
    );
  });

  it("목업 표식이 붙어 있다 — 실서비스 전환 전에 반드시 지워야 할 신호", async () => {
    const m = await loadTenant("immune");
    expect(m.getTenant().isMockup).toBe(true);
  });

  it("🔒 모르는 법인정보는 «빈칸»이지 자리표시자 글자가 아니다", async () => {
    // 왜: 처음엔 "PLACEHOLDER" 를 넣었는데 그 글자가 **푸터와 문의 버튼에 그대로 떴다**
    //     (2026-07-28 목업 실측). 화면은 빈 값이면 그 줄을 안 그리므로,
    //     모르는 사실은 지어내지도 자리표시자로 채우지도 말고 **아무 말도 안 하는** 게 맞다.
    const m = await loadTenant("immune");
    const legal = m.getTenant().legal;
    for (const key of [
      "operatedBy",
      "representative",
      "representativeKo",
      "businessRegistrationNumber",
      "foreignPatientAttractionRegistration",
      "guaranteeInsurer",
      "contactEmail",
      "privacyOfficer",
    ]) {
      expect(legal[key]).toBe("");
    }
    // 확인된 공개 정보는 반대로 채워져 있어야 한다.
    expect(legal.serviceName).toBe("면력한방병원");
    expect(legal.contactPhone).toBe("1588-2915");
    expect(legal.addressKo).toContain("마곡중앙6로");
  });

  it("자리표시자 글자가 테넌트 설정 어디에도 없다", async () => {
    const m = await loadTenant("immune");
    const dump = JSON.stringify(m.getTenant());
    expect(dump).not.toContain("PLACEHOLDER");
    expect(dump).not.toContain("example.com");
  });
});

describe("테넌트 — 가짜 통과 방지(negative control)", () => {
  it("전환이 실제로 일어난다: 같은 문장이 기본/면력에서 다르게 나온다", async () => {
    const base = await loadTenant(undefined);
    const baseOut = base.applyTenantBrand("About healwith", "en");
    const immune = await loadTenant("immune");
    const immuneOut = immune.applyTenantBrand("About healwith", "en");
    // 이 두 값이 같아지면 테스트가 죽은 것(모듈 캐시가 안 비워졌다는 뜻).
    expect(baseOut).not.toBe(immuneOut);
    expect(baseOut).toBe("About healwith");
    expect(immuneOut).toBe("About Immune Hospital");
  });
});
