/**
 * 통화 중에 언어를 바꾸면 통역이 끊기나? 참가자 속성을 직접 읽어 판정한다.
 *
 * 왜 (2026-08-28): 자막 검증을 하다 «언어를 바꾸면 통역쌍이 안 선다»는 인상을 받았는데,
 *   시험 도구가 엉뚱한 버튼을 눌렀을 가능성도 있어 그대로 믿으면 안 된다.
 *   통역쌍의 재료는 참가자의 두 속성뿐이다: `lang`(내 언어)과 `voice`(통역 원함).
 *   그 둘이 언어를 바꾼 뒤에도 «둘 다» 살아 있는지를 LiveKit 에서 직접 읽는다.
 *
 *   node scripts/verify-lang-switch.mjs <상담방-id> <LiveKit방이름> [--port 3007]
 *
 * ⚠️ 시험 전용. is_test=true 방에서만 돌려라.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { RoomServiceClient } from "livekit-server-sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const HERE = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(HERE, "..", ".env.local") });

const ROOM = process.argv[2];
const LK_ROOM = process.argv[3];
const PORT = process.argv.includes("--port")
  ? process.argv[process.argv.indexOf("--port") + 1]
  : "3007";
if (!ROOM || !LK_ROOM) {
  console.error("사용법: node scripts/verify-lang-switch.mjs <상담방-id> <LiveKit방이름>");
  process.exit(1);
}

const svc = new RoomServiceClient(
  process.env.LIVEKIT_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

async function attrs(label) {
  const ps = await svc.listParticipants(LK_ROOM).catch(() => []);
  const people = ps.filter((p) => !p.identity.startsWith("agent-"));
  const bots = ps.filter((p) => p.identity.startsWith("agent-"));
  console.log(`\n[${label}]`);
  for (const p of people) {
    const a = p.attributes || {};
    console.log(
      `  ${p.identity.slice(0, 34).padEnd(36)} lang=${(a.lang || "(없음)").padEnd(8)} voice=${a.voice || "(없음)"}`
    );
  }
  console.log(`  통역봇: ${bots.length ? bots.map((b) => b.identity).join(", ") : "없음"}`);
  return { people, bots };
}

const login = JSON.parse(
  execFileSync("node", [path.join(HERE, "dev-login-as.mjs"), "admin@test.com"], {
    encoding: "utf8",
  })
);
const browser = await chromium.launch({
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const ctx = await browser.newContext({ permissions: ["microphone", "camera"] });
await ctx.addCookies([
  { name: login.cookieName, value: login.cookieValue, domain: "localhost", path: "/" },
]);
const page = await ctx.newPage();

// 느린 회선 흉내 (SLOW=1). 카자흐스탄·러시아 현지 회선에서도 «방에 붙기 전 통역 켜기»
// 고침이 버티는지 보려는 것이다. 20초 상한이 넉넉한지가 질문이다.
if (process.env.SLOW) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
    latency: 2000,
  });
  console.log("느린 회선 흉내 켬 (내려받기 400kbps · 지연 2초)");
}

const calls = [];
page.on("request", (r) => {
  if (r.url().includes("/interpreter")) calls.push(r.method() + " " + (r.postData() || ""));
});

await page.goto(`http://localhost:${PORT}/consultation/${ROOM}`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await page.waitForTimeout(Number(process.env.WAIT_BEFORE || 12000));

// 반증 검사용: 통역을 켜기 «직전»의 내 identity 를 화면에서 직접 읽는다.
const idBefore = await page.evaluate(() => {
  const el = document.querySelector("[data-testid='voice-toggle']");
  return el ? el.getAttribute("data-agent-present") : "(버튼 없음)";
});
console.log(`통역 켜기 직전 상태: 봇재실=${idBefore}, 기다린 시간=${process.env.WAIT_BEFORE || 12000}ms`);

// 통역을 켠다 (testid 로 확실하게 — 글자로 찾으면 언어 목록의 버튼이 잡힌다)
// 버튼이 «그려질 때까지»는 상한과 무관하다(그려져야 누를 수 있다). 상한이 세는 것은
// 「누른 뒤 방에 붙기까지」다. 그래서 버튼을 기다렸다 누르고, 그 순간부터 잰다.
await page.getByTestId("voice-toggle").waitFor({ timeout: 180000 });
const t0 = Date.now();
await page.getByTestId("voice-toggle").click();
console.log("통역 켬 (여기서부터 0초)");
let botAt = null;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(3000);
  const ps = await svc.listParticipants(LK_ROOM).catch(() => []);
  if (ps.some((p) => p.identity.startsWith("agent-"))) {
    botAt = (Date.now() - t0) / 1000;
    break;
  }
}
console.log(botAt ? `통역봇이 온 시각: 누른 뒤 ${botAt.toFixed(0)}초` : "통역봇이 36초 안에 안 옴");
const before = await attrs("언어 바꾸기 «전»");

// 언어를 러시아어로 바꾼다
await page.getByRole("button", { name: /한국어|Language/i }).first().click();
await page.waitForTimeout(1500);
for (const opt of await page.getByRole("button").all()) {
  const t = ((await opt.textContent()) || "").trim();
  if (/^Русский$/i.test(t)) {
    await opt.click();
    console.log("\n언어를 Русский 로 바꿈");
    break;
  }
}
await page.waitForTimeout(9000);
const after = await attrs("언어 바꾸기 «후»");

console.log("\n" + "=".repeat(62));
const me = after.people[0];
const a = me?.attributes || {};
const langOk = a.lang === "ru";
const voiceOk = a.voice === "on";
const botOk = after.bots.length > 0;
console.log(`내 언어가 바뀌었나        ${langOk ? "예 (ru)" : `아니오 (${a.lang || "없음"})`}`);
console.log(`통역 원함 표시가 남았나   ${voiceOk ? "예" : `아니오 (${a.voice || "없음"})`}`);
console.log(`통역봇이 방에 남았나      ${botOk ? "예" : "아니오"}`);
console.log(`\n통역 호출 ${calls.length}회: ${calls.join(" / ").slice(0, 200)}`);
console.log(
  langOk && voiceOk && botOk
    ? "\n판정: 언어를 바꿔도 통역이 안 끊긴다"
    : "\n판정: 언어를 바꾸면 통역이 끊긴다 (위에서 «아니오» 인 줄이 원인)"
);

await page.screenshot({ path: process.env.SHOT || "lang-switch.png" });
await browser.close();
process.exit(langOk && voiceOk && botOk ? 0 : 2);
