import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * 「쿠키가 «없는» 첫 방문자도 제 언어를 받는가」를 잠근다.
 *
 * 왜 필요한가 (2026-08-31 실측으로 밟은 반쪽):
 *   `/patient/*` 는 전부 로그인 뒤라 코디가 보낸 딥링크를 누른 환자는 307 로 `/login` 에 도착한다.
 *   그런데 `/login` 은 proxy.ts 의 PUBLIC_PREFIXES 에도 GUEST_LINK_PREFIXES 에도 없어서 x-locale 이
 *   안 붙었고, `getUiLocale` 의 폴백은 «쿠키뿐»이라 **쿠키 없는 첫 방문자는 통째로 영어**를 받았다.
 *   Accept-Language 가 ru 든 kk 든 `<html lang="en">` · `<title>Sign in | healwith</title>`.
 *   즉 「두 번째 방문부터만 러시아어」였는데, **초대 링크로 처음 오는 환자가 정확히 그 반대**다.
 *   같은 날 화면 29곳의 제목을 다 언어화해 놓고도 이 여정 하나가 비어 있었다.
 *
 * ⚠️ 왜 «미들웨어»에서 고쳐야 하고 getUiLocale 에 Accept-Language 를 넣으면 안 되나:
 *   서버 컴포넌트는 쿠키를 심을 수 없다. 서버만 Accept-Language 로 ru 를 그리면 클라이언트는
 *   쿠키가 없어 en 으로 갈려 **hydration mismatch**(POSTMORTEMS #77)가 그대로 되살아난다.
 *   그래서 쿠키를 심을 수 있는 유일한 자리인 proxy.ts 에서 고쳤고, 이 시험은 그 자리를 지킨다.
 *
 * 이 시험은 «소스의 모양»을 본다. 미들웨어는 단위시험에서 실행하기 어렵고(NextRequest·쿠키 API),
 * 진짜 동작은 실서버 실측으로 확인했다. 여기서 막는 것은 **다음 사람이 목록에서 빼거나
 * 쿠키 심는 줄을 지우는 것** — 실제로 이번에 그 두 가지 때문에 구멍이 났다.
 */

const PROXY = fs.readFileSync(path.resolve(process.cwd(), "proxy.ts"), "utf8");

// 로그인 벽 — 인증 검사를 원래 안 타면서 방문자가 «처음» 도착할 수 있는 화면들.
const MUST_GET_VISITOR_LOCALE = [
  "/login",
  "/signup",
  "/find-id",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
  "/account/password",
  "/no-access",
  "/app",
];

// 코디가 계정 없는 사람에게 보내는 토큰 링크.
const GUEST_LINKS = ["/consultation/", "/survey/", "/claim/", "/opinion/"];

function listOf(name: string): string[] {
  const m = PROXY.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

describe("쿠키 없는 첫 방문자도 제 언어를 받는다", () => {
  it("로그인 벽 화면이 하나도 빠짐없이 VISITOR_LANG_PREFIXES 에 있다", () => {
    const listed = listOf("VISITOR_LANG_PREFIXES");
    const missing = MUST_GET_VISITOR_LOCALE.filter((p) => !listed.includes(p));
    expect(
      missing,
      `\n목록에서 빠진 화면:\n${missing.join("\n")}\n` +
        `→ 여기서 빠지면 그 화면은 «쿠키 없는 첫 방문자»에게 영어로 열린다.\n` +
        `   코디 링크를 처음 누르는 환자가 정확히 그 경우다.\n`
    ).toEqual([]);
  });

  it("코디가 보내는 토큰 링크 4종이 하나도 빠짐없이 GUEST_LINK_PREFIXES 에 있다", () => {
    const listed = listOf("GUEST_LINK_PREFIXES");
    const missing = GUEST_LINKS.filter((p) => !listed.includes(p));
    expect(
      missing,
      `\n목록에서 빠진 링크:\n${missing.join("\n")}\n` +
        `→ 2026-08-31 에 "/opinion/" 이 여기서 빠져 있어 <html lang> 이 항상 en 이었다.\n`
    ).toEqual([]);
  });

  it("x-locale 을 주입하는 분기는 healo_lang 쿠키도 «같이» 심는다 (POSTMORTEMS #77 불변식)", () => {
    // x-locale 을 set 하는 분기 수 == LOCALE_COOKIE 를 심는 분기 수 여야 한다.
    const injects = (PROXY.match(/headers\.set\("x-locale"/g) || []).length;
    const plants = (PROXY.match(/res\.cookies\.set\(LOCALE_COOKIE/g) || []).length;
    expect(
      plants,
      `\nx-locale 을 심는 자리 ${injects}곳 / healo_lang 쿠키를 심는 자리 ${plants}곳.\n` +
        `→ 서버는 그 언어로 그리는데 클라이언트는 쿠키가 없어 en 으로 갈리면 hydration mismatch 다.\n` +
        `   x-locale 을 넣는 분기를 새로 만들면 쿠키 심는 줄도 «같이» 넣어라.\n`
    ).toBeGreaterThanOrEqual(injects);
  });

  it("OAuth 콜백은 이 분기가 삼키지 않는다 (/auth/confirm 만, /auth/callback 은 아님)", () => {
    const listed = listOf("VISITOR_LANG_PREFIXES");
    expect(listed).not.toContain("/auth");
    expect(listed).not.toContain("/auth/callback");
    expect(listed).toContain("/auth/confirm");
  });

  it("인증 검사를 타야 하는 경로가 이 목록에 섞여 들어오지 않았다", () => {
    // 이 분기는 next() 로 «즉시 반환»하므로, 아래 인증 분기에 걸리는 경로를 넣으면 검사가 사라진다.
    const guarded = ["/admin", "/patient", "/hospital", "/agency", "/clinic", "/coordinator"];
    const listed = listOf("VISITOR_LANG_PREFIXES");
    const leaked = listed.filter((p) => guarded.some((g) => p === g || p.startsWith(g + "/")));
    expect(
      leaked,
      `\n인증이 필요한데 목록에 들어온 경로:\n${leaked.join("\n")}\n` +
        `→ 이 분기는 next() 로 즉시 돌려주므로 아래 인증 분기를 «건너뛴다». 넣지 마라.\n`
    ).toEqual([]);
  });
});
