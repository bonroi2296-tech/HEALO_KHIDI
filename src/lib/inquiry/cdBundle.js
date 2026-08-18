/**
 * 병원 CD(CT·MRI) 를 브라우저에서 하나로 묶는다.
 *
 * 왜 환자에게 압축을 안 시키나: CD 안에 낱장 영상이 수백 개라 하나씩 고를 수 없고,
 * 「압축해서 올려주세요」는 러시아어권 어르신에게 통하지 않는다.
 * 폴더째 고르게 하고 묶는 건 우리가 한다.
 *
 * 실측 (크롬, 합성 CT 601장 = 실제 문의 #60 과 같은 장수, 원본 301MB):
 *   수준1 : 13.2초 / 100MB   ← 이걸 쓴다
 *   수준6 : 18.4초 /  97MB   (5초 더 쓰고 3MB 아낌 — 남는 장사가 아니다)
 *   안묶음:  4.0초 / 301MB   (3배를 더 올려야 한다)
 *   메모리 최대 605MB (개발 PC 기준. 환자 PC 는 2~3배 느릴 수 있어 최악 40초로 본다)
 *
 * 🛑 손실 압축(화질 낮추기) 금지 — 버린 점 하나가 병변일 수 있고 그건 우리가 할 판단이 아니다.
 *    DEFLATE 는 무손실이라 원본 그대로 복원된다.
 */

/** 폴더 고르기가 되는 기기인가. 폰·태블릿은 안 된다 → 영상을 «요구하지 않는다». */
export function canPickFolder() {
  if (typeof document === "undefined") return false;
  const el = document.createElement("input");
  return "webkitdirectory" in el && !isProbablyPhone();
}

export function isProbablyPhone() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

/** DICOM 은 확장자가 없는 경우가 흔하다(IM_0001 등). 그래서 «빼는» 목록으로 거른다. */
const SKIP = /^(autorun\.inf|.*\.exe|.*\.jar|.*\.dll|.*\.bat|.*\.htm|.*\.html|.*\.ini|desktop\.ini|thumbs\.db|\.ds_store)$/i;

/** CD 폴더에서 «올릴 만한» 파일만 고른다. 뷰어 프로그램·자동실행 파일은 뺀다. */
export function pickImagingFiles(fileList) {
  return Array.from(fileList || []).filter((f) => !SKIP.test(f.name) && f.size > 0);
}

export const sumBytes = (files) => files.reduce((n, f) => n + f.size, 0);

/**
 * 고른 파일들을 zip 하나로 묶는다.
 * @param onProgress ({done, total, percent}) — 진행 표시용. 없으면 조용히 돈다.
 * @returns File (zip)
 */
export async function bundleToZip(files, { name = "medical-images.zip", onProgress } = {}) {
  // jszip 은 무겁다(약 100KB). 폴더를 «실제로 고른 뒤»에만 받아온다.
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  for (const f of files) {
    // webkitRelativePath 가 있으면 CD 안의 폴더 구조를 그대로 지킨다.
    // DICOMDIR 이 상대 경로로 낱장을 가리키므로 구조가 깨지면 뷰어가 못 읽는다.
    zip.file(f.webkitRelativePath || f.name, f, { binary: true });
  }

  const blob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 1 } },
    (meta) => onProgress?.({ percent: Math.round(meta.percent), currentFile: meta.currentFile })
  );
  return new File([blob], name, { type: "application/zip" });
}

export function formatMB(bytes) {
  const mb = bytes / 1024 / 1024;
  // 「0MB」는 «고장난 것»으로 읽힌다(2026-08-14 화면 실측). 작은 건 KB 로 말한다.
  if (mb < 0.1) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return mb >= 100 ? `${Math.round(mb)}MB` : `${Math.round(mb * 10) / 10}MB`;
}

/**
 * 끌어다 놓은 것에서 파일을 «폴더 안까지» 전부 꺼낸다.
 *
 * 왜 필요한가: CD 폴더를 통째로 끌어다 놓으면 `dataTransfer.files` 에는 아무것도 안 들어온다
 * (폴더는 파일이 아니다). 안을 보려면 `webkitGetAsEntry()` 로 한 겹씩 내려가야 한다.
 *
 * ⚠️ `readEntries` 는 한 번에 «최대 100개»만 준다 — 한 번만 부르면 파일이 조용히 잘린다.
 *    빈 배열이 올 때까지 반복해야 한다. CD 한 장이 수백~수천 장이라 이건 반드시 걸린다.
 */
export async function filesFromDrop(dataTransfer, { maxFiles = 20000 } = {}) {
  const entries = Array.from(dataTransfer?.items || [])
    .map((it) => (typeof it.webkitGetAsEntry === "function" ? it.webkitGetAsEntry() : null))
    .filter(Boolean);
  // 폴더를 못 읽는 브라우저면 평범한 파일 목록으로 물러선다.
  if (!entries.length) return Array.from(dataTransfer?.files || []);

  const out = [];
  const walk = async (entry, prefix) => {
    if (out.length >= maxFiles) return;
    if (entry.isFile) {
      const file = await new Promise((res) => entry.file(res, () => res(null)));
      if (!file) return;
      // 폴더 경로를 살려둔다 — 걸러내기(pickImagingFiles)가 이 값을 본다.
      try {
        Object.defineProperty(file, "webkitRelativePath", { value: prefix + file.name });
      } catch { /* 못 붙여도 파일 자체는 쓸 수 있다 */ }
      out.push(file);
      return;
    }
    if (!entry.isDirectory) return;
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res) => reader.readEntries(res, () => res([])));
      if (!batch.length) break;                      // ← 여기서 끝. 한 번만 부르면 100개에서 잘린다
      for (const e of batch) await walk(e, prefix + entry.name + "/");
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
}

/**
 * 끌어다 놓은 것을 «폴더»와 «낱개 파일»로 갈라준다.
 *
 * 왜 (2026-08-18 PO: 「파일이랑 폴더 둘 다 가능하게 하면 되는 거 아냐?」):
 * 폴더 하나만 보고 전부를 CD 길로 보내면, 같이 놓은 서류(PDF 등)가 조용히 사라진다.
 * 두 갈래는 처리가 다르다 — 폴더는 통째로 묶어 하나로 올리고, 낱개 서류는 한 장씩 읽어
 * 칸을 채운다. 그러니 «갈라서» 각자 길로 보낸다.
 */
export async function splitDrop(dataTransfer) {
  const items = Array.from(dataTransfer?.items || []);
  const entries = items
    .map((it) => (typeof it.webkitGetAsEntry === "function" ? it.webkitGetAsEntry() : null))
    .filter(Boolean);

  // 폴더를 못 읽는 브라우저면 전부 낱개 파일로 본다.
  if (!entries.length) return { folderFiles: [], looseFiles: Array.from(dataTransfer?.files || []) };

  const dirs = entries.filter((e) => e.isDirectory);
  const files = entries.filter((e) => e.isFile);

  const folderFiles = dirs.length
    ? await filesFromDrop({ items: dirs.map((e) => ({ webkitGetAsEntry: () => e })), files: [] })
    : [];
  const looseFiles = files.length
    ? await filesFromDrop({ items: files.map((e) => ({ webkitGetAsEntry: () => e })), files: [] })
    : [];

  return { folderFiles, looseFiles };
}
