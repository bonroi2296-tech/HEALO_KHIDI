/**
 * 「반송될 게 뻔한 주소」로는 메일을 안 보낸다.
 *
 * 🛑 2026-08-19 실측: 시험 문의 26건에 「접수 확인」 메일이 그대로 나갔다(받는 곳 없는 주소 → 전부 반송).
 *    반송률이 높아지면 발송사가 계정을 제한하고 **진짜 환자 메일이 스팸함으로 간다.**
 *    자동 검사가 매번 접수를 넣으므로, 막지 않으면 이 반송이 영원히 쌓인다.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// 정규식은 server-only 모듈 안에 있어 그대로 못 부른다 — 파일에서 «그 줄»을 읽어 같은 눈으로 잰다.
const src = readFileSync(join(__dirname, "sendEmail.ts"), "utf8");
const line = /const UNDELIVERABLE = (\/.+\/i);/.exec(src);
const RE = new RegExp(line![1].slice(1, -2), "i");

describe("반송될 주소로는 안 보낸다", () => {
  it.each([
    "e2e-referral@healo-test.invalid",
    "probe@healo-test.invalid",
    "someone@example.com".replace("example.com", "foo.example"),
    "x@my.test",
    "coordinator@test.com",
  ])("막는다: %s", (addr) => expect(RE.test(addr)).toBe(true));

  it.each([
    "moon@immunelab.co.kr",
    "admin@healwith.co.kr",
    "patient@gmail.com",
    "a@invalid-clinic.kz",      // 이름에 invalid 가 들어갈 뿐 진짜 도메인이다
    "b@testhospital.com",
  ])("보낸다: %s", (addr) => expect(RE.test(addr)).toBe(false));
});
