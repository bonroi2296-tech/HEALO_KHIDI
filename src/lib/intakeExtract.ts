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

/** query에서 severity 추출 */
export function extractSeverityFromQuery(q: string): string | null {
  const s = String(q || "").toLowerCase();
  if (/\bmild\b|minor|slight/i.test(s)) return "mild";
  if (/\bmedium\b|moderate/i.test(s)) return "medium";
  if (/\bsevere\b|serious|bad/i.test(s)) return "severe";
  const scale = s.match(/\b([0-9]|10)\s*\/\s*10\b|\b([0-9]|10)-10\b/);
  if (scale) return scale[0].slice(0, 20);
  return null;
}
