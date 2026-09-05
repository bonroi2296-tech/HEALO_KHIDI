/**
 * 계약 회귀 테스트 — 상담 요약 (POST /api/khidi/consultation/[id]/summarize)
 *
 * 지키려는 것 하나: **번역문만 있는 줄도 요약 재료로 쓰여야 한다.**
 *   실시간 통역(live_translate) 경로는 «번역문만» 준다(통역 모델이 원문 자막을 안 내려준다).
 *   요약이 「원문이 있는 줄」만 골라 쓰면, 통역을 켜고 한 상담은 재료가 0줄이 되어
 *   「대화 기록 없음」으로 끝난다 — 저장은 되는데 안 쓰이는 반쪽이 된다(2026-08-28).
 *
 *   이 시험이 그 조건을 커밋 전에 고정한다. 다시 「원문만」으로 되돌리면 여기서 걸린다.
 *   ⚠️ 함께 지킨다: 원문·번역이 «둘 다» 없는 줄(복호화 실패)은 여전히 빼야 한다.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/requireConsultationAccess", () => ({
  resolveConsultationActor: vi.fn(async () => ({ success: true, role: "staff", isGuest: false })),
}));

vi.mock("@/lib/consultation/transcriptCrypto", () => ({
  decryptTranscriptRows: (rows: any[]) => rows,
}));

// 요약 재료로 «실제로 무엇이 들어갔나»를 붙잡는다
let promptSeen = "";
vi.mock("ai", () => ({
  generateText: vi.fn(async (p: any) => {
    promptSeen = String(p?.prompt ?? p?.messages?.[0]?.content ?? "");
    return { text: '{"summary":"요약","key_points":[],"action_items":[]}' };
  }),
}));
vi.mock("@/lib/ai/geminiThinkingCompat", () => ({
  callGeminiWithCompat: async (run: any, opts: any) => run(opts),
}));
vi.mock("@ai-sdk/google", () => ({ google: () => ({}) }));

const ROWS = [
  // 기존 경로 — 원문 있음
  { source_lang: "ko", speaker_name: "의사", source_text: "어디가 불편하신가요?", translated_text: "Что беспокоит?", created_at: "2026-08-28T01:00:00Z" },
  // 통역 경로 — 번역문만 있음 (이게 빠지면 안 된다)
  { source_lang: "ru", speaker_name: "환자", source_text: null, translated_text: "위암 3기 진단을 받았습니다.", created_at: "2026-08-28T01:01:00Z" },
  // 복호화 실패 — 둘 다 없음 (이건 빠져야 한다)
  { source_lang: "ru", speaker_name: null, source_text: null, translated_text: null, created_at: "2026-08-28T01:02:00Z" },
  // 말하는 중 흐른 «중간 자막» — 같은 발화의 앞토막이라 요약 재료에 들어가면 같은 말이
  // 두 번 들어간다. 2026-09-01 부터 DB 에 남기기 시작했으므로 여기서 걸러져야 한다.
  { source_lang: "ru", speaker_name: "환자", source_text: null, translated_text: "위암 3기 진", is_partial: true, created_at: "2026-08-28T01:03:00Z" },
];

vi.mock("@/lib/rag/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "consultation_sessions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "sess-1", doctor_language: "ko", patient_language: "ru" },
                error: null,
              }),
              single: async () => ({
                data: { id: "sess-1", doctor_language: "ko", patient_language: "ru" },
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      // .eq() 를 몇 번을 이어 붙여도 받아내고, is_partial 필터는 «실제로» 걸러 준다
      // (예전 mock 은 eq 를 한 번만 받아, 라우트가 필터를 하나 더 붙이자 통째로 터졌다).
      return {
        select: () => {
          let rows: any[] = ROWS;
          const chain: any = {
            eq: (col: string, val: any) => {
              if (col === "is_partial") rows = rows.filter((r) => (r.is_partial ?? false) === val);
              return chain;
            },
            order: async () => ({ data: rows, error: null }),
          };
          return chain;
        },
      };
    },
  },
}));

beforeEach(() => {
  promptSeen = "";
  process.env.GEMINI_PII_BILLING_CONFIRMED = "true";
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "x";
});

const { POST } = await import("./route");
const call = () =>
  POST(new Request("http://x/api", { method: "POST" }) as any, {
    params: Promise.resolve({ id: "sess-1" }),
  });

describe("상담 요약 — 통역 경로 줄이 재료에서 빠지면 안 된다", () => {
  it("번역문만 있는 줄도 요약 재료에 들어간다", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(promptSeen).toContain("위암 3기 진단을 받았습니다");
  });

  it("원문이 있는 줄은 원문으로 들어간다", async () => {
    await call();
    expect(promptSeen).toContain("어디가 불편하신가요?");
  });

  it("말하는 중 흐른 중간 자막은 요약 재료에서 빠진다", async () => {
    await call();
    // 같은 발화의 앞토막("위암 3기 진")이 들어가면 요약에 같은 말이 두 번 들어간다.
    // 확정 줄("위암 3기 진단을 받았습니다")은 위 시험이 이미 지키고 있다.
    expect(promptSeen).not.toContain("위암 3기 진\n");
    expect(promptSeen.match(/위암 3기 진/g)?.length).toBe(1);
  });

  it("원문도 번역문도 없는 줄(복호화 실패)은 빠진다", async () => {
    await call();
    // 그 줄의 화자 라벨이 재료에 안 나타나야 한다 — 빈 줄이 들어가면 요약이 오염된다
    const lines = promptSeen.split("\n").filter((l) => /^(의사|환자|발화)/.test(l));
    expect(lines.every((l) => l.replace(/^[^:]*:\s*/, "").trim().length > 0)).toBe(true);
  });
});
