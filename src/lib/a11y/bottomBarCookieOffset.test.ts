/**
 * 「바닥에 붙는 것」은 쿠키 동의 띠만큼 비켜 앉아야 한다.
 *
 * 🛑 같은 사고가 세 번 났다: ①상담방 조작바(2026-07-20, 통화 이탈) ②코디 편집기 「저장」(2026-07-28)
 *    ③환자 의뢰서 「보내기」(2026-08-19 — 자동 클릭 검사가 「띠가 클릭을 가로챈다」로 잡음).
 *    규칙은 CookieConsent.jsx 주석에만 있었고 사람이 세 번 다 놓쳤다. 그래서 기계로 옮긴다.
 *
 * 무엇을 재나: 화면에 «고정»으로 바닥에 붙는 요소(fixed + bottom-0/bottom-<n> + 가로 꽉 참)가
 * `--cookie-banner-h` 를 안 쓰면 실패. 띠 자신과 «띠보다 위에 뜨는 창»(z-[10000] 이상)은 뺀다.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = join(__dirname, "../../..");
const DIRS = ["app", "src"].map((d) => join(ROOT, d));
// 띠 자신 + 상담방(그 화면은 띠를 아예 안 띄운다 — ClientShell 의 `{!isConsultationPage && <CookieConsent />}`).
// 🛑 «귀찮아서» 여기에 이름을 추가하지 마라. 띠가 뜨는 화면이면 비켜 앉는 게 맞다.
const SKIP_FILE = /CookieConsent[.](jsx|tsx)$|[/]consultation[/]/;

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(jsx|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

// className="..." 한 덩어리 안에서 판단한다(요소 단위 근사).
const CLASS_RE = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;

describe("바닥 고정 요소와 쿠키 동의 띠", () => {
  const offenders: string[] = [];
  for (const dir of DIRS) {
    for (const f of files(dir)) {
      const rel = f.split(sep).join("/");   // 윈도우 경로도 같은 눈으로 본다
      if (SKIP_FILE.test(rel)) continue;
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(CLASS_RE)) {
        const cls = m[1] || m[2] || "";
        if (!/\bfixed\b/.test(cls)) continue;
        if (!/\bbottom-(0|\d+|\[)/.test(cls)) continue;              // 바닥에 붙는 것만
        if (/cookie-banner-h/.test(cls)) continue;                    // 이미 비켜 앉음
        if (/z-\[1[0-9]{4,}\]/.test(cls)) continue;                   // 띠보다 위에 뜨는 창(모달 등)
        if (/\bhidden\b/.test(cls) && !/md:|lg:/.test(cls)) continue; // 안 보이는 것
        offenders.push(`${f.slice(f.indexOf("app") >= 0 ? f.indexOf("app") : f.indexOf("src")).split(sep).join("/")} :: ${cls.slice(0, 70)}`);
      }
    }
  }

  it("바닥에 고정된 것은 전부 --cookie-banner-h 를 쓴다", () => {
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("이 검사가 «진짜로» 잡는다 (자체시험)", () => {
    const bad = 'fixed inset-x-0 bottom-0 z-40 bg-white';
    const ok = 'fixed inset-x-0 bottom-[var(--cookie-banner-h,0px)] z-40 bg-white';
    const hit = (c: string) => /\bfixed\b/.test(c) && /\bbottom-(0|\d+|\[)/.test(c) && !/cookie-banner-h/.test(c);
    expect([hit(bad), hit(ok)]).toEqual([true, false]);
  });

  it("실제로 화면 파일을 훑고 있다", () => {
    expect(DIRS.flatMap((d) => files(d)).length).toBeGreaterThan(100);
  });
});
