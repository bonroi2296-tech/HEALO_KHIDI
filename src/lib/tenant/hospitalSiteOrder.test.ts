import { describe, it, expect } from "vitest";
import fs from "node:fs";

/**
 * 화면 순서 자물쇠 — **위쪽은 「보는 것」, 아래쪽은 「읽는 것」.**
 *
 * 왜 생겼나 (2026-07-30, PO: *"이미지를 좀 더 상단에 배치하고 텍스트가 비율이 너무 많아 아직도.
 * 그리고 영상같은거도 쓴다 하지 않았니?"*):
 *   실측했더니 **영상 15개가 전체 15,080px 중 9,889px 지점**(66% 아래)에 있었다.
 *   PO 가 «영상 쓴다고 했잖아»라고 물은 건 거기까지 안 내려갔기 때문이다.
 *   **있는데 안 보이면 없는 것과 같다.** 사진 뭉치(27장)도 7,662px 이었다.
 *
 * 이 검사가 지키는 명제: **해외 환자는 한국어를 못 읽는다.**
 *   영상·사진은 언어가 필요 없고 글자는 필요하다 → 언어가 필요 없는 것이 위로 온다.
 *   순서를 다시 만질 때 무심코 글자 덩어리를 위로 올리면 여기서 걸린다.
 *
 * ⚠️ 이건 «취향»이 아니라 «순서»만 본다 — 픽셀 위치는 단위검사로 못 잰다(화면이 필요하다).
 *    소스에서 섹션이 나오는 순서만 보므로 가볍고, 그래서 CI 에서 매번 돈다.
 */
describe("홈 화면 — 보는 것이 읽는 것보다 위에 있다", () => {
  const 홈 = fs.readFileSync("src/components/hospital-template/HospitalSite.jsx", "utf8");
  const 위치 = (조각: string) => 홈.indexOf(조각);

  const 영상 = 위치("{has(site.videos) && (");
  const 갤러리 = 위치("{has(site.gallery) && (");
  const 큰사진 = 위치("{site.showcase?.image && (");
  const 치료메뉴 = 위치("{site.menu?.items?.length > 0 && (");
  const 왜우리 = 위치("{has(site.whyUs) && (");
  const FAQ = 위치("{has(site.faq) && (");

  it("검사 대상 섹션을 모두 찾았다 — 하나라도 못 찾으면 검사가 안 돈 것", () => {
    const 표 = { 영상, 갤러리, 큰사진, 치료메뉴, 왜우리, FAQ };
    const 못찾음 = Object.entries(표).filter(([, v]) => v < 0).map(([k]) => k);
    expect(못찾음, `섹션을 못 찾았다(이름이 바뀌었나): ${못찾음.join(", ")}`).toEqual([]);
  });

  it("🎬 영상이 글자 덩어리(치료 메뉴 · 왜 우리인가 · FAQ)보다 위에 있다", () => {
    // 치료 메뉴는 실측 글자 1,661자 · 높이 2,146px 로 홈에서 가장 큰 글자 덩어리였다.
    const 아래여야할것 = { 치료메뉴, 왜우리, FAQ };
    const 어긴것 = Object.entries(아래여야할것)
      .filter(([, v]) => v < 영상)
      .map(([k]) => `${k} 가 영상보다 위에 있다`);
    expect(어긴것, `글자가 영상 위로 올라갔다:\n${어긴것.join("\n")}`).toEqual([]);
  });

  it("🖼 사진(갤러리 · 큰 사진 띠)이 글자 덩어리보다 위에 있다", () => {
    const 어긴것: string[] = [];
    for (const [이름, 위] of [["갤러리", 갤러리], ["큰사진띠", 큰사진]] as const) {
      for (const [글자이름, 글자] of [["치료메뉴", 치료메뉴], ["왜우리인가", 왜우리], ["FAQ", FAQ]] as const) {
        if (글자 < 위) 어긴것.push(`${글자이름} 가 ${이름} 보다 위에 있다`);
      }
    }
    expect(어긴것, `글자가 사진 위로 올라갔다:\n${어긴것.join("\n")}`).toEqual([]);
  });
});

describe("속 페이지 — 사진이 맨 밑에 깔리지 않는다", () => {
  /* 실제로 그랬다: 「진료 안내」·「해외 환자 안내」는 사진 격자가 **7번째(마지막)**,
     「오시는 길」은 4번째(마지막)였다. 표를 넷 지나야 사진이 나오는 화면은 «읽는 자료»다.
     → 사진이 있는 페이지면 **앞쪽 절반 안**에 있어야 한다. */
  it("사진 격자가 페이지 앞쪽 절반 안에 있다", async () => {
    const { IMMUNE_PAGES } = (await import("./content/immunePages.js")) as any;
    const 문제: string[] = [];
    let 검사한페이지 = 0;
    for (const [slug, page] of Object.entries(IMMUNE_PAGES as Record<string, any>)) {
      const types = (page.blocks || []).map((b: any) => b.type);
      const g = types.indexOf("gallery");
      if (g < 0) continue; // 사진 격자가 없는 페이지(의료진 탭)는 대상 아님
      검사한페이지 += 1;
      const 앞쪽절반 = Math.max(1, Math.ceil(types.length / 2));
      if (g >= 앞쪽절반) {
        문제.push(`${slug}: 사진이 ${g + 1}/${types.length} 번째 — 앞쪽 ${앞쪽절반}개 안으로 옮겨라`);
      }
    }
    expect(검사한페이지, "사진 격자가 있는 페이지를 하나도 못 찾았다 — 검사가 안 돈 것").toBeGreaterThan(0);
    expect(문제, `사진이 너무 아래에 있다:\n${문제.join("\n")}`).toEqual([]);
  });
});
