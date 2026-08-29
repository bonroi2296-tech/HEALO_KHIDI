#!/usr/bin/env node
/**
 * verify-screens — 「내가 하나하나 안 눌러봐도 잘 만들었는지 알 수 있게」 (PO 지시 2026-08-25)
 *
 * 왜: 화면이 제대로 도는지 확인하려면 지금까진 PO 가 직접 눌러보거나, 내가 매번 일회용 스크립트를
 *     짜서 결과를 «말로» 옮겨야 했다. 말로 옮기면 (a) 내가 뭘 안 쟀는지 PO 가 알 수 없고
 *     (b) 다음에 같은 걸 다시 재려면 처음부터 짜야 한다.
 *     → 실제 계정으로 로그인해 실제 화면을 눌러보고, **사진과 함께 한 장짜리 확인표**를 만든다.
 *
 * 무엇을 재나: 이번에 손댄 것 + 다섯 포털이 열리는지. 각 줄은 「무엇을 확인했나 / 통과 / 근거」.
 *   ⚠️ 재는 항목을 늘릴 땐 CHECKS 배열에만 추가한다. 「눈으로 봤다」는 여기 들어올 수 없다 —
 *      기계가 확인할 수 있는 것만 적는다(그게 이 파일의 존재 이유다).
 *
 * 쓰는 법:
 *   npm run dev            # (다른 창에서) 개발 서버를 3310 포트로 띄운다
 *   npm run verify:screens # 확인표 생성 → verify-report/report.html + 사진들
 *   npm run verify:screens -- --base http://localhost:3000   # 다른 포트면
 *
 * 필요: .env.local 의 Supabase 열쇠(내부·시험 계정 로그인에 씀 — scripts/dev-login-as.mjs 와 같은 방식).
 * 결과물은 저장소에 안 올라간다(verify-report/ 는 .gitignore).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const argBase = process.argv.indexOf("--base");
const BASE = argBase !== -1 ? process.argv[argBase + 1] : "http://localhost:3310";
// --only "글자" 로 그 글자가 든 항목만 돌린다(한 항목만 다시 재볼 때. 확인표는 그때도 덮어쓴다).
const argOnly = process.argv.indexOf("--only");
const ONLY = argOnly !== -1 ? process.argv[argOnly + 1] : null;
const OUT = "verify-report";
const SHOTS = path.join(OUT, "shots");

// ── 시험 계정 로그인(비밀번호를 쓰지 않는 방식 — dev-login-as.mjs 와 동일) ──
const sessions = new Map();
function login(email) {
  if (!sessions.has(email)) {
    sessions.set(email, JSON.parse(execSync(`node scripts/dev-login-as.mjs ${email}`, { encoding: "utf8" }).trim()));
  }
  return sessions.get(email);
}

/**
 * 확인 항목. run(page, ctx) 은 { ok, note } 를 돌려준다.
 * shot 이 있으면 그 이름으로 화면 사진을 남긴다.
 */
