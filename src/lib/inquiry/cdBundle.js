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
  return mb >= 100 ? `${Math.round(mb)}MB` : `${Math.round(mb * 10) / 10}MB`;
}
