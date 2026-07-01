#!/usr/bin/env node
/**
 * 의사 사진 자체 호스팅용 다운로더 (핫링크 금지 — check:content 가드와 한 세트).
 *
 * 왜: 사진을 immunehospital.com 에서 직접 불러오면(핫링크) 원본이 파일명 변경/삭제 시 우리 화면에서 깨진다.
 *     (2026-07-01 병원 페이지 의사사진 다수 404 사고) → public/doctors/ 에 받아두고 로컬 경로로 참조.
 *
 * 사용법:
 *   node scripts/fetch-doctor-photos.mjs <url> [<url> ...]
 *   node scripts/fetch-doctor-photos.mjs                 # 인자 없으면 HospitalsClient.jsx 의 /doctors/* 파일 중 누락분 재수집 안내
 *
 * 받은 파일은 public/doctors/<원본파일명> 으로 저장. 그 뒤 데이터에서 '/doctors/<파일명>' 으로 참조하면 됨.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

const OUT = join(process.cwd(), "public", "doctors");
mkdirSync(OUT, { recursive: true });

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.log("사용법: node scripts/fetch-doctor-photos.mjs <immunehospital.com 이미지 URL> [...]");
  console.log("예:     node scripts/fetch-doctor-photos.mjs https://immunehospital.com/uploads/doctors/xxxx.jpg");
  process.exit(0);
}

let ok = 0, fail = 0;
for (const url of urls) {
  const name = basename(new URL(url).pathname);
  try {
    const res = await fetch(url, { headers: { Referer: "https://healwith.co.kr/", "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) { console.error(`✗ ${name}  HTTP ${res.status} (원본에 없음 — 회색 아바타 폴백 사용)`); fail++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(OUT, name), buf);
    console.log(`✓ ${name}  ${(buf.length / 1024).toFixed(0)}KB → public/doctors/${name}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${name}  ${e.message}`); fail++;
  }
}
console.log(`\n완료: ${ok} 저장, ${fail} 실패. 데이터에서 '/doctors/<파일명>' 으로 참조하세요(핫링크 금지).`);