const CHECKS = [
  {
    group: "어드민이 못 보던 것",
    title: "어드민이 「문의 · 케이스 받은함」을 눌러 코디 받은함으로 간다",
    why: "예전 어드민 문의 화면은 상태 변경과 번역만 됐다",
    as: "admin@test.com",
    url: "/admin",
    shot: "admin-home",
    ready: 'aside a[href="/coordinator/inbox"]',
    async run(p) {
      const link = p.getByRole("link", { name: "문의 · 케이스 받은함", exact: true }).first();
      if (!(await link.count())) return { ok: false, note: "메뉴에 그 항목이 없다" };
      await link.click();
      await p.waitForURL("**/coordinator/inbox", { timeout: 30_000 }).catch(() => {});
      await p.waitForTimeout(6000);
      const path_ = new URL(p.url()).pathname;
      return { ok: path_ === "/coordinator/inbox", note: `이동한 주소 ${path_}` };
    },
  },
  {
    group: "어드민이 못 보던 것",
    title: "어드민이 케이스 «상세»까지 들어가 의뢰서·소견을 본다",
    why: "환자 한 명을 통으로 보는 화면",
    as: "admin@test.com",
    url: "/coordinator/inbox",
    shot: "admin-case-detail",
    ready: "tbody tr",
    async run(p) {
      const row = p.locator("tbody tr").first();
      if (!(await row.count())) return { ok: false, note: "받은함에 케이스가 없다" };
      await row.click();
      await p.waitForURL("**/coordinator/inbox/*", { timeout: 30_000 }).catch(() => {});
      await p.waitForTimeout(14_000);
      const t = await p.locator("body").innerText();
      const found = ["의뢰서", "소견", "케이스"].filter((s) => t.includes(s));
      return { ok: found.length >= 2, note: `보이는 칸: ${found.join(" · ") || "없음"}` };
    },
  },
  {
    group: "어드민이 못 보던 것",
    title: "어드민으로 코디 화면을 보면 이름표가 「관리자 · 코디 화면」",
    why: "예전엔 「코디네이터」만 떠서 계정이 바뀐 줄 알았다",
    as: "admin@test.com",
    url: "/coordinator/inbox/94",
    shot: "admin-label",
    ready: /관리자 · 코디 화면|코디네이터/,
    async run(p) {
      const t = await p.locator("body").innerText();
      const back = await p.getByRole("link", { name: "어드민 화면으로" }).count();
      return {
        ok: t.includes("관리자 · 코디 화면") && back > 0,
        note: `이름표 ${t.includes("관리자 · 코디 화면") ? "OK" : "안 바뀜"} · 돌아가는 길 ${back ? "있음" : "없음"}`,
      };
    },
  },
  {
    group: "상대에게 줄 링크",
    title: "케이스 화면에서 「링크 복사 / 왓츠앱으로 보내기」가 보인다",
    why: "왓츠앱·메일로 받은 건도 상대에게 줄 주소가 필요하다",
    as: "coordinator@test.com",
    url: "/coordinator/inbox/94",
    shot: "share-buttons",
    ready: /링크 복사/,
    async run(p) {
      const copy = await p.getByRole("button", { name: "링크 복사" }).count();
      const wa = p.getByRole("link", { name: "왓츠앱으로 보내기" }).first();
      const waN = await wa.count();
      const href = waN ? await wa.getAttribute("href") : "";
      const msg = decodeURIComponent((href || "").split("text=")[1] || "");
      return {
        ok: copy > 0 && waN > 0 && /\/claim\/[A-Za-z0-9-]+/.test(msg),
        note: `왓츠앱 문구: ${msg.slice(0, 60) || "없음"}…`,
      };
    },
  },
  {
    group: "상대에게 줄 링크",
    title: "그 링크를 «로그인 없이» 열면 환자가 진행상황을 본다",
    why: "가입을 시키면 왓츠앱으로 온 사람은 못 본다",
    as: "coordinator@test.com",
    url: "/coordinator/inbox/94",
    shot: "claim-anon",
    ready: /링크 복사/,
    shotFromExtra: true, // 사진은 아래에서 연 «익명 창» 쪽을 찍는다
    async run(p, { browser, shotPath }) {
      const wa = p.getByRole("link", { name: "왓츠앱으로 보내기" }).first();
      if (!(await wa.count())) return { ok: false, note: "링크 버튼을 못 찾음" };
      const href = await wa.getAttribute("href");
      const url = decodeURIComponent((href || "").split("text=")[1] || "").match(/https?:\/\/\S+/)?.[0];
      if (!url) return { ok: false, note: "문구에서 주소를 못 꺼냄" };
      const anon = await browser.newContext({ viewport: { width: 1100, height: 900 }, locale: "ko-KR" });
      const ap = await anon.newPage();
      const r = await ap.goto(url, { waitUntil: "networkidle" }).catch(() => null);
      await ap.waitForTimeout(8000);
      const t = await ap.locator("body").innerText();
      if (shotPath) { await settleForShot(ap); await ap.screenshot({ path: shotPath }); }
      await anon.close();
      // 「로그인」 화면으로 튕기지 않고 본문이 그려졌나
      const ok = r?.status() === 200 && t.length > 150 && !/로그인이 필요|Sign in to/.test(t);
      return { ok, note: `${r?.status()} · ${t.replace(/\s+/g, " ").slice(0, 60)}…` };
    },
  },
  {
    group: "새로 만든 화면",
    title: "환자 교육자료를 6개 언어로 고칠 수 있다",
    why: "환자 화면에 나가는데 고칠 화면이 어디에도 없었다",
    as: "admin@test.com",
    url: "/admin/education",
    shot: "education",
    ready: "section button",
    async run(p) {
      const rows = await p.locator("section button").count();
      const first = p.locator("section button").first();
      if (!(await first.count())) return { ok: false, note: "자료가 하나도 안 보인다" };
      await first.click();
      await p.waitForTimeout(1200);
      const editorOpen = await p.getByText("자료 수정").isVisible().catch(() => false);
      const ko = await p.locator("input").first().inputValue().catch(() => "");
      await p.getByRole("button", { name: "Русский" }).click().catch(() => {});
      // 탭을 누른 «직후»에 읽으면 한국어 값이 그대로 잡힌다(빈칸으로도 보인다). 값이 실제로
      // 바뀔 때까지 기다린다 — 눈대중 0.6초로 두었더니 결과가 흔들렸다(2026-08-25).
      let ru = "";
      for (let i = 0; i < 15; i++) {
        ru = await p.locator("input").first().inputValue().catch(() => "");
        if (ru && ru !== ko) break;
        await p.waitForTimeout(500);
      }
      return { ok: editorOpen && /[А-Яа-я]/.test(ru), note: `자료 ${rows}건 · 러시아어 제목 「${ru.slice(0, 26)}」` };
    },
  },
  {
    group: "잘못 숨겨져 있던 것",
    title: "매일 도는 AI 자동개선 화면이 메뉴에 있고 기록이 보인다",
    why: "어제도 돌았는데 화면이 보관함에 들어가 있었다",
    as: "admin@test.com",
    url: "/admin/automation/playbook",
    shot: "automation",
    ready: /daily_eval|ab_finalize|auto_improve/,
    async run(p) {
      const t = await p.locator("body").innerText();
      return { ok: /daily_eval|ab_finalize|auto_improve/.test(t), note: t.replace(/\s+/g, " ").slice(0, 60) + "…" };
    },
  },
  {
    group: "계층끼리 말 맞추기",
    title: "병원 진료의뢰 「상태」를 어드민과 병원이 같은 말로 부른다",
    why: "예전엔 발송됨/전송됨, 거부됨/거절로 갈렸다",
    as: "admin@test.com",
    url: "/admin/leads",
    shot: "leads-admin",
    ready: /발송됨|조회됨|응답함|치료 확정|거절됨|만료됨/,
    async run(p, { browser }) {
      const at = await p.locator("body").innerText();
      const adminLabels = [...new Set(at.match(/발송됨|조회됨|응답함|치료 확정|거절됨|만료됨/g) || [])];
      const s = login("hospital@test.com");
      const hc = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: "ko-KR" });
      await hc.addCookies(cookiesFor(s));
      const hp = await hc.newPage();
      await hp.goto(BASE + "/hospital/leads", { waitUntil: "networkidle" });
      await hp.waitForTimeout(9000);
      const ht = await hp.locator("body").innerText();
      await hc.close();
      const old = ["전송됨", "거부됨"].filter((w) => ht.includes(w));
      const shared = adminLabels.filter((w) => ht.includes(w));
      return {
        ok: old.length === 0 && shared.length > 0,
        note: `양쪽이 같이 쓰는 말: ${shared.join("·") || "없음"}${old.length ? ` / ⚠️옛말 발견: ${old.join("·")}` : ""}`,
      };
    },
  },
  {
    group: "계층끼리 말 맞추기",
    title: "코디 화면 색이 브랜드 색(teal)이다",
    why: "다섯 포털 중 코디만 파랑이었다 — 디자인 규정 위반",
    as: "coordinator@test.com",
    url: "/coordinator",
    shot: "coordinator",
    ready: 'aside a[href="/coordinator"]',
    async run(p) {
      const c = await p.evaluate(() => {
        const a = [...document.querySelectorAll("aside a")].find((x) => x.getAttribute("href") === "/coordinator");
        if (!a) return null;
        const s = getComputedStyle(a);
        return { bg: s.backgroundColor, color: s.color };
      });
      const ok = c?.bg === "rgb(240, 253, 250)" && c?.color === "rgb(15, 118, 110)";
      return { ok, note: `배경 ${c?.bg} · 글자 ${c?.color}` };
    },
  },
  {
    group: "다섯 포털이 다 열리나",
    title: "해외 에이전시 포털",
    as: "agency@test.com", url: "/agency", shot: "agency", ready: /환자|진행|의뢰/,
    async run(p) { return portalOk(p, /환자|진행|의뢰/); },
  },
  {
    group: "다섯 포털이 다 열리나",
    title: "해외 의료기관 포털",
    as: "clinic@test.com", url: "/clinic", shot: "clinic", ready: /환자|진행|의뢰/,
    async run(p) { return portalOk(p, /환자|진행|의뢰/); },
  },
  {
    group: "다섯 포털이 다 열리나",
    title: "국내 병원 포털",
    as: "hospital@test.com", url: "/hospital", shot: "hospital", ready: /안녕하세요/,
    async run(p) { return portalOk(p, /안녕하세요/); },
  },
  {
    group: "다섯 포털이 다 열리나",
    title: "환자 화면",
    as: "patient@test.com", url: "/patient", shot: "patient", ready: /안녕하세요|진료|문서/,
    async run(p) { return portalOk(p, /안녕하세요|진료|문서/); },
  },
  // ───────────── 환자 여정: 시연 대본 그대로 ─────────────
  // PO 지시(2026-08-25): *"환자가 본인이 접수 하면 … 접수 잘 됐는지 어케 진행되고 있는지 그리고
  //   방문전에 뭐 이것저것 하고 넘어 오면 치료 받고 뭐 자료 올리고 또 돌아가서 사후관리 하고
  //   그런게 기능적으로 보여줘야 하는거잖아"*
  // ⚠️ 여기서는 «아무것도 제출하지 않는다». 로컬도 실서비스 DB 를 쓰기 때문에 시험 삼아 넣은
  //    문의가 진짜 실적에 섞인다. 그래서 「낼 수 있는 상태인가」까지만 재고, 실제 제출은 안 한다.
  {
    group: "환자 여정 ① 접수",
    title: "환자가 스스로 문의를 넣는 칸이 열린다",
    why: "시연의 출발점 — 공개 문의 폼",
    as: null,
    url: "/inquiry",
    shot: "j1-inquiry",
    ready: /어떻게 도와드릴까요|Inquiry Form/,
    async run(p) {
      // 접수는 «두 번 고르고» 폼이 나온다 — 실제 제품 흐름 그대로 눌러본다.
      //   ① /inquiry  「어떻게 도와드릴까요?」 → AI 상담 / 사람 연결 / 문의서
      //   ② /inquiry/referral 「먼저 상담만 신청할게요(6칸·1분)」 / 「진단과 치료 방향을 빨리 알고 싶어요」
      //   ③ 그제서야 입력칸이 나온다
      // ⚠️ 제출은 하지 않는다 — 로컬도 실서비스 DB 라 시험 문의가 진짜 실적에 섞인다.
      const steps = [];
      const entry = await p.locator("body").innerText();
      if (!/어떻게 도와드릴까요|Inquiry Form/.test(entry)) return { ok: false, note: "첫 화면이 안 그려졌다" };
      steps.push("길 고르기");

      const form1 = p.getByRole("button", { name: /Inquiry Form/ }).first();
      if (!(await form1.count())) return { ok: false, note: "「Inquiry Form」 단추가 없다" };
      await form1.click().catch(() => {});
      const ok2 = await waitReady(p, /먼저 상담만|진단과 치료 방향/, 30000);
      if (!ok2) return { ok: false, note: "문의서를 눌렀는데 다음 화면이 안 나왔다 · " + new URL(p.url()).pathname };
      steps.push("방식 고르기");

      const quick = p.getByRole("button", { name: /먼저 상담만/ }).first();
      const quickN = await quick.count();
      if (quickN) await quick.click().catch(() => {});
      let fields = 0;
      for (let i = 0; i < 30; i++) {
        fields = await p.locator("input, textarea, select").count();
        if (fields > 0) break;
        await p.waitForTimeout(700);
      }
      if (fields > 0) steps.push("입력칸 " + fields + "개");
      return {
        ok: fields > 0,
        note: steps.join(" → ") + " · 주소 " + new URL(p.url()).pathname + " (제출은 안 함)",
      };
    },
  },
  {
    group: "환자 여정 ② 접수 확인·진행상황",
    title: "환자가 «가입 없이» 자기 진행상황을 단계별로 본다",
    why: "왓츠앱·메일로 온 사람도 봐야 한다",
    as: "coordinator@test.com",
    url: "/coordinator/inbox/94",
    shot: "j2-progress",
    ready: /링크 복사/,
    shotFromExtra: true,
    async run(p, { browser, shotPath }) {
      const wa = p.getByRole("link", { name: "왓츠앱으로 보내기" }).first();
      if (!(await wa.count())) return { ok: false, note: "줄 링크를 못 찾음" };
      const href = await wa.getAttribute("href");
      const url = decodeURIComponent((href || "").split("text=")[1] || "").match(/https?:\/\/\S+/)?.[0];
      const anon = await browser.newContext({ viewport: { width: 1100, height: 950 }, locale: "ko-KR" });
      const ap = await anon.newPage();
      const r = await ap.goto(url, { waitUntil: "domcontentloaded" }).catch(() => null);
      await ap.waitForTimeout(9000);
      const t = await ap.locator("body").innerText();
      if (shotPath) { await settleForShot(ap); await ap.screenshot({ path: shotPath }); }
      await anon.close();
      // 단계 줄(접수 → 상담 → 비자 → 입국·치료 → 사후관리 → 완료)이 그려졌나
      const steps = ["접수", "상담", "비자", "치료", "사후", "완료", "Заявка", "Консульт", "визы", "лечение", "наблюдение", "Завершено"]
        .filter((w) => t.includes(w));
      return { ok: r?.status() === 200 && steps.length >= 4, note: `보이는 단계 글자 ${steps.length}개: ${steps.slice(0, 6).join(" · ")}` };
    },
  },
  {
    group: "환자 여정 ③ 방문 전 준비",
    title: "코디가 화상 상담을 잡는 칸이 있다",
    why: "방문 전 원격 상담",
    as: "coordinator@test.com",
    url: "/coordinator/consultations",
    shot: "j3-consult",
    ready: /새 상담 생성/,
    async run(p) {
      const btn = await p.getByRole("button", { name: /새 상담 생성/ }).count();
      const t = await p.locator("body").innerText();
      return { ok: btn > 0, note: `「새 상담 생성」 ${btn ? "있음" : "없음"} · ${t.replace(/\s+/g, " ").slice(0, 45)}…` };
    },
  },
  {
    group: "환자 여정 ③ 방문 전 준비",
    title: "비자·견적이 실제 건을 들고 있다",
    why: "방문 전에 처리하는 두 가지",
    as: "coordinator@test.com",
    url: "/coordinator/visa",
    shot: "j3-visa",
    ready: /전체/,
    async run(p, { browser }) {
      const vt = await p.locator("body").innerText();
      const visa = (vt.match(/전체\s*(\d+)/) || [])[1];
      const s = login("coordinator@test.com");
      const c2 = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: "ko-KR" });
      await c2.addCookies(cookiesFor(s));
      const p2 = await c2.newPage();
      await p2.goto(BASE + "/coordinator/cost-estimates", { waitUntil: "domcontentloaded" }).catch(() => {});
      await p2.waitForTimeout(9000);
      const ct = await p2.locator("body").innerText();
      const cost = (ct.match(/전체\s*(\d+)/) || [])[1];
      await c2.close();
      return { ok: visa !== undefined && cost !== undefined, note: `비자 ${visa ?? "?"}건 · 견적 ${cost ?? "?"}건` };
    },
  },
  {
    group: "환자 여정 ④ 내 진료 관리",
    title: "환자가 로그인해 자기 케이스와 단계를 본다",
    why: "환자 쪽 화면",
    as: "patient@test.com",
    url: "/patient",
    shot: "j4-patient",
    ready: /안녕하세요|접수됨|완료/,
    async run(p) {
      const t = await p.locator("body").innerText();
      const cases = (t.match(/접수됨|진행|완료/g) || []).length;
      return { ok: cases > 0, note: `내 케이스 단계 표시 ${cases}곳` };
    },
  },
  {
    group: "환자 여정 ⑤ 자료 올리기",
    title: "환자가 진단서·검사결과를 올리는 칸이 있다",
    why: "치료 전후로 자료를 주고받는다",
    as: "patient@test.com",
    url: "/patient/documents",
    shot: "j5-docs",
    ready: /의료 문서|업로드|드래그/,
    async run(p) {
      const t = await p.locator("body").innerText();
      const fileInput = await p.locator('input[type=file]').count();
      const hasDrop = /드래그하거나 클릭/.test(t);
      const hasTypes = /진단서/.test(t) && /검사 결과/.test(t);
      const mine = /내 문서/.test(t);
      return { ok: (fileInput > 0 || hasDrop) && hasTypes, note: `올리는 칸 ${hasDrop ? "있음" : fileInput ? "있음(파일칸)" : "없음"} · 문서 유형 ${hasTypes ? "있음" : "없음"} · 내 문서 목록 ${mine ? "있음" : "없음"}` };
    },
  },
  {
    group: "환자 여정 ⑥ 사후관리",
    title: "귀국 후 증상을 보고하고 자료를 올린다",
    why: "사후관리 — KHIDI 정량지표에 들어가는 부분",
    as: "patient@test.com",
    url: "/patient/symptoms",
    shot: "j6-symptoms",
    ready: /증상/,
    async run(p) {
      const add = await p.getByRole("button", { name: /증상 추가/ }).count();
      const submit = await p.getByRole("button", { name: /증상 제출/ }).count();
      const file = await p.locator('input[type=file]').count();
      return { ok: add > 0 && submit > 0, note: `증상 추가 ${add ? "있음" : "없음"} · 제출 ${submit ? "있음" : "없음"} · 자료 올리기 ${file ? "있음" : "없음"}` };
    },
  },
  {
    group: "환자 여정 ⑥ 사후관리",
    title: "재진(다시 방문) 예약을 잡는 칸이 있다",
    why: "사후관리 흐름의 마지막",
    as: "patient@test.com",
    url: "/patient/rebooking",
    shot: "j6-rebooking",
    ready: /예약 확정|무시/,  // ⚠️ 「예약」만 두면 화면 제목에 걸려 추천 카드가 오기 «전»에 잰다
    async run(p) {
      const ok1 = await p.getByRole("button", { name: /예약 확정/ }).count();
      const t = await p.locator("body").innerText();
      return { ok: ok1 > 0, note: `「예약 확정」 ${ok1 ? "있음" : "없음"} · ${t.replace(/\s+/g, " ").slice(0, 45)}…` };
    },
  },
  {
    group: "환자 여정 ⑦ 성과 집계",
    title: "여정 결과가 KHIDI 지표로 자동 집계된다",
    why: "평가위원이 보는 숫자 — 사람이 세지 않는다",
    as: "admin@test.com",
    url: "/admin/khidi/conversion",
    shot: "j7-kpi",
    ready: /유치 깔때기/,  // ⚠️ 「유치」만 두면 옆 메뉴 글자에 걸려 자료가 오기 «전»에 재게 된다
    async run(p) {
      const t = (await p.locator("body").innerText()).replace(/\s+/g, " ");
      // 화면은 「문의 접수 7 · 사전상담 완료 1」처럼 «건» 없이 숫자만 적는다.
      const steps = ["문의 접수", "사전상담 완료", "견적·비자 진행", "유치 확정", "사후관리 완료"];
      const found = steps.map((k) => {
        const after = t.split(k)[1];                 // 라벨 바로 뒤 글자
        const m = after ? after.trim().match(/^[0-9]+/) : null;  // 그 앞머리 숫자
        return m ? `${k} ${m[0]}` : null;
      }).filter(Boolean);
      return { ok: found.length >= 4, note: found.join(" · ") || "집계 숫자를 못 찾음" };
    },
  },
  {
    group: "정리한 것이 제자리에 있나",
    title: "안 쓰는 화면 3개가 메뉴에서 내려갔다 (주소로는 그대로 열린다)",
    why: "지운 게 아니라 숨긴 것 — 되살리기 쉬워야 한다",
    as: "admin@test.com",
    url: "/admin",
    ready: "aside a",
    async run(p, { pauseErrors }) {
      const gone = [];
      for (const name of ["치료·암종", "의료진·지점", "AI 피드백"]) {
        if (await p.getByRole("link", { name, exact: true }).count()) gone.push(`${name}(아직 보임)`);
      }
      // ⚠️ 여기서부터는 주소를 연달아 옮긴다 — 화면이 아직 자료를 받는 중에 옮기면
      //    브라우저가 「Failed to fetch」를 남긴다. 그건 «화면 잘못»이 아니라 «내가 옮긴 탓»이다.
      //    그걸 오류로 세면 확인표가 늘 빨개지고, 그러면 진짜 오류가 나도 안 보게 된다.
      pauseErrors();
      const dead = [];
      for (const u of ["/admin/treatments", "/admin/doctors", "/admin/khidi/ai-feedback"]) {
        // 앞 화면이 아직 뜨는 중에 다음 주소로 옮기면 브라우저가 ERR_ABORTED 를 낸다.
        // 화면 잘못이 아니라 «내가 급하게 옮긴 것»이라, 한 번 더 차분히 열어본다.
        let r = await p.goto(BASE + u, { waitUntil: "load" }).catch(() => null);
        if (!r) {
          await p.waitForTimeout(1500);
          r = await p.goto(BASE + u, { waitUntil: "load" }).catch(() => null);
        }
        if (r?.status() !== 200) dead.push(u + "(" + (r?.status() ?? "못 열림") + ")");
      }
      return {
        ok: gone.length === 0 && dead.length === 0,
        note: gone.length || dead.length ? `${gone.join(", ")} ${dead.join(", ")}` : "메뉴에서 안 보이고, 주소로는 3개 다 열린다",
      };
    },
  },
  {
    group: "정리한 것이 제자리에 있나",
    title: "로그인 안 한 사람이 파트너 포털에 오면 로그인 화면으로 보낸다",
    why: "다섯 중 여기만 서버가 안 막고 있었다",
    as: null, // 로그인 없이
    url: "/agency",
    ready: /로그인|Sign in|Войти/,
    async run(p) {
      const path_ = new URL(p.url()).pathname;
      return { ok: path_ === "/login", note: `도착한 주소 ${path_}` };
    },
  },
];

