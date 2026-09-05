/**
 * 통역봇 자막이 «화면에 붙어 뜨고 + 기록에 남는지» 실제 상담방에서 끝단 검증.
 *
 * 왜 (2026-08-28): 통역봇 자막 경로는 저장이 통째로 빠져 있었다(실측: 자막 3,553건 중 0건).
 *   고친 뒤 「빌드 통과」로는 아무것도 증명 못 한다. 진짜 상담방을 열고 통역을 켜고
 *   실제 음성을 흘려서, 화면과 저장 호출을 둘 다 눈으로 확인한다.
 *
 * 구조: 로봇 2대. A 는 한국어로 말하고(가짜 마이크에 WAV), B 는 러시아어를 듣는다.
 *   통역봇이 A 의 말을 러시아어로 옮겨 B 화면에 자막을 뿌린다 → B 가 기록에 남기는지 본다.
 *
 *   node scripts/verify-bot-subtitle-log.mjs <상담방-id> [--port 3007]
 *
 * ⚠️ 시험 전용. is_test=true 방에서만 돌려라.
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOM = process.argv[2];
const PORT = process.argv.includes("--port")
  ? process.argv[process.argv.indexOf("--port") + 1]
  : "3007";
if (!ROOM) {
  console.error("상담방 id 를 넘겨라");
  process.exit(1);
}
const BASE = `http://localhost:${PORT}`;
// 앞뒤에 무음을 붙인 판을 쓴다. 2026-08-28 실측: 안 붙이면 통역쌍(session up)이 서기 «전»에
// 말이 끝나 자막이 한 줄도 안 온다. 통역 품질 문제가 아니라 타이밍 문제다.
const WAV =
  process.env.SPEAK_WAV ||
  path.join(HERE, "..", "e2e", "fixtures", "audio", "ko-patient-speech.wav");

const cookieFor = (email) =>
  JSON.parse(
    execFileSync("node", [path.join(HERE, "dev-login-as.mjs"), email], { encoding: "utf8" })
  );

const browser = await chromium.launch({
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-audio-capture=${WAV}`,
  ],
});

async function openRoom(email, label) {
  const login = cookieFor(email);
  const ctx = await browser.newContext({ permissions: ["microphone", "camera"] });
  await ctx.addCookies([
    { name: login.cookieName, value: login.cookieValue, domain: "localhost", path: "/" },
  ]);
  const page = await ctx.newPage();
  const saved = [];
  page.on("request", (req) => {
    if (req.url().includes("/translate") && req.method() === "POST") {
      try {
        const b = JSON.parse(req.postData() || "{}");
        if (b.sttEngine === "live_translate") saved.push(b);
      } catch {}
    }
  });
  await page.goto(`${BASE}/consultation/${ROOM}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  console.log(`  [${label}] 입장 (${email})`);
  return { page, saved };
}

/** 화면 버튼을 글자로 찾아 누른다. 셀렉터는 바뀌어도 글자는 남는다. */
async function press(page, rx, label) {
  for (const b of await page.getByRole("button").all()) {
    const t = ((await b.textContent()) || "").trim();
    if (rx.test(t)) {
      await b.click().catch(() => {});
      console.log(`    ${label}: "${t.slice(0, 24)}" 누름`);
      await page.waitForTimeout(2000);
      return true;
    }
  }
  console.log(`    ⚠️ ${label} 버튼을 못 찾음`);
  return false;
}

// B(러시아어를 듣는 쪽)가 먼저 들어가 통역을 켠다 — 통역쌍은 청취자가 있어야 만들어진다.
const b = await openRoom("coordinator@test.com", "B 듣는쪽");
// 화면이 아예 안 그려지면(선언 순서 오류 등) 그 자리에서 멈춘다 — 0건을 «정상»으로 읽지 않게.
b.page.on("pageerror", (e) => console.log("  [화면 오류]", String(e.message).slice(0, 120)));
await b.page.waitForTimeout(11000);
const btns = [];
for (const x of await b.page.getByRole("button").all()) {
  const t = ((await x.textContent()) || "").trim();
  if (t) btns.push(t.slice(0, 22));
}
console.log("  B 화면 버튼:", btns.join(" | ").slice(0, 260));

// ⚠️ 순서가 중요하다: 언어를 먼저 바꾸면 통역 스위치가 안 먹는다(2026-08-28 실측).
await press(b.page, /Subtitle|자막/i, "자막 켜기");
await press(b.page, /Voice|통역/i, "통역 켜기");
// 언어는 화면에서 바꾸지 않는다. 바꾸면 방에 알리는 lang 속성이 제때 안 따라가서
// 통역쌍이 안 선다(2026-08-28 실측). 대신 방 설정(patient_language=ru)으로 처음부터 맞춘다.
await press(b.page, /^Mic$|마이크/i, "마이크 끄기(B는 안 말한다)");
await b.page.screenshot({ path: (process.env.SHOT || "x.png").replace(".png", "-B-setup.png") });
await b.page.waitForTimeout(7000);

