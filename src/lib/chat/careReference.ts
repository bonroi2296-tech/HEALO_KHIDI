/**
 * healwith: 암환자 인테이크·견적 기준자료 (AI 항상 참고)
 *
 * 출처(PO 제공, 2026-06): 면력한방병원 「암 진료비 안내」(2026-06-17) +
 *   「Healwith прайс онкология Korea RU」(2026-06-19) + CRM 필수서류 목록.
 * 환율 1 USD ≈ 1,350 KRW, 외국인(비보험) 국제수가 기준 = 전액 본인부담.
 *
 * 이 상수는 generateReply.buildSystemPrompt 에서 항상 Context로 주입된다.
 * (RAG 벡터 검색에 의존하지 않고 매번 확실히 참고하게 — "서류 뭐 필요?"/"얼마?"는 핵심 질문)
 *
 * ⚠️ 금액은 이 파일에 «적지 마라». 2026-08-20 부터 숫자의 단일 출처는
 *   `@/lib/costs/surgeryRanges`(대학병원 수술 범위)와 `@/lib/costs/immuneClinicPrices`(면력 확정가)다.
 *   화면(환자 견적·코디 견적서)과 AI 안내문이 같은 값을 봐야 하기 때문이다.
 *   같은 숫자를 두 곳에 적으면 한쪽만 고쳐져 조용히 어긋난다.
 *   A 블록(대학병원 수술 범위)은 그 자료에서 «만들어진다» — 글자 형태가 예전과 동일함을 대조로 확인했다.
 *   C·D 블록(면력 치료·검진)은 달러 표기가 원본 자료 그대로라 문자열로 두되,
 *   `careReference.prices.test.ts` 가 immuneClinicPrices 의 원화값과 어긋나지 않는지 매번 대조한다.
 */

import { CANCER_EN, CANCER_ORDER, toUsd, overallRange } from "@/lib/costs/surgeryRanges";

const usd = (krw: number) => `$${toUsd(krw).toLocaleString("en-US")}`;
const mil = (krw: number) => `₩${Math.round(krw / 1_000_000)}M`;

/** A) 대학병원 암수술 범위 — surgeryRanges 에서 만든다. */
const SURGERY_BLOCK = CANCER_ORDER.map((k) => {
  const r = overallRange(k);
  if (!r) return "";
  return `- ${CANCER_EN[k]}: ${usd(r.minKrw)}–${toUsd(r.maxKrw).toLocaleString("en-US")} (≈${mil(r.minKrw)}–${Math.round(r.maxKrw / 1_000_000)}M)`;
}).filter(Boolean).join(String.fromCharCode(10));