function portalOk(p, must) {
  return p.locator("body").innerText().then((t) => ({
    ok: must.test(t),
    note: t.replace(/\s+/g, " ").slice(0, 60) + "…",
  }));
}

/**
 * 사진을 찍기 «전»에 화면이 다 그려질 때까지 기다린다.
 *
 * 왜 필요한가: 처음 만든 확인표의 첫 사진이 문지기의 「접속 확인 중…」 로딩 화면이었다.
 *   판정은 통과였는데(주소가 옮겨진 건 맞다) **사진은 빈 화면**이라 근거가 못 됐다.
 *   ✅ 옆에 로딩 화면이 붙으면 표 전체를 못 믿게 된다 — 그게 이 표의 가장 큰 위험이다.
 */
/**
 * 「몇 초 기다린다」가 아니라 «내가 볼 것이 나왔나»를 보고 기다린다.
 *
 * 왜 바꿨나: 처음엔 항목마다 6~11초를 눈대중으로 기다렸다. 혼자 돌리면 통과하는데
 *   연달아 돌리면 3개가 빨개졌다(개발 서버가 화면을 처음 지을 때 더 걸린다).
 *   **앱은 그대로인데 결과가 흔들리는 확인표**는 있으나 마나다 — 곧 빨간불을 무시하게 된다.
 *   그래서 각 항목이 «무엇이 보이면 준비된 것인가»를 스스로 적고, 그게 나올 때까지 기다린다.
 *
 * ready: 정규식(본문 글자에서 찾음) | 문자열(화면 요소 선택자) | 함수(page => boolean)
 */
