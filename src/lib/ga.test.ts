import { describe, it, expect, afterEach, vi } from "vitest";
import { hasAnalyticsConsent, getPlatform, event, pageview, setAnalyticsUser, GA_EVENTS } from "./ga";

// vitest 환경이 'node'(window 없음)라 케이스별로 window.localStorage 를 스텁한다.
function stubConsent(getItem: () => string | null) {
  vi.stubGlobal("window", { localStorage: { getItem } });
}

describe("hasAnalyticsConsent (분석툴 로드 게이트)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it('"all" 동의면 true', () => {
    stubConsent(() => "all");
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('"essential"이면 false (Essential Only 선택 시 추적 금지)', () => {
    stubConsent(() => "essential");
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("동의 키가 없으면 false (배너 무시/미선택 = 추적 안 함)", () => {
    stubConsent(() => null);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("localStorage 접근이 막히면 false (안전 기본값)", () => {
    stubConsent(() => {
      throw new Error("blocked");
    });
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("SSR(window 없음)이면 false", () => {
    // window 미스텁 상태 = node 환경에서 typeof window === 'undefined'
    expect(hasAnalyticsConsent()).toBe(false);
  });
});

describe("getPlatform (앱/웹 구분)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("스토어 앱(Capacitor 웹뷰)이면 네이티브 플랫폼명", () => {
    vi.stubGlobal("window", {
      Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
    });
    expect(getPlatform()).toBe("android");
  });

  it("Capacitor 는 있으나 네이티브가 아니면 web (웹에서 연 경우)", () => {
    vi.stubGlobal("window", { Capacitor: { isNativePlatform: () => false } });
    expect(getPlatform()).toBe("web");
  });

  it("일반 브라우저면 web", () => {
    vi.stubGlobal("window", {});
    expect(getPlatform()).toBe("web");
  });

  it("Capacitor 가 예외를 던져도 web (추적이 화면을 깨뜨리면 안 됨)", () => {
    vi.stubGlobal("window", {
      Capacitor: { isNativePlatform: () => { throw new Error("boom"); } },
    });
    expect(getPlatform()).toBe("web");
  });

  it("SSR 이면 server", () => {
    expect(getPlatform()).toBe("server");
  });
});

describe("event (공통 파라미터 자동 첨부)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubGtag() {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag, Capacitor: undefined });
    vi.stubGlobal("document", { documentElement: { getAttribute: () => "ru" } });
    return gtag;
  }

  it("platform·lang 이 자동으로 붙는다", () => {
    const gtag = stubGtag();
    event(GA_EVENTS.INQUIRY_SUBMITTED, { cancer_type: "lung" });
    expect(gtag).toHaveBeenCalledWith("event", "inquiry_submitted", {
      platform: "web",
      lang: "ru",
      cancer_type: "lung",
    });
  });

  it("호출부가 넘긴 값이 공통값을 이긴다", () => {
    const gtag = stubGtag();
    event(GA_EVENTS.VIEW_HOSPITAL, { lang: "kz" });
    expect(gtag).toHaveBeenCalledWith("event", "view_hospital", {
      platform: "web",
      lang: "kz",
    });
  });

  it("gtag 이 없으면(동의 전·차단) 조용히 아무것도 안 한다", () => {
    vi.stubGlobal("window", {});
    expect(() => event(GA_EVENTS.INQUIRY_SUBMITTED)).not.toThrow();
  });
});

