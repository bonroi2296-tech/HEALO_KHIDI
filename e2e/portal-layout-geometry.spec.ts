/**
 * E2E: 포털 화면의 «위 여백 사슬»이 어긋나지 않는지 — 로그인해서 실제로 잰다 @smoke
 *
 * 왜 이 검사가 있나 (2026-08-03):
 *   PO 가 폰에서 「상단 헤더에 쓸데없는 공백」을 제보했다. 뿌리는 «고정 상단바 높이를
 *   손으로 박아둔 숫자»가 실제 높이와 어긋난 것이었고, 같은 부류가 포털에도 있었다:
 *     - 어드민·병원: 두 번째 메뉴 줄이 top-12(48px) — 상단바는 이미 56~64px + 안전영역
 *       → 브라우저 9px, 스토어 앱 46px 만큼 상단바 «밑에 깔려» 있었다.
 *     - 코디·어드민·병원: 그 메뉴 줄의 실제 높이가 69px 인데 본문은 48~56px 만 비켜줘
 *       → 본문 윗줄이 13~21px 가려져 있었다.
 *   이걸 사람 눈으로 잡으려면 «로그인해서 폰 크기로» 봐야 한다 — 빌드·타입검사·HTTP 200
 *   으로는 절대 안 드러난다. 그래서 기계가 잰다.
 *
 * 무엇을 재나: 상단바 → (모바일) 두 번째 메뉴 줄 → 본문 의 사슬이 «겹치지 않는지».
 *   안전영역(노치·상태표시줄)이 붙는 경우까지 두 번 잰다 — 스토어 앱이 그 경우다.
 *
 * 필요한 환경변수: 역할별 E2E_*_EMAIL / _PASSWORD (미설정 역할은 스킵).
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAs, type Role } from "./fixtures/auth";

/** 폰 크기 — 안드로이드 중형(가장 흔한 폭). 데스크톱은 두 번째 줄이 없어 이 검사 대상이 아니다. */
const PHONE = { width: 411, height: 820 };

/** 그 기기의 상태표시줄 높이(PO 제보 화면 실측값). 스토어 앱에서만 실제로 붙는다. */
const SAFE_TOP = 37;

type Case = { role: Role; envKey: string; path: string; label: string };

const CASES: Case[] = [
  { role: "admin", envKey: "E2E_ADMIN_EMAIL", path: "/admin", label: "어드민" },
  { role: "coordinator", envKey: "E2E_COORDINATOR_EMAIL", path: "/coordinator", label: "코디네이터" },
  { role: "hospital", envKey: "E2E_HOSPITAL_EMAIL", path: "/hospital", label: "병원" },
  { role: "patient", envKey: "E2E_TEST_USER_EMAIL", path: "/patient", label: "환자" },
];

type Geometry = {
  headerBottom: number | null;
  barTop: number | null;
  barBottom: number | null;
  contentTop: number | null;
  /** 어떤 상자를 본문으로 골랐는지 — 헛짚었을 때 로그만 보고 알 수 있게 */
  contentBox: string | null;
  /** 화면 첫 글자들 — 문지기(권한 없음) 화면을 본문으로 착각하지 않게 */
  bodyHead: string;
  safeTopVar: string;
};