async function waitReady(page, ready, ms = 45_000) {
  if (!ready) return true;
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      if (typeof ready === "function") { if (await ready(page)) return true; }
      else if (ready instanceof RegExp) {
        if (ready.test(await page.locator("body").innerText())) return true;
      } else if (await page.locator(ready).count()) return true;
    } catch { /* 화면이 아직 바뀌는 중 — 다시 본다 */ }
    await page.waitForTimeout(700);
  }
  return false;
}

async function settleForShot(page) {
  const LOADING = ["접속 확인 중", "Verifying access", "불러오는 중", "Loading"];
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    const t = await page.locator("body").innerText().catch(() => "");
    const stillLoading = LOADING.some((w) => t.includes(w));
    // 글자가 넉넉히 그려졌고 로딩 문구가 사라졌으면 다 그려진 것으로 본다.
    if (!stillLoading && t.replace(/\s/g, "").length > 200) return true;
    await page.waitForTimeout(1000);
  }
  return false; // 끝내 안 끝나면 그대로 찍는다 — 「덜 그려졌다」는 사실도 근거다.
}

function cookiesFor(s) {
  return [
    { name: s.cookieName, value: s.cookieValue, domain: "localhost", path: "/" },
    { name: "healo_lang", value: "ko", domain: "localhost", path: "/" },
    { name: "healo_bo_lang", value: "ko", domain: "localhost", path: "/" },
  ];
}

