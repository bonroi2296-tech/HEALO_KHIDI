/**
 * 상담 녹화(LiveKit Egress) — 설정 단일 SoR (single source of truth)
 *
 * 무엇: 원격협진방을 파일로 녹화해 우리 비공개 저장소(Supabase Storage, S3 호환)에
 *       올린다.
 *
 * ⚠️ 2026-09-04 정정: 여기 「LiveKit 유료 플랜 전용 기능」이라 적혀 있었으나 **틀렸다.**
 *    공식 요금표 화면 실측 결과 녹화(Transcode/Track egress)는 **무료(Build) 플랜에도 월 60분
 *    포함**이고 Ship 은 600분이다. 요금제를 무료로 내려도 녹화는 살아 있다.
 *    (옛 기록이 60분을 Ship 칸 숫자로 잘못 읽었다 — 60분은 무료 칸이다.)
 *
 * ⚠️ 기본값 = 꺼짐. **PO 지시(2026-07-28): "바로 오픈하지 말고 준비만".**
 *    스위치가 꺼져 있으면 API 는 503 을 돌려주고 방에는 버튼조차 안 뜬다
 *    = 지금 상담방과 100% 동일하게 동작한다. 켜는 순간에만 녹화가 가능해진다.
 *
 * 왜 스위치를 두나(그냥 만들면 안 되나): 녹화는 **되돌릴 수 없는 종류**의 기능이다.
 *   한 번 환자 영상·음성이 저장되기 시작하면 "안 찍은 걸로" 만들 수 없다. 동의 문구·
 *   보관기간·파기·열람권한 정책이 확정되기 전에는 켜지 않는다.
 *
 * 오픈 전 켜기 절차 + 정책 체크리스트: docs/CONSULT_RECORDING_SETUP.md
 */

// ── 스위치 ────────────────────────────────────────────────────────────────
/** 서버측 (녹화 시작/중지 API 가 동작하는지) */
export function isRecordingEnabledServer() {
  return process.env.CONSULT_RECORDING_ENABLED === "true";
}

/** 클라측 (상담방에 녹화 버튼을 띄우는지) */
export function isRecordingEnabledClient() {
  return process.env.NEXT_PUBLIC_CONSULT_RECORDING_ENABLED === "true";
}

// ── 정책 상수 ─────────────────────────────────────────────────────────────

/**
 * 음성만 녹화(영상 없음). 이유 3가지:
 *  1) 비용 — 영상 $0.02/분 vs 음성 $0.005/분(4배 차이). 30분 상담 = $0.60 vs $0.15.
 *  2) 개인정보 — 환자 얼굴 영상은 우리가 다룰 수 있는 가장 민감한 자료다. 안 만들면 안 샌다.
 *  3) 쓸모 — 우리가 녹화로 얻으려는 건 «무슨 말이 오갔나»(분쟁 대비·통역 품질 검수)이고
 *     그건 음성이면 충분하다. 얼굴이 필요한 상황이 실제로 생기면 그때 바꿔라(한 줄이다).
 */
export const RECORDING_AUDIO_ONLY = true;

/** 보관 기간(일). 지나면 파기 대상 — `expires_at` 에 박아 두고 정리 배치가 지운다. */
export const RECORDING_RETENTION_DAYS = 90;

/**
 * 녹음 음질(kbps). LiveKit 기본값은 128 인데 **64 로 낮춘다.**
 *
 * 왜: Supabase Storage 의 **전역 업로드 상한이 50MB**(2026-07-28 실측 — 프로젝트 spend cap
 *   때문에 낮게 잡혀 있다)라, 기본 128kbps 로 찍으면 **한 시간짜리 상담이 57MB 라 업로드가
 *   통째로 실패한다.** 64kbps 면 분당 약 0.48MB → **약 100분까지** 한 파일에 들어간다.
 *   말소리 기록용으로 64kbps Opus 는 충분하다(음악이 아니다).
 *
 * ⚠️ 100분 넘는 상담을 녹음해야 하거나 영상 녹화로 바꾸려면 **먼저 상한부터 올려야 한다**
 *   (Supabase 대시보드 Storage → Settings → Global file size limit. spend cap 해제가 선행 —
 *   돈이 걸린 설정이라 PO 결정 사항).
 */
export const RECORDING_AUDIO_BITRATE_KBPS = 64;

/** 저장소 전역 업로드 상한(바이트). 위 계산의 근거값 — 대시보드에서 바뀌면 여기도 고쳐라. */
export const STORAGE_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** 저장 버킷(비공개). 공개 버킷에 두면 링크만 알면 누구나 듣는다 — 절대 public 금지. */
export const RECORDING_BUCKET = "consultation-recordings";

/** 녹화를 시작·중지할 수 있는 역할. 환자·게스트 의사는 못 누른다(운영자만). */
export const RECORDING_ROLES = ["admin", "coordinator"];

/**
 * 저장 경로. 상담 1건당 폴더 하나 → 파기·감사 때 폴더째 다루면 된다.
 * 확장자는 음성만일 때 .ogg, 영상 포함이면 .mp4.
 */
export function recordingFilepath(consultationId, startedAtIso) {
  const stamp = String(startedAtIso).replace(/[:.]/g, "-");
  const ext = RECORDING_AUDIO_ONLY ? "ogg" : "mp4";
  return `${consultationId}/${stamp}.${ext}`;
}
