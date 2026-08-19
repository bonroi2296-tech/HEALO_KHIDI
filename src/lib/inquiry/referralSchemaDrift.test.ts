/**
 * 화면(SECTIONS)이 보내는 칸이 서버(zod)에 다 있나 — zod 는 모르는 키를 «조용히» 버린다.
 * 🛑 같은 부류 사고 두 번(2026-08-19): cdFolder.path 가 스키마에 없어 CD 묶음이 첨부에서 사라졌고,
 *    stage 가 빠져 병기가 저장 안 됐다. 둘 다 400 도 안 나고 그냥 없어졌다. 그래서 파일을 읽어 대조한다.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SECTIONS } from "./referralSchema";

const route = readFileSync(join(__dirname, "../../../app/api/inquiries/referral/route.ts"), "utf8");
const start = route.indexOf("const Schema = z.object({");
const body = route.slice(start, route.indexOf("\n});", start));
const zodKeys = new Set([...body.matchAll(/(?:^|[\s,{])([a-zA-Z]\w*)\s*:\s*(?:z\.|s\()/gm)].map((m) => m[1]));
// intakeData 에 넣는 키(저장까지 이어지는가)
const saveStart = route.indexOf("const intakeData = {");
const saveBody = route.slice(saveStart, route.indexOf("\n    };", saveStart));
const savedKeys = new Set([...saveBody.matchAll(/^\s+([a-zA-Z]\w*):/gm)].map((m) => m[1]));
// 본체 컬럼으로 따로 저장하는 접수 칸(intake_data 에는 안 넣는다)
const IN_MAIN_ROW = new Set(["lastName", "firstName", "email", "patientLang", "cancerType", "phone", "nationality", "preferredDate", "dateFlexible"]);

describe("의뢰서 — 화면 칸 ↔ 서버 스키마 ↔ 저장", () => {
  const fields = (SECTIONS as any[]).flatMap((s) => s.fields as any[]).filter((f) => f.type !== "note");
  it("화면이 보내는 칸이 zod 스키마에 전부 있다 (없으면 조용히 버려진다)", () => {
    const miss = fields.map((f) => f.name).filter((n) => !zodKeys.has(n));
    expect(miss, miss.join(", ")).toEqual([]);
  });
  it("스키마를 통과한 칸이 intake_data 또는 본체 컬럼에 저장된다", () => {
    const miss = fields.map((f) => f.name).filter((n) => !savedKeys.has(n) && !IN_MAIN_ROW.has(n));
    expect(miss, miss.join(", ")).toEqual([]);
  });
  it("cdFolder 는 path 까지 받는다 (첨부 카드에서 열리려면 경로가 있어야 한다)", () => {
    const cd = body.slice(body.indexOf("cdFolder:"), body.indexOf("}", body.indexOf("cdFolder:")));
    expect(cd).toMatch(/\bpath\s*:/);
  });
});
