#!/usr/bin/env node
/**
 * 「아무도 안 눌러본 화면」 전수 훑기 — 로그인 뒤 화면까지 실제로 열어본다 (수동 실행).
 *
 * 왜 (2026-08-25 PO: 「완벽하냐, 또 대충 만든 거 아니냐 / 로컬에서 확인해봐」):
 *   검사기는 코드 «모양»만 본다. 화면이 실제로 그려지는지는 눌러봐야 안다.
 *   이 훑기로 실제 결함 1건을 잡았다 — /admin/observability 가 2026-02 부터 계속 500
 *   (DB 함수가 실DB 에 없었다. 반성문 #174).
 *
 * ⚠️ 자동 검사(CI)에 넣지 않는 이유: 오탐이 남는다. 첫 판은 15건 중 14건이 헛경보였고
 *   (첫 방문 때 화면 만드는 시간을 1.8초만 기다림), 6초로 늘린 뒤에도 5건 중 5건이 헛것이었다
 *   (개발 서버 최초 컴파일·공개 화면의 401 폴백 등). 사람이 결과를 «한 번 더 눌러보는»
 *   전제로 쓰는 도구다. CI 에 넣으면 늑대소년이 된다.
 *
 * 준비:
 *   1) 개발 서버를 띄운다 (기본 http://localhost:3271 — BASE 상수 확인)
 *   2) 역할별 로그인 쿠키를 만든다:
 *        for a in admin coordinator patient hospital agency clinic; do
 *          node scripts/dev-login-as.mjs $a@test.com > <DIR>/cookie_$a.json
 *        done
 *      (DIR 상수를 쿠키를 둔 폴더로 맞춘다)
 *
 * 실행:  node scripts/sweep-screens.mjs
 * 결과:  <DIR>/clickthrough.json + 화면에 「볼 것」 목록
 *
 * 판정 기준(하나라도 걸리면 「볼 것」): 화면 죽음 / 콘솔 오류 / 서버 500 / HTTP 400+ /
 *   본문이 사실상 빔. 걸린 것은 반드시 «한 개씩 새 탭으로» 다시 열어 확인하라.
 */

import { chromium } from "file:///C:/Users/user/Desktop/HEALO_KHIDI/node_modules/playwright/index.mjs";
import fs from "node:fs";

const DIR = "C:/Users/user/AppData/Local/Temp/claude/C--Users-user-Desktop-HEALO-KHIDI/79ac4ff8-1594-4cd1-9f31-2b9ba4a28d74/scratchpad";
const BASE = "http://localhost:3271";

const ROUTES = {
  admin: [
    "/admin", "/admin/account/deletion-requests", "/admin/agent", "/admin/ai-status", "/admin/analytics",
    "/admin/audit", "/admin/automation/playbook", "/admin/chat", "/admin/consultations", "/admin/crawl",
    "/admin/crawl/pipeline", "/admin/crawl/review", "/admin/doctors", "/admin/education", "/admin/enrichment",
    "/admin/hospitals", "/admin/import", "/admin/inquiries", "/admin/khidi/ad-budget", "/admin/khidi/agencies",
    "/admin/khidi/agent-analysis", "/admin/khidi/ai-feedback", "/admin/khidi/ai-quality", "/admin/khidi/ai-regression",
    "/admin/khidi/cases", "/admin/khidi/conversion", "/admin/khidi/evidence", "/admin/khidi/kpi-dashboard",
    "/admin/khidi/model-benchmark", "/admin/khidi/north-star", "/admin/khidi/partners", "/admin/khidi/referrals",
    "/admin/khidi/satisfaction", "/admin/khidi/usage", "/admin/leads", "/admin/observability", "/admin/playbook",
    "/admin/playbook-analytics", "/admin/playbook-patterns", "/admin/rag", "/admin/rag/documents", "/admin/reminders",
    "/admin/settings/branding", "/admin/settings/notifications", "/admin/staff", "/admin/treatments", "/admin/users",
    "/notifications",
  ],
  coordinator: [
    "/coordinator", "/coordinator/alerts", "/coordinator/cases", "/coordinator/chat", "/coordinator/consultations",
    "/coordinator/content", "/coordinator/conversion", "/coordinator/cost-estimates", "/coordinator/inbox",
    "/coordinator/inbox/216", "/coordinator/intakes", "/coordinator/messages", "/coordinator/partners",
    "/coordinator/requests", "/coordinator/satisfaction", "/coordinator/settings", "/coordinator/visa",
  ],
  patient: [
    "/patient", "/patient/account", "/patient/calendar", "/patient/chat", "/patient/consultations",
    "/patient/cost-estimates", "/patient/documents", "/patient/education", "/patient/messages",
    "/patient/rebooking", "/patient/symptoms", "/patient/visa", "/patient/visa/applications",
  ],
  hospital: ["/hospital", "/hospital/leads", "/hospital/profile", "/hospital/treatments"],
  agency: ["/agency"],
  clinic: ["/clinic"],
  public: [
    "/", "/about", "/hospitals", "/hospitals/immune", "/treatments", "/education", "/faq", "/contact",
    "/inquiry", "/inquiry/referral", "/inquiry/intake", "/cost-calculator", "/telemedicine", "/insurance",
    "/visa", "/search", "/stories", "/partners", "/care-journey", "/specialties/korean-medicine",
    "/ru/for-russian-patients", "/kk/for-kazakh-patients", "/privacy", "/terms", "/medical-disclaimer",
    "/login", "/signup", "/forgot-password", "/find-id", "/cookies", "/account-deletion",
  ],
};

