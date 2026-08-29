import { describe, it, expect, beforeAll } from "vitest";
import { appendFollowUp, readFollowUps, editFollowUp, removeFollowUp } from "./followUps";

beforeAll(() => {
  process.env.ENCRYPTION_KEY_V1 =
    "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
});

/**
 * 2026-08-14 감사: 고치기·지우기를 «작성 시각»으로 지목해서, 환자와 코디가 같은 초에 쓰면
 * 엉뚱한 줄이 함께 지워질 수 있었다(지우기는 filter 라 여러 줄이 한 번에 날아감).
 * 이 시험이 「항상 한 줄만 건드린다」를 잠근다.
 */
describe("추가 정보 — 대상 지목", () => {
  it("새 글엔 안정적 id 가 붙는다", () => {
    const rows = appendFollowUp(null, "환자가 오늘 열이 남", "코디");
    expect(readFollowUps(rows)[0].id).toBeTruthy();
    expect(readFollowUps(rows)[0].text).toBe("환자가 오늘 열이 남");
  });

  it("시각이 «같은» 두 줄이어도 지목한 하나만 지운다", () => {
    const same = "2026-08-14T05:00:00.000Z";
    const raw: any[] = [
      { id: "A", at: same, by: "환자", text_encrypted: null },
      { id: "B", at: same, by: "코디", text_encrypted: null },
    ];
    const next = removeFollowUp(raw, "B");
    expect(next).toHaveLength(1);                 // ← 예전엔 둘 다 사라졌다
    expect((next as any[])[0].id).toBe("A");
  });

  it("시각이 같아도 지목한 하나만 고친다", () => {
    const same = "2026-08-14T05:00:00.000Z";
    const raw: any[] = [
      { id: "A", at: same, by: "환자", text_encrypted: null },
      { id: "B", at: same, by: "코디", text_encrypted: null },
    ];
    const next = editFollowUp(raw, "B", "고친 내용") as any[];
    const read = readFollowUps(next);
    expect(read[1].text).toBe("고친 내용");
    expect(read[0].text).not.toBe("고친 내용");   // 옆줄은 그대로
  });

  it("id 없는 «옛 글»은 시각으로도 찾힌다(무중단)", () => {
    const raw: any[] = [{ at: "2026-07-01T00:00:00.000Z", by: "코디", text_encrypted: null }];
    expect(removeFollowUp(raw, "2026-07-01T00:00:00.000Z")).toHaveLength(0);
  });

  it("없는 대상이면 null (아무것도 안 지운다)", () => {
    const raw: any[] = [{ id: "A", at: "x", by: "코디", text_encrypted: null }];
    expect(removeFollowUp(raw, "없는키")).toBeNull();
    expect(editFollowUp(raw, "없는키", "t")).toBeNull();
  });
});