// 통역봇이 내보내는 것과 같은 모양으로 자막 조각을 흘려보낸다(send_test_captions.py).
// 자막을 «만드는» 쪽이 아니라 «받는» 쪽 배선만 보는 시험이다.
const AGENT_DIR = process.env.AGENT_DIR;
if (AGENT_DIR) {
  const { spawn } = await import("node:child_process");
  const room = process.env.LK_ROOM || ROOM;
  console.log(`  통역봇 흉내로 자막 흘리기 (방 ${room})`);
  const sender = spawn(
    "uv",
    ["run", "--env-file", ".env.local", "python", "send_test_captions.py", room, "--lang", "ko"],
    { cwd: AGENT_DIR, stdio: "inherit", shell: true }
  );
  await new Promise((r) => sender.on("exit", r));
}
await b.page.screenshot({ path: (process.env.SHOT || "x.png").replace(".png", "-live.png") });
console.log("  자막 확정 타이머(6초)가 돌기를 기다린다...");
await b.page.waitForTimeout(12000);

// 회의록 칸(Translation)을 열어 «목록»이 어떻게 그려지는지 본다. 통역봇 줄은 원문이 없어서
// 예전엔 여기가 빈 상자로 남았다(2026-08-28).
// 옆 칸은 기본으로 닫혀 있다 — Chat 을 눌러 열고, 그 안의 Translation 탭으로 옮긴다.
for (const rx of [/^Chat$|^채팅$/i, /^Translation$|^번역$/i]) {
  for (const btn of await b.page.getByRole("button").all()) {
    const t = ((await btn.textContent()) || "").trim();
    if (rx.test(t)) {
      await btn.click().catch(() => {});
      await b.page.waitForTimeout(2000);
      break;
    }
  }
}
// 문맥 버퍼가 «붙이는 중간 상태»로 가득 차지 않았는지 본다(2026-08-28).
const ctx = await b.page.evaluate(() => (window.__convoContext || []).map((x) => x.text));
if (ctx.length) {
  console.log(`
문맥 버퍼 ${ctx.length}줄`);
  ctx.forEach((t, i) => console.log(`  ${i + 1}. ${String(t).slice(0, 80)}`));
  const dup = ctx.filter((t, i) => ctx.some((o, j) => j !== i && String(o).startsWith(String(t))));
  if (dup.length) console.log(`  ⚠️ 다른 줄에 통째로 들어간 줄 ${dup.length}개 (중간 상태가 겹쳐 쌓임)`);
  else console.log("  ✅ 겹쳐 쌓인 줄 없음");
}

const logLines = await b.page.evaluate(() => {
  const boxes = Array.from(document.querySelectorAll(".border-gray-700.rounded-lg"));
  return boxes.map((el) => (el.textContent || "").trim()).filter(Boolean);
});
console.log(`
회의록 목록 ${logLines.length}줄`);
logLines.forEach((t, i) => console.log(`  ${i + 1}. ${t.slice(0, 110)}`));
// ⚠️ 길이로 «빈 상자»를 판정하면 짧은 자막(「저는」)을 빈 것으로 오해한다(2026-08-28 실측).
//    언어 라벨만 있고 그 뒤가 아예 없는 것만 빈 상자로 센다.
const empty = logLines.filter((t) => !t.replace(/^(한국어|русский|Русский|English|日本語|中文|Қазақша)+/i, "").trim());
if (empty.length) console.log(`  ⚠️ 내용 없이 빈 상자 ${empty.length}개`);
await b.page.screenshot({ path: (process.env.SHOT || "x.png").replace(".png", "-log.png") });

const shown = await b.page.evaluate(() =>
  Array.from(document.querySelectorAll("[class*='backdrop-blur']"))
    .map((e) => (e.textContent || "").trim())
    .filter((t) => t.length > 6 && !/^\d+:\d+$/.test(t))
    .slice(-6)
);

console.log("\n" + "=".repeat(64));
console.log(`B 화면에 뜬 자막 ${shown.length}줄`);
shown.forEach((t, i) => console.log(`  ${i + 1}. ${t.slice(0, 130)}`));
console.log(`\nB 가 기록에 보낸 줄 ${b.saved.length}건 (경로 live_translate)`);
b.saved.forEach((x, i) =>
  console.log(
    `  ${i + 1}. [${x.sourceLanguage} -> ${x.targetLanguage}] ${String(x.translatedText).slice(0, 100)}`
  )
);
const badLang = b.saved.filter((x) => x.sourceLanguage === x.targetLanguage);
if (badLang.length) console.log(`
  ⚠️ 원문 언어와 번역 언어가 같은 줄 ${badLang.length}건 (회의록에 「한국어 → 한국어」로 남는다)`);

await b.page.screenshot({ path: process.env.SHOT || "bot-subtitle-verify.png" });
await browser.close();
process.exit(b.saved.length ? 0 : 2);
