import { describe, it, expect } from "vitest";
import { breadcrumbLd, partnerHospitalLdList, careJourneyLd, websiteLd, ORG_ID } from "./structuredData";

describe("structuredData", () => {
  it("breadcrumbLd: 위치(position) 1부터 순서대로, 상대경로는 절대 URL로", () => {
    const ld = breadcrumbLd([
      { name: "Home", url: "/" },
      { name: "Care Journey", url: "/care-journey" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].position).toBe(2);
    expect(ld.itemListElement[1].item).toBe("https://healwith.co.kr/care-journey");
  });

  it("partnerHospitalLdList: 실제 제휴/협진 병원이 비어있지 않고 종양 전문 표기", () => {
    const list = partnerHospitalLdList();
    expect(list.length).toBeGreaterThanOrEqual(8); // 면력 4 + 대학 4
    for (const node of list) {
      expect(["MedicalClinic", "Hospital"]).toContain(node["@type"]);
      expect(typeof node.name).toBe("string");
      expect(node.name.length).toBeGreaterThan(0);
      expect(node.medicalSpecialty).toBe("Oncology");
    }
    // 대학병원은 Hospital 타입
    const severance = list.find((n) => /Severance/i.test(n.name));
    expect(severance?.["@type"]).toBe("Hospital");
  });

  it("careJourneyLd: MedicalBusiness + BreadcrumbList, 6개 언어, JSON 직렬화 가능", () => {
    const graph = careJourneyLd();
    expect(graph).toHaveLength(2);
    const [biz, crumbs] = graph;
    expect(biz["@type"]).toBe("MedicalBusiness");
    // layout 의 브랜드 엔티티와 같은 @id → 검색엔진이 한 회사로 병합
    expect(biz["@id"]).toBe(ORG_ID);
    expect(biz.availableLanguage).toHaveLength(6);
    expect(biz.department.length).toBeGreaterThanOrEqual(8);
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    // 가짜 평점/후기 schema 가 섞이지 않았는지(가짜 금지 원칙)
    const json = JSON.stringify(graph);
    expect(json).not.toMatch(/aggregateRating|reviewRating|"Review"/i);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  // 재발 방지 가드(2026-07-16 독립 리뷰 적발): @id 로 layout 브랜드 엔티티에 병합되는 노드가
  // 정체성 속성을 다시 선언하면, 병합 후 회사 설명이 2개로 충돌하거나 회사 url 이 페이지주소로
  // 오염된다. layout.jsx 가 단일 SoR — 여기선 의료 facet 만 얹어야 한다.
  it("careJourneyLd: @id 병합 노드는 정체성(name·description·url·logo·areaServed)을 재선언하지 않는다", () => {
    const [biz] = careJourneyLd();
    for (const identityProp of ["name", "description", "url", "logo", "areaServed"]) {
      expect(biz, `${identityProp} 는 layout.jsx 가 SoR — 재선언 시 병합 충돌`).not.toHaveProperty(
        identityProp
      );
    }
  });

  // 재발 방지 가드(2026-07-16 독립 리뷰 적발): /search 는 2026-07-14(#746, PO 직접 지시)로
  // 비활성(→/hospitals 리다이렉트). 없는 검색 기능을 구조화데이터로 광고하면 안 된다.
  // 옛 파일을 통째로 덮어쓰는 실수로 SearchAction 이 부활한 전례가 있어 테스트로 못박는다.
  it("websiteLd: 죽은 /search 를 가리키는 SearchAction 이 부활하지 않는다", () => {
    const ld = websiteLd() as Record<string, unknown>;
    expect(ld).not.toHaveProperty("potentialAction");
    expect(JSON.stringify(ld)).not.toMatch(/SearchAction|search\?q=/i);
  });
});
