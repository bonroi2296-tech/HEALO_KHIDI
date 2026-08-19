import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { safeLink, toCanonicalConsents, toDateOrNull, CONSENT_KEY_MAP } from "./referralSubmit";

describe("의뢰서 접수 — 링크는 http(s) 만", () => {
  it.each([
    ["https://drive.google.com/file/d/abc/view", "https://drive.google.com/file/d/abc/view"],
    ["  http://dropbox.com/s/x  ", "http://dropbox.com/s/x"],
    ["javascript:alert(1)", null],          // 코디 브라우저에서 실행된다
    ["data:text/html,<script>", null],
    ["ftp://x.y/z", null],
    ["drive.google.com/abc", null],          // 규약 없음
    ['https://a.b/"onclick=', null],         // 따옴표 — 속성 탈출 시도
    ["", null], [null, null], [undefined, null], [42, null],
  ])("%s → %s", (input, want) => {
    expect(safeLink(input)).toBe(want);
  });
});

describe("의뢰서 접수 — 동의 키를 공용 이름으로", () => {
  it("짧은 이름 5개가 전부 공용 이름으로 바뀐다", () => {
    const out = toCanonicalConsents({ pipa: true, sensitive: true, thirdParty: true, crossBorder: true, marketing: false });
    expect(out).toEqual({
      pipa_collection: true, sensitive_health: true, third_party_hospital: true, cross_border_kr: true, marketing: false,
    });
  });
  it("모르는 키는 그대로 통과 (버리지 않는다)", () => {
    expect(toCanonicalConsents({ future_item: true })).toEqual({ future_item: true });
  });
  it("공용 이름은 코디 화면이 읽는 CONSENT_ITEMS 와 «글자 그대로» 같다", () => {
    // 🛑 여기서 어긋나면 환자가 동의했는데 코디 화면에 «미동의»로 뜬다. 문자열을 손으로 맞추지 말고 파일을 읽는다.
    const src = readFileSync(join(__dirname, "intakeLabels.js"), "utf8");
    // 첫 등장은 머리 주석이다 — «정의»(export const CONSENT_ITEMS = [)부터 잡는다
    const i = src.indexOf("export const CONSENT_ITEMS = [");
    const block = src.slice(i, src.indexOf("\n];", i));
    const keys = [...block.matchAll(/key:\s*"([a-z_]+)"/g)].map((m) => m[1]).sort();
    expect(Object.values(CONSENT_KEY_MAP).sort()).toEqual(keys);
  });
});

describe("의뢰서 접수 — 진단 시기(연-월)를 date 컬럼에", () => {
  it.each([
    ["2026-05", "2026-05-01"],
    ["2026-05-14", "2026-05-14"],
    [" 2025-12 ", "2025-12-01"],
    ["2025년 12월경", null],   // 발병 시기처럼 자유 글은 별도 칸 — 여기 오면 안 넣는다
    ["", null], [null, null], [undefined, null],
  ])("%s → %s", (input, want) => {
    expect(toDateOrNull(input as any)).toBe(want);
  });
});
