/**
 * 문구 키 → 「이게 어느 화면의 무엇인가」.
 *
 * 왜: 편집기·변경 이력이 `home.stats.items.0.label` 같은 **코드 이름만** 보여줬다.
 * 코디는 그게 어느 화면인지 알 방법이 없어 «코드를 까뒤집어 봐야 하냐»는 말이 나왔다
 * (2026-07-29 PO 지적). 이름을 붙이고, 가능하면 **그 화면을 여는 주소**까지 준다.
 *
 * ⚠️ 원칙: **모르면 지어내지 않는다.** 아래 표에 없는 앞머리는 `screen: null` 로 두고
 *    화면에는 키만 보여준다 — 틀린 이름을 붙이면 코디가 엉뚱한 화면을 뒤진다.
 *    (표는 실제 사용처를 grep 으로 확인해 채웠다. 새 앞머리가 생기면 여기 한 줄 추가.)
 */

// 앞머리(첫 마디) → { 화면 이름, 열어볼 주소(없으면 null), 비고 }
// path 는 공개 화면만. 로그인 뒤 화면·검색엔진용은 주소를 주지 않는다(눌러도 못 보거나 안 보임).
const BY_PREFIX = {
  // ── 공개 화면 ─────────────────────────────────────────────
  home:           { screen: "홈 화면", path: "/" },
  socialProof:    { screen: "홈·치료 여정 화면의 「신뢰 지표」 구역", path: "/" },
  telemedicine:   { screen: "원격협진 안내", path: "/telemedicine" },
  careJourney:    { screen: "치료 여정 안내", path: "/care-journey" },
  costCalc:       { screen: "비용 계산기", path: "/cost-calculator" },
  hospitalsPage:  { screen: "병원 목록", path: "/hospitals" },
  treatmentsPage: { screen: "치료 안내 목록", path: "/treatments" },
  faqData:        { screen: "자주 묻는 질문(문답 내용)", path: "/faq" },
  about:          { screen: "회사 소개", path: "/about" },
  km:             { screen: "한방 특화 안내", path: "/specialties/korean-medicine" },
  // 병원 상세·치료 상세 **양쪽**에서 쓴다(실사용 50건). 어느 쪽인지 알 수 없어 링크는 안 준다
  // — 치료 상세 문구를 고친 코디를 병원 목록으로 보내면 헤맨다(독립 리뷰 지적).
  detail:         { screen: "병원·치료 상세 화면", path: null },
  signup:         { screen: "회원가입 화면", path: "/signup" },
  nav:            { screen: "화면 위쪽 메뉴(전 화면 공통)", path: "/" },
  footer:         { screen: "화면 맨 아래 정보(전 화면 공통)", path: "/" },
  cta:            { screen: "여러 화면의 「상담 신청」 구역", path: null },

  // ── 문의폼 ────────────────────────────────────────────────
  inquiryFunnel:  { screen: "문의폼", path: "/inquiry" },
  intakeLabels:   { screen: "문의폼 선택 버튼(암종·병기 등)", path: "/inquiry" },
  chat:           { screen: "문의 채팅창", path: "/inquiry" },

  // ── 로그인 뒤 환자 화면(주소를 줘도 코디는 못 연다) ───────────
  patientChatUI:   { screen: "환자 화면 · AI 채팅", path: null, note: "환자 로그인 후 화면" },
  patientVisa:     { screen: "환자 화면 · 비자", path: null, note: "환자 로그인 후 화면" },
  patientConsults: { screen: "환자 화면 · 상담 목록", path: null, note: "환자 로그인 후 화면" },
  visaApps:        { screen: "환자 화면 · 비자 신청 목록", path: null, note: "환자 로그인 후 화면" },
  visaAppDetail:   { screen: "환자 화면 · 비자 신청 상세", path: null, note: "환자 로그인 후 화면" },
  costDetail:      { screen: "환자 화면 · 견적 상세", path: null, note: "환자 로그인 후 화면" },

  // ── 화면에서 쓰는 곳을 못 찾은 문구(옛 흔적으로 보인다) ────────
  //    2026-07-29 실측: 사전에는 있는데 app/·src/ 어디서도 불러 쓰지 않는다(동적 조립도 없음).
  //    고쳐도 아무 화면에도 안 나오므로 **미리 알려서 헛수고를 막는다.**
  //    ⚠️ 「확실히 죽었다」가 아니라 「쓰는 곳을 못 찾았다」로 적는다 — 내가 놓쳤을 수 있다.
  success:     { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다" },
  inquiry:     { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다" },
  faq:         { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 지금 「자주 묻는 질문」은 faqData 를 씁니다" },
  meta:        { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 지금은 seo 를 씁니다" },
  search:      { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 옛 검색결과 화면 잔재(홈 검색창 2개만 예외)" },
  list:        { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다" },
  social:      { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다" },
  howItWorks:  { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다" },

  // ── 화면에 안 보이는 것(검색엔진·구글용) ─────────────────────
  seo:  { screen: "검색엔진용 설명", path: null, note: "화면에는 안 보이고 구글 검색 결과에 쓰입니다" },
  meta: { screen: "검색엔진용 제목·설명", path: null, note: "화면에는 안 보이고 구글 검색 결과에 쓰입니다" },
};

// 앞머리 전체는 죽었는데 **몇 개만 살아 있는** 예외. 앞머리 표보다 먼저 본다.
// (search.* 13키 중 이 둘만 홈 히어로에서 실제로 쓰인다 — 나머지는 2026-07-21 삭제된 검색결과 화면 잔재)
const BY_KEY = {
  "search.placeholder": { screen: "홈 검색창", path: "/" },
  "search.button":      { screen: "홈 검색창", path: "/" },
};

/**
 * @param {string} key  content_overrides.content_key
 * @param {(k:string)=>({section?:string,label?:string}|null)} [homeLabel]
 *        홈 레지스트리 라벨 조회기(서버에서만 주입 — 「홈 · 통계 / 항목1 · 문구」 같은 사람 이름).
 * @returns {{ screen: string|null, path: string|null, where: string|null, note: string|null }}
 */
export function describeKey(key, homeLabel) {
  if (!key || typeof key !== "string") return { screen: null, path: null, where: null, note: null };
  const head = key.split(".")[0];
  const hit = BY_KEY[key] || BY_PREFIX[head] || null;

  // 홈 문구는 레지스트리에 사람이 읽는 이름이 이미 있다(예: 「통계 / 항목1 · 문구」).
  let where = null;
  if (homeLabel) {
    const m = homeLabel(key);
    if (m && m.label) where = m.section ? `${m.section} / ${m.label}` : m.label;
  }

  return {
    screen: hit ? hit.screen : null,
    path: hit ? hit.path || null : null,
    where,
    note: hit && hit.note ? hit.note : null,
  };
}

/** 표에 없는 앞머리 목록(점검용) — 새 화면이 생기면 여기서 드러난다. */
export function unknownPrefixes(keys) {
  const out = new Set();
  for (const k of keys || []) {
    const head = String(k || "").split(".")[0];
    if (head && !BY_PREFIX[head]) out.add(head);
  }
  return [...out];
}