const cookieFor = (role) => {
  const d = JSON.parse(fs.readFileSync(`${DIR}/cookie_${role}.json`, "utf8"));
  return { name: d.cookieName, value: d.cookieValue, domain: "localhost", path: "/" };
};

// 이미 아는 잡음은 뺀다(로컬 개발 서버 특유의 것).
const NOISE = [
  /Download the React DevTools/i,
  /Failed to load resource.*favicon/i,
  /hydration/i,
  /Warning:/i,
  /googletagmanager|gtag|analytics/i,
  /ERR_BLOCKED_BY_CLIENT/i,
  /Failed to fetch/i, // 화면 이동 중 끊긴 요청 — 15건 중 14건이 이것이었다(2026-08-25 실측)
];

const results = [];
const browser = await chromium.launch();

for (const [role, routes] of Object.entries(ROUTES)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, locale: "ko-KR" });
  if (role !== "public") await ctx.addCookies([cookieFor(role)]);
  const page = await ctx.newPage();

  for (const route of routes) {
    const consoleErrors = [];
    const serverErrors = [];
    const onConsole = (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (!NOISE.some((re) => re.test(t))) consoleErrors.push(t.slice(0, 160));
    };
    const onResponse = (r) => {
      if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url().replace(BASE, "").slice(0, 80)}`);
    };
    page.on("console", onConsole);
    page.on("response", onResponse);

    let status = 0;
    let text = "";
    try {
      const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 90000 });
      status = resp?.status() ?? 0;
      await page.waitForTimeout(6000);
      text = await page.evaluate(() => document.body.innerText);
    } catch (e) {
      consoleErrors.push(`(열기 실패) ${String(e.message).slice(0, 120)}`);
    }
    page.off("console", onConsole);
    page.off("response", onResponse);

    const landed = page.url().replace(BASE, "");
    const dead = /Application error|Internal Server Error|문제가 발생했습니다|Something went wrong|잠시 후 다시/i.test(text);
    const bodyLen = text.replace(/\s+/g, " ").trim().length;
    const bad = dead || consoleErrors.length > 0 || serverErrors.length > 0 || status >= 400 || bodyLen < 120;
    results.push({ role, route, landed, status, bodyLen, dead, consoleErrors, serverErrors, bad });
    process.stdout.write(bad ? "!" : ".");
  }
  await ctx.close();
}
await browser.close();

fs.writeFileSync(`${DIR}/clickthrough.json`, JSON.stringify(results, null, 1), "utf8");
const bad = results.filter((r) => r.bad);
console.log(`\n\n총 ${results.length}개 화면 · 볼 것 ${bad.length}개\n`);
for (const r of bad) {
  const why = [
    r.status >= 400 ? `HTTP ${r.status}` : null,
    r.dead ? "화면 죽음" : null,
    r.bodyLen < 120 ? `본문 ${r.bodyLen}자(사실상 빈 화면)` : null,
    r.serverErrors.length ? `서버오류 ${r.serverErrors.slice(0, 2).join(", ")}` : null,
    r.consoleErrors.length ? `콘솔 ${r.consoleErrors.length}건: ${r.consoleErrors[0]}` : null,
  ].filter(Boolean);
  console.log(`[${r.role}] ${r.route}${r.landed !== r.route ? ` → ${r.landed}` : ""}\n    ${why.join(" | ")}`);
}
