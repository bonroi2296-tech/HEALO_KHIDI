/**
 * generateSurveyToken 의 연결 가드 — 세션·케이스 어디에도 안 붙은 "고아 설문" 차단.
 *
 * 왜 이것만 테스트하나: 이 함수의 나머지는 DB insert(=I/O)라 단위테스트 대상이 아니지만,
 * 이 가드는 순수 분기이고 뚫리면 증상이 조용하다 — 고아 행은 멱등 가드(inquiry_id/
 * consultation_session_id 존재검사)에 영원히 안 걸려 cron 이 돌 때마다 새로 쌓이고,
 * K-03(만족도) 집계도 대상을 못 짚는다. 화면 어디에도 안 보이는 종류의 사고라 테스트로 묶는다.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/rag/supabaseAdmin", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/email/sendEmail", () => ({ sendEmail: vi.fn() }));
vi.mock("./surveyEmailTemplate", () => ({ renderSurveyEmail: vi.fn() }));

const { generateSurveyToken } = await import("./generateSurveyToken");

describe("generateSurveyToken — 연결 가드", () => {
  it("세션·케이스 둘 다 없으면 insert 까지 가지 않고 실패한다", async () => {
    const r = await generateSurveyToken({});
    expect(r.ok).toBe(false);
    expect(r.error).toBe("missing_link");
  });

  it("patientId 만 있어도(연결 없음) 실패한다 — 게스트라고 통과시키면 안 된다", async () => {
    const r = await generateSurveyToken({ patientId: "u1" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("missing_link");
  });
});
