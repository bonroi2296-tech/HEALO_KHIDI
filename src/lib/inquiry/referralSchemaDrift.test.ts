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
// 스키마는 라우트가 아니라 referralSubmit.ts 에 있다 (2026-09-08: 라우트에 두면 시험이 부를 수
// 없고, 부르라고 export 를 붙이면 App Router 규칙 때문에 빌드가 깨진다).
const schemaSrc = readFileSync(join(__dirname, "./referralSubmit.ts"), "utf8");
const start = schemaSrc.indexOf("export const Schema = z.object({");
if (start < 0) throw new Error("referralSubmit.ts 에서 접수 스키마를 못 찾았다 — 이 검사가 헛돌고 있다");
const body = schemaSrc.slice(start, schemaSrc.indexOf("\n});", start));
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

// ── 실제 zod 스키마가 값을 통과시키나 (텍스트 대조로는 못 재는 것) ──────────────
// 🛑 이 저장소는 「스키마에 없는 키는 조용히 버려진다」로 두 번 당했다(cdFolder·nationality).
//    새 칸을 넣었으면 «실제로 파싱을 통과하는지»를 재라 — 라우트가 버리면 화면은 아무 말도 안 한다.
describe("접수 스키마 — 「기계가 채운 칸」 표시(autoFilled)가 실제로 통과한다", async () => {
  const { Schema } = await import("./referralSubmit");
  const base = {
    lastName: "TEST", firstName: "T", email: "t@example.com",
    patientLang: "ru", cancerType: "other",
    consents: { pipa: true, sensitive: true, thirdParty: true, crossBorder: true },
  };

  it("파일명·true 두 모양을 다 받는다 (2026-09-08 #316)", () => {
    const r = Schema.safeParse({ ...base, icdCode: "C16", autoFilled: { icdCode: "КЛИНИКА.pdf", stage: true } });
    expect(r.success).toBe(true);
    expect(r.success && r.data.autoFilled).toEqual({ icdCode: "КЛИНИКА.pdf", stage: true });
  });

  it("없어도 통과한다 — 서류를 안 올린 접수가 막히면 안 된다", () => {
    expect(Schema.safeParse(base).success).toBe(true);
  });
});
