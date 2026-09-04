/**
 * 브라우저 → Supabase Storage 직행 업로드 (서버 쪽 공용 부품)
 *
 * 왜 필요한가: 파일을 우리 서버(Vercel 함수)로 통과시키면 요청 본문 4.5MB 에서
 * 우리 코드에 닿기도 전에 413 으로 끊긴다(실측 2026-08-03: 4MB 통과 / 5MB 거부).
 * 화면마다 "20MB 까지"라고 적어놨어도 실제로는 전부 4.5MB 였다.
 *
 * 그래서 업로드는 2단계로 나눈다:
 *   1) sign   — 서버가 «이 경로 하나에만» 쓸 수 있는 일회용 URL 을 내준다
 *   2) commit — 브라우저가 올린 뒤, 서버가 파일 앞 512바이트를 읽어 위장 여부를 확인한다
 *
 * 서버 경유 때 있던 검사(크기·MIME·magic bytes)는 그대로 유지된다. 다만 크기·MIME 은
 * 「선언값」이라 버킷의 file_size_limit / allowed_mime_types 로도 같이 막아야 진짜 방어가 된다.
 */
import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { verifyFileMagic } from "@/lib/security/fileMagic";
import { randomUUID } from "node:crypto";

export type UploadPhase = "sign" | "commit";

export interface SignBody {
  phase?: UploadPhase;
  name?: string;
  type?: string;
  size?: number;
  path?: string;
}

/**
 * 저장소에 쓸 «파일 이름 조각» 세척. 화면에 보이는 이름이 아니다 —
 * 원래 이름은 DB(attachments[].name)에 그대로 남고, 여기서 만드는 건 저장소 키뿐이다.
 *
 * ⚠️ 아스키만 남긴다. 한글을 살려두면 Supabase 가 **키를 거부한다**
 *   (실측 2026-08-03: `신장_초음파_검사.jpg` → 서명은 200 으로 내주고 PUT 에서 400 InvalidKey).
 *   서명 단계는 통과하므로 화면엔 그냥 「업로드 실패」만 뜬다 — 원인이 안 보인다.
 *   키릴 파일명은 원래부터 `_` 로 바뀌어 살아남았고, 한글만 예외로 열어둔 게 화근이었다.
 *
 * 🛠 2026-08-14: 아스키 규칙은 그대로 두되 «정보를 잃지 않게» 고쳤다.
 *   그전엔 러시아어 이름이 통째로 날아갔다 — `выписка_тест.pdf` → `__.pdf`.
 *   충돌은 앞의 UUID 가 막아주지만 저장소를 직접 열면 파일이 전부 `__.pdf` 라 구분이 안 됐다.
 *   → 키릴은 «옮겨 적고»(vypiska_test.pdf), 그래도 몸통이 비면 `file` 을 준다.
 */
const CYRILLIC: Record<string, string> = {
  а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ё:"e", ж:"zh", з:"z", и:"i", й:"y",
  к:"k", л:"l", м:"m", н:"n", о:"o", п:"p", р:"r", с:"s", т:"t", у:"u", ф:"f",
  х:"kh", ц:"ts", ч:"ch", ш:"sh", щ:"sch", ъ:"", ы:"y", ь:"", э:"e", ю:"yu", я:"ya",
  // 카자흐어에만 있는 글자
  ә:"a", ғ:"g", қ:"q", ң:"ng", ө:"o", ұ:"u", ү:"u", һ:"h", і:"i",
};

function translit(s: string): string {
  return s.replace(/[Ѐ-ӿ]/g, (ch) => {
    const low = ch.toLowerCase();
    const mapped = CYRILLIC[low];
    if (mapped === undefined) return "_";
    if (ch === low || !mapped) return mapped;
    return mapped.charAt(0).toUpperCase() + mapped.slice(1);
  });
}

export function sanitizeFileName(name: string): string {
  // ① é·ü 같은 라틴 확장 글자는 악센트만 떼면 살아난다 ② 키릴은 음차 ③ 나머지는 «_»
  const ascii = translit(name.normalize("NFKD").replace(/[̀-ͯ]/g, ""))
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);

  // 이름이 통째로 날아간 경우(한글·중국어 등) — 아무 정보도 없는 키가 된다.
  // 확장자는 살리고 몸통엔 최소한의 이름을 준다. 원래 이름은 DB 에 그대로 남아 있다.
  const m = ascii.match(/^(.*?)(\.[a-zA-Z0-9]{1,8})?$/);
  const stem = (m?.[1] ?? ascii).replace(/[._-]/g, "");
  return stem ? ascii : `file${m?.[2] ?? ""}`;
}

/**
 * 같은 음성 파일을 브라우저마다 다른 이름으로 부른다 — 대표 이름 하나로 모은다.
 * .3gp 는 이름만 다를 뿐 속은 MP4 와 같은 상자(ftyp)라 audio/mp4 로 묶는다.
 * .opus 는 속이 Ogg 상자라 audio/ogg 로 묶는다.
 */
const AUDIO_ALIAS: Record<string, string> = {
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/3gpp": "audio/mp4",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/opus": "audio/ogg",
};

/**
 * 확장자만 있고 브라우저가 MIME 을 못 알아본 경우 보정.
 * .dcm(의료영상)은 표준 MIME 이 없어 브라우저가 빈 문자열로 준다 — 병원 CD 자료가 이 경우.
 */
