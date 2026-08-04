/**
 * 가드: 채팅 시작 창구를 부르는 «점검 스크립트»는 반드시 내부 전용 이메일을 넘겨야 한다.
 *
 * 왜 이 가드가 있나 (2026-08-04 실측):
 *   점검 스크립트가 AI 채팅으로 3턴 이상 대화하면 서버가 그 스레드를 **진짜 문의로 승격**한다
 *   (promoteThreadToInquiry). 그때 이메일이 없으면 「테스트」 판정이 안 걸려 is_test=false —
 *   즉 로봇 대화가 KHIDI 실적의 «진짜 문의»로 쌓인다. 14일간 17건이 그렇게 새어 있었고
 *   같은 기간 진짜 웹 문의는 3건이었다. 스레드는 스크립트가 지우지만 승격된 문의는 아무도 안 지운다.
 *
 * 검출 조건이 기계적으로 명확해서 가드로 만들었다(CLAUDE.md 규칙 7의 3문답):
 *   ①`/api/public/chat/start` 호출 + `guest_email` 유무 = 문자열 맞추기가 아니라 구조적 사실
 *   ②이 경로가 새는 문의의 대부분(17건 중 16건)을 덮는다
 *   ③피해 갈 동기가 없다(오히려 안 넣으면 실적이 더러워진다)
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/** 내부 전용 도메인 — resolveTestDomains() 의 기본 목록에 들어 있어야 판정이 걸린다. */
const INTERNAL_DOMAIN = "healo-test.invalid";

const SCRIPTS = ["scripts/smoke-chat.mjs", "scripts/check-ai-behavior.mjs"];

describe("점검 스크립트는 자기 대화를 «테스트»로 표시한다", () => {
  for (const rel of SCRIPTS) {
    it(`${rel} — 채팅을 시작할 때 내부 전용 이메일을 넘긴다`, () => {
      const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");

      // 전제 확인: 이 스크립트가 정말 채팅 시작 창구를 부르는가.
      // (부르지 않게 바뀌었다면 이 가드 자체가 낡은 것이므로 같이 실패해야 한다.)
      expect(src, `${rel} 이 /api/public/chat/start 를 더는 부르지 않는다 — 가드를 갱신하라`)
        .toContain("/api/public/chat/start");

      // ⚠️ 파일 전체에서 문자열을 세면 «주석에 적어둔 도메인»에도 걸려서 가드가 거짓 통과한다.
      //    (2026-08-04: 처음 이렇게 만들었다가 일부러 낸 고장을 못 잡는 걸 확인하고 고쳤다.)
      //    그래서 실제 «키: 값» 짝에서 값만 뽑아 검사한다.
      const m = src.match(/guest_email\s*:\s*["'`]([^"'`]+)["'`]/);
      expect(m, `${rel} 에 guest_email 이 없다 — 승격된 문의가 진짜 실적으로 잡힌다`).not.toBeNull();
      expect(
        m![1],
        `${rel} 의 guest_email 이 내부 전용 도메인(${INTERNAL_DOMAIN})이 아니다 — 실제 값: ${m![1]}`
      ).toMatch(new RegExp(`@${INTERNAL_DOMAIN.replace(".", "\\.")}$`, "i"));
    });
  }
});
