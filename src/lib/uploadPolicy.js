/**
 * 업로드 규칙 단일 출처 — 「무슨 형식을 몇 MB 까지 받나」를 여기서만 정한다.
 *
 * 왜: 화면마다 accept 목록이 제각각이었다(어떤 곳은 Word 를 받고 어떤 곳은 안 받고,
 * 안내 문구엔 20MB 인데 실제로는 4.5MB 였고…). 사용자는 «뭘 올릴 수 있는지» 화면에서
 * 알 수 없었고, 우리도 서버·화면 두 곳을 따로 고치다 어긋났다.
 * 이제 화면의 파일 선택 칸·안내 문구·서버 검사가 전부 이 파일을 본다.
 *
 * ⚠️ 여기 값을 바꾸면 서버 쪽 상수(app/api/**)도 같이 봐야 한다 — 서버가 최종 방어선이다.
 */

export const MAX_DOC_BYTES = 200 * 1024 * 1024; // 저장소 전역 상한과 동일(실측 200MB 성공/201MB 거부)
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 어드민 이미지 — 서버 경유라 Vercel 4.5MB 벽 안쪽

const MB = (b) => Math.round(b / 1024 / 1024);

/**
 * 상황별 규칙.
 *  exts  : 사용자에게 보여줄 확장자 이름 (화면 표기용)
 *  accept: <input type="file" accept="..."> 값
 *  mimes : 서버·클라 공통 화이트리스트
 */
export const UPLOAD_POLICY = {
  // 환자 의료서류(문의 첨부·환자 서류함·비자·코디 대리 업로드)
  // 세브란스 의뢰서가 「JPG, MS, DICOM 등」을 받는다고 안내한다 → 낱개 DICOM 도 여기서 받는다.
  // 🛑 DICOM 은 «확장자가 없는» 경우가 흔하다. 2026-08-18 실측(환자 CD 601개): 파일 이름이
  //    Z01·Z02… 로 확장자가 아예 없었고, 128바이트째에 "DICM" 이 있어야 DICOM 이다.
  //    그래서 확장자·브라우저 형식만 믿으면 안 되고, 서버의 앞머리 검사(fileMagic)가 진짜 문지기다.
  // 🔊 음성·텍스트도 받는다(2026-09-02 PO 지시). 환자가 증상을 글로 적기 어려울 때 음성 메모를
  //    보내는 경로가 실제로 있다(왓즈앱·텔레그램 음성은 ogg, 아이폰 음성 메모는 m4a, 구형 안드로이드는 amr).
  //    ⚠️ 여기 «별칭»(audio/x-m4a 등)도 함께 적는 이유: 화면 검사(checkFile)는 브라우저가 준
  //    file.type 을 그대로 보기 때문이다. 서버로 갈 때는 normalizeMime 이 대표 이름 하나로 모은다
  //    — 안 모으면 sign 은 통과하고 앞머리 검사가 지워서 「올렸는데 사라짐」이 된다.
  medicalDoc: {
    exts: ["PDF", "JPG", "PNG", "WebP", "Word", "DICOM", "MP3", "M4A", "TXT"],
    accept: ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.dcm,.mp3,.m4a,.wav,.ogg,.oga,.opus,.webm,.amr,.txt,application/pdf,image/jpeg,image/png,image/gif,image/webp,application/dicom,audio/*,text/plain",
    mimes: [
      "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/dicom",
      // 음성 — 앞이 대표 이름, 뒤는 브라우저가 대신 보내는 별칭.
      "audio/mpeg",
      "audio/mp4", "audio/x-m4a", "audio/m4a",
      "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave",
      "audio/ogg", "audio/opus",
      "audio/webm",
      "audio/amr", "audio/3gpp",
      // 텍스트 메모
      "text/plain",
    ],
    maxBytes: MAX_DOC_BYTES,
  },
  // 영상자료 — 병원 CD 를 통째로. 안에 든 DICOM 을 서버가 풀어서 뷰어로 보여준다.
  imaging: {
    exts: ["ZIP", "RAR", "DICOM(.dcm)"],
    accept: ".zip,.rar,.dcm,application/zip,application/x-rar-compressed,application/vnd.rar,application/dicom",
    mimes: [
      "application/zip", "application/x-zip-compressed",
      "application/x-rar-compressed", "application/vnd.rar",
      "application/dicom", "application/octet-stream", // 브라우저가 .dcm·.rar 을 못 알아보는 경우
    ],
    maxBytes: MAX_DOC_BYTES,
  },
  // 어드민·병원 화면의 이미지(로고·대표사진 등)
  image: {
    exts: ["JPG", "PNG", "WebP"],
    accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
    mimes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: MAX_IMAGE_BYTES,
  },
};

// 「최대」에 해당하는 말 — 활성 6개 언어.
const MAX_WORD = { ko: "최대", en: "up to", ru: "до", kz: "дейін", zh: "最大", ja: "最大" };

/**
 * 화면에 그대로 붙일 안내 문구.
 *   describeUpload("medicalDoc", "ko") → "PDF · JPG · PNG · WebP · Word · 최대 200MB"
 * kz 는 「200MB дейін」처럼 뒤에 붙는 게 자연스러워 순서를 바꾼다.
 */
export function describeUpload(kind, lang = "ko") {
  const p = UPLOAD_POLICY[kind];
  if (!p) return "";
  const size = `${MB(p.maxBytes)}MB`;
  const word = MAX_WORD[lang] || MAX_WORD.en;
  const tail = lang === "kz" ? `${size} ${word}` : `${word} ${size}`;
  return `${p.exts.join(" · ")} · ${tail}`;
}

/** 파일 하나가 규칙에 맞는지. 안 맞으면 화면이 그대로 쓸 수 있는 사유 코드를 준다. */
export function checkFile(kind, file) {
  const p = UPLOAD_POLICY[kind];
  if (!p || !file) return { ok: false, error: "file_required" };
  if (file.size > p.maxBytes) return { ok: false, error: "file_too_large" };
  // 브라우저가 확장자를 못 알아보면 type 이 빈 문자열로 온다(.dcm·.rar 이 자주 그렇다).
  // 그 경우는 서버가 실제 내용을 보고 판정하므로 여기서 막지 않는다.
  if (file.type && !p.mimes.includes(file.type)) return { ok: false, error: "invalid_file_type" };
  return { ok: true };
}
