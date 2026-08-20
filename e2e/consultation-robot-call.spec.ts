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

import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, chromium, type Browser } from "@playwright/test";
import { loginAs } from "./fixtures/auth";

test.describe("야간 로봇 통화 — 2인 실연결 검증", () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E_ADMIN_EMAIL 미설정 — 스킵");
  test.skip(
    process.env.E2E_ROBOT_CALL !== "1",
    "E2E_ROBOT_CALL!=1 — 야간 프로덕션 잡 전용 (Full E2E 로컬 서버엔 LiveKit env 없음)"
  );
  // 방 연결·ICE 협상까지 실네트워크라 넉넉히 (이 스펙만; 전역 timeout 무관)
  // 2026-07-28: 통역 단계가 붙으며 180초로는 모자랐다 — 봇 입장 대기(45s) + 자막 관측(60s) +
  // 퇴장 확인(45s) 만 150초다. 예산이 모자라면 «페이지가 닫혔다»는 엉뚱한 에러로 끝난다.
  test.setTimeout(360_000);

  // ── 두 로봇의 언어와 말소리 ──────────────────────────────────────────────
  //   여기 한 곳만 고치면 어떤 언어 짝으로 잴지 바뀐다.
  //   🔑 규칙: **신고한 언어(locale) 와 실제 내는 소리(wav) 가 반드시 같아야 한다.**
  //      통역봇은 소리를 듣고 언어를 가려내지 않고 참가자가 신고한 `lang` 을 그대로 믿는다.
  //      어긋나면 봇이 «한국어 소리를 러시아어로 알고» 받아쓴다(2026-08-20 이전의 실제 상태).
  //   기본값을 한국어와 러시아어로 두는 이유: 러시아·카자흐 환자가 주 고객이라
  //      이 짝이 실제로 돈이 걸린 길이다.
  //   영어로 재고 싶으면 B 를 아래 주석 줄로 갈아라(말소리 파일은 이미 저장소에 있다):
  //      B: { locale: "en-US", wav: "en-coordinator-speech.wav", script: "latin" }
  const PAIR = {
    A: { locale: "ko-KR", wav: "ko-patient-speech.wav", script: "hangul" },
    B: { locale: "ru-RU", wav: "ru-patient-speech.wav", script: "cyrillic" },
  } as const;

  let fakeMediaBrowser: Browser | null = null;
  // 로봇 B 전용 브라우저. 가짜 마이크 파일이 브라우저 단위로 고정되기 때문에
  // 「로봇마다 다른 말」을 시키려면 브라우저를 따로 띄우는 수밖에 없다(아래 주석 참고).
  let fakeMediaBrowserB: Browser | null = null;

  test.afterEach(async () => {
    await fakeMediaBrowser?.close().catch(() => {});
    await fakeMediaBrowserB?.close().catch(() => {});
    fakeMediaBrowser = null;
    fakeMediaBrowserB = null;
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

    // ⚠️ 초대 URL 의 도메인을 **검사 대상**으로 갈아끼운다 (2026-07-28 실측으로 추가).
    //    서버는 초대 링크를 `siteUrl()`(= 정본 도메인, 프로덕션)로 만든다 — 환자에게 나가는
    //    링크라 request origin 을 안 쓰는 게 맞다. 그런데 **프리뷰를 대상으로 돌려도 로봇이
    //    프로덕션 방으로 들어가 버려서**, 프리뷰의 새 코드를 검사한 줄 알고 실은 프로덕션을
    //    재고 있었다(고친 줄 알았던 기능이 「안 고쳐졌다」로 나옴 — 낡은 대상 오검증 부류).
    //    프로덕션 야간 실행에서는 두 도메인이 같아 무동작이다.
    const robotEntryUrl = (() => {
      const u = new URL(invite.inviteUrl);
      const base = new URL(process.env.E2E_BASE_URL || "http://localhost:3000");
      u.protocol = base.protocol;
      u.host = base.host;
      return u.toString();
    })();
    console.log(`[robot-call] 로봇 입장 URL = ${robotEntryUrl.split("?")[0]}`);

    // 2) 가짜 미디어 브라우저(권한창 자동 허용 + 초록 링 테스트 영상) — 로봇 전용 인스턴스
    //
    // 🎙️ 가짜 «마이크» 에 실제 말소리를 물린다 (2026-07-27).
    //   그 전까지는 `--use-fake-device-for-media-stream` 만 있어서 마이크에 크로미움 기본
    //   **사인톤(「삐—」)** 이 들어갔다. 말소리가 아니니 STT 가 잡을 게 없고, 그래서 이 야간
    //   테스트는 매일 돌면서도 «둘이 연결됐나» 까지만 봤다 — 자막·통역봇은 한 번도 검증된 적이 없다.
    //   `--use-file-for-fake-audio-capture` 로 WAV 를 마이크 입력으로 재생하면 STT·통역 경로가 깨어난다.
    //   (파일·재생성 절차 = e2e/fixtures/audio/README.md. 크로미움은 이 파일을 무한 반복 재생한다.)
    //
    //   ⚠️ 기록용: "자동환경엔 마이크가 없어 통역 검증 불가" 라고 여러 세션이 적어 왔는데
    //      **오진이었다.** 크로미움이 WAV 를 마이크로 재생해 준다. 진짜 블로커는 «말소리 파일 없음» 이었고,
    //      로컬 TTS(piper)로 만들면 끝나는 문제였다.
    // ⚠️ `__dirname` 금지 — 이 저장소는 package.json "type":"module" 이라 ESM 스코프다
    //    (e2e/fixtures/auth.ts 에 같은 경고가 이미 있었는데 내가 어겼다. 첫 실행에서
    //     `ReferenceError: __dirname is not defined` 로 터짐 — tsc 는 @types/node 때문에
    //     통과시켜 주므로 «타입검사 초록 = 동작»이 아님을 다시 확인한 사례.)
    // ⚠️ 가짜 마이크 파일은 «브라우저를 띄울 때» 정해진다(창마다 바꿀 수 없다).
    //    그래서 로봇마다 다른 말을 시키려면 **로봇 수만큼 브라우저를 띄워야 한다.**
    //
    //    2026-08-20 정정: 그 전까지 브라우저 «하나»에 한국어 WAV 하나만 물리고
    //    로봇 둘을 같은 브라우저에서 띄웠다. 그 결과 **러시아어라고 신고한 로봇 B 가
    //    실제로는 한국어를 뱉고 있었다.** 통역봇은 발화를 듣고 언어를 가려내지 않고
    //    참가자가 신고한 `lang` 속성을 그대로 믿는다 → 한국어 소리를 러시아어로 알고
    //    받아쓰게 된다. 「자막 지어냄」의 재료가 되기 좋은 상태였다.
    //    이제 로봇마다 «신고한 언어 = 실제로 내는 소리» 가 맞는다.
    const audioDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/audio");
    const launchWithVoice = (wav: string) =>
      chromium.launch({
        args: [
          "--use-fake-ui-for-media-stream",
          "--use-fake-device-for-media-stream",
          `--use-file-for-fake-audio-capture=${path.join(audioDir, wav)}`,
        ],
      });
    fakeMediaBrowser = await launchWithVoice(PAIR.A.wav);
    fakeMediaBrowserB = await launchWithVoice(PAIR.B.wav);

    // 로봇마다 «다른 언어»로 붙는다 (2026-07-28 PO 지시: 통역까지 확인).
    //   방 UI 언어 = Accept-Language(= 컨텍스트 locale) 이고, 그 언어가 그대로 LiveKit
    //   `lang` 속성으로 방에 알려진다 → 통역봇은 그 속성으로 «누구 말을 어느 언어로»를 정한다.
    //   둘 다 영어면 번역할 게 없어 세션 자체가 안 만들어진다(첫 실행에서 실제로 그랬다).
    const joinAsRobot = async (name: string, locale: string, browser: Browser) => {
      const ctx = await browser.newContext({
        permissions: ["camera", "microphone"],
        locale,
      });
      const robot = await ctx.newPage();
      // 방 화면이 하얗게/에러로 죽으면 이유가 브라우저 콘솔에만 남는다 — 야간 실행엔 사람이
      // 없으니 즉시 stdout 으로 흘린다(원격 진단 원칙, POSTMORTEMS #61 과 같은 부류 예방).
      robot.on("pageerror", (err) => console.log(`[robot-call] ${name} pageerror: ${err.message}`));
      robot.on("console", (m) => {
        // warning 도 본다 — 통역·자막 경로의 실패는 전부 `console.warn` 으로 나간다
        // (`[LiveTranslate] …`). error 만 보던 탓에 2026-07-28 진단에서 이 줄들을 통째로
        // 놓쳤다: 봇은 자막을 보냈는데 화면엔 없고, 이유는 warn 에 있었을 자리다.
        const t = m.type();
        if (t === "error" || t === "warning")
          console.log(`[robot-call] ${name} ${t}: ${m.text().slice(0, 300)}`);
      });
      await robot.goto(robotEntryUrl, { waitUntil: "domcontentloaded" });
      const nameInput = robot.locator('input[type="text"]').first();
      await nameInput.waitFor({ state: "visible", timeout: 20_000 });
      await nameInput.fill(name);
      // 데스크톱 제출 버튼(폼 submit). 모바일 고정 바 도입(#767) 전후 모두 존재하는 타깃.
      await robot.locator('button[type="submit"]').first().click();
      // 헤더 연결 배지 — 새 방문자 기본 언어(en) 기준, ko 병행 허용
      try {
        await expect(
          robot.getByText(/Connected|연결됨|Подключено|Қосылды|已连接|接続済み/).first(),
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
      // 쿠키 동의 배너(fixed z-9999)가 컨트롤 바를 덮어 클릭을 가로챔(리허설 실측).
      // goto 직후엔 아직 안 떠 있어 못 닫음 → 연결 확인 후 최대 5초 기다려 '필수만 동의'로 닫기
      const cookieBtn = robot.getByRole("button", { name: /Essential Only|필수만|Только необходимые|Тек қажеттілері|仅必要|必須のみ/i }).first();
      await cookieBtn.click({ timeout: 5_000 }).catch(() => {}); // 배너 없으면(이미 동의) 조용히 통과
      return robot;
    };

    // 둘 다 «말을 한다». 언어와 말소리는 파일 위쪽 PAIR 한 곳에서 정한다.
    //
    // 2026-08-20 바뀐 점:
    //   전: A=한국어 화자 / B=러시아어 «청취자». 그런데 B 도 마이크가 켜져 있었고
    //       한국어 WAV 를 같이 물고 있어서, 실제로는 「러시아어라고 신고하고 한국어를
    //       내는 참가자」였다. 한 방향만, 그것도 어긋난 재료로 쟀다.
    //   후: 브라우저를 둘로 나눠 각자 제 언어로 말한다 → **양방향 통역**이 처음으로
    //       진짜 검사 대상이 되고, 신고한 언어와 실제 소리도 맞는다.
    const robotA = await joinAsRobot("E2E-ROBOT-A", PAIR.A.locale, fakeMediaBrowser!);
    const robotB = await joinAsRobot("E2E-ROBOT-B", PAIR.B.locale, fakeMediaBrowserB!);

    // 3) 상호 확인 — 각 로봇 화면에 '상대' 이름 타일이 보여야 진짜 연결
    await expect(
      robotA.getByText("E2E-ROBOT-B").first(),
      "로봇A 화면에 로봇B 가 안 보임"
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      robotB.getByText("E2E-ROBOT-A").first(),
      "로봇B 화면에 로봇A 가 안 보임"
    ).toBeVisible({ timeout: 30_000 });

    // 4) 채팅 왕복 — 게스트 채팅이 DB 제약·API 회귀로 조용히 죽는 부류를 매일 밤 검출
    //    (2026-07-15 실사고: sender_role CHECK 에 guest·admin 누락 → 전송 500 무증상, 반성문 #94)
    const chatMsg = `robot-chat-${Date.now()}`;
    await robotA.locator('button[aria-label="Toggle chat panel"]').first().click(); // 라벨 유무 무관(구·신 UI 겸용)
    // 패널 기본 탭이 '번역'이라 채팅 입력칸이 안 보임(리허설 실측) → 채팅 탭으로 전환
    await robotA.getByRole("button", { name: /^(채팅|Chat|Чат|聊天|チャット)$/ }).first().click();
    const msgInput = robotA
      .locator('input[placeholder*="메시지"], input[placeholder*="message" i], input[placeholder*="сообщ" i], input[placeholder*="Хабарлама" i]')
      .first();
    await msgInput.waitFor({ state: "visible", timeout: 10_000 });
    await msgInput.fill(chatMsg);
    await msgInput.press("Enter");
    await expect(
      robotA.getByText(chatMsg).first(),
      "로봇A 자기 화면에 보낸 채팅이 안 보임(전송 실패 의심)"
    ).toBeVisible({ timeout: 10_000 });
    await robotB.locator('button[aria-label="Toggle chat panel"]').first().click();
    await robotB.getByRole("button", { name: /^(채팅|Chat|Чат|聊天|チャット)$/ }).first().click();
    await expect(
      robotB.getByText(chatMsg).first(),
      "로봇B 에게 채팅이 전달되지 않음"
    ).toBeVisible({ timeout: 20_000 });

    // 5) 🔊 통역봇 실참여 검증 (2026-07-27 신설) — E2E_INTERPRETER=1 일 때만
    //
    // 왜 이게 필요한가: 통역봇은 «토큰 발급 시 LiveKit 이 디스패치하는 별도 워커 프로세스» 라,
    //   앱이 멀쩡해도 봇 배포가 죽어 있으면 **아무 에러 없이 그냥 통역이 안 된다**.
    //   실제로 POSTMORTEMS #100 이 정확히 그 부류였다 — 스위치 켜짐·봇 입장·로그 정상인데
    //   통역만 전혀 안 됨. 사람이 실통화를 해봐야만 알 수 있는 상태로 방치돼 있었다.
    //
    // 판정 근거(화면): 통역 토글을 켜면 앱이 봇 재실 여부에 따라 **다른 토스트**를 띄운다
    //   (`page.jsx` 의 `agentPresent ? c.voiceOnMsg : c.voiceOnPendingMsg`).
    //   → "…통역봇이 방에 들어오면…" 이 뜨면 봇이 방에 없다는 뜻 = 실패.
    //   게스트 화면 언어가 ko/en/ru/kz 중 무엇이든 잡히도록 6개어 변형을 다 넣는다.
    if (process.env.E2E_INTERPRETER === "1") {
      // 봇 없음 = "들어오면 통역돼요" 계열 / 봇 있음 = "통역 음성으로 들려요" 계열
      const BOT_MISSING =
        /통역봇이 방에 들어오면|interpreter bot joins|когда подключится|қосылғанда|翻译机器人|通訳ボット/;
      const BOT_PRESENT =
        /통역 음성으로 들려요|hear an interpreted voice|переведённый голос|аударылған дауысты|翻译语音|通訳音声/;

      // 접근명(«통역»)으로 찾지 않는다 — 봇이 없을 때 붙는 `···` 배지가 이름에 섞여
      // "통역 ···" 이 되는 바람에 **정작 봇이 없는 경우에만 못 찾았다**(2026-07-27 실측:
      // 프로덕션에서 15초 타임아웃 3회. 잡으려던 상황에서만 눈이 머는 셀렉터였다).
      // → page.jsx 의 `data-testid="voice-toggle"` 로 고정(다국어 6종·배지 무관).
      const voiceBtn = robotB.getByTestId("voice-toggle").first();
      try {
        await voiceBtn.waitFor({ state: "visible", timeout: 15_000 });
      } catch (e) {
        // 버튼 자체가 없으면 «봇 없음»과 «UI 가 달라짐»을 구분해야 한다 → 화면을 남긴다.
        const screen = await robotB
          .locator("body")
          .innerText()
          .catch(() => "(본문 읽기 실패)");
        test.info().annotations.push({
          type: "interpreter-nobutton",
          description: `통역 토글을 못 찾음. 화면: ${screen.replace(/\n+/g, " | ").slice(0, 500)}`,
        });
        throw e;
      }

      // ⚠️ 토스트로 «봇 재실»을 묻지 마라 (2026-07-28 프리뷰 실측으로 배운 것).
      //    토스트는 클릭해야 뜨는데, 이제 **클릭 자체가 봇을 부르고/내보낸다**(on-demand
      //    디스패치). 옛 루프는 「켜서 토스트 보고 → 다시 꺼서 다음 회차 준비」였는데,
      //    그 «다시 끄기»가 매번 봇을 쫓아내 **봇이 방에 붙을 8초를 스스로 없애 버렸다**
      //    (실측: 4회 전부 pending 토스트 → 봇=false. 앱은 멀쩡했다).
      //    → 클릭 없이 읽히는 신호로 판정한다: 통역 버튼의 `data-agent-present` 속성은
      //      봇 재실만 반영한다(토글 상태·배지와 무관 — 2026-07-29 자가감사로 교체).
      // ⚠️ 채팅 패널을 «닫고» 시작한다. 자막 오버레이는 `{!panelOpen && …}` 이라 패널이 열려
      //    있으면 **아예 렌더되지 않는다**(2026-07-11 PO: 모바일에서 패널이 자막을 덮음).
      //    4단계 채팅 검사가 패널을 열어둔 채 끝나서, 봇이 자막 34건을 보낸 실행에서도
      //    화면엔 «자막 못 봄»이 나왔다 — 앱이 아니라 검사가 눈을 가리고 있었다(2026-07-28).
      await robotB.locator('button[aria-label="Toggle chat panel"]').first().click();
      await robotA.locator('button[aria-label="Toggle chat panel"]').first().click();

      let botPresent = false;
      let lastToast = "(토스트 못 봄)";

      // 서버가 뭐라고 답했는지 남긴다 — 「봇이 안 들어온다」가 앱 문제인지 워커 문제인지
      // 가르는 첫 갈림길인데, 프로덕션 로그는 몇 분 밀려서 아침에 보면 이미 늦다.
      const apiAnswers: string[] = [];
      robotB.on("response", async (res) => {
        if (!res.url().includes("/interpreter")) return;
        const body = await res.text().catch(() => "(본문 못 읽음)");
        apiAnswers.push(`${res.status()} ${body.slice(0, 200)}`);
      });

      // ── 기능이 꺼져 있으면 «스스로» 건너뛴다 (2026-07-28, 반성문 #138 의 교훈) ──
      //   통역 스위치(`LIVE_TRANSLATE_ENABLED`)는 PO 판단으로 켜졌다 꺼졌다 한다. 예전엔
      //   워크플로 플래그를 **사람이 같이 내려야** 했고, 그걸 잊은 하루가 새벽 긴급 이메일로
      //   돌아왔다(이슈 #1061). 이제 서버 응답이 정답을 들고 있으므로(`enabled:false`)
      //   가드가 자기 전제를 스스로 확인한다 — 꺼져 있으면 조용히 통과, 켜지는 순간 자동 검증.
      const firstAnswer = robotB
        .waitForResponse((r) => r.url().includes("/interpreter"), { timeout: 20_000 })
        .catch(() => null);
      await voiceBtn.click(); // 통역 켜기 = 이 순간 서버가 봇을 부른다
      const answerBody = await firstAnswer
        .then((r) => (r ? r.json() : null))
        .catch(() => null);
      if (answerBody && answerBody.enabled === false) {
        console.log(
          "[robot-call] 통역 기능 꺼짐(LIVE_TRANSLATE_ENABLED=false) — 통역 단계 건너뜀(정상)"
        );
        test.info().annotations.push({
          type: "interpreter-skipped",
          description: "서버가 enabled:false — 통역이 의도적으로 꺼져 있어 검증 생략",
        });
        return;
      }

      const toast = robotB
        .getByText(new RegExp(`${BOT_PRESENT.source}|${BOT_MISSING.source}`))
        .first();
      lastToast = await toast
        .waitFor({ state: "visible", timeout: 8_000 })
        .then(() => toast.innerText())
        .then((t) => t.trim())
        .catch(() => "(토스트 못 봄)");

      // 워커가 방에 붙기까지 수 초 — 통역 버튼의 «봇 재실» 표시가 1 이 되길 기다린다.
      // ⚠️ 예전엔 «봇 대기 배지가 사라짐»으로 판정했는데 그건 거짓 초록이 난다: 그 배지는
      //    이제 «통역을 켠 동안»에만 그려지고, 서버가 «준비 중»이라 답하면 앱이 토글을 스스로
      //    되돌리므로 **봇이 안 와도 배지가 사라진다**. 봇 재실만 반영하는 속성으로 본다.
      //    (2026-07-29 자가감사 — 이게 우리에게 하나뿐인 자동 통화 확인이라 더 정확해야 한다)
      try {
        await robotB
          .locator('[data-testid="voice-toggle"][data-agent-present="1"]')
          .first()
          .waitFor({ state: "attached", timeout: 45_000 });
        botPresent = true;
      } catch {
        botPresent = false;
      }

      // ── 통역 자막이 «실제로» 떴는가 — 봇을 내보내기 «전»에 본다 ────────────
      //   로봇A 가 제 언어로 말하므로, 봇이 일하고 있다면 로봇B 자막 스택에
      //   **B 의 언어로 옮겨진 문장**이 떠야 한다. 본문 전체에서 찾으면 UI 문구에 걸려
      //   늘 «찾음»이 되므로 **자막 스택 안에서만** 본다.
      //
      //   ⚠️ 판정 글자는 PAIR.B.script 를 따라 «자동으로» 고른다. 예전에는 키릴 문자를
      //   찾는 코드가 박혀 있어서, 로봇B 의 언어를 바꾸면 그 글자가 영영 안 떠
      //   매일 밤 «자막 못 봄» 으로 굳는 함정이 있었다(2026-08-20 실제로 밟을 뻔했다).
      //   PAIR 만 고치면 판정도 같이 따라오도록 묶어 뒀다.
      //   ⚠️ 순서 주의: 통역을 끄면 봇이 나가므로 이 관측은 반드시 «끄기» 앞이어야 한다.
      //   ⚠️ 아직 하드 실패로 걸지 않는다 — 합성음(piper) 인식률이 미검증이라 첫날부터
      //      expect 로 올리면 «봇은 멀쩡한데 합성음이 약해서» 매일 밤 빨간불이 될 수 있다.
      let captionText = "(관측 안 함 — 봇 미입장)";
      if (botPresent) {
        // 자막 «본문»만 읽는다 — 같은 줄의 이름·언어 라벨과 옆의 AI 면책 배너도
        // 같은 언어라, 스택 전체 텍스트로 보면 봇이 아무 말도 안 해도 «자막 있음»이 된다
        // (2026-07-28 실측: 라벨만 잡고 통과할 뻔했다).
        const lines = robotB.getByTestId("subtitle-text");
        const translated = translatedInto(PAIR.B.script);
        const deadline = Date.now() + 60_000;
        captionText = "자막 못 봄";
        while (Date.now() < deadline) {
          const texts = await lines.allInnerTexts().catch(() => [] as string[]);
          const hit = texts.find(translated);
          if (hit) {
            captionText = "자막 뜸: " + hit.slice(0, 120);
            break;
          }
          await robotB.waitForTimeout(3_000);
        }
      }
      console.log(`[robot-call] 통역자막(영어) = ${captionText}`);
      test.info().annotations.push({
        type: "interpreter-caption",
        description: `${captionText} (ko 화자 → en 화자, 양쪽 다 합성음. 러시아어 경로는 말소리 파일이 없어 안 잼)`,
      });

      // 끄면 나가는가 — PO 요구사항의 나머지 절반(2026-07-28). 봇이 들어온 경우에만 의미.
      let botLeft: boolean | null = null;
      if (botPresent) {
        await voiceBtn.click(); // 통역 끄기 = 방에 원하는 사람이 없으면 봇 퇴장
        // 여기서도 «대기 배지가 다시 보임»으로 보면 안 된다 — 통역을 껐으니 배지는 애초에
        // 안 그려져서 **봇이 나갔든 말든 항상 «안 나갔다»**가 나온다(거짓 빨강).
        botLeft = await robotB
          .locator('[data-testid="voice-toggle"][data-agent-present="0"]')
          .first()
          .waitFor({ state: "attached", timeout: 45_000 })
          .then(() => true)
          .catch(() => false);
        console.log(`[robot-call] 통역봇 퇴장=${botLeft}`);
        test.info().annotations.push({
          type: "interpreter-bot-leave",
          description: `끄면 나가는가=${botLeft}`,
        });
      }

      // ⚠️ 판정 결과는 **assert 앞에서 즉시** stdout 으로 찍는다.
      //    실패 상세(assert 메시지·annotation)는 스위트가 «끝까지» 돌아야 출력되는데,
      //    2026-07-27 실측: 다른 PR 이 main 에 머지되며 동시성 규칙이 이 실행을 중간에 죽여
      //    **로봇 테스트는 3회 다 돌았는데 결과를 한 글자도 못 건졌다.**
      //    한 줄이라도 미리 흘려두면 취소·타임아웃에도 답이 남는다.
      console.log(
        `[robot-call] 통역봇=${botPresent} / 마지막토스트="${lastToast}"`
      );
      console.log(`[robot-call] interpreter 응답: ${apiAnswers.join(" | ") || "(호출 없음)"}`);
      test.info().annotations.push({
        type: "interpreter-api",
        description: apiAnswers.join(" | ") || "(호출 없음)",
      });
      test.info().annotations.push({
        type: "interpreter-bot",
        description: `봇 재실 판정=${botPresent} / 마지막 토스트="${lastToast}"`,
      });
      expect(
        botPresent,
        `통역봇(agent-*)이 상담방에 들어오지 않았다 — 워커 배포·LIVE_TRANSLATE_ENABLED 확인 필요. ` +
          `마지막 토스트: "${lastToast}"`
      ).toBeTruthy();
      expect(
        botLeft,
        `통역을 껐는데 봇이 방에 남아 있다 (분당 과금이 계속 난다). ` +
          `interpreter 라우트의 «아무도 원하지 않으면 퇴장» 판정을 볼 것.`
      ).toBe(true);

      console.log(`[robot-call] 통역봇=${botPresent} / 자막관측=${captionText}`);
    }
  });
});
