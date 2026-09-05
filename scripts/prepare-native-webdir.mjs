#!/usr/bin/env node
/**
 * 앱(AAB/IPA)에 «실제로 필요한 파일만» 담은 webDir 을 만든다.
 *
 * 🔴 왜 만들었나 (2026-08-31 실측):
 *   앱 파일이 **79MB** 였고 그중 **74.6MB(94%)가 `base/assets`** 였다. 뜯어보니
 *   웹사이트 사진 폴더가 통째로 들어가 있었다 — `public/immune` 43.9MB ·
 *   `public/images` 15.1MB · `public/doctors` 15.0MB.
 *
 *   그런데 이 앱은 **라이브로드**다(`server.url = https://healwith.co.kr`). 화면도 사진도
 *   서버에서 불러오므로 **그 74MB 는 앱 안에서 한 번도 안 열린다.** 그냥 실려 다닐 뿐이다.
 *   원인은 `capacitor.config.ts` 의 `webDir: 'public'` — 캡시터가 그 폴더를 통째로 복사한다.
 *   (그 줄 주석에도 「형식상 요구하므로 가리킴, 실제 미사용」이라고 적혀 있었다.)
 *
 * ✅ 앱이 로컬 파일에서 «실제로 여는 것»은 하나뿐이다 — `errorPath: 'offline.html'`.
 *    인터넷이 끊겼을 때 하얀 화면 대신 띄우는 안내이고, 자체 완결형이라(외부 참조 0건)
 *    이 파일만 있으면 된다. 5KB 다.
 *
 * 🔑 **정본은 `public/offline.html` 하나로 유지한다** — 여기서 «복사»만 한다.
 *    두 벌로 갈라지면 웹(PWA `sw.js`)과 앱의 오프라인 화면이 서로 달라진다.
 *
 * 쓰는 법: `npm run cap:sync` (이 스크립트 → `npx cap sync`)
 *   ⚠️ `npx cap sync` 를 «직접» 부르면 이 폴더가 없어 실패한다. 반드시 위 명령으로 돌려라.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = "native-webdir";
// 앱이 실제로 여는 것만. 늘릴 때는 «앱이 로컬에서 정말 여는가»를 먼저 확인하라.
const FILES = ["offline.html"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let total = 0;
for (const f of FILES) {
  const src = path.join("public", f);
  if (!fs.existsSync(src)) {
    console.error(`🔴 ${src} 가 없다 — 앱이 오프라인 화면을 못 띄운다. 파일을 되살리거나 이 목록을 고쳐라.`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(OUT, f));
  total += fs.statSync(src).size;
}

// 캡시터는 webDir 에 index.html 이 없으면 경고를 낸다. 라이브로드라 실제로 열리진 않지만,
// 「없어서 나는 경고」와 「진짜 문제」가 섞이지 않도록 offline.html 을 그대로 둔다.
fs.copyFileSync(path.join("public", "offline.html"), path.join(OUT, "index.html"));

console.log(`[native-webdir] ${FILES.length}개 파일 · ${(total / 1024).toFixed(1)} KB (+ index.html 사본)`);
