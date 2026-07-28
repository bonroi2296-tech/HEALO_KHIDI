/**
 * Google Play 「피처 그래픽」 생성 (1024×500 · 필수 제출물, 2026-07-28)
 *
 * 왜: Play 콘솔은 앱 아이콘(512×512)·스크린샷 외에 **피처 그래픽 1024×500** 을 필수로 받는다.
 *     iOS 에는 없는 항목이라 `appstore-screenshots.mjs` 로는 안 나온다.
 *
 * 사용: node scripts/play-feature-graphic.mjs [locale]   (기본 en — ko|en|ru)
 * 출력: appstore-assets/feature-graphic-<locale>.png     (git 미추적)
 *
 * 디자인 근거(DESIGN.md): 배경 = teal-700 단색(#0f766e).
 *   - 그라데이션 배경은 DESIGN.md 금지 목록 → 단색.
 *   - 흰 글씨는 500~600번대 위에서 대비 미달 → 700번대(흰 글씨 5.7:1 ✅).
 * 문구는 지어내지 말 것 — `docs/APP_STORE_LISTING.md` §1 「짧은 설명」 승인본을 그대로 쓴다.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

// docs/APP_STORE_LISTING.md §1 짧은 설명 (PO 승인본 — 여기서 새로 쓰지 마라)
const TAGLINE = {
  ko: "한국 암 치료, 처음부터 끝까지 함께",
  en: "Cancer care in Korea, end to end",
  ru: "Лечение рака в Корее — рядом с вами",
};

const locale = process.argv[2] || "en";
const tagline = TAGLINE[locale];
if (!tagline) throw new Error(`지원 언어 아님: ${locale} (${Object.keys(TAGLINE).join("|")})`);

const iconB64 = readFileSync("public/icons/icon-512x512.png").toString("base64");

const html = `<!doctype html><meta charset="utf-8">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1024px; height: 500px; background: #0f766e; display: flex;
         align-items: center; gap: 44px; padding: 0 76px;
         font-family: Pretendard, "Malgun Gothic", system-ui, sans-serif; color: #fff; }
  img { width: 168px; height: 168px; border-radius: 38px; background: #fff; flex: none; }
  h1 { font-size: 78px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
  p  { font-size: 33px; font-weight: 500; color: #ccfbf1; margin-top: 18px; line-height: 1.3; }
</style>
<img src="data:image/png;base64,${iconB64}" alt="">
<div><h1>healwith</h1><p>${tagline}</p></div>`;

mkdirSync("appstore-assets", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await page.setContent(html, { waitUntil: "load" });
await page.waitForTimeout(400); // 폰트 안착
const out = `appstore-assets/feature-graphic-${locale}.png`;
await page.screenshot({ path: out });
await browser.close();
console.log(`완료: ${out} (1024×500)`);
