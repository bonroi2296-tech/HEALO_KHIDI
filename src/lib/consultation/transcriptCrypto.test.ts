import { describe, it, expect, beforeAll } from "vitest";
import { encryptTranscriptRow, decryptTranscriptRows, readTranscriptField } from "./transcriptCrypto";

beforeAll(() => {
  // 32 bytes hex(64자) — 테스트 전용 키 (encryptionV2.test.ts 와 동일)
  process.env.ENCRYPTION_KEY_V1 =
    "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
});

describe("transcriptCrypto — speaker_name 암호화 (2026-08-14)", () => {
  it("speakerName 을 넘기면 평문 칸은 비우고 암호문 칸에 넣는다", () => {
    const row = encryptTranscriptRow({ sourceText: "위암 4기", translatedText: "stage 4", speakerName: "황이준" });
    expect(row.speaker_name).toBeNull();
    expect(row.speaker_name_encrypted).toBeTruthy();
    expect(row.speaker_name_encrypted).not.toContain("황이준"); // 평문이 새지 않는다
  });

  it("저장→조회 왕복: 내용과 화자 이름이 원값으로 복원", () => {
    const row = encryptTranscriptRow({ sourceText: "위암 4기", translatedText: "stage 4", speakerName: "Aigerim" });
    const [read] = decryptTranscriptRows([{ ...row } as any]);
    expect(read.source_text).toBe("위암 4기");
    expect(read.translated_text).toBe("stage 4");
    expect(read.speaker_name).toBe("Aigerim");
  });

  it("speakerName 을 안 넘기면 speaker 칸 자체를 안 건드린다(맞장구·실시간 경로 보존)", () => {
    const row = encryptTranscriptRow({ sourceText: "a", translatedText: "b" });
    expect("speaker_name" in row).toBe(false);
    expect("speaker_name_encrypted" in row).toBe(false);
  });

  it("옛 평문 행(암호문 없음)도 그대로 읽힌다(무중단 폴백)", () => {
    const [read] = decryptTranscriptRows([
      { source_text: "옛 원문", source_text_encrypted: null, speaker_name: "옛이름", speaker_name_encrypted: null } as any,
    ]);
    expect(read.source_text).toBe("옛 원문");
    expect(read.speaker_name).toBe("옛이름");
  });

  it("readTranscriptField: 손상 암호문은 null(그 줄만 포기, 전체 조회는 살아있음)", () => {
    expect(readTranscriptField("not-a-valid-ciphertext", null)).toBeNull();
    expect(readTranscriptField(null, "평문폴백")).toBe("평문폴백");
  });
});
