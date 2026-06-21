import { describe, it, expect, vi } from "vitest";
// 이 모듈은 server-only(supabaseAdmin) 의존이 있으나, 테스트 대상은 순수 함수
// buildReferralSummaryMarkdown 뿐. import가 막히지 않도록 server-only를 빈 모듈로 모킹.
vi.mock("server-only", () => ({}));
import { buildReferralSummaryMarkdown, type ReferralSummaryJson } from "./buildReferralSummary";

const base: ReferralSummaryJson = {
  patient: { country: "Kazakhstan", language: "ru" },
  complaint: { body_part: ["stomach"], duration: "3 months", severity: 7, objective: "weight loss" },
  history: { diagnosis: { has: true, text: "gastric cancer stage II" }, meds: { has: false, text: "" } },
  logistics: { preferred_date: "2026-07-01", flex: true },
  attachments: [{ path: "a/b.pdf", name: "CT.pdf", signedUrl: "https://x/y", expiresAt: "2026-06-21T00:00:00Z" }],
  quality: { extraction_confidence: 0.856, missing_fields: ["insurance"] },
};

describe("buildReferralSummaryMarkdown", () => {
  it("전체 입력 → 모든 섹션·값 포함", () => {
    const md = buildReferralSummaryMarkdown(base);
    expect(md).toContain("# Patient Referral Summary");
    expect(md).toContain("## Patient Information");
    expect(md).toContain("Kazakhstan");
    expect(md).toContain("## Chief Complaint");
    expect(md).toContain("stomach");
    expect(md).toContain("3 months");
    expect(md).toContain("7/10");
    expect(md).toContain("Prior Diagnosis**: Yes");
    expect(md).toContain("gastric cancer stage II");
    expect(md).toContain("Current Medications**: No");
    expect(md).toContain("2026-07-01");
    expect(md).toContain("Date Flexible**: Yes");
    expect(md).toContain("## Attachments");
    expect(md).toContain("CT.pdf");
    expect(md).toContain("https://x/y");
    expect(md).toContain("86%"); // 0.856 반올림
    expect(md).toContain("insurance");
  });

  it("severity 0(거짓 같은 값)도 0/10로 표기(0 != null)", () => {
    const md = buildReferralSummaryMarkdown({ ...base, complaint: { ...base.complaint, severity: 0 } });
    expect(md).toContain("0/10");
  });

  it("null/빈 값 → N/A·해당 줄 생략, 크래시 없음", () => {
    const empty: ReferralSummaryJson = {
      patient: { country: null, language: null },
      complaint: { body_part: null, duration: null, severity: null, objective: null },
      history: { diagnosis: null, meds: null },
      logistics: { preferred_date: null, flex: false },
      attachments: [],
      quality: { extraction_confidence: null, missing_fields: null },
    };
    const md = buildReferralSummaryMarkdown(empty);
    expect(md).toContain("Country**: N/A");
    expect(md).toContain("Language**: N/A");
    expect(md).not.toContain("## Attachments"); // 첨부 없으면 섹션 생략
    expect(md).not.toContain("/10"); // severity 없으면 생략
    expect(typeof md).toBe("string");
  });

  it("결정적(같은 입력 같은 출력)", () => {
    expect(buildReferralSummaryMarkdown(base)).toBe(buildReferralSummaryMarkdown(base));
  });
});
