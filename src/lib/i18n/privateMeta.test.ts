import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 비공개 화면(/patient·/claim·/survey·/no-access)의 탭 제목 언어화를 잠근다.
 *
 * 왜 필요한가 (2026-08-31 실측): 이 화면들은 `export const metadata = { title: "내 진료 관리" }`
 * 처럼 «정적 문자열»이라 언어 폴백을 전혀 안 탔다 → 본문은 러시아어인데 브라우저 탭 제목만
 * 한국어. /claim·/survey 는 코디가 메신저로 보내는 토큰 링크라 미리보기 카드까지 한국어였다.
 *
 * 이 시험이 막는 «되돌리기» 두 가지 — 둘 다 조용히 터진다(빌드·타입·화면 200 전부 통과):
 *  ① getUiLocale() 을 getRequestLocale() 로 되돌리는 것.
 *     /patient·/no-access 는 proxy.ts 의 PUBLIC_PREFIXES 밖이라 x-locale 이 «안 붙는다».
 *     그래서 x-locale 만 보면 항상 en 으로 떨어져 아무것도 안 고쳐진 상태로 되돌아간다.
 *  ② 반대로 localeAlternates() 에까지 쿠키 폴백을 흘리는 것.
 *     그러면 x-locale 이 없는 비공개 경로 86개가 canonical+hreflang 을 새로 얻는다.
 *     게다가 그 경로엔 x-pathname 도 안 붙어 canonical 이 «그 언어 홈»으로 잘못 찍힌다
 *     — noindex 와 canonical 동시 선언은 구글이 명시적으로 피하라는 조합이다.
 */

const state = { header: null as string | null, cookie: undefined as string | undefined };

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (k: string) => (k === "x-locale" ? state.header : null) }),
  cookies: async () => ({
    get: (k: string) => (k === "healo_lang" && state.cookie ? { value: state.cookie } : undefined),
  }),
}));

const { getUiLocale, localizedMeta, localeAlternates } = await import("./metadata");

beforeEach(() => {
  state.header = null;
  state.cookie = undefined;
});

describe("getUiLocale — 탭 제목 언어 (x-locale → healo_lang 쿠키 → en)", () => {
  it("x-locale 이 있으면 그걸 쓴다 (/claim·/survey 같은 게스트 링크)", async () => {
    state.header = "ru";
    state.cookie = "kz";
    expect(await getUiLocale()).toBe("ru");
  });

  it("x-locale 이 없으면 쿠키로 잇는다 — 이게 /patient·/no-access 를 고치는 한 줄이다", async () => {
    state.cookie = "ru";
    expect(await getUiLocale()).toBe("ru");
  });

  it("둘 다 없으면 en", async () => {
    expect(await getUiLocale()).toBe("en");
  });

  it("활성 6개 밖의 옛 쿠키(vi 등)는 en 으로 떨어뜨린다 — 본문(6개어)과 갈리면 안 된다", async () => {
    state.cookie = "vi";
    expect(await getUiLocale()).toBe("en");
  });
});

describe("localizedMeta — 비공개 화면", () => {
  it("x-locale 없이 쿠키만 있어도 제목이 그 언어로 나온다 (/patient 의 실제 조건)", async () => {
    state.cookie = "ru";
    const meta = await localizedMeta(
      { robots: { index: false, follow: false }, alternates: null },
      "seo.patientDash.title",
      "seo.patientDash.desc"
    );
    expect(meta.title).toEqual({ absolute: "Личный кабинет пациента | healwith" });
    expect(meta.description).toMatch(/[Ѐ-ӿ]/);
  });

  it("alternates: null 이 살아남는다 — noindex 화면이 layout 의 canonical/hreflang 을 안 물려받게", async () => {
    state.header = "ru"; // /claim·/survey 조건: x-locale 은 있다
    const meta = await localizedMeta(
      { robots: { index: false, follow: false }, alternates: null },
      "seo.claim.title",
      "seo.claim.desc"
    );
    expect(meta.alternates).toBeNull();
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("제목에 브랜드가 두 번 붙지 않는다 (옛 '진행 상황 — healwith' + template 중복 버그)", async () => {
    state.header = "ko";
    const meta = await localizedMeta({ alternates: null }, "seo.claim.title", "seo.claim.desc");
    const title = (meta.title as { absolute: string }).absolute;
    expect(title.match(/healwith/g)).toHaveLength(1);
  });
});

describe("localeAlternates — 손대면 안 되는 쪽 (SEO 오염 차단문)", () => {
  it("x-locale 이 없으면 null 이다 — 쿠키가 여기까지 새면 비공개 경로 86개가 canonical 을 얻는다", async () => {
    state.cookie = "ru"; // 쿠키는 있지만 x-locale 이 없다
    expect(await localeAlternates()).toBeNull();
  });

  it("x-locale 이 있으면 그 언어 canonical + hreflang 6개 + x-default (공개 화면은 그대로)", async () => {
    state.header = "ru";
    const alt = await localeAlternates();
    expect(alt?.canonical).toMatch(/\/ru$/);
    expect(Object.keys(alt!.languages)).toHaveLength(7); // 6개 언어 + x-default
  });
});

describe("localizedMeta — 메신저 미리보기(og/twitter) 상속 (2026-08-31 회귀 수리)", () => {
  beforeEach(() => {
    state.header = null;
    state.cookie = "ru";
  });

  // 왜 이 시험이 있나: base 에 openGraph 가 없을 때 `openGraph: undefined` 를 «키로» 내보내면
  // Next 의 병합(for...in)이 값이 undefined 여도 키를 잡아 resolveOpenGraph(undefined) → null 로
  // 루트 layout 의 og:*·twitter:* 를 통째로 지운다. 실측(2026-08-31): 그 상태의 /claim 은
  // og 0개·twitter 0개였고, 안 고친 /login 은 상속돼 살아 있었다.
  // ⛔ 카카오톡은 og 전용이라 미리보기 카드가 «아예» 안 뜬다 — 코디가 메신저로 보내는 링크가
  //    바로 /claim·/survey 라, 이 회귀는 이 기능의 존재 이유를 깎는다.
  it("base 에 openGraph 가 없으면 키 자체를 안 만든다 (layout 상속 유지)", async () => {
    const meta = await localizedMeta(
      { robots: { index: false, follow: false }, alternates: null },
      "seo.noAccess.title",
      "seo.noAccess.desc"
    );
    expect("openGraph" in meta).toBe(false);
    expect("twitter" in meta).toBe(false);
  });

  it("base 에 openGraph 가 있으면 언어화해서 채운다 (공개 화면 동작 유지)", async () => {
    const meta = await localizedMeta(
      { openGraph: { type: "website" }, twitter: { card: "summary_large_image" } },
      "seo.noAccess.title",
      "seo.noAccess.desc"
    );
    expect(meta.openGraph.type).toBe("website");
    expect(meta.openGraph.title).toMatch(/[А-Яа-я]/);
    expect(meta.twitter.card).toBe("summary_large_image");
    expect(meta.twitter.title).toMatch(/[А-Яа-я]/);
  });
});
