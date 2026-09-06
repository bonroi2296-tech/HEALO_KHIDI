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
  patientChatUI:   { screen: "환자 화면 · AI 채팅", path: null, note: "환자 로그인 후 화면", noteId: "patientOnly" },
  patientVisa:     { screen: "환자 화면 · 비자", path: null, note: "환자 로그인 후 화면", noteId: "patientOnly" },
  patientConsults: { screen: "환자 화면 · 상담 목록", path: null, note: "환자 로그인 후 화면", noteId: "patientOnly" },
  visaApps:        { screen: "환자 화면 · 비자 신청 목록", path: null, note: "환자 로그인 후 화면", noteId: "patientOnly" },
  visaAppDetail:   { screen: "환자 화면 · 비자 신청 상세", path: null, note: "환자 로그인 후 화면", noteId: "patientOnly" },
  costDetail:      { screen: "환자 화면 · 견적 상세", path: null, note: "환자 로그인 후 화면", noteId: "patientOnly" },

  // ── 화면에서 쓰는 곳을 못 찾은 문구(옛 흔적으로 보인다) ────────
  //    2026-07-29 실측: 사전에는 있는데 app/·src/ 어디서도 불러 쓰지 않는다(동적 조립도 없음).
  //    고쳐도 아무 화면에도 안 나오므로 **미리 알려서 헛수고를 막는다.**
  //    ⚠️ 「확실히 죽었다」가 아니라 「쓰는 곳을 못 찾았다」로 적는다 — 내가 놓쳤을 수 있다.
  success:     { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다", noteId: "deadGeneric" },
  inquiry:     { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다", noteId: "deadGeneric" },
  faq:         { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 지금 「자주 묻는 질문」은 faqData 를 씁니다", noteId: "deadFaq" },
  meta:        { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 지금은 seo 를 씁니다", noteId: "deadMeta" },
  search:      { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 옛 검색결과 화면 잔재(홈 검색창 2개만 예외)", noteId: "deadSearch" },
  list:        { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다", noteId: "deadGeneric" },
  social:      { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다", noteId: "deadGeneric" },
  howItWorks:  { screen: null, path: null, note: "쓰는 화면을 못 찾음 — 고쳐도 안 보일 수 있습니다", noteId: "deadGeneric" },

  // ── 화면에 안 보이는 것(검색엔진·구글용) ─────────────────────
  //    ⚠️ meta 를 여기 또 적지 마라 — 위(52줄대)에 이미 있고, 뒤엣것이 이겨서
  //       실사용 0건인 meta.* 에 「검색엔진용」이라는 **틀린 이름**이 붙었다
  //       (2026-07-29 린트 no-dupe-keys 가 잡음). 지금 쓰는 건 seo 뿐이다.
  seo:  { screen: "검색엔진용 설명", path: null, note: "화면에는 안 보이고 구글 검색 결과에 쓰입니다", noteId: "seoOnly" },

  // ── 콘텐츠 파일 문구(2026-09-06 편집기에 편입) — 주소는 아래 dynamicPath 가 slug 로 정한다 ──
  therapy:  { screen: "치료 안내 상세 · 치료법 카드(암종마다 5개만 보임)", path: "/treatments" },
  itcrn:    { screen: "치료 안내 상세 · 5축(ITCRN) 설명(모든 암종 화면 공통)", path: "/treatments/female" },
  care:     { screen: "치료 안내 상세 · 수술 후 관리(대장·위암 / 간·췌장암 화면)", path: "/treatments/digest" },
  cancer:    { screen: "치료 안내 상세(암종별)", path: "/treatments" },
  cancerFaq: { screen: "치료 안내 상세 · 자주 묻는 질문(암종별)", path: "/treatments" },
  // 본문은 DB(어드민 병원 번역)가 그리고, 이 파일 문구는 검색 결과·미리보기 카드·구조화데이터에 쓰인다 —
  // 코디가 여기서 고치고 «화면 본문이 안 바뀌네»로 헤매지 않게 비고를 단다.
  hospital:  { screen: "병원 상세(제휴 병원 소개)", path: "/hospitals", note: "검색 결과·미리보기 카드용 소개입니다(한국어는 DB 값이 우선) — 병원 상세 본문은 어드민 「병원 번역」에서 고칩니다", noteId: "hospitalMetaOnly" },
};

// 암종·병원 문구는 키 둘째 마디가 slug 다 → 그 화면 주소를 바로 만든다.
function dynamicPath(key) {
  const parts = String(key).split(".");
  if ((parts[0] === "cancer" || parts[0] === "cancerFaq") && parts[1]) return `/treatments/${parts[1]}`;
  if (parts[0] === "hospital" && parts[1]) return `/hospitals/${parts[1]}`;
  return null;
}

// 앞머리 전체는 죽었는데 **몇 개만 살아 있는** 예외. 앞머리 표보다 먼저 본다.
// (search.* 13키 중 이 둘만 홈 히어로에서 실제로 쓰인다 — 나머지는 2026-07-21 삭제된 검색결과 화면 잔재)
const BY_KEY = {
  "search.placeholder": { screen: "홈 검색창", path: "/", id: "homeSearch" },
  "search.button":      { screen: "홈 검색창", path: "/", id: "homeSearch" },
};

/**
 * @param {string} key  content_overrides.content_key
 * @param {(k:string)=>({section?:string,label?:string}|null)} [homeLabel]
 *        홈 레지스트리 라벨 조회기(서버에서만 주입 — 「홈 · 통계 / 항목1 · 문구」 같은 사람 이름).
 * @returns {{ screen: string|null, path: string|null, where: string|null, note: string|null }}
 */
// 「그 문구가 실제로 눈에 보이는 자리」까지 데려가는 주소.
// 왜 따로 두나: 문의폼은 한 주소(/inquiry) 안에서 화면이 여러 번 바뀐다. 병기·진단일은
// **2단계**에 있어서 그냥 /inquiry 를 열면 채널 선택 화면만 뜨고 영원히 안 보인다
// (2026-08-03 PO: «화면 열기 누르니깐 문의페이지 나오는데?»). 그래서 단계를 지정해 연다.
// 목록에 안 걸리면 위 표의 path 를 그대로 쓴다.
const REACH = [
  [/^inquiryFunnel.(stage|diagnosis|treatmentState|upload|travelTiming|priorities|step2|submitStep2)/, "/inquiry?preview=step2"],
  [/^intakeLabels.(stage|treatState|travel|priority)/, "/inquiry?preview=step2"],
  [/^inquiryFunnel.(success|upgrade|yesUpgrade|noUpgrade)/, "/inquiry?preview=step1-success"],
  [/^inquiryFunnel.(signup|noSignup|doneTitle|doneBody|backHome)/, "/inquiry?preview=step2-success"],
  [/^inquiryFunnel.(human|messenger|channelComingSoon)/, "/inquiry?preview=human-channels"],
  [/^inquiryFunnel./, "/inquiry?preview=step1"],
  [/^intakeLabels.cancer./, "/inquiry?preview=step1"],
  // 채팅 시작 문구는 «AI 상담사» 화면 안에 있다 — 채널 선택 화면만 열면 영원히 안 보인다
  // (2026-08-03 전 화면 훑기에서 발견).
  [/^chat./, "/inquiry?preview=ai-chat"],
];

/** key → 그 문구가 보이는 화면 주소(단계까지). 없으면 null. */
export function reachPath(key) {
  if (typeof key !== "string") return null;
  for (const [re, url] of REACH) if (re.test(key)) return url;
  return null;
}

export function describeKey(key, homeLabel) {
  if (!key || typeof key !== "string") return { screen: null, path: null, where: null, note: null };
  const head = key.split(".")[0];
  const byKey = BY_KEY[key];
  const hit = byKey || BY_PREFIX[head] || null;
  // 화면 이름·비고를 코디 언어로 보여주려면 «번역할 이름표»가 필요하다 — 한국어 문자열이 아니라 id 로 준다.
  // (사전에 없으면 화면이 아래 한국어 screen/note 로 폴백하므로 새 항목을 넣어도 안 깨진다)
  const screenId = hit ? (byKey ? byKey.id || null : head) : null;

  // 홈 문구는 레지스트리에 사람이 읽는 이름이 이미 있다(예: 「통계 / 항목1 · 문구」).
  let where = null;
  if (homeLabel) {
    const m = homeLabel(key);
    if (m && m.label) where = m.section ? `${m.section} / ${m.label}` : m.label;
  }

  const dyn = dynamicPath(key);
  return {
    screen: hit ? hit.screen : null,
    screenId,
    path: dyn || (hit ? hit.path || null : null),
    // 미리보기·화면열기가 실제로 그 문구까지 데려가는 주소(단계 포함). 없으면 path 를 쓴다.
    reach: reachPath(key) || dyn || (hit ? hit.path || null : null),
    where,
    note: hit && hit.note ? hit.note : null,
    noteId: hit && hit.noteId ? hit.noteId : null,
  };
}

/**
 * 홈 문구 키를 「구역 / 낱말 · 낱말」의 **부품**으로 쪼갠다 (예: home.stats.items.0.label
 * → { sectionKey:"stats", words:[{f:"items",n:1},{f:"label"}] }).
 *
 * 왜 부품인가: 화면에 보여줄 이름을 **코디 언어로** 조립해야 한다. 서버가 한국어 문장을
 * 만들어 보내면(예전 방식) 러시아어 화면에도 「통계 / 항목1 · 문구」가 그대로 박힌다
 * (실측 2026-07-29: 휴대폰 폭에서 72칸 중 22칸이 한국어로 남아 있었다).
 * 낱말 번역은 코디 사전의 ceSec_* · ceFld_* 가 갖고 있고, 사전에 없으면 원래 낱말로 폴백한다.
 *
 * ⚠️ 조립 규칙은 `src/lib/content/registry.js` 의 labelFor() 와 **같은 규칙**이다
 *    (숫자는 앞 낱말에 붙여 「항목1」). 한쪽만 고치면 두 화면의 이름이 어긋난다.
 */
export function homeWhereParts(key) {
  if (typeof key !== "string" || !key.startsWith("home.")) return null;
  const parts = key.split(".").slice(1);
  if (parts.length === 0) return null;
  const words = [];
  for (const p of parts.slice(1)) {
    if (/^\d+$/.test(p)) {
      // 숫자는 «앞 낱말 + 번호» 로 붙는다. 앞 낱말이 없으면 「항목」이 기본.
      if (words.length === 0) words.push({ f: "items" });
      words[words.length - 1] = { ...words[words.length - 1], n: Number(p) + 1 };
      continue;
    }
    words.push({ f: p });
  }
  return { sectionKey: parts[0], words };
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