// ───────────────────────────── 실행 ─────────────────────────────
const alive = await fetch(BASE + "/api/health").then((r) => r.ok).catch(() => false);
if (!alive) {
  console.error(`❌ 개발 서버가 ${BASE} 에 없다. 다른 창에서 \`npm run dev\` 로 띄운 뒤 다시 돌려라.`);
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const browser = await chromium.launch();

/**
 * «처음 여는 화면»은 개발 서버가 그 자리에서 지어낸다. 그동안 화면이 먼저 자료를 부르면
 * 「Failed to fetch」가 한두 개 남는다 — **화면 잘못이 아니라 아직 안 지어진 것**이다.
 * (실측 2026-08-25: 서버를 새로 띄운 직후 /coordinator 에서 2건, 데워진 뒤 3회 연속 0건.
 *  실서비스는 화면을 미리 다 지어두므로 이 현상 자체가 없다.)
 * 그래서 «재기 전에» 같은 주소를 한 번 열어 두고, 그 판은 세지 않는다.
 */
/**
 * 개발 서버가 «지금» 멀쩡한지 물어본다.
 *
 * 왜: 오류 글자만으로는 「화면이 고장났다」와 「개발 서버가 지쳤다」를 못 가른다.
 *   연속으로 여러 판 돌리면 Next 개발 서버가 느려지다 60초도 못 버티는데, 그때 나온 실패를
 *   ❌ 고장으로 적으면 확인표가 통째로 거짓말이 된다(2026-08-25 실측: 8판째 18/24).
 *   ⚠️ 이건 개발 서버 사정이다 — 실서비스는 화면을 미리 다 지어놓고 배포하므로 해당 없다.
 */
async function serverHealthy() {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const r = await fetch(BASE + "/api/health", { signal: ac.signal });
    clearTimeout(t);
    return r.ok;
  } catch { return false; }
}