describe("setAnalyticsUser (직원 제외 + 기기 간 연결)", () => {
  afterEach(() => {
    setAnalyticsUser(null); // 모듈 전역 internalUser 를 케이스마다 초기화
    vi.unstubAllGlobals();
  });

  function stub() {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag });
    vi.stubGlobal("document", { documentElement: { getAttribute: () => "ko" } });
    return gtag;
  }
  const staff = (role: string) => ({ user: { id: "u-1", app_metadata: { role } } });

  it("일반 사용자는 계정 id 로 기기 간 연결", () => {
    const gtag = stub();
    setAnalyticsUser({ user: { id: "abc-uuid", app_metadata: {} } });
    expect(gtag).toHaveBeenCalledWith("set", { user_id: "abc-uuid" });
  });

  it("직원(코디)이면 그 뒤 이벤트가 아예 안 나간다", () => {
    const gtag = stub();
    setAnalyticsUser(staff("coordinator"));
    gtag.mockClear();
    event(GA_EVENTS.INQUIRY_SUBMITTED);
    pageview("/hospitals");
    expect(gtag).not.toHaveBeenCalled();
  });

  it("직원 역할 전체(운영자·병원·에이전시 등)를 막는다", () => {
    for (const role of ["admin", "coordinator", "hospital", "agency", "clinic", "doctor"]) {
      const gtag = stub();
      setAnalyticsUser(staff(role));
      gtag.mockClear();
      event(GA_EVENTS.INQUIRY_SUBMITTED);
      expect(gtag, `role=${role} 이 안 막힘`).not.toHaveBeenCalled();
      setAnalyticsUser(null);
    }
  });

  it("직원이 로그아웃하면 다시 집계된다 (막힌 채로 굳지 않음)", () => {
    const gtag = stub();
    setAnalyticsUser(staff("admin"));
    setAnalyticsUser(null);
    gtag.mockClear();
    event(GA_EVENTS.INQUIRY_SUBMITTED);
    expect(gtag).toHaveBeenCalled();
  });

  it("역할은 app_metadata 만 본다 (user_metadata 는 위조 가능 — 그걸로 추적을 끌 수 있으면 안 됨)", () => {
    const gtag = stub();
    setAnalyticsUser({ user: { id: "u-2", app_metadata: {}, user_metadata: { role: "admin" } } });
    gtag.mockClear();
    event(GA_EVENTS.INQUIRY_SUBMITTED);
    expect(gtag).toHaveBeenCalled();
  });
});

describe("pageview (GA4 방식)", () => {
  afterEach(() => { setAnalyticsUser(null); vi.unstubAllGlobals(); });

  it("config 재호출이 아니라 page_view 이벤트를 쏘고 page_location 을 명시한다", () => {
    const gtag = vi.fn();
    vi.stubGlobal("window", { gtag, location: { href: "https://healwith.co.kr/hospitals?x=1" } });
    vi.stubGlobal("document", { documentElement: { getAttribute: () => "ru" } });
    pageview("/hospitals");
    expect(gtag).toHaveBeenCalledWith("event", "page_view", {
      page_location: "https://healwith.co.kr/hospitals?x=1",
      page_path: "/hospitals",
      platform: "web",
      lang: "ru",
    });
    // 첫 진입 URL 이 그대로 박히는 옛 방식(config 재호출)으로 되돌아가지 않았는지
    expect(gtag).not.toHaveBeenCalledWith("config", expect.anything(), expect.anything());
  });
});

describe("GA_EVENTS 카탈로그", () => {
  it("이벤트 이름이 서로 겹치지 않는다 (겹치면 두 사건이 한 숫자로 합쳐짐)", () => {
    const names = Object.values(GA_EVENTS);
    expect(new Set(names).size).toBe(names.length);
  });

  it("GA4 이벤트 이름 규칙(소문자·숫자·밑줄, 40자 이하)을 지킨다", () => {
    for (const n of Object.values(GA_EVENTS)) {
      expect(n).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(n.length).toBeLessThanOrEqual(40);
    }
  });

  it("«시도»와 «성공»이 각각 따로 있다 (하나로 합치면 실패가 전환으로 집계됨)", () => {
    expect(GA_EVENTS.STEP1_ATTEMPTED).not.toBe(GA_EVENTS.INQUIRY_SUBMITTED);
    expect(GA_EVENTS.STEP2_ATTEMPTED).not.toBe(GA_EVENTS.INQUIRY_DETAIL_SUBMITTED);
  });
});
