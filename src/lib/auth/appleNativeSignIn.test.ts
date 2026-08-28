import { describe, it, expect } from "vitest";
import { makeRawNonce, sha256Hex, isAppleCancel } from "./appleNativeSignIn";

describe("애플 네이티브 로그인 준비값", () => {
  it("해시가 표준 SHA-256 과 같다 (애플이 이 값으로 대조한다)", async () => {
    // 널리 알려진 시험값 — 이게 어긋나면 Supabase 가 nonce 불일치로 로그인을 거절한다.
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("임의값은 64자리이고 매번 다르다", () => {
    const a = makeRawNonce();
    const b = makeRawNonce();
    expect(a).toHaveLength(64);
    expect(a).toMatch(/^[0-9a-f]+$/);
    expect(a).not.toBe(b);
  });

  it("취소는 오류로 취급하지 않는다", () => {
    expect(isAppleCancel({ code: "1001" })).toBe(true);
    expect(isAppleCancel({ message: "The operation was canceled." })).toBe(true);
    expect(isAppleCancel({ message: "network error" })).toBe(false);
    expect(isAppleCancel(null)).toBe(false);
  });
});
