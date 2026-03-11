/**
 * 대표 후보 설명용 문맥 추출: 후보명 등장 위치 ±N자, 노이즈 블록 제외
 */

const CONTEXT_BEFORE = 500;
const CONTEXT_AFTER = 700;
const MAX_CONTEXT = 1200;

const NOISE_BLOCK =
  /궁금하신\s*점|QR|검색\s*해\s*주세요|로그인|이용약관|개인정보|FAQ|문의하기|진료일정|의료진소개|센터소개|공지사항|전화\s*번호|\d{2,3}-\d{3,4}-\d{4}/i;

/**
 * candidateName이 페이지 텍스트에 등장하는 위치를 찾고, 앞뒤 400~800자 슬라이스 (최대 1200자).
 * 없으면 headings_context 주변 또는 상위 문단만 사용. 노이즈 블록 제외.
 */
export function buildDescriptionContext(
  pageText: string,
  candidateName: string,
  headingsContext?: string
): string {
  const text = pageText.trim();
  if (!text) {
    return (headingsContext ?? "").trim().slice(0, MAX_CONTEXT);
  }

  const nameCleaned = candidateName.replace(/\s+/g, " ").trim();
  const idx = text.indexOf(nameCleaned);
  if (idx >= 0) {
    const start = Math.max(0, idx - CONTEXT_BEFORE);
    const end = Math.min(text.length, idx + nameCleaned.length + CONTEXT_AFTER);
    let slice = text.slice(start, end);
    const paragraphs = slice.split(/\n\n+/).filter((p) => p.trim() && !NOISE_BLOCK.test(p.trim()));
    slice = paragraphs.join("\n\n").slice(0, MAX_CONTEXT);
    if (slice.length >= 50) return slice;
  }

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim() && !NOISE_BLOCK.test(p.trim()));
  const head = paragraphs.slice(0, 4).join("\n\n").slice(0, MAX_CONTEXT);
  if (head.length >= 30) return head;

  return (headingsContext ?? "").trim().split(/\n\n+/).filter((p) => !NOISE_BLOCK.test(p)).join("\n\n").slice(0, MAX_CONTEXT);
}

/**
 * context에서 1~2문장만 추출 (룰 기반 fallback). 200자 이내, 노이즈 제거.
 */
export function fallbackShortDescription(context: string, maxChars = 200): string {
  const cleaned = context
    .replace(/\s+/g, " ")
    .replace(/\d{2,3}-\d{3,4}-\d{4}/g, "")
    .trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]?/g) ?? [];
  let out = "";
  for (const s of sentences) {
    const t = s.trim();
    if (!t || NOISE_BLOCK.test(t)) continue;
    if (out.length + t.length + 1 > maxChars) break;
    out += (out ? " " : "") + t;
  }
  return out.slice(0, maxChars) || cleaned.slice(0, maxChars);
}
