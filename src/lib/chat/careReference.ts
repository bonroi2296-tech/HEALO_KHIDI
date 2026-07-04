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
 * 가격 변동·항목 추가는 이 파일만 고치면 전 언어·전 채널에 반영됨 (단일 SoR).
 */

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
- Thyroid cancer (갑상선암): $3,000–18,500 (≈₩4M–25M)
- Stomach cancer (위암): $6,000–18,500 (≈₩8M–25M)
- Colorectal cancer (대장암): $7,500–13,500 (≈₩10M–18M)
- Lung cancer (폐암): $9,000–18,500 (≈₩12M–25M)
- Liver cancer (간암): $9,000–18,500 (≈₩12M–25M)
- Breast cancer (유방암): $6,000–13,500 (≈₩8M–18M)
- Uterine/ovarian (자궁·난소암): $7,500–15,000 (≈₩10M–20M)

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
