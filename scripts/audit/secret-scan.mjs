#!/usr/bin/env node
/**
 * 시크릿(비밀키) 정적 스캔 — 클라이언트 번들/서버 코드에 하드코딩된 비밀키 검출.
 * 감리 증거용: 실측 결과를 docs/audit/secret-scan-report.json 으로 남긴다.
 * 결과: 발견 시 exit 1 (CI 게이트 가능).
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DIRS = ["app", "src", "components"];
const EX = /node_modules|\.next|\/archive\/|\.test\.|\.spec\./;
const EXT = /\.(js|jsx|ts|tsx|mjs)$/;

const PATTERNS = [
  { re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, msg: "Private key block" },
  { re: /AKIA[0-9A-Z]{16}/, msg: "AWS access key id" },
  { re: /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|SERVICE_ROLE)/, msg: "비밀키를 NEXT_PUBLIC_ 로 클라이언트 노출" },
  { re: /\beyJ[A-Za-z0-9_-]{18,}\.[A-Za-z0-9_-]{18,}\.[A-Za-z0-9_-]{10,}/, msg: "하드코딩 JWT(토큰 값)" },
  { re: /\bsk-[A-Za-z0-9]{32,}\b/, msg: "OpenAI 류 secret key" },
  { re: /(?:service_role|SERVICE_ROLE_KEY)\s*[:=]\s*["'][A-Za-z0-9._-]{20,}["']/, msg: "하드코딩 service_role 키" },
];

function walk(d) {
  const out = [];
  let es;
  try { es = readdirSync(join(ROOT, d)); } catch { return out; }
  for (const e of es) {
    const rel = join(d, e);
    if (EX.test("/" + rel.replace(/\\/g, "/") + "/")) continue;
    let st;
    try { st = statSync(join(ROOT, rel)); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(rel));
    else if (EXT.test(e)) out.push(rel);
  }
  return out;
}

const hits = [];
for (const f of DIRS.flatMap(walk)) {
  const lines = readFileSync(join(ROOT, f), "utf8").split("\n");
  lines.forEach((l, i) => {
    for (const p of PATTERNS) if (p.re.test(l)) hits.push({ file: f, line: i + 1, type: p.msg });
  });
}

mkdirSync("docs/audit", { recursive: true });
writeFileSync("docs/audit/secret-scan-report.json", JSON.stringify({ ts: new Date().toISOString(), scanned: DIRS, total: hits.length, hits }, null, 2));

console.log(`[secret-scan] ${hits.length} hit(s)`);
hits.forEach((h) => console.log(`  ${h.file}:${h.line} — ${h.type}`));
process.exit(hits.length ? 1 : 0);
