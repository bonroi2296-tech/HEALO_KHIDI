/**
 * 핵심 경로 테스트: PII 암호화(AES-256-GCM).
 * 감리(2026-06-19)에서 "암호화 모듈 무테스트"로 지적된 공백을 메움.
 * 키는 지연 로딩(함수 호출 시점에 process.env 읽음)이라 테스트에서 주입 가능.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";

// encryptionV2 는 `import "server-only"` 를 포함 → 테스트(노드) 환경에선 throw.
// 테스트에서만 no-op 으로 무력화 (vi.mock 은 import 위로 호이스팅됨).
vi.mock("server-only", () => ({}));

// 모듈 import 전에 키를 세팅할 필요는 없으나(지연 로딩), 명확성을 위해 beforeAll 에서 설정.
beforeAll(() => {
  // 32 bytes hex(64자) — 테스트 전용 키
  process.env.ENCRYPTION_KEY_V1 =
    "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
});

import {
  encryptString,
  decryptString,
  encryptStringNullable,
  decryptStringNullable,
  isEncryptedPayload,
  safeHash,
  maskEmail,
  maskPhone,
} from "./encryptionV2";

describe("encryptionV2 — AES-256-GCM round-trip", () => {
  it("암호화→복호화 하면 원문이 복원된다", () => {
    const plain = "홍길동 / hong@example.com / +821012345678";
    const enc = encryptString(plain);
    expect(enc).not.toBe(plain);
    expect(decryptString(enc)).toBe(plain);
  });

  it("같은 평문도 매번 다른 암호문(IV 랜덤)이지만 둘 다 같은 원문으로 복호화된다", () => {
    const plain = "diagnosis: stage III";
    const a = encryptString(plain);
    const b = encryptString(plain);
    expect(a).not.toBe(b); // IV 랜덤
    expect(decryptString(a)).toBe(plain);
    expect(decryptString(b)).toBe(plain);
  });

  it("암호문이 변조되면 복호화가 실패한다(인증 태그)", () => {
    const enc = encryptString("sensitive");
    const obj = JSON.parse(enc);
    // data 1바이트 뒤집기
    const buf = Buffer.from(obj.data, "base64");
    buf[0] = buf[0] ^ 0xff;
    obj.data = buf.toString("base64");
    expect(() => decryptString(JSON.stringify(obj))).toThrow();
  });
});

describe("encryptionV2 — nullable 헬퍼", () => {
  it("encryptStringNullable(null/undefined/'') 은 null", () => {
    expect(encryptStringNullable(null)).toBeNull();
    expect(encryptStringNullable(undefined)).toBeNull();
    expect(encryptStringNullable("")).toBeNull();
  });

  it("encryptStringNullable→decryptStringNullable 라운드트립", () => {
    const enc = encryptStringNullable("patient-name");
    expect(enc).not.toBeNull();
    expect(decryptStringNullable(enc)).toBe("patient-name");
  });

  it("decryptStringNullable(null) 은 null", () => {
    expect(decryptStringNullable(null)).toBeNull();
    expect(decryptStringNullable(undefined)).toBeNull();
  });
});

describe("encryptionV2 — 보조 유틸", () => {
  it("isEncryptedPayload 는 암호문/평문을 구분한다", () => {
    // isEncryptedPayload 는 boolean true 대신 truthy 값을 반환할 수 있어 toBeTruthy 사용.
    expect(isEncryptedPayload(encryptString("x"))).toBeTruthy();
    expect(isEncryptedPayload("그냥 평문")).toBeFalsy();
    expect(isEncryptedPayload(null)).toBeFalsy();
    expect(isEncryptedPayload("{not json")).toBeFalsy();
  });

  it("safeHash 는 결정적이고 입력이 다르면 다르다", () => {
    expect(safeHash("a@b.com")).toBe(safeHash("a@b.com"));
    expect(safeHash("a@b.com")).not.toBe(safeHash("c@d.com"));
  });

  it("maskEmail / maskPhone 은 일부만 노출한다", () => {
    expect(maskEmail("hong@example.com")).toContain("@");
    expect(maskEmail("hong@example.com")).not.toBe("hong@example.com");
    const masked = maskPhone("+821012345678");
    expect(masked).not.toBe("+821012345678");
  });
});