const warmed = new Set();
async function warmUp(ctx, url) {
  if (warmed.has(url)) return;
  warmed.add(url);
  const w = await ctx.newPage();
  await w.goto(BASE + url, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
  await w.waitForTimeout(2500);
  await w.close();
}

/**
 * 한 항목을 «한 판» 돌린다. 창을 새로 열고, 재고, 사진 찍고, 창을 닫는다.
 * 실패하면 그대로 던진다 — 다시 할지 말지는 부르는 쪽이 정한다.
 */
async function runOnce(c, shotPath) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1, locale: "ko-KR" });
  if (c.as) await ctx.addCookies(cookiesFor(login(c.as)));
  await warmUp(ctx, c.url);
  const page = await ctx.newPage();
  const errs = [];
  // 화면 오류는 «그 화면에 머무는 동안»만 센다. 검사가 스스로 주소를 옮기는 구간은
  // pauseErrors() 로 끈다 — 옮기다 끊긴 요청까지 세면 확인표가 거짓 빨간불이 된다.
  let watching = true;
  const pauseErrors = () => { watching = false; };
  page.on("console", (m) => { if (watching && m.type() === "error") errs.push(m.text().slice(0, 120)); });
  try {
    // 개발 서버는 화면을 «처음 열 때» 지어낸다 — 기본 30초로는 모자랄 때가 있다.
    page.setDefaultTimeout(60_000);
    await page.goto(BASE + c.url, { waitUntil: "networkidle", timeout: 60_000 });
    const ready = await waitReady(page, c.ready);
    let out = await c.run(page, { browser, shotPath, pauseErrors });
    if (!ready && out.ok === false) out = { ...out, note: (out.note || "") + " (화면이 45초 안에 안 그려졌다 — 서버가 느린 것일 수 있다)" };
    // 사진은 «판정이 끝난 뒤»에, 그리고 «다 그려진 뒤»에 찍는다 — 둘 다 아니면 근거가 못 된다.
    if (shotPath && !c.shotFromExtra) {
      const settled = await settleForShot(page);
      await page.screenshot({ path: shotPath });
      if (!settled) out = { ...out, note: (out.note || "") + " ⚠️사진 찍을 때 화면이 아직 그려지는 중이었다" };
    }
    return { out, errs };
  } finally {
    await ctx.close().catch(() => {});
  }
}

