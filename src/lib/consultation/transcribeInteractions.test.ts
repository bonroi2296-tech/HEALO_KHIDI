import { describe, it, expect } from "vitest";
import {
  bcp47For,
  buildTranscribeRequest,
  joinTextParts,
  noteTranscribeFailure,
  parseTranscribeResponse,
  resetTranscribeCooldown,
  transcribeCoolingDown,
} from "./transcribeInteractions";

describe("bcp47For", () => {
  it("우리 코드 → 모델 코드 (카자흐 kz 는 kk-KZ)", () => {
    expect(bcp47For("kz")).toBe("kk-KZ");
    expect(bcp47For("ko")).toBe("ko-KR");
    expect(bcp47For("ru")).toBe("ru-RU");
    expect(bcp47For("xx")).toBe("");
  });
});

describe("buildTranscribeRequest — REST 본문(snake_case)", () => {
  it("인라인 오디오 + 힌트 없음이면 generation_config 를 안 붙인다(자동 감지)", () => {
    const b = buildTranscribeRequest({ model: "gemini-3.5-transcribe", audioBase64: "QUJD", mimeType: "audio/webm" });
    expect(b).toEqual({
      model: "gemini-3.5-transcribe",
      input: [{ type: "audio", data: "QUJD", mime_type: "audio/webm" }],
    });
    expect("generation_config" in b).toBe(false);
  });
  it("언어 힌트·용어는 generation_config.transcription_config 에, 빈 값은 거른다", () => {
    const b = buildTranscribeRequest({
      model: "m",
      audioBase64: "x",
      mimeType: "audio/webm",
      languageCodes: ["ko-KR", "", "kk-KZ"],
      customVocabulary: ["면력한방병원", ""],
    }) as any;
    expect(b.generation_config.transcription_config).toEqual({
      language_codes: ["ko-KR", "kk-KZ"],
      custom_vocabulary: ["면력한방병원"],
    });
  });
  it("같은 언어끼리 회의면 같은 코드가 두 번 와도 한 번만 보낸다", () => {
    const b = buildTranscribeRequest({ model: "m", audioBase64: "x", mimeType: "audio/webm", languageCodes: ["ko-KR", "ko-KR"] }) as any;
    expect(b.generation_config.transcription_config.language_codes).toEqual(["ko-KR"]);
  });
  it("용어는 100개까지만", () => {
    const vocab = Array.from({ length: 150 }, (_, i) => `t${i}`);
    const b = buildTranscribeRequest({ model: "m", audioBase64: "x", mimeType: "audio/webm", customVocabulary: vocab }) as any;
    expect(b.generation_config.transcription_config.custom_vocabulary).toHaveLength(100);
  });
});

describe("parseTranscribeResponse — 문서의 REST 응답 예시 기준", () => {
  const docExample = {
    id: "interactions/abc123xyz",
    status: "completed",
    steps: [
      {
        id: "step_001",
        type: "model_output",
        content: [
          {
            type: "text",
            text: "Hello world",
            annotations: [{ type: "word_info", text: "Hello", speaker: "spk_1", start_offset: "0.100s", end_offset: "0.450s" }],
          },
        ],
      },
    ],
  };
  it("steps[].content[].text 를 읽는다", () => {
    const p = parseTranscribeResponse(docExample);
    expect(p.text).toBe("Hello world");
    expect(p.found).toBe(true);
    expect(p.status).toBe("completed");
    expect(p.usage).toBeNull();
  });
  it("text 조각이 여러 개면 이어 붙이고, 빈 글은 found=true·text=\"\" (침묵은 폴백이 아니다)", () => {
    const p = parseTranscribeResponse({
      status: "completed",
      steps: [{ content: [{ type: "text", text: "Здравствуйте" }, { type: "text", text: " доктор " }] }],
    });
    expect(p.text).toBe("Здравствуйте доктор");
    const silent = parseTranscribeResponse({ status: "completed", steps: [{ content: [{ type: "text", text: "" }] }] });
    expect(silent.found).toBe(true);
    expect(silent.text).toBe("");
  });
  it("output_text 가 있으면 그것을 우선한다", () => {
    const p = parseTranscribeResponse({ output_text: "안녕하세요", steps: [{ content: [{ type: "text", text: "안녕" }] }] });
    expect(p.text).toBe("안녕하세요");
  });
  it("모양이 다르면 found=false + 최상위 키만 남긴다(내용은 안 남긴다)", () => {
    const p = parseTranscribeResponse({ candidates: [{ content: { parts: [{ text: "x" }] } }], weird: 1 });
    expect(p.found).toBe(false);
    expect(p.text).toBe("");
    expect(p.topKeys).toEqual(["candidates", "weird"]);
    expect(parseTranscribeResponse(null).found).toBe(false);
  });
  it("usage 키 이름 후보를 관대하게 읽는다", () => {
    expect(parseTranscribeResponse({ steps: [], usage: { input_tokens: 120, output_tokens: 8 } }).usage).toEqual({ promptTokens: 120, completionTokens: 8 });
    expect(parseTranscribeResponse({ steps: [], usage_metadata: { prompt_token_count: "5", candidates_token_count: 2 } }).usage).toEqual({ promptTokens: 5, completionTokens: 2 });
    expect(parseTranscribeResponse({ steps: [], usage: { foo: 1 } }).usage).toBeNull();
  });
});

describe("joinTextParts — 조각 잇기", () => {
  it("한중일 경계는 붙이고, 그 외는 한 칸 띄운다", () => {
    expect(joinTextParts(["今日は", "病院に"])).toBe("今日は病院に");
    expect(joinTextParts(["Hello", "world"])).toBe("Hello world");
    expect(joinTextParts(["안녕하세요", "доктор"])).toBe("안녕하세요 доктор");
  });
  it("빈 조각은 건너뛰고 줄바꿈은 살린다", () => {
    expect(joinTextParts(["", "a  b", "  ", "c"])).toBe("a b c");
    expect(joinTextParts(["a", "b\n c"])).toBe("a b\nc");
  });
});

describe("실패 뒤 쉬기(cooldown)", () => {
  it("실패를 적으면 그 시간 동안 실험을 건너뛰고, 지나면 다시 탄다", () => {
    resetTranscribeCooldown();
    expect(transcribeCoolingDown(1_000)).toBe(false);
    noteTranscribeFailure(1_000, 5_000);
    expect(transcribeCoolingDown(2_000)).toBe(true);
    expect(transcribeCoolingDown(6_000)).toBe(false);
    resetTranscribeCooldown();
  });
});
