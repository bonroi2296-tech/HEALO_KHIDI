/**
 * healwith: 병원 CD(CT) 묶음을 «볼 수 있는 형태»로 한 번 정리해 두는 API (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/imaging  { path }
 *   → { series: [...], urls: {...} }   (두 번째부터는 만들어 둔 걸 그대로 돌려준다)
 *
 * 왜 서버에서 하나 (2026-08-03 실측):
 *   처음엔 브라우저에서 .rar 을 풀게 만들었다. 로컬에선 됐는데 **실서비스에서 막혔다** —
 *   rar 풀이 라이브러리가 내부에서 문자열을 코드로 실행(eval)하는데, 우리 보안정책(CSP)이
 *   그걸 금지한다. 개발 모드에선 그 금지가 풀려 있어서 «되는 줄» 알았다.
 *   보안정책을 낮추는 대신 푸는 일을 서버로 옮겼다(서버엔 그 제약이 없다).
 *
 * 어떻게 담나:
 *   낱장 601개를 따로 올리면 저장소 객체가 601개가 된다 → **시리즈별로 픽셀만 이어붙여 한 덩어리**로
 *   올리고, 브라우저는 보는 장의 «구간만» 잘라 받는다(Range). 한 장 = 512×512×2 = 512KB.
 *   덕분에 첫 화면이 134MB 를 기다리지 않는다.
 *   DICOM 해석은 여기서 다 끝내므로 브라우저는 숫자를 그림으로 바꾸기만 하면 된다.
 *
 * 실측(문의 #60 카자흐 CT): 풀기 2.1초 + 픽셀 뽑기 0.2초 · 시리즈 5개 · 생픽셀 합계 301MB
 */
export const runtime = "nodejs";
export const maxDuration = 300;

import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

const BUCKET = "attachments";
const MAX_SLICES = 1200; // 한 검사에 이보다 많으면 손대지 않는다(시간·저장소 폭주 방지)
const MANIFEST_V = 3;    // 3 = 글 기록(docs)·비의료 파일(extras) 포함. 낮으면 다시 푼다.
const URL_TTL = 60 * 60;

type SeriesOut = {
  uid: string; desc: string; modality: string;
  rows: number; cols: number; signed: boolean;
  slope: number; intercept: number; ww: number; wc: number;
  file: string; sliceBytes: number; count: number;
};

const manifestPath = (p: string) => `${p}.study.json`;
const seriesPath = (p: string, i: number) => `${p}.s${i}.bin`;

/** 앞 128바이트 뒤에 "DICM" 이 있으면 DICOM. 병원 CD 는 확장자가 없어 이걸로만 가른다. */
function looksDicom(b: Uint8Array): boolean {
  return b.length > 132 && b[128] === 0x44 && b[129] === 0x49 && b[130] === 0x43 && b[131] === 0x4d;
}

type Entry = { name: string; bytes: Uint8Array };

