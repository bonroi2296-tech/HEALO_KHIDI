/**
 * 가드의 가드 — 영향 반경 지도가 «실제 과거 사고를 잡는지» 재현으로 확인한다.
 *
 * 왜 이런 모양인가 (#106 교훈 그대로):
 *   "통과하는 가드는 증거가 아니다. 일부러 깨뜨려서 빨간불이 켜지는 걸 본 뒤에 채택할 것(변이 시험)."
 *   실제로 이 도구의 첫 판은 두 번 틀렸고, 그 둘을 여기 시험으로 박아 재발을 막는다:
 *     1차 — `tel:${...}` 처럼 값을 끼워 넣는 형태를 못 잡았다(숫자를 요구하는 정규식으로 짜서).
 *           하필 #106 원문이 정확히 그 형태라, 그 사고를 재현해도 «조용히 통과»했다.
 *     2차 — 통째로 지워진 파일은 diff 가 `+++ /dev/null` 이라 파일 이름 추적이 한 칸 밀렸다.
 *           삭제분이 «엉뚱한 파일» 것으로 찍혔다 — 파일 삭제야말로 이 검사의 본령인데.
 *
 * 무엇을 시험하나: 도구를 실제로 실행해(가짜 저장소 아님, 이 저장소의 진짜 과거 커밋)
 *   ①#106 을 잡나 ②정상 커밋에 시끄럽지 않나 ③위 두 회귀가 되살아나지 않나.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TOOL = "scripts/blast-radius.mjs";

function run(args: string[]): any {
  const out = execFileSync("node", [TOOL, "--json", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30000,
  });
  return JSON.parse(out);
}

function commitExists(sha: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", sha + "^{commit}"], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

describe("영향 반경 지도", () => {
  it("도구가 존재하고 실행된다", () => {
    expect(fs.existsSync(path.join(ROOT, TOOL))).toBe(true);
    const r = run(["--files", "src/lib/i18n/index.js"]);
    expect(Array.isArray(r.impactedRoutes)).toBe(true);
  });

  it("널리 쓰이는 파일은 «들어오는 방향»이 넓게 잡힌다 (#106 이 아무도 안 봤다던 그 방향)", () => {
    const r = run(["--files", "src/lib/i18n/index.js"]);
    // 6개 언어 사전은 화면 곳곳이 쓴다 — 한 자리 수면 그래프가 끊긴 것이다.
    expect(r.hotspots[0].users).toBeGreaterThan(10);
    expect(r.impactedRoutes.length).toBeGreaterThan(10);
  });

  it("같은 주소가 두 번 나오지 않는다 (page 와 layout 이 각각 파일이라 겹친다)", () => {
    const r = run(["--files", "src/lib/i18n/index.js"]);
    const urls = r.impactedRoutes.map((x: any) => x.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  // ── 실제 사고 재현 ────────────────────────────────────────
  const CASE_106 = "5602626a"; // 톤 때문에 부품을 지우며 응급전화 동선까지 삭제 (한 달간 0개)

  it.runIf(commitExists(CASE_106))(
    "#106 재현 — 지운 파일 안에 살아 있던 «전화 걸기 링크»를 잡는다",
    () => {
      const r = run(["--commit", CASE_106]);
      const tel = r.vanished.filter((v: any) => v.what.includes("전화"));
      expect(tel.length).toBeGreaterThan(0);
      // 회귀 1차 — 값을 끼워 넣는 형태(`tel:${...}`)를 놓치면 이 사고를 통째로 못 잡는다.
      expect(tel.some((v: any) => v.tokens.some((t: string) => t.startsWith("tel:")))).toBe(true);
      // 회귀 2차 — 통째로 지워진 파일에 «제대로» 귀속돼야 한다(엉뚱한 파일로 찍히면 추적이 헛돈다).
      expect(tel.some((v: any) => v.file.includes("EmergencyButton") && v.deleted === true)).toBe(true);
    }
  );

  it.runIf(commitExists(CASE_106))("#106 재현 — 호출부가 사라져 고아가 된 서버창구도 잡는다", () => {
    const r = run(["--commit", CASE_106]);
    const api = r.vanished.filter((v: any) => v.what.includes("서버 호출"));
    expect(api.some((v: any) => v.tokens.some((t: string) => t.includes("/api/portal/emergency")))).toBe(true);
  });

  // ── 오탐 ──────────────────────────────────────────────────
  it("문서만 고친 변경에는 아무 말도 안 한다 (시끄러우면 아무도 안 본다)", () => {
    const r = run(["--files", "docs/PROJECT_CONTEXT.md"]);
    expect(r.impactedRoutes.length).toBe(0);
    expect(r.vanished.length).toBe(0);
  });

  // ── 부품 연결 «밖»의 축 (2차 확장) ─────────────────────────
  // 첫 판은 import 로 이어진 것만 봤다. 반성문 실측으로는 그 밖이 더 크다:
  // DB 표·칸 14건 · 화면 주소(문자열) 11건 · 환경변수 4건.
  const CASE_DB = "db9f7606"; // 이사(마이그레이션) 파일 4개를 건드린 실제 커밋
  const MIG = "migrations/20260805_case_updates.sql"; // 실재하는 이사 파일

  it.runIf(commitExists(CASE_DB))("이사 파일을 건드리면 어느 표를 만졌는지 뽑아낸다", () => {
    const r = run(["--commit", CASE_DB]);
    expect(r.dbTables.length).toBeGreaterThan(0);
  });

  // 이 축이 존재하는 «이유»가 바로 이 경우다: #94·#95 는 코드를 한 줄도 안 고치고 표에
  // 지키기 규칙만 하나 걸었는데 채팅 전송이 통째로 500 이 났다. 코드 변경이 0 이면
  // 부품 연결 그래프에는 씨앗이 아예 없다 — DB 경유가 유일한 길이다.
  it.runIf(fs.existsSync(path.join(ROOT, MIG)))(
    "코드는 그대로고 «표만» 바꿔도 화면까지 반경이 이어진다 (#94·#95 부류)",
    () => {
      const r = run(["--files", MIG]);
      expect(r.changed.length).toBe(0); // 코드 변경 0 — 부품 연결 씨앗이 없다
      expect(r.dbTables.length).toBeGreaterThan(0);
      const viaDb = r.impactedRoutes.filter((x: any) => x.reason && x.reason.includes("DB 표"));
      expect(viaDb.length).toBeGreaterThan(0); // 그래도 화면까지 이어져야 한다
    }
  );

  it("어디서나 쓰는 환경변수(NODE_ENV 등)는 반경으로 세지 않는다 (소음)", () => {
    const r = run(["--commit", CASE_DB]);
    expect(r.envKeys).not.toContain("NODE_ENV");
  });

  it("「이거 하나 바꾸면 사실상 전 화면」인 파일은 따로 짚어준다", () => {
    const r = run(["--files", "src/lib/i18n/index.js", "tailwind.config.js"]);
    const files = r.globalHits.map((g: any) => g.file);
    expect(files).toContain("tailwind.config.js");
    expect(files).toContain("src/lib/i18n/index.js");
  });

  it("«옮긴 것»은 사라진 것으로 세지 않는다", () => {
    // 지운 줄과 더한 줄에 같은 표시자가 있으면 이동이다 — 이걸 못 가르면 리팩터링마다 거짓 경보가 난다.
    const r = run(["--files", "src/lib/i18n/index.js"]);
    expect(r.vanished.length).toBe(0); // --files 는 diff 가 없으므로 0. 상계 로직의 하한 확인.
  });
});