export const CARE_REFERENCE = `
[healwith 안내자료 | Official | 인테이크 필수서류 & 견적 범위]
SCOPE: Oncology only. Korea, foreign/uninsured patients (full out-of-pocket, international rate).
All amounts are INDICATIVE RANGES, not fixed quotes. 1 USD ≈ 1,350 KRW (varies with FX).
Final price is set by each hospital's international dept AFTER reviewing the patient's diagnosis.

REQUIRED DOCUMENTS — ask the patient for these to prepare an estimate / start the process:
1. Medical certificate stating the diagnosis (진단서)
2. Biopsy / histology results (조직검사결과지)
3. Operation/surgery record, if any surgery was done (수술확인서)
4. Recent blood test results (혈액검사지)
5. Current medications & prior treatment given (투약 처방 내역)
→ Once these are shared with a healwith coordinator, the hospital prepares a personalized quote, treatment plan and timeline. Preliminary review is free.

A) UNIVERSITY-HOSPITAL CANCER SURGERY (international/uninsured). "from" = minimally invasive; robotic (da Vinci) = upper bound. Includes ~5–10 days hospitalization, basic workup, surgery:
${SURGERY_BLOCK}

B) PRE-OP DIAGNOSIS / TESTS (paid separately from surgery):
- CT: $220–450 · MRI: $600–750 · PET-CT (whole body): $750–1,000
- Biopsy: $750–1,550 · Basic comprehensive checkup: ~$370
- Real reported case: diagnosis (workup + ultrasound + biopsy + PET/MRI) + surgery ≈ $8,900 (≈₩12M) total.

C) INTEGRATIVE / IMMUNE CARE (Immune Hospital, non-insured). SUPPORTIVE care for recovery & side-effect management alongside surgery/chemo — NEVER a cancer cure. Inpatient integrative course ≈ $740–1,480/week (room separate):
- Hyperthermia from $185/session (Hyperthermia-35 $260) · Mistletoe (Iscador/Abnoba) $75 · Thymosin $155 · Immucothel $310
- High-dose vitamin C IV from $11 · Glutathione/Selenium/Dipeptiven $22–67
- Immuncell (cell therapy) $3,700 · Blood stem cells 100cc from $740/proc, 200cc from $1,480/proc
- Herbal anti-tumor (Haamdan/Yuamdan) $30–45 · Meshima F $445 · pharmacoacupuncture $75 · custom 1-month herbal $370–550 · NK-activity test $75
- Rooms/day: rehab 1-bed $150 · immune 1-bed $300–370 · VIP $520

D) CANCER SCREENING PACKAGES (early detection, for those without a diagnosis yet):
- Basic — tumor-marker focused: $330 (₩450,000). Blood panel + 8 tumor markers (CEA, AFP, CA19-9, CA125, CA15-3, PSA, CA72-4, SCC) + NK activity.
- Premium — markers + genetics: $730 (₩990,000). Adds cancer-gene test (11 male / 12 female types), hair-mineral test, antioxidant test.
Note: tumor-marker & genetic tests are SCREENING only; a positive result must be confirmed with imaging (CT/MRI/PET-CT) and biopsy.

E) INTEGRATIVE CANCER CARE — WHAT IT ACTUALLY IS (Immune Hospital, healwith partner). Use this whenever the patient asks about recovery, side effects, immunity, rehabilitation, nutrition, or "what else can be done". It runs ALONGSIDE surgery/chemo/radiation and is SUPPORTIVE only.
The hospital works on five axes — name the ones that fit what the patient described:
- Immunity: Thymosin a1, Mistletoe (Iscador/Abnoba), Immucothel (KLH), Immuncell-LC (cultured T-cell therapy), immune-boosting herbal formula
- Body temperature: RF hyperthermia (Hyperthermia-35 for longer sessions)
- Circulation: lymphatic drainage, acupuncture and physical therapy — used for post-op lymphedema and stiffness
- Post-surgical rehabilitation centre (all branches): CRYO cryotherapy + exercise rehab, to restore function and tissue healing at the surgical site. Recommended at least 3x/week. Fits patients recovering from cancer surgery.
- Resistance: selenium, glutathione, high-dose vitamin C IV, Dipeptiven (glutamine) for mucosal protection during chemo
- Nutrition: therapeutic diets planned by a dietitian — low-residue diet after colorectal/gastric surgery, post-gastrectomy diet for dumping syndrome
Delivered as an inpatient course while recovering from surgery or between chemo cycles; rooms available in the rehab ward, immunotherapy ward, or VIP. Interpretation in Russian/Kazakh is arranged by a healwith coordinator.

HOW TO ANSWER RECOVERY / SIDE-EFFECT / IMMUNITY QUESTIONS:
1. NAME THE PARTNER HOSPITAL — 면력한방병원 in Korean, and exactly "Immune Hospital" in every other language (PO decision 2026-09-06: one foreign-language name — never a translated or transliterated clinic name). Saying only "a partner clinic" is a failure: connecting the patient to this hospital is the point of the answer.
2. Name the ACTUAL treatments that match what they described — do not answer with only a vague label like "integrative care" or "immune therapy".
3. Say plainly that this is SUPPORTIVE care that helps them tolerate and recover from the main treatment; it does not remove the cancer.
4. Offer ONE next step: a healwith coordinator arranges the referral and a treatment plan.
The same hospital also runs a nerve centre for shingles and facial palsy (pDRN nerve injection, autologous GFC). That is a DIFFERENT condition — do not fold it into an answer about cancer recovery.
NEVER claim survival benefit, cure rate, tumor shrinkage, or that it can replace chemotherapy or surgery. If asked "does it cure cancer?" — answer no, clearly, then explain what it does help with.
`.trim();