/** .rar / .zip / 낱개 .dcm → 안에 든 «모든» 파일. DICOM 인지는 부르는 쪽이 가른다. */
async function unpack(buf: Buffer): Promise<Entry[]> {
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  const isRar = buf[0] === 0x52 && buf[1] === 0x61 && buf[2] === 0x72 && buf[3] === 0x21;

  if (!isZip && !isRar) {
    return [{ name: "file", bytes: new Uint8Array(buf) }];
  }
  if (isZip) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buf);
    const out: Entry[] = [];
    for (const f of Object.values(zip.files)) {
      if ((f as any).dir) continue;
      out.push({ name: (f as any).name, bytes: await (f as any).async("uint8array") });
    }
    return out;
  }
  // ⚠️ rar 풀이는 **번들러를 거치지 않고** 불러온다.
  //   import() 로 부르면 Turbopack·webpack 이 딸린 .wasm 을 «모듈»로 삼키려다 실패한다
  //   (실측: "Module not found: Can't resolve 'a'"). createRequire 는 번들러 눈에 안 띈다.
  //   wasm 바이너리도 직접 읽어 넘긴다 — 안 넘기면 라이브러리가 스스로 찾다 죽는다
  //   ("Failed to parse URL from unrar.wasm").
  // ⚠️ 이 라이브러리는 WASM 을 딸고 다니는데, 번들 안에서는 스스로 그 파일을 못 찾는다
  //   ("Failed to parse URL from unrar.wasm"). 그래서 **우리가 직접 읽어 넘긴다.**
  //   createRequire 로 경로를 잡으려 해봤지만 빌드하면 그것도 껍데기가 된다
  //   ("g is not a function") — 실행 폴더 기준 고정 경로가 가장 튼튼했다.
  const { createExtractorFromData } = await import("node-unrar-js");
  const wasmRaw = await readFile(`${process.cwd()}/node_modules/node-unrar-js/esm/js/unrar.wasm`);
  const wasmBinary = new Uint8Array(wasmRaw).buffer as ArrayBuffer;
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const ex = await createExtractorFromData({ data: ab, wasmBinary });
  const names = [...ex.getFileList().fileHeaders].filter((h: any) => !h.flags.directory).map((h: any) => h.name);
  const files = [...ex.extract({ files: names }).files];
  return files.map((f: any) => ({ name: f.fileHeader?.name || "", bytes: new Uint8Array(f.extraction || []) }));
}

/**
 * 그림이 없는 DICOM(구조화 보고서 SR — 선량 기록 등)을 «글»로 편다.
 * 왜: 예전엔 «못 그리니 원본을 내려받아 보라»고만 했다. 내용은 멀쩡히 들어 있는데
 *   코디한테 다운로드를 시키는 건 안 보여주는 것과 같다(PO 지적 2026-08-03).
 * 무엇을 뽑나: 보고서의 트리를 그대로 따라가며 «항목 이름: 값»으로 옮긴다.
 *   요약하지 않는다 — 로우 데이터라 첨삭하면 안 된다.
 */
function srLines(ds: any): string[] {
  const S = (d: any, t: string) => { try { return d.string(t) || ""; } catch { return ""; } };
  const meaning = (d: any, seqTag: string) => {
    const f = d.elements?.[seqTag]?.items?.[0]?.dataSet;
    return f ? S(f, "x00080104") || S(f, "x00080100") : "";
  };
  const out: string[] = [];
  const walk = (d: any, depth: number) => {
    const seq = d.elements?.x0040a730; // ContentSequence
    if (!seq?.items || out.length > 600 || depth > 12) return;
    for (const it of seq.items) {
      const n = it.dataSet;
      if (!n) continue;
      const name = meaning(n, "x0040a043"); // ConceptNameCodeSequence
      const type = S(n, "x0040a040");       // ValueType
      let val = "";
      if (type === "TEXT") val = S(n, "x0040a160");
      else if (type === "CODE") val = meaning(n, "x0040a168");
      else if (type === "NUM") {
        const mv = n.elements?.x0040a300?.items?.[0]?.dataSet;
        if (mv) val = `${S(mv, "x0040a30a")} ${meaning(mv, "x004008ea")}`.trim();
      } else if (type === "DATE") val = S(n, "x0040a121");
      else if (type === "DATETIME") val = S(n, "x0040a120");
      const pad = "  ".repeat(depth);
      if (type === "CONTAINER") { if (name) out.push(`${pad}[${name}]`); }
      else if (name || val) out.push(`${pad}${name}${val ? `: ${val}` : ""}`);
      walk(n, depth + 1);
    }
  };
  walk(ds, 0);
  return out;
}

