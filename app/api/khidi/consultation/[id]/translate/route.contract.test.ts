/**
 * 계약 회귀 테스트 — 자막 기록 저장 (POST /api/khidi/consultation/[id]/translate)
 *
 * 지키려는 것 하나: **실시간 통역 자막이 기록에 들어갈 수 있어야 한다.**
 *   통역 모델은 «번역문만» 주고 원문 자막은 안 내려준다. 그런데 이 라우트는 오랫동안
 *   원문(originalText)을 필수로 요구했고, 그래서 통역을 켜고 한 상담은 자막이
 *   **한 줄도 안 남았다**(2026-08-28 실측: 자막 3,553건 중 통역 경로 0건).
 *   회의록과 상담 요약이 그 기록을 근거로 만들어지므로, 그 상담은 내용이 통째로 빈다.
 *
 *   이 시험이 그 조건을 커밋 전에 고정한다. 누가 다시 「원문 필수」로 되돌리면 여기서 걸린다.
 *   ⚠️ 함께 지킨다: «둘 다 없는» 빈 줄은 여전히 막아야 한다(원래 제약의 목적).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/requireConsultationAccess", () => ({
  resolveConsultationActor: vi.fn(async () => ({ success: true, role: "staff", isGuest: false })),
}));

const inserted: any[] = [];
vi.mock("@/lib/rag/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (rows: any[]) => {
        inserted.push(...rows);
        return {
          select: () => ({
            single: async () => ({ data: { id: "row-1", ...rows[0] }, error: null }),
          }),
        };
      },
    }),
  },
}));

vi.mock("@/lib/consultation/transcriptCrypto", () => ({
  encryptTranscriptRow: (row: any) => ({
    source_text_encrypted: row.sourceText ? "enc:" + row.sourceText : null,
    translated_text_encrypted: row.translatedText ? "enc:" + row.translatedText : null,
    speaker_name_encrypted: row.speakerName ? "enc:" + row.speakerName : null,
  }),
  decryptTranscriptRows: (rows: any) => rows,
}));

const { POST } = await import("./route");

const call = (body: any) =>
  POST(
    new Request("http://x/api", { method: "POST", body: JSON.stringify(body) }) as any,
    { params: Promise.resolve({ id: "sess-1" }) }
  );

beforeEach(() => {
  inserted.length = 0;
});

describe("자막 기록 저장 — 통역 경로가 막히면 안 된다", () => {
  it("번역문만 있어도 저장한다 (실시간 통역은 원문을 안 준다)", async () => {
    const res = await call({
      translatedText: "В прошлом году мне поставили диагноз рака желудка.",
      sourceLanguage: "ru",
      targetLanguage: "ko",
      sttEngine: "live_translate",
    });
    expect(res.status).toBe(200);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].stt_engine).toBe("live_translate");
    // 원문 칸은 비어 있어야 한다 — 없는 것을 지어내면 회의록이 거짓이 된다
    expect(inserted[0].source_text_encrypted).toBeNull();
    expect(inserted[0].translated_text_encrypted).toBeTruthy();
  });

  it("원문만 있어도 저장한다 (기존 경로)", async () => {
    const res = await call({
      originalText: "안녕하세요",
      sourceLanguage: "ko",
      targetLanguage: "ru",
    });
    expect(res.status).toBe(200);
    expect(inserted[0].source_text_encrypted).toBeTruthy();
  });

  it("원문도 번역문도 없으면 막는다 (빈 줄 방지 — 원래 제약의 목적)", async () => {
    const res = await call({ sourceLanguage: "ko", targetLanguage: "ru" });
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("모르는 자막 경로 이름은 그대로 저장하지 않는다", async () => {
    await call({
      translatedText: "테스트",
      sourceLanguage: "ko",
      targetLanguage: "ru",
      sttEngine: "made_up_engine",
    });
    expect(inserted[0].stt_engine).not.toBe("made_up_engine");
  });

  it("대화 내용은 평문 칸에 안 들어간다 (암호문 칸으로만)", async () => {
    await call({
      originalText: "위암 3기입니다",
      translatedText: "Рак желудка 3 стадии",
      sourceLanguage: "ko",
      targetLanguage: "ru",
      speakerName: "환자",
    });
    expect(inserted[0].source_text).toBeUndefined();
    expect(inserted[0].translated_text).toBeUndefined();
    expect(inserted[0].speaker_name).toBeUndefined();
  });

  it("「말한 시각」을 주면 그 시각으로 남긴다 (회의록 순서가 안 어긋나게)", async () => {
    const spoken = new Date(Date.now() - 30_000).toISOString();
    await call({
      translatedText: "네",
      sourceLanguage: "ru",
      targetLanguage: "ko",
      sttEngine: "live_translate",
      spokenAt: spoken,
    });
    expect(inserted[0].created_at).toBe(spoken);
  });

  it("말도 안 되는 시각은 버린다 (클라이언트 값을 그대로 믿지 않는다)", async () => {
    await call({
      translatedText: "네",
      sourceLanguage: "ru",
      targetLanguage: "ko",
      spokenAt: "2020-01-01T00:00:00.000Z",
    });
    expect(inserted[0].created_at).toBeUndefined();

    inserted.length = 0;
    await call({
      translatedText: "네",
      sourceLanguage: "ru",
      targetLanguage: "ko",
      spokenAt: "그냥 글자",
    });
    expect(inserted[0].created_at).toBeUndefined();
  });


  it("게스트(환자)도 자막을 남길 수 있다 — 못 남기면 코디 말의 통역이 기록에서 통째로 빠진다", async () => {
    const auth = await import("@/lib/auth/requireConsultationAccess");
    (auth.resolveConsultationActor as any).mockResolvedValueOnce({
      success: true,
      role: "patient",
      isGuest: true,
      userId: null,
    });
    const res = await call({
      translatedText: "네, 알겠습니다.",
      sourceLanguage: "ko",
      targetLanguage: "ru",
      sttEngine: "live_translate",
    });
    expect(res.status).toBe(200);
    expect(inserted.length).toBe(1);
  });

});