/**
 * 서류 목록을 뺀 참고자료 (2026-07-04) — 사용자가 서류/절차/비용을 묻지 않은 턴에 주입.
 * 감정적 첫 메시지에 5종 나열을 구조적으로 차단하되, 가격·프로그램 정보는 유지
 * (가격은 별도 규칙이 "물을 때만"을 이미 강제). REQUIRED DOCUMENTS 블록만 요약 1줄로 대체.
 */
export const CARE_REFERENCE_NO_DOCLIST = CARE_REFERENCE.replace(
  /REQUIRED DOCUMENTS[\s\S]*?Preliminary review is free\./,
  "REQUIRED DOCUMENTS: a healwith coordinator guides which medical papers are needed (5 standard items). Do NOT enumerate them unless the user asks what to prepare — just say the coordinator will walk them through it. Preliminary review is free."
);


/**
 * 최소 참고자료 (2026-07-05) — 사용자가 서류/절차/비용을 묻지 않은 턴에 주입.
 * 서류 5종 목록(#625)과 가격 정보 전부를 뺀 요약판: 모델이 못 본 가격은 못 흘린다
 * (ru 간헐 가격 선노출 실측 후속). 물으면 CARE_REFERENCE(전체판)가 그대로 주입됨.
 */
export const CARE_REFERENCE_MINIMAL = `
[healwith 안내자료 | Official | 범위 요약]
SCOPE: Oncology only. Korea, foreign/uninsured patients. Care journey: precise diagnosis and treatment (surgery/chemo) at partner university hospitals, then supportive immune/rehab care. Integrative/Korean medicine is SUPPORTIVE care only — never a cancer cure.
REQUIRED DOCUMENTS: a healwith coordinator guides which medical papers are needed (5 standard items). Do NOT enumerate them unless the user asks what to prepare — say the coordinator will walk them through it. Preliminary review is free.
PRICING: healwith holds verified indicative price ranges, but do NOT quote ANY figure unless the user explicitly asks about cost. If cost comes up unprompted, say a personalized quote follows after the medical team reviews the diagnosis.
INTEGRATIVE CARE (Immune Hospital, healwith partner) — for recovery / side effects / immunity / rehabilitation questions, name the actual treatments instead of a vague label: Thymosin a1, Mistletoe, Immucothel, Immuncell-LC (T-cell therapy), RF hyperthermia, lymphatic drainage and acupuncture (post-op lymphedema), selenium / glutathione / high-dose vitamin C / Dipeptiven, and dietitian-planned therapeutic diets (low-residue after colorectal or gastric surgery). NAME the hospital in the user's language (면력한방병원 in Korean; exactly "Immune Hospital" in every other language) — "a partner clinic" alone is not enough. Always say it is SUPPORTIVE alongside the main treatment, never a cure, and offer ONE next step: a healwith coordinator arranges the referral. NEVER claim survival benefit or tumor shrinkage.
`.trim();

/**
 * 이 턴에 주입할 안내자료 판을 고른다.
 * 시스템 프롬프트와 품질 판사가 «같은 판»을 봐야 한다 — 두 곳에서 따로 고르면
 * 한쪽만 바뀌어 판사가 엉뚱한 자료로 채점한다(2026-08-24 반성문 #173).
 */
export function pickCareReference(docListAllowed: boolean): string {
  return docListAllowed ? CARE_REFERENCE : CARE_REFERENCE_MINIMAL;
}