for (const c of CHECKS.filter((c) => !ONLY || c.title.includes(ONLY))) {
  const shotPath = c.shot ? path.join(SHOTS, `${c.shot}.png`) : null;
  let out, errs = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      ({ out, errs } = await runOnce(c, shotPath));
      break;
    } catch (e) {
      const msg = String(e);
      // 개발 서버가 죽으면 «화면이 고장났다»가 아니라 «확인을 못 했다»다 — 둘을 같은 ❌ 로
      // 적으면 앱 잘못으로 읽힌다(2026-08-25 실제로 그렇게 찍혔다).
      const serverDown = /ERR_CONNECTION_REFUSED|ECONNREFUSED|ERR_EMPTY_RESPONSE/.test(msg);
      // 느려서 한 번 삐끗한 건 «한 번 더» 해본다. 두 번 다 안 되면 그때 진짜 고장이다.
      const slow = /Timeout|ERR_ABORTED/.test(msg);
      if (!serverDown && slow && attempt === 1) continue;
      // 실패로 적기 «전»에 서버가 멀쩡한지 물어본다. 서버가 헐떡이면 「고장」이 아니라 「확인 못 함」이다.
      const healthy = await serverHealthy();
      out = (serverDown || !healthy)
        ? { ok: false, skipped: true, note: "확인 못 함 — 개발 서버가 지쳤다(응답 없음). 화면 잘못이 아니다. 서버를 다시 띄우고 재실행." }
        : serverDown
        ? { ok: false, skipped: true, note: "확인 못 함 — 개발 서버가 응답하지 않았다(화면 잘못이 아니다). 서버를 다시 띄우고 재실행." }
        : { ok: false, note: "실행 중 오류(두 번 시도): " + msg.slice(0, 100) };
      break;
    }
  }
  const rel = shotPath && fs.existsSync(shotPath) ? path.relative(OUT, shotPath).split("\\").join("/") : null;
  results.push({ ...c, ...out, errs, shot: rel });
  console.log(`${out.ok ? "✅" : out.skipped ? "?" : "❌"} ${c.title}${out.note ? " — " + out.note : ""}`);
}
await browser.close();

const passed = results.filter((r) => r.ok).length;
const skipped = results.filter((r) => r.skipped).length;
const failed = results.filter((r) => !r.ok && !r.skipped).length;
const consoleErrs = results.reduce((a, r) => a + r.errs.length, 0);

// ── 한 장짜리 확인표 ──
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
const groups = [...new Set(results.map((r) => r.group))];
const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
// 사진은 파일 안에 그대로 담는다(data URI). 그래야 이 html 한 개만 열어도 사진이 다 보이고,
// 웹에 올려 공유할 때도 사진이 따로 안 따라다닌다.
function inline(rel) {
  try {
    const b = fs.readFileSync(path.join(OUT, rel));
    return `data:image/png;base64,${b.toString("base64")}`;
  } catch { return null; }
}

