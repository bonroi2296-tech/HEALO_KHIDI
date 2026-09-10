/**
 * Intake 추출용 키워드/패턴 유틸 (normalize + chat 공용)
 */

const BODY_PART_KEYWORDS: [RegExp | string, string][] = [
  [/nose|rhinoplasty|nasal/i, "nose"],
  [/skin|acne|facial|laser|botox|filler/i, "skin"],
  [/breast|augmentation|implants/i, "breast"],
  [/hair|transplant|follicle/i, "hair"],
  [/eye|lasik|eyelid|double eyelid/i, "eye"],
  [/abdomen|tummy|liposuction|belly/i, "abdomen"],
  [/chin|jaw/i, "chin"],
  [/dental|implant|tooth|teeth/i, "dental"],
];

const CONTRAINDICATION_KEYWORDS: [RegExp | string, string][] = [
  [/allergy|allergic/i, "allergy"],
  [/medication|medicine|meds|drug/i, "medication"],
  [/diabetes|diabetic/i, "diabetes"],
  [/pregnant|pregnancy/i, "pregnant"],
];

export function bodyPartFromText(text: string | null | undefined): string | null {
  const s = String(text || "").toLowerCase();
  if (!s) return null;
  for (const [pattern, part] of BODY_PART_KEYWORDS) {
    if (typeof pattern === "string" ? s.includes(pattern) : pattern.test(s)) return part;
  }
  return null;
}

export function contraindicationsAndFlagsFromMessage(
  message: string | null | undefined
): { contraindications: string[]; allergy: boolean; medications: boolean } {
  const s = String(message || "").toLowerCase();
  const contraindications: string[] = [];
  let allergy = false;
  let medications = false;
  for (const [pattern, label] of CONTRAINDICATION_KEYWORDS) {
    const match = typeof pattern === "string" ? s.includes(pattern) : pattern.test(s);
    if (match) {
      contraindications.push(label);
      if (label === "allergy") allergy = true;
      if (label === "medication") medications = true;
    }
  }
  return { contraindications, allergy, medications };
}