/** 화면에 실제로 그려진 위치를 그대로 읽는다(클래스 이름이 아니라 «픽셀»을 믿는다). */
async function measure(page: Page): Promise<Geometry> {
  return page.evaluate(() => {
    const round = (n: number) => Math.round(n);
    const header = document.querySelector("header");
    const headerRect = header ? header.getBoundingClientRect() : null;

    // 모바일 두 번째 메뉴 줄 = 상단바 바로 밑에 붙는 fixed 가로 막대
    let bar: DOMRect | null = null;
    for (const el of Array.from(document.querySelectorAll("div"))) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed") continue;
      const r = el.getBoundingClientRect();
      if (r.width < window.innerWidth * 0.8) continue;
      if (r.height < 30 || r.height > 140) continue;
      if (r.top > window.innerHeight / 2) continue; // 하단 탭바 제외
      if (headerRect && r.top < headerRect.top + 1) continue; // 상단바 자신 제외
      if (!bar || r.top < bar.top) bar = r;
    }

    // ⚠️ 본문 상자를 고를 때 «맨 바깥 <main id="main-content">» 를 잡으면 안 된다.
    //    그건 전 화면 공통 껍데기라 위끝이 항상 0 이다 → 무조건 「가림」으로 잘못 나온다
    //    (2026-08-03 첫 실행에서 4건 다 그렇게 헛짚었다). 포털이 «자기 layout 에서» 만든
    //    안쪽 <main> 또는 본문 여백 상자(.healo-portal-offset)를 쓴다.
    const inner =
      document.querySelector("main:not(#main-content)") ||
      document.querySelector(".healo-portal-offset");
    const contentTop = inner
      ? round(inner.getBoundingClientRect().top + (parseFloat(getComputedStyle(inner).paddingTop) || 0))
      : null;

    return {
      headerBottom: headerRect ? round(headerRect.bottom) : null,
      barTop: bar ? round(bar.top) : null,
      barBottom: bar ? round(bar.bottom) : null,
      contentTop,
      contentBox: inner ? `${inner.tagName.toLowerCase()}.${String(inner.className).slice(0, 40)}` : null,
      bodyHead: (document.body.innerText || "").trim().replace(/\s+/g, " ").slice(0, 120),
      safeTopVar: getComputedStyle(document.documentElement).getPropertyValue("--healo-safe-top").trim(),
    };
  });
}

/** 사슬 검사: 상단바 → 메뉴 줄 → 본문 순서로, 뒤엣것이 앞엣것 «밑에 깔리지» 않아야 한다. */
function expectNoOverlap(g: Geometry, where: string) {
  // 테두리 1px 은 붙어 있는 정상 상태다 — 2px 까지 허용.
  const TOL = 2;
  if (g.headerBottom !== null && g.barTop !== null) {
    expect(
      g.barTop,
      `${where}: 두 번째 메뉴 줄이 상단바 밑에 ${g.headerBottom - g.barTop}px 깔렸다 ` +
        `(상단바 아래끝 ${g.headerBottom}, 메뉴 줄 위끝 ${g.barTop})`
    ).toBeGreaterThanOrEqual(g.headerBottom - TOL);
  }
  const above = g.barBottom ?? g.headerBottom;
  if (above !== null && g.contentTop !== null) {
    expect(
      g.contentTop,
      `${where}: 본문 윗줄이 위 막대 밑에 ${above - g.contentTop}px 가렸다 ` +
        `(막대 아래끝 ${above}, 본문 시작 ${g.contentTop})`
    ).toBeGreaterThanOrEqual(above - TOL);
  }
}

/**
 * 공개 화면 «아래» 사슬 — 하단 탭바가 ①화면 끝에 붙어 있고 ②누를 만큼 크고 ③밑에 빈 칸이 없는지.
 * 로그인 없이 도는 검사라 계정이 없어도 항상 돈다.
 *
 * 왜 이게 필요한가: 아래쪽 안전영역을 「안드로이드 브라우저면 0」으로 바꿨다(앱 안 브라우저가
 * 시스템 버튼줄 높이를 잘못 알려줘 탭 밑에 47px 빈 칸이 생기던 문제). 이 검사는 그 고침이
 * ①되돌아가(다시 빈 칸) ②지나쳐서(탭이 너무 작아짐) 둘 중 어느 쪽으로도 안 흐르게 잠근다.
 */
