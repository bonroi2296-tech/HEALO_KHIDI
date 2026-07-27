/**
 * center_menu 문서가 「한 문서 = 한 청크」를 유지하는지 지킨다.
 *
 * 왜 이 테스트가 있나: chunkText 는 개행을 죽이고 800자에서 무자비하게 자른다.
 * 카테고리 항목이 늘어 문서가 800자를 넘는 순간 청크가 둘로 갈라지고,
 * 머리에 박아둔 「국내 비급여가·확정 견적 아님」 경고가 뒷 청크에서 사라진다
 * → AI 가 금액만 든 조각을 집어 외국인에게 확정 견적처럼 답할 수 있다.
 * 항목을 추가하다 이 테스트가 깨지면 = 그 카테고리를 쪼개라는 신호.
 */
import { describe, it, expect } from "vitest";
import { buildDocument } from "./buildDocument";
import { chunkText } from "./chunker";

const row = {
  center_slug: "facial-palsy",
  center_name_ko: "안면마비센터",
  center_summary_ko: "안면 신경과 근육 기능 회복을 위한 재활 중심 프로그램",
  hospital_brand: "면력한방병원",
  category_ko: "pDRN 신경주사",
  frequency_ko: "주2~3회",
  revised_on: "2026-07-22",
  items: [
    { item_name_ko: "1회", price_krw: 170000 },
    { item_name_ko: "15회 (회당)", price_krw: 130000 },
    { item_name_ko: "금액없는항목", price_krw: null },
  ],
};

describe("buildDocument(center_menu)", () => {
  const doc = buildDocument("center_menu" as any, row);

  it("센터·카테고리로 문서를 가른다", () => {
    expect(doc.source_id).toBe("facial-palsy:pDRN 신경주사");
    expect(doc.lang).toBe("ko");
    expect(doc.title).toBe("안면마비센터 · pDRN 신경주사");
  });

  it("금액과 「확정 견적 아님」 경고가 한 청크에 같이 담긴다", () => {
    const chunks = chunkText(doc.content);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain("확정 견적이 아니며");
    expect(chunks[0].content).toContain("170,000원");
    expect(chunks[0].content).toContain("금액 미기재");
  });
});
