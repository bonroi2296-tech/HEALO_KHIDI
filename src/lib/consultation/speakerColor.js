/**
 * 화자별 색 — 자막에서 "누가 한 말인지"를 **사람 단위**로 구분한다.
 *
 * ⚠️ 역할(의사·환자·코디)로 나누지 않는다 (PO 2026-07-25):
 *    상담방은 게스트가 **로그인 없이 초대링크로** 들어오는 자리라 역할값이 실제 사람과
 *    일치하지 않는다(게스트는 전부 patient 로 떨어짐 → 3명이 들어와도 같은 색·같은 라벨).
 *    계층(role)은 백오피스 권한에서만 쓰고, 상담방 자막에서는 쓰지 않는다.
 *
 * 색 선택은 **표시 이름 우선**(`name || identity`)이라, 같은 사람이면 자막 오버레이와
 * 「자막 기록」 패널에서 같은 색이 나온다.
 *
 * DESIGN.md 예외 근거: brand teal 외 색을 쓰지만 **장식이 아니라 식별 부호**다(화자 구분).
 * teal 을 1순위로 두고, 검은 자막 배경 위에서 서로 확실히 구분되는 300 계열만 쓴다.
 */

/**
 * 검은 오버레이 위 가독성 기준으로 고른 화자 팔레트 (teal 우선).
 *
 * · text/border/dot — 자막 오버레이용(예전부터).
 * · chip/bar — 「자막 기록」 패널용(2026-07-27 추가). 점 하나로는 누가 말했는지 훑기 어렵다는
 *   PO 지적에 따라, 이름을 **색 배지**로 박고 카드 왼쪽에 **굵은 색 띠**를 세운다.
 *   (chip 은 색 배경 + 어두운 글자라 이름 자체가 색으로 읽힌다.)
 */
export const SPEAKER_COLORS = [
  { text: "text-teal-300", border: "border-teal-400/50", dot: "bg-teal-400", chip: "bg-teal-400 text-teal-950", bar: "bg-teal-400" },
  { text: "text-amber-300", border: "border-amber-400/50", dot: "bg-amber-400", chip: "bg-amber-400 text-amber-950", bar: "bg-amber-400" },
  { text: "text-sky-300", border: "border-sky-400/50", dot: "bg-sky-400", chip: "bg-sky-400 text-sky-950", bar: "bg-sky-400" },
  { text: "text-rose-300", border: "border-rose-400/50", dot: "bg-rose-400", chip: "bg-rose-400 text-rose-950", bar: "bg-rose-400" },
  { text: "text-violet-300", border: "border-violet-400/50", dot: "bg-violet-400", chip: "bg-violet-400 text-violet-950", bar: "bg-violet-400" },
];

/** 이름 → 아바타에 넣을 1~2글자. 한글·키릴·라틴 모두 첫 글자면 충분히 구분된다. */
export function speakerInitial(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  // "healwith_moon" 처럼 구분자가 있으면 첫 두 토막의 머리글자
  const parts = s.split(/[\s_.\-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

// 화자 → 팔레트 index. **등장 순서대로 배정**한다(해시 아님).
//   해시(이름을 색으로 흩뿌리기)는 실측에서 탈락: 실제 참가자 이름 4명("Assel"·"Radmila"·
//   "healwith_moon"·"Жанат")을 넣으니 색이 2개로 뭉쳤다. 색이 겹치면 «구분» 기능 자체가
//   무의미해지므로, 팔레트 수 안에서는 **겹치지 않음을 보장**하는 순서 배정을 쓴다.
const assigned = new Map();

/**
 * 화자 식별자 → 팔레트 색 (같은 사람이면 통화 내내 같은 색, 다른 사람과 안 겹침).
 * @param {string} [seed] 표시 이름 또는 참가자 identity
 * @returns {{ text: string, border: string, dot: string }}
 */
export function speakerColor(seed) {
  const s = typeof seed === "string" ? seed.trim() : "";
  if (!s) return SPEAKER_COLORS[0];
  if (!assigned.has(s)) {
    assigned.set(s, assigned.size % SPEAKER_COLORS.length);
  }
  return SPEAKER_COLORS[assigned.get(s)];
}

/** 배정 초기화 — 테스트용(실서비스에선 페이지 로드마다 새로 시작하므로 부를 일 없음). */
export function resetSpeakerColors() {
  assigned.clear();
}
