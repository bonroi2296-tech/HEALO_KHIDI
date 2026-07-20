import { describe, it, expect, beforeAll, vi } from "vitest";
import crypto from "node:crypto";

// encryptionV2 는 `import "server-only"` 포함 → 노드 테스트 환경에선 throw.
// 기존 encryptionV2.test.ts 와 동일하게 no-op 으로 무력화(호이스팅됨).
vi.mock("server-only", () => ({}));

import { decryptString } from "./encryptionV2";

/**
 * 백필 스크립트(scripts/backfill-transcript-encryption.ts)는 `server-only` 제약 때문에
 * encryptionV2 를 import 하지 못하고 **암호화 형식을 재현**한다.
 * 형식이 1바이트라도 어긋나면 앱이 460건을 복호화하지 못한다 — 조용히 상담기록이 빈칸이 된다.
 * 그래서 "스크립트가 만든 암호문을 앱이 풀 수 있는가"를 시험으로 못박는다.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/** 백필 스크립트와 동일한 구현(복사본 — 여기서 어긋나면 시험이 깨져야 한다). */
function encryptLikeBackfill(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let data = cipher.update(plaintext, "utf8", "base64");
  data += cipher.final("base64");
  return JSON.stringify({
    v: "v1",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data,
  });
}

describe("백필 암호문을 앱이 복호화할 수 있어야 한다", () => {
  let key: Buffer;

  beforeAll(() => {
    key = crypto.randomBytes(32);
    process.env.ENCRYPTION_KEY_V1 = key.toString("base64");
  });

  it("한국어 의료 문장 왕복", () => {
    const plain = "위암 2기로 진단되었고 복강경 위절제술을 권합니다.";
    expect(decryptString(encryptLikeBackfill(plain, key))).toBe(plain);
  });

  it("러시아어 왕복", () => {
    const plain = "У меня боли в желудке уже три месяца.";
    expect(decryptString(encryptLikeBackfill(plain, key))).toBe(plain);
  });

  it("카자흐어(키릴 확장) 왕복 — 타겟 언어라 반드시 확인", () => {
    const plain = "Менің асқазаным үш ай бойы ауырады.";
    expect(decryptString(encryptLikeBackfill(plain, key))).toBe(plain);
  });

  it("이모지·개행이 섞여도 왕복", () => {
    const plain = "환자 상태 ✅\n다음 단계: 항암 6개월";
    expect(decryptString(encryptLikeBackfill(plain, key))).toBe(plain);
  });

  it("변조된 암호문은 복호화가 실패해야 한다(인증 태그 검증)", () => {
    const payload = JSON.parse(encryptLikeBackfill("비밀", key));
    payload.data = Buffer.from("다른내용", "utf8").toString("base64");
    expect(() => decryptString(JSON.stringify(payload))).toThrow();
  });
});
