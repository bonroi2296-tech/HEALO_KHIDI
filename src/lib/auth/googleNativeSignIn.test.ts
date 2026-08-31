/**
 * 「구글에는 해시한 nonce, Supabase 에는 원본」 배선을 잠근다.
 *
 * 🔴 왜 있나 (2026-08-31): 양쪽에 «같은 원본»을 줬다가 실기기에서
 *    `AuthApiError / Nonces mismatch` 로 로그인이 막혔다. 구글은 받은 값을 그대로
 *    idToken 의 `nonce` 클레임에 넣고, Supabase 는 우리가 준 원본을 «해시해서» 맞춰 본다.
 *    → 이 시험은 그 «어긋난 짝»으로 되돌아가면 빨간불이 되게 한다.
 *
 * ⚠️ 값이 맞는지만 보지 말고 **양쪽이 서로 다른 값을 받는지**를 봐라 — 같은 값을 주는 회귀가
 *    바로 그 사고였다.
 */
import { describe, it, expect, vi } from "vitest";
import { makeRawNonce, sha256Hex, signInWithGoogleNative } from "./googleNativeSignIn";

describe("구글 네이티브 로그인 — nonce 배선", () => {
  it("sha256Hex 는 알려진 SHA-256 값을 낸다", async () => {
    // RFC/NIST 표준 시험값: SHA-256("abc")
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("makeRawNonce 는 매번 다른 64자 16진수를 낸다", () => {
    const a = makeRawNonce();
    const b = makeRawNonce();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("🔴 구글에는 «해시한 것», Supabase 에는 «원본» 이 간다 (같은 값이면 실패)", async () => {
    const 구글에준것: string[] = [];
    const supabase에준것: string[] = [];

    vi.doMock("@capgo/capacitor-social-login", () => ({
      SocialLogin: {
        initialize: async () => {},
        login: async (args: { options?: { nonce?: string } }) => {
          구글에준것.push(args.options?.nonce ?? "(없음)");
          return { provider: "google", result: { idToken: "fake.id.token" } };
        },
      },
    }));

    const supabase = {
      auth: {
        signInWithIdToken: async (args: Record<string, unknown>) => {
          supabase에준것.push((args.nonce as string) ?? "(없음)");
          return { error: null };
        },
      },
    };

    await signInWithGoogleNative(supabase as never);

    expect(구글에준것).toHaveLength(1);
    expect(supabase에준것).toHaveLength(1);

    const 해시 = 구글에준것[0];
    const 원본 = supabase에준것[0];

    // ① 둘이 «달라야» 한다 — 같으면 그것이 바로 그날의 사고다.
    expect(해시).not.toBe(원본);

    // ② 구글이 받은 것은 정확히 «원본의 SHA-256» 이어야 한다.
    expect(해시).toBe(await sha256Hex(원본));

    // ③ 원본은 우리가 만든 형식 그대로여야 한다(중간에 가공되지 않았다).
    expect(원본).toMatch(/^[0-9a-f]{64}$/);
  });
});