/** query에서 timeline 추출 (asap, 1-3m, preferred_date 등) */
export function extractTimelineFromQuery(q: string): string | null {
  const s = String(q || "").toLowerCase();
  if (/\basap\b|as soon|urgent/i.test(s)) return "asap";
  if (/1-3\s*month|1\s*to\s*3\s*m|within 3\s*m/i.test(s)) return "1-3m";
  if (/3-6\s*month|3\s*to\s*6\s*m/i.test(s)) return "3-6m";
  if (/6\s*month|6m\+|6m\s*plus/i.test(s)) return "6m+";
  const iso = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `preferred_date:${iso[0]}`;
  const us = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return `preferred_date:${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

/** query에서 budget 추출 */
export function extractBudgetFromQuery(q: string): string | null {
  const s = String(q || "").toLowerCase();
  if (/\bbudget\b|price|cost|usd|won|\$|₩|krw/i.test(s)) {
    const m = s.match(/(\d[\d,.]*)\s*(k|m|million|thousand)?\s*(usd|won|krw|\$|₩)?/i);
    if (m) return m[0].trim().slice(0, 50);
    return "mentioned";
  }
  return null;
}

/** query에서 duration 추출 (1w, 1m, 3m, 6m, 1y+) */
export function extractDurationFromQuery(q: string): string | null {
  const s = String(q || "").toLowerCase();
  if (/\b1w\b|1\s*week/i.test(s)) return "1w";
  if (/\b1m\b|1\s*month/i.test(s)) return "1m";
  if (/\b3m\b|3\s*month/i.test(s)) return "3m";
  if (/\b6m\b|6\s*month/i.test(s)) return "6m";
  if (/\b1y\b|1\s*year|1y\+/i.test(s)) return "1y+";
  return null;
}

/**
 * 위험 신호 — 이게 하나라도 있으면 낱말 등급과 관계없이 severe 다.
 *
 * 러시아어를 같이 두는 이유: 환자 대부분이 러시아어로 쓴다. 영어 낱말만 보면
 * 「мне рвёт кровью」 같은 문장이 통째로 안 잡힌다.
 * 🛑 목록을 늘리는 건 좋지만 «줄이지는» 마라. 여기서 놓치면 경증으로 기록된다.
 */
const SEVERITY_RED_FLAGS = [
  // 출혈·토혈
  /vomit\w*\s+blood|vomiting\s+blood|coughing\s+up\s+blood|hematemesis/i,
  /heavy\s+bleeding|profuse\s+bleeding|bleeding\s+heavily|massive\s+blood/i,
  // 🛑 키릴 문자에는 \w 를 쓰지 마라 — 자바스크립트의 \w 는 [A-Za-z0-9_] 라서 러시아어를
  //    한 글자도 안 잡는다. 어미 변화는 [а-яё]* 로 받는다(입력은 이미 소문자로 낮춰져 있다).
  /рвот[а-яё]*\s+кровь[а-яё]*|рв[ёе]т\s+кровью|кровав[а-яё]*\s+рвот[а-яё]*/i,
  /(сильн|обильн|массивн)[а-яё]*\s+кровотечен[а-яё]*/i,
  // 응급 처치·이송
  /ambulance|emergency\s+room|\ber\b\s+visit|hospitalized|admitted\s+to\s+hospital/i,
  /nasal\s+packing|tamponade|transfusion/i,
  // 「скорая / скорую / скорой помощь(и)」 처럼 격이 바뀌므로 어미를 넓게 받는다.
  /скор[а-яё]*\s+помощ[а-яё]*|реанимац[а-яё]*|госпитализ[а-яё]*|тампонад[а-яё]*|переливани[а-яё]*\s+крови/i,
  // 의식·호흡
  /unconscious|passed\s+out|fainted|can'?t\s+breathe|difficulty\s+breathing/i,
  /потер[а-яё]*\s+сознани[а-яё]*|обморок|не\s+могу\s+дышать|одышк[а-яё]*/i,
];

/**
 * 환자 글에서 심각도 한 낱말. **오분류의 «방향»이 중요하다: 과소평가가 훨씬 비싸다.**
 *
 * 🛑 2026-09-09 실사고. 대량 비출혈 환자가 이렇게 적었다.
 *    "Initially, the bleeding was **mild**, with blood coming from my nose drop by drop.
 *     Within less than one minute, the bleeding rapidly increased … I subsequently began
 *     **vomiting blood**." (이어서 비강 패킹, 타 병원 이송)
 *    옛 구현은 «mild 를 맨 먼저» 검사해 첫 낱말을 집었고, 이 사건이 «경증»으로 기록됐다.
 *    그래서 두 가지를 바꿨다.
 *      ① 판정 순서를 뒤집는다 — severe > medium > mild. 한 글에 둘 다 있으면 «높은 쪽»이 이긴다.
 *      ② 낱말 등급과 무관하게 위험 신호가 있으면 severe 로 올린다(SEVERITY_RED_FLAGS).
 *
 * ⚠️ **이건 여전히 낱말 맞추기다.** 못 잡는 표현이 얼마든지 있다.
 *    「심각도가 낮게 나왔다」를 «위험하지 않다»로 읽으면 안 된다 — 이 값은 참고용 꼬리표이지
 *    분류(triage)가 아니다. 사람이 원문을 읽는 것을 대신하지 않는다.
 */
export function extractSeverityFromQuery(q: string): string | null {
  const s = String(q || "").toLowerCase();
  // ① 위험 신호가 이긴다 — 환자가 스스로 「mild」라고 적었어도, 「7/10」이라고 적었어도.
  if (SEVERITY_RED_FLAGS.some((re) => re.test(s))) return "severe";
  // ② 낱말 등급은 «높은 쪽부터». 옛 구현은 이 순서가 반대였다.
  if (/\bsevere\b|serious|bad/i.test(s)) return "severe";
  if (/\bmedium\b|moderate/i.test(s)) return "medium";
  if (/\bmild\b|minor|slight/i.test(s)) return "mild";
  const scale = s.match(/\b([0-9]|10)\s*\/\s*10\b|\b([0-9]|10)-10\b/);
  if (scale) return scale[0].slice(0, 20);
  return null;
}