const html = `<!-- healwith 화면 확인표 — npm run verify:screens 가 만든다 -->
<title>백오피스 화면 확인표</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@500;700;900&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  /* 색은 제품이 쓰는 teal 을 그대로 가져온다 — 확인표가 확인 대상과 같은 세계에 있게. */
  :root{
    --paper:#FBFCFB; --surface:#FFFFFF; --ink:#12211F; --ink-soft:#5B6B69;
    --line:#DDE5E3; --line-soft:#EDF2F1;
    --brand:#0F766E; --brand-soft:#E6F4F2;
    --pass:#0F766E; --fail:#B4232A; --fail-soft:#FDECEC; --warn:#8A6410; --warn-soft:#FDF6E3;
    --shadow:0 1px 2px rgba(18,33,31,.05), 0 8px 24px rgba(18,33,31,.05);
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --paper:#0E1614; --surface:#152220; --ink:#E6EEEC; --ink-soft:#9DB0AD;
      --line:#263835; --line-soft:#1C2A28;
      --brand:#5EEAD4; --brand-soft:#12302C;
      --pass:#5EEAD4; --fail:#FF9A93; --fail-soft:#2E1A1A; --warn:#E8C468; --warn-soft:#2A2413;
      --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);
    }
  }
  :root[data-theme="dark"]{
    --paper:#0E1614; --surface:#152220; --ink:#E6EEEC; --ink-soft:#9DB0AD;
    --line:#263835; --line-soft:#1C2A28;
    --brand:#5EEAD4; --brand-soft:#12302C;
    --pass:#5EEAD4; --fail:#FF9A93; --fail-soft:#2E1A1A; --warn:#E8C468; --warn-soft:#2A2413;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);
       font-family:"Noto Sans KR",system-ui,-apple-system,"Malgun Gothic",sans-serif;
       line-height:1.65;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1100px;margin:0 auto;padding:clamp(28px,5vw,56px) clamp(18px,4vw,34px) 72px}
  .eyebrow{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.14em;
           text-transform:uppercase;color:var(--brand);margin:0 0 10px}
  h1{font-family:"Gothic A1","Noto Sans KR",sans-serif;font-weight:900;letter-spacing:-.03em;
     font-size:clamp(30px,5vw,44px);line-height:1.12;margin:0 0 12px;text-wrap:balance}
  .lede{font-size:clamp(15px,1.6vw,17px);color:var(--ink-soft);margin:0 0 32px;max-width:62ch}
  .scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:14px}
  .score{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow)}
  .score .n{font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;
            font-size:30px;font-weight:500;letter-spacing:-.02em;line-height:1.1}
  .score .l{font-size:13px;color:var(--ink-soft);margin-top:4px}
  .meta{font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--ink-soft);margin:0 0 40px}
  h2{font-family:"Gothic A1","Noto Sans KR",sans-serif;font-weight:700;font-size:19px;letter-spacing:-.01em;
     margin:44px 0 14px;padding-bottom:9px;border-bottom:1px solid var(--line)}
  .row{background:var(--surface);border:1px solid var(--line);border-radius:14px;
       padding:18px 20px;margin-bottom:12px;box-shadow:var(--shadow);
       display:grid;grid-template-columns:26px 1fr;gap:0 14px;align-items:start}
  .row.bad{border-color:var(--fail);background:var(--fail-soft)}
  /* 「확인 못 함」은 고장과 다른 색 — 서버가 죽어서 못 잰 것을 화면 잘못으로 읽으면 안 된다 */
  .row.skip{border-color:var(--warn);background:var(--warn-soft)}
  .row.skip .mark{background:transparent;color:var(--warn)}
  .mark{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;margin-top:2px;
        background:var(--brand-soft);color:var(--pass);font-size:13px;font-weight:700}
  .row.bad .mark{background:transparent;color:var(--fail)}
  .t{font-weight:700;font-size:15.5px;letter-spacing:-.01em}
  .why{font-size:13px;color:var(--ink-soft);margin-top:3px}
  .note{grid-column:2;margin-top:11px;padding:9px 12px;border-radius:9px;background:var(--line-soft);
        font-family:"IBM Plex Mono",monospace;font-size:12.5px;line-height:1.6;color:var(--ink);
        overflow-x:auto;word-break:break-word}
  .err{grid-column:2;margin-top:8px;font-size:12.5px;color:var(--fail)}
  figure{grid-column:2;margin:13px 0 0}
  figure img{width:100%;display:block;border:1px solid var(--line);border-radius:10px;background:var(--surface);cursor:zoom-in}
  figcaption{font-size:12px;color:var(--ink-soft);margin-top:6px}
  dialog{border:none;background:transparent;padding:0;max-width:96vw;max-height:96vh}
  dialog::backdrop{background:rgba(6,14,13,.82)}
  dialog img{max-width:96vw;max-height:96vh;border-radius:10px;display:block;cursor:zoom-out}
  a{color:var(--brand)}
  .foot{margin-top:48px;padding-top:18px;border-top:1px solid var(--line);
        font-size:13px;color:var(--ink-soft);line-height:1.9}
  .foot code{font-family:"IBM Plex Mono",monospace;background:var(--line-soft);
             padding:1px 6px;border-radius:5px;color:var(--ink);font-size:12.5px}
  :focus-visible{outline:2px solid var(--brand);outline-offset:3px;border-radius:4px}
  @media (prefers-reduced-motion:no-preference){ .row{transition:border-color .15s ease} }
</style>
<div class="wrap">
  <p class="eyebrow">healwith · 백오피스</p>
  <h1>화면 확인표</h1>
  <p class="lede">실제 시험 계정으로 로그인해 실제 화면을 눌러본 결과입니다. 사진은 «눌러본 뒤» 찍은 것이라, 통과 표시와 사진이 같은 순간을 가리킵니다. 사진을 누르면 크게 볼 수 있습니다.</p>

  <div class="scores">
    <div class="score"><div class="n" style="color:${passed === results.length ? "var(--pass)" : "var(--fail)"}">${passed}/${results.length}</div><div class="l">통과</div></div>
    <div class="score"><div class="n" style="color:${failed ? "var(--fail)" : "var(--pass)"}">${failed}</div><div class="l">고장</div></div>
    <div class="score"><div class="n" style="color:${skipped ? "var(--fail)" : "var(--pass)"}">${skipped}</div><div class="l">확인 못 함</div></div>
    <div class="score"><div class="n" style="color:${consoleErrs ? "var(--fail)" : "var(--pass)"}">${consoleErrs}</div><div class="l">화면 오류</div></div>
    <div class="score"><div class="n">${results.filter((r) => r.shot).length}</div><div class="l">증거 사진</div></div>
  </div>
  <p class="meta">${esc(stamp)} · ${esc(BASE)}</p>

${groups.map((g) => `  <h2>${esc(g)}</h2>\n` + results.filter((r) => r.group === g).map((r) => {
  const src = r.shot ? inline(r.shot) : null;
  return `  <div class="row${r.ok ? "" : r.skipped ? " skip" : " bad"}">
    <div class="mark" aria-hidden="true">${r.ok ? "✓" : r.skipped ? "?" : "✕"}</div>
    <div>
      <div class="t">${esc(r.title)}</div>
      ${r.why ? `<div class="why">${esc(r.why)}</div>` : ""}
    </div>
    ${r.note ? `<div class="note">${esc(r.note)}</div>` : ""}
    ${r.errs.length ? `<div class="err">화면 오류 ${r.errs.length}건 — ${esc(r.errs[0])}</div>` : ""}
    ${src ? `<figure><img src="${src}" alt="${esc(r.title)} 확인 화면" loading="lazy"><figcaption>눌러본 뒤 찍은 화면</figcaption></figure>` : ""}
  </div>`;
}).join("\n")).join("\n")}

  <p class="foot">
    이 표는 <code>npm run verify:screens</code> 로 언제든 다시 만듭니다(개발 서버가 떠 있어야 합니다).<br>
    재는 항목을 늘리려면 <code>scripts/verify-screens.mjs</code> 의 CHECKS 에 한 줄 추가합니다 —
    「눈으로 봤다」는 여기 못 들어옵니다. <strong>기계가 확인할 수 있는 것만</strong> 올라갑니다.
  </p>
</div>
<dialog id="zoom"><img alt=""></dialog>
<script>
  // 사진 크게 보기 — 누르면 열리고, 다시 누르거나 Esc 로 닫힌다.
  const dlg = document.getElementById("zoom");
  const big = dlg.querySelector("img");
  document.querySelectorAll("figure img").forEach((img) => {
    img.addEventListener("click", () => { big.src = img.src; big.alt = img.alt; dlg.showModal(); });
  });
  dlg.addEventListener("click", () => dlg.close());
</script>`;

fs.writeFileSync(path.join(OUT, "report.html"), html, "utf8");
console.log(`\n📋 확인표: ${path.resolve(OUT, "report.html")}  (통과 ${passed}/${results.length} · 화면 오류 ${consoleErrs})`);
if (passed !== results.length) process.exit(1);
