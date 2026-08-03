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

/** .rar / .zip / 낱개 .dcm → 파일 바이트 목록 */
async function unpack(buf: Buffer, name: string): Promise<Uint8Array[]> {
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  const isRar = buf[0] === 0x52 && buf[1] === 0x61 && buf[2] === 0x72 && buf[3] === 0x21;

  if (!isZip && !isRar) {
    const one = new Uint8Array(buf);
    return looksDicom(one) ? [one] : [];
  }
  if (isZip) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buf);
    const out: Uint8Array[] = [];
    for (const f of Object.values(zip.files)) {
      if ((f as any).dir) continue;
      const b = await (f as any).async("uint8array");
      if (looksDicom(b)) out.push(b);
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
  return files.map((f: any) => new Uint8Array(f.extraction || [])).filter(looksDicom);
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
    const cached = await supabaseAdmin.storage.from(BUCKET).download(manifestPath(path));
    if (cached.data) {
      try { series = JSON.parse(await cached.data.text()).series; } catch { series = null; }
    }

    if (!series) {
      const dl = await supabaseAdmin.storage.from(BUCKET).download(path);
      if (dl.error || !dl.data) return Response.json({ ok: false, error: "download_failed" }, { status: 404 });
      const buf = Buffer.from(await dl.data.arrayBuffer());

      const items = await unpack(buf, path);
      if (!items.length) return Response.json({ ok: false, error: "no_dicom" }, { status: 400 });
      if (items.length > MAX_SLICES) return Response.json({ ok: false, error: "too_many_slices" }, { status: 400 });

      const dicomParser = (await import("dicom-parser")).default;
      const groups = new Map<string, { meta: any; slices: { instance: number; pixels: Buffer }[] }>();

      for (const bytes of items) {
        let ds: any;
        try { ds = dicomParser.parseDicom(bytes); } catch { continue; }
        const el = ds.elements.x7fe00010;
        if (!el) continue;
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
        .upload(manifestPath(path), Buffer.from(JSON.stringify({ v: 1, series: built })), {
          contentType: "application/octet-stream",
          upsert: true,
        });
      if (mUp.error) console.error("[imaging] manifest 저장 실패(다음에 또 푼다):", mUp.error.message);
      series = built;
    }

    // 시리즈 덩어리마다 서명 주소 — 브라우저는 보는 장의 구간만 잘라 받는다.
    const { data: signed } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(series.map((s) => s.file), URL_TTL);
    const urls: Record<string, string> = {};
    (signed || []).forEach((s: any) => { if (s?.path && s?.signedUrl) urls[s.path] = s.signedUrl; });

    return Response.json({ ok: true, series, urls });
  } catch (err) {
    console.error("[imaging] exception:", err);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
