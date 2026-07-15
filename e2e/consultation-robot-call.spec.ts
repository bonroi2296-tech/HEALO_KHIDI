/**
 * 야간 로봇 통화 테스트 (안전망 ②, 2026-07-15 PO 승인)
 *
 * 매일 밤 가짜 카메라·마이크를 단 로봇 브라우저 2대가 **실제로** 상담방에 입장해
 * "양쪽 다 연결 + 서로 보임"까지 검증한다. 연결 회귀(키 폐기·서버 설정·게스트 입장
 * 파이프라인 고장)를 사람 대신 기계가 아침 전에 잡는 층 —
 * 근거: 7/2 'invalid token: revoked'는 이틀, 7/14 실회의 연결 문제는 회의 중에야 발견됨.
 *
 * 흐름: 어드민 UI 로그인 → 상담 생성(isTest 명시 + notes [TEST] 마커 — "자동 도장" 아님!
 *       독립 리뷰 적발: inquiry 미연결만으론 is_test 가 안 찍혀 KHIDI 증빙에 실데이터처럼 낌)
 *       → 초대 발급 → 가짜 미디어 브라우저 2대가 게스트 입장 → 상호 확인 → 종료.
 * 상담 레코드는 소프트 원칙대로 남긴다(밤마다 1건, is_test 라 집계·증빙 제외).
 *
 * @smoke 아님 = PR 게이트 제외. 실행 조건 = E2E_ROBOT_CALL=1 (Production Nightly 잡에만
 * 설정 — Full E2E(main push)는 로컬 dev 서버에 LiveKit env 가 없어 구조적으로 503 실패라 제외,
 * 독립 리뷰 적발).
 */

import { test, expect, chromium, type Browser } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("야간 로봇 통화 — 2인 실연결 검증", () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E_ADMIN_EMAIL 미설정 — 스킵");
  test.skip(
    process.env.E2E_ROBOT_CALL !== "1",
    "E2E_ROBOT_CALL!=1 — 야간 프로덕션 잡 전용 (Full E2E 로컬 서버엔 LiveKit env 없음)"
  );
  // 방 연결·ICE 협상까지 실네트워크라 넉넉히 (이 스펙만; 전역 timeout 무관)
  test.setTimeout(180_000);

  let fakeMediaBrowser: Browser | null = null;

  test.afterEach(async () => {
    await fakeMediaBrowser?.close().catch(() => {});
    fakeMediaBrowser = null;
  });

  test("로봇 2대가 같은 초대링크로 입장해 서로 연결된다", async ({ page }) => {
    // 1) 어드민으로 상담 생성 + 초대 발급 (page.request = 로그인 쿠키 공유)
    await loginAs(page, "admin");

    const createRes = await page.request.post("/api/khidi/consultation", {
      data: {
        sessionType: "pre_consultation",
        scheduledAt: new Date().toISOString(),
        // isTest 명시 = is_test 도장의 정본 경로. notes 의 [TEST] 는 이중 안전벨트
        // (detectSessionIsTest 가 notes 대문자화 후 "[TEST]" 리터럴을 찾음).
        isTest: true,
        notes: "[TEST] E2E 야간 로봇 통화 검증 (자동 생성)",
      },
    });
    expect(createRes.ok(), "상담 생성 API 실패").toBeTruthy();
    const created = await createRes.json();
    const consultationId: string =
      created?.consultation?.id ?? created?.id ?? created?.data?.id;
    expect(consultationId, "생성 응답에서 상담 id 를 못 찾음").toBeTruthy();

    const inviteRes = await page.request.post(
      `/api/khidi/consultation/${consultationId}/invite`,
      // role 필수. maxUses 기본값이 1(1회용)이라 로봇 2대가 같은 링크를 못 씀 → 5회로
      // (리허설에서 로봇B가 '만료된 링크'로 거절당한 실측 원인). 만료도 1시간이면 충분.
      { data: { role: "guest", maxUses: 5, expiresInHours: 1 } }
    );
    expect(inviteRes.ok(), "초대 발급 API 실패").toBeTruthy();
    const invite = await inviteRes.json();
    expect(invite?.inviteUrl, "초대 URL 없음").toBeTruthy();

    // 2) 가짜 미디어 브라우저(권한창 자동 허용 + 초록 링 테스트 영상) — 로봇 전용 인스턴스
    fakeMediaBrowser = await chromium.launch({
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    });

    const joinAsRobot = async (name: string) => {
      const ctx = await fakeMediaBrowser!.newContext({
        permissions: ["camera", "microphone"],
      });
      const robot = await ctx.newPage();
      await robot.goto(invite.inviteUrl, { waitUntil: "domcontentloaded" });
      const nameInput = robot.locator('input[type="text"]').first();
      await nameInput.waitFor({ state: "visible", timeout: 20_000 });
      await nameInput.fill(name);
      // 데스크톱 제출 버튼(폼 submit). 모바일 고정 바 도입(#767) 전후 모두 존재하는 타깃.
      await robot.locator('button[type="submit"]').first().click();
      // 헤더 연결 배지 — 새 방문자 기본 언어(en) 기준, ko 병행 허용
      try {
        await expect(
          robot.getByText(/Connected|연결됨/).first(),
          `${name} 이 연결 배지에 도달하지 못함`
        ).toBeVisible({ timeout: 45_000 });
      } catch (e) {
        // 실패 화면을 리포트에 남긴다 — 야간 빨간불 때 스크린샷 없이도 원인 판독 (원격 진단 원칙)
        const txt = await robot
          .locator("body")
          .innerText()
          .catch(() => "(body 읽기 실패)");
        test.info().annotations.push({
          type: "robot-screen",
          description: `${name}: ${txt.replace(/\n+/g, " | ").slice(0, 600)}`,
        });
        console.log(`[robot-call] ${name} 실패 화면:`, txt.replace(/\n+/g, " | ").slice(0, 600));
        throw e;
      }
      return robot;
    };

    const robotA = await joinAsRobot("E2E-ROBOT-A");
    const robotB = await joinAsRobot("E2E-ROBOT-B");

    // 3) 상호 확인 — 각 로봇 화면에 '상대' 이름 타일이 보여야 진짜 연결
    await expect(
      robotA.getByText("E2E-ROBOT-B").first(),
      "로봇A 화면에 로봇B 가 안 보임"
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      robotB.getByText("E2E-ROBOT-A").first(),
      "로봇B 화면에 로봇A 가 안 보임"
    ).toBeVisible({ timeout: 30_000 });
  });
});
