/**
 * 병원 CD(CT 영상) 를 브라우저에서 열어 보여주기 위한 부품 (브라우저 전용).
 *
 * 왜 이렇게 만들었나 (2026-08-03, 문의 #60 카자흐 환자 CT):
 *   병원이 준 건 CD 통째 압축본이었다 — 134MB .rar 안에 확장자 없는 파일 601개.
 *   열려면 자바를 깔고 CD 뷰어를 실행해야 했다. 그걸 웹에서 그냥 보게 만든다.
 *
 * 실측으로 확인한 것(그 실제 파일):
 *   · 601개 전부 진짜 DICOM (오프셋 128 에 "DICM")
 *   · 전송구문 1.2.840.10008.1.2.1 = **압축 안 된** Explicit VR Little Endian
 *   · 512×512, 16비트 부호있음, 창 350/40, 기울기 1 / 절편 -1024
 *   → 압축이 없으니 무거운 영상 라이브러리(cornerstone + WASM 코덱) 없이
 *     dicom-parser 로 값만 읽고 캔버스에 직접 그리면 된다.
 *
 * 서버로 601개를 풀어 올리지 않고 **볼 때 브라우저에서 푼다.** 저장소엔 묶음 파일 하나만 둔다.
 */

const DICM = [0x44, 0x49, 0x43, 0x4d];

/** 파일 앞부분이 진짜 DICOM 인지 — 확장자를 못 믿는다(병원 CD 는 보통 확장자가 없다). */
export function looksDicom(bytes) {
  if (!bytes || bytes.length < 133) return false;
  return DICM.every((c, i) => bytes[128 + i] === c);
}

/** 묶음(.zip/.rar) 또는 낱개 .dcm → DICOM 바이트 배열 목록. onProgress(0~1). */
export async function unpackStudy(arrayBuffer, fileName = "", onProgress) {
  const head = new Uint8Array(arrayBuffer.slice(0, 8));
  const isZip = head[0] === 0x50 && head[1] === 0x4b;
  const isRar = head[0] === 0x52 && head[1] === 0x61 && head[2] === 0x72 && head[3] === 0x21;

  if (!isZip && !isRar) {
    const one = new Uint8Array(arrayBuffer);
    return looksDicom(one) ? [{ name: fileName || "slice", bytes: one }] : [];
  }

  const out = [];
  if (isZip) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(arrayBuffer);
    const entries = Object.values(zip.files).filter((f) => !f.dir);
    for (let i = 0; i < entries.length; i++) {
      const bytes = new Uint8Array(await entries[i].async("uint8array"));
      if (looksDicom(bytes)) out.push({ name: entries[i].name, bytes });
      onProgress?.((i + 1) / entries.length);
    }
  } else {
    const { createExtractorFromData } = await import("node-unrar-js");
    // rar 풀이는 WASM 이라 그 바이너리를 직접 줘야 한다. 안 주면 브라우저가 스스로 못 찾아
    // «both async and sync fetching of the wasm failed» 로 죽는다(실측). public/wasm 에 복사해 둠.
    const wasmBinary = await (await fetch("/wasm/unrar.wasm")).arrayBuffer();
    const ex = await createExtractorFromData({ data: arrayBuffer, wasmBinary });
    const names = [...ex.getFileList().fileHeaders]
      .filter((h) => !h.flags.directory)
      .map((h) => h.name);
    // 한 번에 전부 뽑는다(낱개로 부르면 601번 압축을 다시 훑어 훨씬 느리다).
    const files = [...ex.extract({ files: names }).files];
    for (let i = 0; i < files.length; i++) {
      const bytes = new Uint8Array(files[i].extraction || []);
      if (looksDicom(bytes)) out.push({ name: files[i].fileHeader.name, bytes });
      onProgress?.((i + 1) / files.length);
    }
  }
  return out;
}

/** DICOM 낱장들 → 시리즈별로 묶고 장 번호로 정렬. */
export async function buildSeries(items) {
  const dicomParser = (await import("dicom-parser")).default;
  const map = new Map();

  for (const it of items) {
    let ds;
    try { ds = dicomParser.parseDicom(it.bytes); } catch { continue; }
    const str = (t) => { try { return ds.string(t) || ""; } catch { return ""; } };
    const num = (t) => { try { return ds.uint16(t); } catch { return 0; } };

    const uid = str("x0020000e") || "unknown";
    if (!map.has(uid)) {
      map.set(uid, {
        uid,
        modality: str("x00080060") || "",
        description: str("x0008103e") || "(이름 없음)",
        windowWidth: parseFloat(String(str("x00281051")).split("\\")[0]) || 400,
        windowCenter: parseFloat(String(str("x00281050")).split("\\")[0]) || 40,
        slices: [],
      });
    }
    map.get(uid).slices.push({
      instance: parseInt(str("x00200013") || "0", 10),
      rows: num("x00280010"),
      cols: num("x00280011"),
      bits: num("x00280100"),
      signed: num("x00280103") === 1,
      slope: parseFloat(str("x00281053")) || 1,
      intercept: parseFloat(str("x00281052")) || 0,
      element: ds.elements.x7fe00010,
      bytes: it.bytes,
    });
  }

  const series = [...map.values()];
  series.forEach((s) => s.slices.sort((a, b) => a.instance - b.instance));
  // 장수가 많은 시리즈(진짜 판독용)를 앞에 — Scout 2장짜리가 먼저 뜨면 «영상이 이게 다야?» 가 된다.
  series.sort((a, b) => b.slices.length - a.slices.length);
  return series;
}

/**
 * 한 장을 캔버스에 그린다. CT 는 값 범위가 넓어(-1024~3000 HU) 그대로는 안 보인다 —
 * 「창(window)」으로 볼 구간을 잘라서 0~255 로 편다. 그게 방사선과에서 쓰는 그 창이다.
 */
export function drawSlice(canvas, slice, windowWidth, windowCenter) {
  if (!slice?.element) return false;
  const { rows, cols, signed, slope, intercept, bytes, element } = slice;
  const n = rows * cols;
  const raw = signed
    ? new Int16Array(bytes.buffer, bytes.byteOffset + element.dataOffset, n)
    : new Uint16Array(bytes.buffer, bytes.byteOffset + element.dataOffset, n);

  const lo = windowCenter - windowWidth / 2;
  const scale = 255 / (windowWidth || 1);

  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(cols, rows);
  const d = img.data;
  for (let i = 0; i < n; i++) {
    let v = (raw[i] * slope + intercept - lo) * scale;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    const p = i << 2;
    d[p] = d[p + 1] = d[p + 2] = v;
    d[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return true;
}

/** 방사선과에서 쓰는 표준 창 — 보려는 조직에 따라 바꾼다. */
export const WINDOW_PRESETS = [
  { key: "soft", label: "복부·연부조직", ww: 350, wc: 40 },
  { key: "lung", label: "폐", ww: 1500, wc: -600 },
  { key: "bone", label: "뼈", ww: 2000, wc: 400 },
  { key: "brain", label: "뇌", ww: 80, wc: 40 },
];
