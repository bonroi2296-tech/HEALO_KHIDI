/**
 * 병원 진료의뢰 상태 사전이 «서버가 실제로 저장할 수 있는 값»을 전부 덮는지 검사.
 *
 * 왜: 사전에 없는 상태가 오면 화면엔 코드값(예: "converted")이 그대로 뜬다. 조용히 안 깨지고
 *     «영어 코드가 한 칸만 섞여 보이는» 모양이라 사람 눈으로는 잘 안 잡힌다.
 *     서버 허용값은 src/lib/validation/admin.ts 의 z.enum 하나뿐이라 그것과만 맞추면 된다.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { LEAD_STATUSES, LEAD_STATUS_ORDER, leadStatusLabel, leadStatusBadge } from "./leadStatus";

// 서버 허용값을 «파일에서 읽어» 대조한다 — 여기 손으로 베껴 두면 서버가 바뀌어도 이 검사가 통과한다.
function serverAllowedStatuses(): string[] {
  const src = fs.readFileSync("src/lib/validation/admin.ts", "utf8");
  const m = src.match(/status:\s*z\.enum\(\[([^\]]+)\]\)/);
  if (!m) throw new Error("admin.ts 에서 리드 상태 z.enum 을 못 찾았다 — 검사기를 고쳐라");
  return m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

describe("병원 진료의뢰 상태 사전", () => {
  it("서버가 저장할 수 있는 상태를 전부 덮는다", () => {
    const allowed = serverAllowedStatuses();
    expect(allowed.length).toBeGreaterThan(0);
    for (const s of allowed) {
      expect(LEAD_STATUSES, `사전에 없는 상태: ${s}`).toHaveProperty(s);
    }
  });

  it("사전에만 있고 서버엔 없는 유령 상태가 없다", () => {
    const allowed = new Set(serverAllowedStatuses());
    for (const s of LEAD_STATUS_ORDER) {
      expect(allowed.has(s), `서버가 저장할 수 없는 상태가 사전에 있다: ${s}`).toBe(true);
    }
  });

  it("모르는 값이 와도 빈칸을 만들지 않는다", () => {
    expect(leadStatusLabel("무슨값")).toBe("무슨값");
    expect(leadStatusLabel(null as any)).toBe("-");
    expect(leadStatusBadge("무슨값")).toContain("bg-");
  });
});
