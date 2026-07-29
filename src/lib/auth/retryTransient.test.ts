/**
 * askOnceMoreOnError — 「거부」와 「못 물어봤다」를 가르는 계약 시험
 *
 * 왜: 문지기들이 인증·DB 오류를 그대로 «권한 없음» 으로 바꿔 로그인한 사용자가 튕겼다
 *   (2026-07-29, docs/KNOWN_ISSUES.md). 이 헬퍼가 그 완충인데, 잘못 손대면
 *   ①거부가 통과로 뒤집히거나 ②모든 조회가 2배로 늘 수 있어 계약을 못 박는다.
 *
 * 실행: npm run test:run -- retryTransient
 */

import { describe, it, expect, vi } from "vitest";
import { askOnceMoreOnError } from "./retryTransient";

describe("askOnceMoreOnError", () => {
  it("성공하면 두 번 묻지 않는다 (평상시 DB 부하가 늘면 안 된다)", async () => {
    const ask = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    const res = await askOnceMoreOnError(ask);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(res?.data).toEqual({ id: 1 });
  });

  it("한 번 삐끗하면 다시 물어 성공을 살린다 (튕김의 원인이던 것)", async () => {
    const ask = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "fetch failed" } })
      .mockResolvedValueOnce({ data: { id: 1 }, error: null });
    const res = await askOnceMoreOnError(ask);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(res?.error).toBeFalsy();
    expect(res?.data).toEqual({ id: 1 });
  });

  it("예외를 던져도 한 번 더 (network throw)", async () => {
    const ask = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce({ data: { id: 2 }, error: null });
    const res = await askOnceMoreOnError(ask);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(res?.data).toEqual({ id: 2 });
  });

  it("「행이 없다」(PGRST116)는 확정 거부 — 다시 묻지 않는다", async () => {
    const ask = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    const res = await askOnceMoreOnError(ask);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(res?.error).toBeTruthy(); // 거부는 거부 그대로 — 통과로 뒤집히면 안 된다
  });

  it("두 번 다 실패하면 오류를 그대로 돌려준다 (보안: 통과로 뒤집지 않는다)", async () => {
    const ask = vi.fn().mockResolvedValue({ data: null, error: { message: "down" } });
    const res = await askOnceMoreOnError(ask);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(res?.error).toBeTruthy();
  });

  it("두 번 다 던지면 null (호출부는 예전처럼 거부한다)", async () => {
    const ask = vi.fn().mockRejectedValue(new Error("down"));
    const res = await askOnceMoreOnError(ask);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(res).toBeNull();
  });
});
