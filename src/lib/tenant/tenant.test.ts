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

  /* 🔴 healwith 에는 `homeContent` 가 «없어야» 한다 — 이건 취향이 아니라 안전선이다.
     `getMergedHomeContent()`(src/lib/content/overrides.js)는 이렇게 생겼다:

         const tenantHome = getTenant().homeContent;
         if (tenantHome) deepMerge(merged, tenantHome);      ← ①
         …
         return isDefaultTenant() ? merged : brandifyLangMap(merged);   ← ②

     ②는 healwith 를 지켜 준다(원본 그대로 반환). 그런데 **①은 ② 앞에서 돈다.**
     즉 누가 healwith 테넌트에 `homeContent` 를 한 줄 붙이는 순간, 설정을 아무것도 안 켰는데도
     **실서비스 홈 문구가 조용히 바뀐다.** 화면도 안 깨지고 검사도 안 울려서 아무도 모른다.
     그래서 「비어 있음」 자체를 검사로 박는다.
     ⚠️ 이 검사가 빨개졌다면 「검사를 고치는」 게 아니라 **①을 ② 뒤로 옮기거나
        기본 테넌트일 때 건너뛰게** 고쳐야 한다. */
  it("🔒 기본(healwith) 테넌트에는 homeContent 가 없다 — 있으면 실서비스 홈이 조용히 바뀐다", async () => {
    const m = await loadTenant(undefined);
    expect(m.getTenant().homeContent).toBeUndefined();
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
    expect(m.tenantBrandName("ru")).toBe("Immune Hospital");
    expect(m.tenantBrandName("kz")).toBe("Immune Hospital");
  });

  it("모르는 언어는 영어 이름으로 폴백한다", async () => {
    const m = await loadTenant("immune");
    expect(m.tenantBrandName("vi")).toBe("Immune Hospital");
  });

  it("사전 문구 안의 브랜드명이 그 언어 이름으로 바뀐다", async () => {
    const m = await loadTenant("immune");
    expect(m.applyTenantBrand("About healwith", "en")).toBe("About Immune Hospital");
    expect(m.applyTenantBrand("healwith 소개", "ko")).toBe("면력한방병원 소개");
    expect(m.applyTenantBrand("healwith помогает", "ru")).toBe("Immune Hospital помогает");
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
    // ⚠️ 2026-07-29 정정: 아래 목록에서 대표자·사업자등록번호·개인정보보호책임자를 뺐다.
    //    전에는 「모르는 값」이라 빈칸이었는데, **병원 사이트 푸터에 이미 공개돼 있었다.**
    //    즉 그때 빈칸이었던 건 «모르는 사실»이어서가 아니라 **내가 안 찾아봐서**였다.
    //    교훈: 「없다」로 확정하기 전에 그 병원 사이트를 먼저 뒤진다.
    for (const key of [
      "operatedBy",
      "foreignPatientAttractionRegistration", // 유치기관 등록번호는 아직 못 찾음
      "guaranteeInsurer",
      "contactEmail",
    ]) {
      expect(legal[key]).toBe("");
    }
    // 확인된 공개 정보는 반대로 채워져 있어야 한다(출처: immunehospital.com 푸터·법정 공개).
    expect(legal.serviceName).toBe("면력한방병원");
    expect(legal.contactPhone).toBe("1588-2915");
    expect(legal.addressKo).toContain("마곡중앙6로");
    expect(legal.representativeKo).toBe("황이준");
    expect(legal.businessRegistrationNumber).toBe("645-92-01641");
    expect(legal.privacyOfficerKo).toBe("손효준");
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

describe("판의 콘텐츠 위생 — 사람 눈 대신 기계가 잡는다", () => {
  /* 왜 이 검사가 생겼나 (2026-07-29):
     프로그램 카드 두 장이 **같은 사진**을 쓰고 있었고, 전체 화면을 눈으로 훑어서야 잡혔다.
     같은 사진이 나란히 뜨면 «채울 게 없어서 돌려 쓴 티» = 판 냄새다.
     병원마다 데이터를 새로 채워 넣는 구조라 이 실수는 병원이 늘수록 반복된다 → 기계가 잡는다. */
  const collectImages = (node: any, out: string[] = []): string[] => {
    if (Array.isArray(node)) {
      node.forEach((n) => collectImages(n, out));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        // ⚠️ 빈 문자열은 «사진 없음»이지 사진이 아니다. 여러 사람이 사진이 없을 수 있으므로
        //    이걸 세면 중복으로 오해한다(2026-07-29: 사진 없는 의료진 2명 때문에 실제로 오탐).
        if ((k === "image" || k === "photo" || k === "src" || k === "thumb") && typeof v === "string" && v !== "") out.push(v);
        else if (typeof v !== "string") collectImages(v, out);
      }
    }
    return out;
  };

  it("한 병원 홈 안에서 같은 사진을 두 번 쓰지 않는다", async () => {
    const { IMMUNE_SITE } = await import("./content/immuneSite.js");
    const imgs = collectImages(IMMUNE_SITE);
    const dup = [...new Set(imgs.filter((v, i) => imgs.indexOf(v) !== i))];
    // ⚠️ 처음엔 «같은 배열 안에서만» 검사했는데, 실제로 겹쳤던 자리는
    //    specialties 와 programs — **서로 다른 배열**이라 그 검사는 통과해 버렸다.
    //    (2026-07-29, 일부러 되살려 본 negative control 로 잡음.)
    //    한 화면 안이면 섹션이 달라도 눈에는 그냥 «같은 사진 두 번»이다 → 전체에서 유일해야 한다.
    expect(dup, `같은 사진이 두 번 쓰였다: ${dup.join(", ")}`).toEqual([]);
  });

  it("쓰는 사진 파일이 실제로 저장소에 있다 (홈 + 속 페이지 전부)", async () => {
    const fs = await import("node:fs");
    const { IMMUNE_SITE } = await import("./content/immuneSite.js");
    // 속 페이지(탭)도 같이 본다 — 홈만 검사하면 탭에 생긴 오타는 그대로 통과한다.
    const pages = await import("./content/immunePages.js");
    const missing = collectImages([IMMUNE_SITE, pages])
      .filter((p) => p.startsWith("/"))
      .filter((p) => !fs.existsSync(`public${p}`));
    // 경로 오타는 화면에 «회색 네모»로만 나타나서 눈으로는 놓치기 쉽다.
    expect(missing, `없는 사진 파일: ${missing.join(", ")}`).toEqual([]);
  });

  it("속 페이지 한 장 안에서도 같은 사진이 두 번 안 나온다", async () => {
    // 홈과 탭이 같은 사진을 쓰는 건 정상(같은 병원이니까) — 문제는 **한 화면 안**의 중복이다.
    const { IMMUNE_PAGES } = await import("./content/immunePages.js");
    const entries = Object.entries(IMMUNE_PAGES);
    // ⚠️ 검사가 «돌긴 도는지» 먼저 확인한다. 처음 쓴 판본은 자료 모양을 잘못 짚어
    //    **0개 페이지를 돌면서 초록불**이었다(2026-07-29). 0건 통과는 통과가 아니다.
    expect(entries.length).toBeGreaterThan(0);
    for (const [slug, page] of entries) {
      const imgs = collectImages(page?.blocks ?? []);
      const dup = [...new Set(imgs.filter((v, i) => imgs.indexOf(v) !== i))];
      expect(dup, `${slug} 페이지에서 같은 사진이 두 번: ${dup.join(", ")}`).toEqual([]);
    }
  });
});