test.describe("공개 화면 하단 탭바 @smoke", () => {
  test.use({ viewport: { width: 411, height: 820 } });

  test("탭바가 화면 끝에 붙고, 밑에 빈 칸이 없고, 누를 만큼 크다", async ({ page }) => {
    await page.goto("/en");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const bar = await page.evaluate(() => {
      const vh = window.innerHeight;
      let found: { top: number; bottom: number; height: number; padBottom: string } | null = null;
      for (const el of Array.from(document.querySelectorAll("div,nav"))) {
        const cs = getComputedStyle(el);
        if (cs.position !== "fixed") continue;
        const r = el.getBoundingClientRect();
        if (r.width < window.innerWidth * 0.8) continue;
        if (r.height < 30) continue;
        if (Math.abs(r.bottom - vh) > 4) continue; // 화면 아래끝에 붙은 것만
        if (r.top < vh / 2) continue;
        if (!found || r.height > found.height) {
          found = { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), padBottom: cs.paddingBottom };
        }
      }
      return { vh, bar: found };
    });

    expect(bar.bar, "화면 아래에 붙은 탭바를 못 찾았다").not.toBeNull();
    const b = bar.bar!;
    // ① 화면 끝에 붙어 있다 = 탭 밑에 빈 칸이 없다(고치기 전엔 여기 47px 이 떠 있었다)
    expect(b.bottom, `탭바 아래에 ${bar.vh - b.bottom}px 빈 칸이 생겼다`).toBeGreaterThanOrEqual(bar.vh - 2);
    // ② 손가락으로 누를 수 있는 크기(접근성 하한 44px)보다 커야 한다 — 지나치게 줄이는 방향도 막는다
    expect(b.height, "탭바가 44px 보다 작아져 누르기 어렵다").toBeGreaterThanOrEqual(44);
  });
});

test.describe("포털 위 여백 사슬 @smoke", () => {
  for (const c of CASES) {
    test(`${c.label} 포털 — 폰에서 상단바·메뉴 줄·본문이 서로 안 가린다`, async ({ page }) => {
      test.skip(!process.env[c.envKey], `${c.envKey} 미설정 — ${c.label} 스킵`);

      // 쿠키 동의 배너가 화면 아래를 덮어 측정에 끼어들지 않게(실사용자도 한 번 누르면 안 뜬다)
      await page.addInitScript(() => {
        try { localStorage.setItem("healo_cookie_consent", "all"); } catch {}
      });
      await page.setViewportSize(PHONE);
      await loginAs(page, c.role);
      await page.goto(c.path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("header").first()).toBeVisible({ timeout: 30_000 });
      // 문지기(게이트)를 통과해 «그 포털의» 본문 상자가 실제로 붙을 때까지 기다린다.
      // 여기서 못 기다리면 문지기 화면을 본문으로 착각해 엉뚱한 숫자를 재게 된다.
      await expect(
        page.locator("main:not(#main-content), .healo-portal-offset").first()
      ).toBeAttached({ timeout: 30_000 });

      // ① 보통 브라우저 — 안전영역 0
      const plain = await measure(page);
      expect(
        plain.contentTop,
        `${c.label}: 본문 상자를 못 찾았다 — 문지기에 막혔을 수 있다. 화면 첫 글자: "${plain.bodyHead}"`
      ).not.toBeNull();
      expectNoOverlap(plain, `${c.label}/브라우저 (본문상자=${plain.contentBox})`);

      // ② 스토어 앱 — 상태표시줄만큼 안전영역이 붙는 경우.
      //    안전영역 흉내는 크롬 개발자도구 명령(CDP)으로만 되고, 지원 안 하는 판이면 조용히 건너뛴다.
      let insetApplied = false;
      try {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setSafeAreaInsetsOverride" as never, {
          insets: { top: SAFE_TOP, topMax: SAFE_TOP },
        } as never);
        insetApplied = true;
      } catch {
        // 지원 안 함 — ① 결과만으로 판정한다(거짓 통과를 만들지 않게 아래에서 명시적으로 남긴다).
        console.warn("[portal-layout] 안전영역 흉내를 지원하지 않는 브라우저 판 — 스토어 앱 경우는 못 쟀다");
      }
      if (insetApplied) {
        await page.evaluate(() => document.documentElement.setAttribute("data-healo-native", "1"));
        await page.waitForTimeout(300);
        const native = await measure(page);
        expect(
          native.safeTopVar,
          "스토어 앱 표식이 붙었는데도 위 안전영역 값이 0 이다 — 스위치가 안 걸렸다"
        ).not.toBe("0px");
        expectNoOverlap(native, `${c.label}/스토어앱 (본문상자=${native.contentBox})`);
      }
    });
  }
});
