import { describe, it, expect } from "vitest";
import { SECTIONS, CONSENTS, missingIntake, missingForReferral, referralReadiness, lab, fieldsByReq, nextReferralSection } from "./referralSchema";

describe("환자 의뢰서 칸 정의", () => {
  it("빈 폼이면 접수 칸이 전부 「비었다」로 잡힌다", () => {
    const req = fieldsByReq("intake").map((f: any) => f.name);
    expect(missingIntake({})).toEqual(req);
    expect(req.length).toBeGreaterThan(0);
  });

  it("공백만 친 칸은 채운 걸로 안 쳐준다", () => {
    expect(missingIntake({ lastName: "   " })).toContain("lastName");
    expect(missingIntake({ lastName: "TATEPBAYEVA" })).not.toContain("lastName");
  });

  it("여러 개 고르는 칸은 빈 배열이면 안 채운 것", () => {
    expect(missingForReferral({ pastHistory: [] })).toContain("pastHistory");
    expect(missingForReferral({ pastHistory: ["none"] })).not.toContain("pastHistory");
  });

  // ⚠️ 이 검사가 이 설계의 핵심을 지킨다. 접수 문턱이 늘어나면 여기서 걸린다.
  it("보내기를 막는 칸은 「연락에 필요한 것」뿐이다", () => {
    const intake = fieldsByReq("intake").map((f: any) => f.name).sort();
    expect(intake).toEqual(["cancerType", "email", "firstName", "lastName", "patientLang"]);
  });

  // 🛑 이 검사가 「마지막 한 칸을 못 찾겠다」의 재발을 막는다(2026-08-12 PO 실사용).
  it("보내기를 막는 칸은 «전부 한 묶음»에 모여 있다", () => {
    const first = SECTIONS.find((s: any) => s.id === "essentials")!;
    expect(first).toBeTruthy();
    const elsewhere = SECTIONS.filter((s: any) => s.id !== "essentials")
      .flatMap((s: any) => s.fields)
      .filter((f: any) => f.req === "intake")
      .map((f: any) => f.name);
    expect(elsewhere, "문턱 칸이 다른 묶음에 흩어져 있다").toEqual([]);
  });

  it("서류·의료정보는 보내기를 막지 않는다", () => {
    const ref = fieldsByReq("referral").map((f: any) => f.name);
    const intake = fieldsByReq("intake").map((f: any) => f.name);
    expect(intake.filter((n: string) => ref.includes(n))).toEqual([]);
    for (const n of ["passportNo", "envelope", "localDoctorOpinion", "preferredDate"]) {
      expect(ref, n).toContain(n);
      expect(intake, n).not.toContain(n);
    }
  });

  // 🛑 서류 칸을 종류별로 다시 쪼개면 여기서 걸린다. 쪼개도 이상한 게 오는 건 똑같고
  //    환자에게 «판단»을 시켜서 안 내게 만들 뿐이다(2026-08-12 PO 상의).
  it("서류는 종류별로 안 나누고 봉투 한 칸으로 받는다", () => {
    const docs: any = SECTIONS.find((s: any) => s.id === "documents");
    const fileFields = docs.fields.filter((f: any) => f.type === "envelope" || f.type === "file");
    expect(fileFields.map((f: any) => f.name)).toEqual(["envelope"]);
  });

  it("의뢰 준비도는 채운 만큼 올라간다", () => {
    expect(referralReadiness({})).toBe(0);
    const all = Object.fromEntries(fieldsByReq("referral").map((f: any) => [f.name, "x"]));
    expect(referralReadiness(all)).toBe(100);
    expect(referralReadiness({ passportNo: "N1" })).toBeGreaterThan(0);
    expect(referralReadiness({ passportNo: "N1" })).toBeLessThan(100);
  });

  it("질병 코드는 필수가 아니다 — 서류에 진단명이 없는 게 정상이다", () => {
    const icd = SECTIONS.flatMap((s: any) => s.fields).find((f: any) => f.name === "icdCode");
    expect(icd.req).toBe("optional");
  });

  it("칸 이름이 겹치지 않는다", () => {
    const names = SECTIONS.flatMap((s: any) => s.fields).map((f: any) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("모든 칸에 한국어·영어·러시아어 라벨이 있다", () => {
    const labeled = SECTIONS.flatMap((s: any) => s.fields).filter((f: any) => f.label);
    for (const f of [...labeled, ...CONSENTS]) {
      for (const l of ["ko", "en", "ru"]) {
        expect(lab(f.label, l), `${f.name || "consent"} / ${l}`).not.toBe("");
      }
    }
  });

  it("없는 언어는 영어로 떨어진다", () => {
    expect(lab({ ko: "가", en: "A" }, "zh")).toBe("A");
  });
});

describe("nextReferralSection — 「다음에 갈 묶음」", () => {
  it("아무것도 안 채우면 첫 묶음(자료)을 가리킨다", () => {
    const s = nextReferralSection({});
    expect(s).not.toBeNull();
    expect(s!.secId).toBe("documents");
    expect(s!.n).toBeGreaterThan(0);
  });

  it("한 묶음을 다 채우면 다음 묶음으로 넘어간다", () => {
    const first = nextReferralSection({})!;
    const sec = SECTIONS.find((x) => x.id === first.secId)!;
    const filled: Record<string, string> = {};
    for (const f of sec.fields) filled[f.name] = "x";
    const next = nextReferralSection(filled);
    expect(next).not.toBeNull();
    expect(next!.secId).not.toBe(first.secId);
  });

  it("다 채우면 null — 「다음」 안내가 사라진다", () => {
    const filled: Record<string, string> = {};
    for (const f of fieldsByReq("referral")) filled[f.name] = "x";
    expect(nextReferralSection(filled)).toBeNull();
  });

  it("가리키는 칸은 그 묶음 안에 «실제로» 있다 (엉뚱한 곳으로 데려가지 않는다)", () => {
    const s = nextReferralSection({})!;
    const sec = SECTIONS.find((x) => x.id === s.secId)!;
    expect(sec.fields.some((f) => f.name === s.name)).toBe(true);
  });
});

describe("묶음 순서", () => {
  it("자료 묶음이 맨 앞이다 — 여권 한 장이면 아래 칸이 대신 채워진다", () => {
    expect(SECTIONS[0].id).toBe("documents");
    expect(SECTIONS[1].id).toBe("essentials");
  });
});
