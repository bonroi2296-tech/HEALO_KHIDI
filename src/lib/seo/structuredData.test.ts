import { describe, it, expect } from "vitest";
import { breadcrumbLd, partnerHospitalLdList, careJourneyLd } from "./structuredData";

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
    const graph = careJourneyLd({ description: "test desc" });
    expect(graph).toHaveLength(2);
    const [biz, crumbs] = graph;
    expect(biz["@type"]).toBe("MedicalBusiness");
    expect(biz.name).toBe("healwith");
    expect(biz.description).toBe("test desc");
    expect(biz.availableLanguage).toHaveLength(6);
    expect(biz.department.length).toBeGreaterThanOrEqual(8);
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    // 가짜 평점/후기 schema 가 섞이지 않았는지(가짜 금지 원칙)
    const json = JSON.stringify(graph);
    expect(json).not.toMatch(/aggregateRating|reviewRating|"Review"/i);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