export function normalizeMime(name: string, declared: string): string {
  // 브라우저마다 다른 이름으로 오는 것을 «앞머리 검사가 아는 이름»으로 맞춘다. 안 맞추면 sign 은 통과하고
  // commit 의 앞머리 검사가 mime_mismatch 로 지운다 — 환자 눈엔 「올렸는데 사라짐」(독립 리뷰 3건 지적).
  if (declared === "application/x-rar-compressed") return "application/vnd.rar";
  if (AUDIO_ALIAS[declared]) return AUDIO_ALIAS[declared];
  if (declared === "application/octet-stream") {
    if (/\.rar$/i.test(name)) return "application/vnd.rar";
    if (/\.zip$/i.test(name)) return "application/zip";
    declared = "";   // 나머지는 확장자로 다시 본다(.dcm·확장자 없음 → DICOM)
  }
  if (declared) return declared;
  if (/\.dcm$/i.test(name)) return "application/dicom";
  // 음성·텍스트 — 윈도우·안드로이드는 .m4a·.amr 의 형식 이름을 아예 안 준다(빈 문자열).
  if (/\.mp3$/i.test(name)) return "audio/mpeg";
  if (/\.(m4a|mp4a|3gp|3gpp)$/i.test(name)) return "audio/mp4";
  if (/\.wav$/i.test(name)) return "audio/wav";
  if (/\.(ogg|oga|opus)$/i.test(name)) return "audio/ogg";
  if (/\.webm$/i.test(name)) return "audio/webm";
  if (/\.amr$/i.test(name)) return "audio/amr";
  if (/\.txt$/i.test(name)) return "text/plain";
  // 확장자가 «아예 없는» 파일도 DICOM 으로 본다. 병원 CD 의 낱개 파일이 그렇다
  // (2026-08-18 실측: Z01·Z02… 601개, 전부 확장자 없음). 틀렸으면 서버의 앞머리 검사가
  // 128바이트째 "DICM" 이 없다고 잡아 지운다 — 여기서 관대해도 문이 열리지는 않는다.
  if (!/\.[A-Za-z0-9]{1,8}$/.test(name)) return "application/dicom";
  return "";
}

/** 경로 위조로 남의 파일을 건드리지 못하게 — sign 이 만든 모양만 통과시킨다. */
export function isOwnPath(dir: string, path: string): boolean {
  const re = new RegExp(
    `^${dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_`
  );
  return re.test(path);
}

export interface SignOptions {
  bucket: string;
  dir: string;
  allowed: Set<string> | readonly string[];
  maxBytes: number;
}

export type SignResult =
  | { ok: true; signedUrl: string; path: string; name: string; type: string }
  | { ok: false; error: string; status: number; detail?: string };

/** 1단계 — 검증 후 일회용 업로드 URL 발급. */
export async function issueUploadUrl(body: SignBody, opts: SignOptions): Promise<SignResult> {
  const name = typeof body.name === "string" ? body.name : "";
  const size = typeof body.size === "number" ? body.size : -1;
  const type = normalizeMime(name, typeof body.type === "string" ? body.type : "");
  const allowed = opts.allowed instanceof Set ? opts.allowed : new Set(opts.allowed);

  if (!name || size < 0) return { ok: false, error: "file_required", status: 400 };
  if (size > opts.maxBytes) {
    return {
      ok: false,
      error: "file_too_large",
      status: 400,
      detail: `Max ${Math.round(opts.maxBytes / 1024 / 1024)}MB`,
    };
  }
  if (!allowed.has(type)) return { ok: false, error: "invalid_file_type", status: 400 };

  const path = `${opts.dir}/${randomUUID()}_${sanitizeFileName(name)}`;
  const { data, error } = await supabaseAdmin.storage.from(opts.bucket).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    console.error("[directUpload] sign error:", error);
    return { ok: false, error: "upload_failed", status: 500 };
  }

  // U+FFFD 세척: 깨진 키릴 파일명이 그대로 돌아가면 이후 요청 본문에 실려 인코딩 가드에 막힌다.
  return { ok: true, signedUrl: data.signedUrl, path, name: name.replace(/�/g, ""), type };
}

export type VerifyResult = { ok: true; size: number } | { ok: false; error: string };

/**
 * 2단계 — 올라간 파일 앞 512바이트를 읽어 선언한 MIME 과 실제 내용이 맞는지 확인.
 * (512인 이유: DICOM 은 오프셋 128에 "DICM" 이 있다.) 어긋나면 그 자리에서 지운다.
 */
export async function verifyUploaded(
  bucket: string,
  path: string,
  declaredType: string,
  maxBytes: number
): Promise<VerifyResult> {
  const { data: signed, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !signed?.signedUrl) return { ok: false, error: "upload_failed" };

  const head = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-511" } });
  if (!head.ok) return { ok: false, error: "upload_failed" };

  // "bytes 0-511/1234567" → 실제 크기. 선언값을 믿지 않고 여기서 다시 잰다.
  const total = Number(head.headers.get("content-range")?.split("/")[1] ?? NaN);
  const size = Number.isFinite(total) ? total : -1;

  const drop = async (err: string) => {
    await supabaseAdmin.storage.from(bucket).remove([path]);
    return { ok: false as const, error: err };
  };

  if (size > maxBytes) return drop("file_too_large");

  const magic = verifyFileMagic(Buffer.from(await head.arrayBuffer()), declaredType);
  if (!magic.ok) {
    console.warn(`[directUpload] magic check failed: declared=${declaredType} reason=${magic.reason}`);
    return drop("invalid_file_content");
  }

  return { ok: true, size };
}