/** CD 에 딸려 오는 비의료 파일(자체 뷰어·목차·라벨)을 사람 말로 분류. */
function extraKind(name: string): string {
  const n = name.toUpperCase();
  if (n.endsWith("DICOMDIR")) return "CD 목차 파일(DICOMDIR)";
  if (/\.(EXE|JAR|DLL|INF|PRO|BAT)$/.test(n)) return "CD 자체 뷰어 프로그램";
  if (/\.(HTM|HTML|TXT|PDF|RTF)$/.test(n)) return "CD 라벨·안내 쪽";
  return "그 밖의 파일";
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { path } = await request.json();
    if (typeof path !== "string" || !path.startsWith(`inquiry/${id}/`)) {
      return Response.json({ ok: false, error: "invalid_path" }, { status: 400 });
    }

    // 이미 정리해 둔 게 있으면 그걸 쓴다(같은 검사를 두 번 풀지 않는다).
    let series: SeriesOut[] | null = null;
    let skippedOut: { desc: string; modality: string; count: number }[] = [];
    let docsOut: { key: string; desc: string; modality: string; lines: string[] }[] = [];
    let extrasOut: { kind: string; count: number }[] = [];
    const cached = await supabaseAdmin.storage.from(BUCKET).download(manifestPath(path));
    if (cached.data) {
      try {
        const m = JSON.parse(await cached.data.text());
        // 판이 낮으면 다시 푼다 — 예전 목록엔 «글 기록(docs)»이 없다.
        if ((m.v || 1) >= MANIFEST_V) {
          series = m.series;
          skippedOut = m.skipped || [];
          docsOut = m.docs || [];
          extrasOut = m.extras || [];
        }
      } catch { series = null; }
    }

    if (!series) {
      const dl = await supabaseAdmin.storage.from(BUCKET).download(path);
      if (dl.error || !dl.data) return Response.json({ ok: false, error: "download_failed" }, { status: 404 });
      const buf = Buffer.from(await dl.data.arrayBuffer());

      const entries = await unpack(buf);
      const items = entries.filter((e) => looksDicom(e.bytes));
      // 의료 내용이 아닌 것(뷰어 프로그램·목차·라벨)은 종류별 건수만 남긴다 — 조용히 없애지 않되, 겁주지도 않는다.
      const extraMap = new Map<string, number>();
      for (const e of entries) {
        if (looksDicom(e.bytes)) continue;
        const k = extraKind(e.name);
        extraMap.set(k, (extraMap.get(k) || 0) + 1);
      }
      if (!items.length) return Response.json({ ok: false, error: "no_dicom" }, { status: 400 });
      if (items.length > MAX_SLICES) return Response.json({ ok: false, error: "too_many_slices" }, { status: 400 });

      const dicomParser = (await import("dicom-parser")).default;
      const groups = new Map<string, { meta: any; slices: { instance: number; pixels: Buffer }[] }>();
      // 그림이 없는 항목(선량 기록 SR 등)은 «글»로 펴서 같은 화면에서 보여준다.
      // 글로도 못 펴는 것만 skipped 로 남긴다 — 조용히 빼면 «CD 안에 이게 전부»로 착각한다.
      const skipped = new Map<string, { desc: string; modality: string; count: number }>();
      const docs: { key: string; desc: string; modality: string; lines: string[] }[] = [];

      for (const { name: entryName, bytes } of items) {
        let ds: any;
        try { ds = dicomParser.parseDicom(bytes); } catch { continue; }
        const el = ds.elements.x7fe00010;
        if (!el) {
          const g = (t: string, dflt = "") => { try { return ds.string(t) || dflt; } catch { return dflt; } };
          const lines = srLines(ds);
          if (lines.length) {
            docs.push({
              key: `d${docs.length}`,
              desc: g("x0008103e") || g("x00081030") || "기록",
              modality: g("x00080060"),
              lines,
            });
            continue;
          }
          // DICOMDIR 은 CD 의 목차일 뿐 «못 본 의료자료»가 아니다 — 경고로 띄우면 헛불안이다.
          if (/DICOMDIR$/i.test(entryName)) {
            const kk = extraKind(entryName);
            extraMap.set(kk, (extraMap.get(kk) || 0) + 1);
            continue;
          }
          const k = g("x0020000e", "?");
          const g0 = skipped.get(k) || {
            // DICOMDIR 처럼 이름표가 아예 없는 것도 «무엇인지»는 말해준다.
            desc: g("x0008103e") || extraKind(entryName),
            modality: g("x00080060"),
            count: 0,
          };
          g0.count++;
          skipped.set(k, g0);
          continue;
        }
        const str = (t: string) => { try { return ds.string(t) || ""; } catch { return ""; } };
        const u16 = (t: string) => { try { return ds.uint16(t) || 0; } catch { return 0; } };
        const first = (v: string) => parseFloat(String(v).split("\\")[0]);

        const uid = str("x0020000e") || "unknown";
        if (!groups.has(uid)) {
          groups.set(uid, {
            meta: {
              uid,
              desc: str("x0008103e") || "(이름 없음)",
              modality: str("x00080060") || "",
              rows: u16("x00280010"),
              cols: u16("x00280011"),
              signed: u16("x00280103") === 1,
              slope: first(str("x00281053")) || 1,
              intercept: first(str("x00281052")) || 0,
              ww: first(str("x00281051")) || 400,
              wc: first(str("x00281050")) || 40,
              sliceBytes: el.length,
            },
            slices: [],
          });
        }
        const g = groups.get(uid)!;
        // 한 시리즈 안에서 크기가 다른 장이 섞이면 구간 계산이 어긋난다 — 그런 장은 뺀다.
        if (el.length !== g.meta.sliceBytes) continue;
        g.slices.push({
          instance: parseInt(str("x00200013") || "0", 10),
          pixels: Buffer.from(bytes.buffer, bytes.byteOffset + el.dataOffset, el.length),
        });
      }

      const built: SeriesOut[] = [];
      // 장수가 많은 것부터 — Scout 2장짜리가 먼저 뜨면 «영상이 이게 다야?» 가 된다.
      const ordered = [...groups.values()].sort((a, b) => b.slices.length - a.slices.length);
      for (let i = 0; i < ordered.length; i++) {
        const g = ordered[i];
        if (!g.slices.length || !g.meta.rows || !g.meta.cols) continue;
        g.slices.sort((a, b) => a.instance - b.instance);
        const file = seriesPath(path, i);
        const blob = Buffer.concat(g.slices.map((s) => s.pixels));
        const up = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(file, blob, { contentType: "application/octet-stream", upsert: true });
        if (up.error) {
          console.error("[imaging] series upload:", up.error.message);
          return Response.json({ ok: false, error: "prepare_failed" }, { status: 500 });
        }
        built.push({ ...g.meta, file, count: g.slices.length });
      }
      if (!built.length) return Response.json({ ok: false, error: "no_dicom" }, { status: 400 });

      // ⚠️ contentType 을 application/json 으로 주면 버킷의 형식 화이트리스트에 걸려 «조용히» 실패한다.
      //   그러면 목록이 안 남아 열 때마다 601장을 다시 푼다(실측: 매번 16초). octet-stream 으로.
      const mUp = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(
          manifestPath(path),
          Buffer.from(JSON.stringify({
            v: MANIFEST_V,
            series: built,
            skipped: [...skipped.values()],
            docs,
            extras: [...extraMap.entries()].map(([kind, count]) => ({ kind, count })),
          })),
          { contentType: "application/octet-stream", upsert: true }
        );
      if (mUp.error) console.error("[imaging] manifest 저장 실패(다음에 또 푼다):", mUp.error.message);
      series = built;
      skippedOut = [...skipped.values()];
      docsOut = docs;
      extrasOut = [...extraMap.entries()].map(([kind, count]) => ({ kind, count }));
    }

    // 시리즈 덩어리마다 서명 주소 — 브라우저는 보는 장의 구간만 잘라 받는다.
    const { data: signed } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(series.map((s) => s.file), URL_TTL);
    const urls: Record<string, string> = {};
    (signed || []).forEach((s: any) => { if (s?.path && s?.signedUrl) urls[s.path] = s.signedUrl; });

    return Response.json({ ok: true, series, urls, skipped: skippedOut, docs: docsOut, extras: extrasOut });
  } catch (err) {
    console.error("[imaging] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
