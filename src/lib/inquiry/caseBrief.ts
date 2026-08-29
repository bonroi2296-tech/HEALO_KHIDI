/**
 * healwith: 문의 → 코디용 "케이스 브리프" (빠른 의사판단 보조)
 *
 * 코디가 문의상세에서 버튼을 누르면, 접수된 구조화 인테이크 + 메시지 + 첨부 의료문서(멀티모달)를
 * Gemini가 다 읽고 한 화면 브리프로 정리한다:
 *   ① 환자 개요(누구·무슨 상태)  ② 원하는 것  ③ 코디가 볼 포인트/다음 액션  ④ 주의 플래그
 *
 * ⚠️ 의료 레드라인(triage.ts 와 동일): 확정진단·처방·결과보장 금지. 이건 "AI가 정리한 초안"이고
 *    최종 판단은 코디·의료진 몫 — 응답에 항상 검수 라벨을 붙여 노출한다(클라이언트).
 *    개인식별정보(이름·연락처)는 브리프에 넣지 않는다(임상 요약만) → 평문 노출 최소화.
 *
 * 캐시: 결과는 API 가 **암호화해** inquiries.coordinator_brief 에 넣는다(열람 즉시 뜨게).
 *      (이 주석은 한때 「저장하지 않는다」였는데 실제로는 캐시가 붙었다 — 2026-07-29 정정.)
 *
 * 🌐 언어: 브리프는 **읽는 사람 언어로** 만든다. 코디가 러시아어 사용자인데 본문만 한국어로
 *      나와서 «틀은 러시아어, 정작 읽을 알맹이는 한국어»가 됐다(2026-07-29 실측).
 *      한국 직원은 한국어로 봐야 하므로 «그냥 러시아어로 바꾸기»는 답이 아니다 →
 *      캐시를 { ko: {...}, ru: {...} } 처럼 **언어별로** 담는다(서로 지우지 않는다).
 */

import "server-only";

import { redactModelPii } from "../security/redactModelPii";
import { logAiUsage } from "@/lib/ai/usageLog";
import { getAiReadable } from "@/lib/documents/aiReadable";
import { followUpSig, followUpsForBrief } from "@/lib/inquiry/followUps";
import { readPreparedStudy, renderSlicesPng } from "@/lib/imaging/prepareStudy";
import { fetchGeminiWithCompat } from "@/lib/ai/geminiThinkingCompat";

const MODEL = "gemini-flash-latest";

// Gemini inlineData 로 직접 판독 가능한 타입만(이미지 + PDF). doc/docx 는 모델이 못 읽음.
const MODEL_READABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_FILES = 6;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;

type Attachment = { path?: string | null; name?: string | null; type?: string | null };

export type CaseBrief = {
  overview: string;        // 한 줄 개요(누구·무슨 상태) — 이름 없이 임상 위주
  request: string;         // 환자가 원하는 것(치료·일정·우선순위)
  points: string[];        // 코디가 볼 포인트 / 다음 액션
  red_flags: string[];     // 주의 깊게 볼 점(있으면)
  imaging_note?: string;   // CT 초견(AI) — 영상 대표 장면을 보고 적은 «참고용 초안». 판독 아님
};

// 브리프를 만들 수 있는 언어 = 백오피스 언어와 동일(6개).
export const BRIEF_LANGS = ["ko", "en", "ru", "kz", "zh", "ja"] as const;
export type BriefLang = (typeof BRIEF_LANGS)[number];
export const normalizeBriefLang = (v: any): BriefLang =>
  (BRIEF_LANGS as readonly string[]).includes(String(v)) ? (String(v) as BriefLang) : "ko";

// 언어별 캐시 묶음. 예전에 저장된 «브리프 한 개» 형태도 읽을 수 있게 아래 readBriefMap 이 흡수한다.
// 캐시에는 브리프 + 「못 읽은 첨부 수」를 같이 담는다(화면이 그 숫자를 그대로 띄운다).
export type CaseBriefMap = Partial<Record<BriefLang, CaseBrief & { unreadable?: number }>>;

/** 저장돼 있던 값 → 언어별 묶음. 옛 형식(브리프 한 개)은 한국어로 친다. */
export function readBriefMap(parsed: any): CaseBriefMap {
  if (!parsed || typeof parsed !== "object") return {};
  // 옛 형식: 브리프 그 자체(overview 를 갖고 있다)
  if (typeof parsed.overview === "string") return { ko: parsed as CaseBrief };
  const out: CaseBriefMap = {};
  for (const l of BRIEF_LANGS) {
    const b = parsed[l];
    if (b && typeof b === "object" && typeof b.overview === "string") out[l] = b as CaseBrief;
  }
  return out;
}

export type CaseBriefResult =
  | { ok: true; brief: CaseBrief; unreadableCount: number }
  | { ok: false; error: string };

/**
 * 응답 형식. imaging_note 는 **CT 장면이 붙었을 때만 «필수»**로 만든다 —
 * 선택으로 두면 모델이 그냥 건너뛴다(실측 2026-08-03: 12장을 붙였는데도 빈 채로 왔다).
 */
function responseSchema(withImaging: boolean) {
  return {
    type: "object",
    properties: {
      overview: { type: "string" },
      request: { type: "string" },
      points: { type: "array", items: { type: "string" } },
      red_flags: { type: "array", items: { type: "string" } },
      ...(withImaging ? { imaging_note: { type: "string" } } : {}),
    },
    required: withImaging
      ? ["overview", "request", "points", "imaging_note"]
      : ["overview", "request", "points"],
  };
}

// 저장소에서 모델이 읽을 수 있는 첨부만 base64 inlineData 로.
// ⚠️ 예전엔 18MB 를 넘으면 `break` 로 «조용히» 빠졌다 — 자료를 한 글자도 안 읽고도
//    브리프가 «첨부 반영됨»으로 기록됐다(문의 #60: 130MB 진료기록이 통째로 무시됨).
//    지금은 ①큰 스캔 PDF 는 getAiReadable 이 줄여서 넣고 ②그래도 못 넣은 건 unreadable 로 «센다».
//    센 숫자는 브리프 화면에 그대로 표시된다 — 못 읽은 걸 숨기지 않는다.
async function loadInlineParts(attachments: Attachment[]): Promise<{ parts: any[]; unreadable: number }> {
  const parts: any[] = [];
  let total = 0;
  let unreadable = 0;
  for (const att of (attachments || []).slice(0, MAX_FILES)) {
    const type = att?.type || (att?.name ? guessType(att.name) : "") || "";
    if (!att?.path || !MODEL_READABLE.has(type)) { unreadable++; continue; }
    try {
      const doc = await getAiReadable("attachments", att.path, type);
      if (!doc.ok) { unreadable++; continue; }
      if (total + doc.buffer.length > MAX_TOTAL_BYTES) { unreadable++; continue; }
      total += doc.buffer.length;
      parts.push({ inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString("base64") } });
    } catch { unreadable++; }
  }
  return { parts, unreadable };
}

function guessType(name: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "";
}

/**
 * 브리프 입력 서명 — 첨부가 바뀌면(추가/삭제) 캐시를 stale 로 감지해 다음 열람 때 자동 재생성.
 * 첨부 경로만 쓰므로 비민감(경로는 난수 파일명). 저장(POST)·판정(GET) 양쪽이 같은 함수로 계산.
 */
export function briefSig(
  attachments: Attachment[] | null | undefined,
  followUps?: unknown
): string {
  const paths = (attachments || []).map((a) => a?.path || "").filter(Boolean).sort();
  // 접수 후 추가 정보가 늘어도 «낡음»으로 잡혀야 한다 — 안 그러면 새로 받은 상태가 브리프에 영영 안 들어간다.
  return `${paths.length}:${paths.join("|")}#${followUpSig(followUps)}`;
}

// 구조화 인테이크(복호화된 inquiry)에서 브리프에 쓸 비식별 임상 컨텍스트만 뽑아 텍스트로.
// export 인 이유: 「어떤 값이 모델에게 실제로 전달되는가」는 시험으로 지켜야 한다.
// 요약문에 그 값이 안 보이는 것과 애초에 «안 넘어간» 것은 다른 문제인데, 요약만 보고는 못 가른다.
export function buildContext(inq: any, lang: BriefLang): string {
  const intake = inq?.intake && typeof inq.intake === "object" ? inq.intake : {};
  const looksEnc = (s: any) => typeof s === "string" && /^\{"(v|iv|tag|data)"\s*:/.test(s.trim());
  const clean = (v: any) => (looksEnc(v) ? null : v);
  const lines: string[] = [];
  // 모델은 «오늘»을 모른다 — 안 주면 지난 진단일(2026-06)을 «미래 날짜, 오기재»로 판정한다(2026-08-19 실서비스 #132 실측).
  lines.push(`today: ${new Date().toISOString().slice(0, 10)}`);
  if (inq?.nationality) lines.push(`nationality: ${inq.nationality}`);
  if (inq?.cancer_type) lines.push(`cancer_type: ${inq.cancer_type}`);
  // 코디가 확정한 진단코드(inquiries.icd_code). 아래 referral.icdCode 는 «환자가 적은 값»이라
  // 둘 다 있으면 나란히 들어간다 — 모델이 어느 쪽이 확정인지 알아야 해서 이름을 갈라 둔다.
  if (inq?.icd_code) lines.push(`icd_code (confirmed by coordinator): ${inq.icd_code}`);
  if (clean(intake.stage)) lines.push(`stage: ${intake.stage}`);
  if (clean(intake.treatment_state)) lines.push(`treatment_state: ${clean(intake.treatment_state)}`);
  if (clean(intake.diagnosis_date)) lines.push(`diagnosis_date: ${clean(intake.diagnosis_date)}`);
  if (clean(intake.travel_timing)) lines.push(`travel_timing: ${intake.travel_timing}`);
  if (Array.isArray(intake.priorities) && intake.priorities.length) {
    const pl = PRIORITY_LABELS[lang] || PRIORITY_LABELS.ko;
    lines.push(`priorities: ${intake.priorities.map((p: string) => pl[p] || p).join(", ")}`);
  }
  if (inq?.preferred_date) lines.push(`preferred_date: ${inq.preferred_date}`);
  // 새 의뢰서(intake_data, referral_v1 — 복호화된 inq.referral)의 임상 칸. 여권번호·생년월일 같은 식별정보는 넣지 않는다.
  const ref = inq?.referral && typeof inq.referral === "object" && inq.referral.version === "referral_v1" ? inq.referral : null;
  if (ref) {
    const REF_KEYS = ["diagnosisNameRaw", "icdCode", "stage", "diagnosisDate", "onsetDate", "chiefComplaint", "testsAndTreatments",
      "localDoctorOpinion", "pastHistory", "pastHistoryNote", "medications", "familyHistory", "referralWants", "referralPurpose", "flightFitness"];
    for (const k of REF_KEYS) {
      const v = clean(ref[k]);
      if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
      lines.push(`referral.${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
    }
    if (ref.mode === "quick") lines.push("referral.mode: quick (patient chose consultation-only; clinical fields intentionally left empty)");
  }
  // 접수 «이후»에 코디가 받은 환자 상태 — 서류엔 없지만 «지금» 상태라 브리프에 꼭 들어가야 한다.
  const fu = followUpsForBrief(inq?.follow_ups);
  if (fu) lines.push(`follow_up_notes (received after intake, from coordinator):\n${fu}`);
  return lines.join("\n");
}

// 우선순위 코드 → 라벨(신·구 값 모두). 서버 모듈이라 intakeLabels(lucide) 를 안 끌어오려고 인라인.
// ⚠️ 6개 언어인 이유: 프롬프트가 «환자가 고른 항목을 라벨 그대로 인용하라»고 시킨다.
//    러시아어 브리프에 한국어 라벨을 넣어주면 그 한국어가 본문에 그대로 박힌다.
const PRIORITY_LABELS: Record<string, Record<string, string>> = {
  ko: { cost: "비용", fast_start: "빠른 치료 시작", short_stay: "짧은 체류·치료 기간", expertise: "의료진·병원 실력", communication: "소통·통역", price: "가격", duration: "기간", doctor: "의료진", accessibility: "접근성" },
  en: { cost: "cost", fast_start: "starting treatment quickly", short_stay: "short stay / short treatment", expertise: "doctor and hospital expertise", communication: "communication and interpreting", price: "price", duration: "duration", doctor: "doctors", accessibility: "accessibility" },
  ru: { cost: "стоимость", fast_start: "быстрое начало лечения", short_stay: "короткое пребывание и лечение", expertise: "опыт врачей и больницы", communication: "общение и перевод", price: "цена", duration: "длительность", doctor: "врачи", accessibility: "доступность" },
  kz: { cost: "құны", fast_start: "емдеуді жылдам бастау", short_stay: "қысқа болу және емдеу", expertise: "дәрігерлер мен аурухана тәжірибесі", communication: "қарым-қатынас және аударма", price: "баға", duration: "ұзақтығы", doctor: "дәрігерлер", accessibility: "қолжетімділік" },
  zh: { cost: "费用", fast_start: "尽快开始治疗", short_stay: "短期停留与治疗", expertise: "医生与医院水平", communication: "沟通与翻译", price: "价格", duration: "时长", doctor: "医生", accessibility: "便利性" },
  ja: { cost: "費用", fast_start: "早期の治療開始", short_stay: "短期滞在・短期治療", expertise: "医師・病院の実力", communication: "コミュニケーション・通訳", price: "価格", duration: "期間", doctor: "医師", accessibility: "アクセス" },
};

// 모델에게 «무슨 언어로 쓰라»고 이름으로 말해준다(코드 "kz" 로는 못 알아듣는다).
const LANG_NAME: Record<string, string> = {
  ko: "Korean", en: "English", ru: "Russian", kz: "Kazakh", zh: "Simplified Chinese", ja: "Japanese",
};

function buildPrompt(lang: BriefLang, withImaging = false): string {
  const L = LANG_NAME[lang] || "Korean";
  return [
    `You are a medical-tourism case coordinator's assistant for healwith (Korea, oncology).`,
    `A foreign patient (Russian/Kazakh/CIS) submitted an inquiry. You are given: (1) structured intake fields, (2) the patient's free-text message, (3) uploaded medical documents (images/PDF).`,
    `Produce a CONCISE BRIEF **written in ${L}** that lets the coordinator make a fast judgment. Output JSON:`,
    `- overview: one or two sentences — who (age/sex if evident, nationality) and their clinical situation (what the records/intake suggest). Use careful, non-definitive wording (the ${L} equivalent of "appears to" / "suggests"). DO NOT include the patient's name, phone, email, or any personal identifier.`,
    `- request: ONLY what the patient EXPLICITLY stated — from their free-text message and the intake fields (travel timing, stated priorities, the treatment stage they reported). Do NOT name or infer a specific treatment (e.g. conization/LEEP) that the patient did not state. If the patient did not specify a desired treatment, say so plainly (the ${L} equivalent of "no specific treatment stated") — never invent a wish.`,
    `  When listing the patient's priorities, quote each selected option by the plain label EXACTLY as given in the intake above. Do NOT expand a label into an interpretive phrase — e.g. do not turn "doctors" into "the expertise of the doctors", or "short stay" into "shortening the treatment period". Just state which priorities they picked.`,
    `- points: array of short bullet strings — what the coordinator should look at or do next. Put YOUR CLINICAL INFERENCES here (e.g. "CIN3 → consider conization (LEEP)"), clearly framed as coordinator considerations, NOT as the patient's request. Also: needed precision tests, suggested hospital department, missing documents, scheduling.`,
    `- red_flags: array of short strings — anything needing careful attention (urgency, abnormal critical values, contradictions). Empty array if none.`,
    // CT 대표 장면이 붙은 경우에만 — 코디는 의학 지식이 없어서 «무엇이 보이는지»를 알 길이 없다.
    // 그래서 초견을 준다. 확진이 아니라 «의료진 판독 전 참고»라는 것을 문장 안에서도 못 박게 한다.
    withImaging
      ? `- imaging_note: a PRELIMINARY observation of the CT slices attached (evenly sampled from the study — NOT the full series). Write 2-5 short sentences in ${L}: which body region is shown, and any obvious findings (mass, fluid, dilated collecting system, effusion, enlarged nodes) with their location. Use hedged wording throughout (the ${L} equivalent of "appears/suspected"). This is a reading aid for a NON-MEDICAL coordinator before a doctor reads the study — say so plainly at the end of the field. NEVER state a definitive diagnosis, stage, or treatment. If the sampled slices are not informative, say that instead of guessing. Omit this field entirely when no CT slices are attached.`
      : null,
    ``,
    `TERMS: write anatomy in the standard ${L} clinical term, never a transliteration of the source sound (Korean: 대동맥 not 아오르타, 수신증 not 수뇨관신배확장증). Never invent a term that does not exist in ${L} clinical usage (Korean: there is no such word as 세종격동).`,
    // ⚠️ 이 브리프를 «가장 먼저 읽는 사람은 의학 지식이 없는 코디네이터»다 (PO 지시 2026-08-04:
    //   «의사들은 알아먹더라도 먼저 보는 사람은 전문 의료인이 아니잖아»). 「폐야」·「종격동」을
    //   그대로 쓰면 코디는 무슨 말인지 모른 채 에이전시에 옮긴다. 쉬운 말이 «먼저», 전문 용어는 괄호로.
    `PLAIN WORDS FIRST: the FIRST reader is a coordinator with NO medical training; a doctor reads it later. So lead with everyday ${L} and put the clinical term in parentheses after it — never the other way round. Korean examples: 「양쪽 폐 전체(폐야)」, 「양쪽 폐 사이 가운데 공간 — 심장·큰 혈관·기도가 있는 곳(종격동)」, 「콩팥에 소변이 고여 부은 상태(수신증)」, 「배 안에 물이 참(복수)」. If a finding cannot be said in everyday words, add one short clause explaining what that body part does or where it is. This applies to overview, points, red_flags and imaging_note alike.`,
    // ⚠️ 아래 두 줄은 2026-08-04 문의 #60 에서 실제로 터진 것이다. 지우지 마라.
    //   ①「Противопоказаний к авиаперелетам нет/есть 등 표기 확인 필요」처럼 **원문 문장과
    //     모델의 망설임이 통째로** 한국어 칸에 박혔다. 읽는 사람은 러시아어를 모른다.
    //   ②원문은 «нет»(금기 없음)인데 요약에는 「항공편 이용 금기 상태」라고 **정반대**로 적혔다.
    //     이건 «환자가 한국에 올 수 있느냐»를 뒤집는 문장이라 오역 중 가장 위험한 종류다.
    `LANGUAGE PURITY (hard): every field must contain ONLY ${L} (plus Latin medical abbreviations like ECOG, cT4N1M1, CT). NEVER output Cyrillic or any source-language text — not even quoted, not even in parentheses. Do not narrate your own uncertainty about wording ("marking needs checking", "page 11 says X but"). Say the fact plainly, or say it needs confirmation. One idea per sentence, short.`,
    // ⚠️ 러시아어는 부정어가 **문장 맨 뒤**에 온다. 모델이 앞의 명사(「금기」)만 읽고 뒤집었다 —
    //   2026-08-04 문의 #60 에서 실제로 «금기 없음»을 «금기 명시»로 두 번 연속 틀렸다.
    `NEGATION SAFETY (critical): Russian puts the negation at the END of the clause. "Противопоказаний к авиаперелетам НЕТ" means there are **NO** contraindications to air travel — it is a clearance, not a warning. Never read the leading noun ("противопоказаний" = contraindications) as an assertion; always read to the end of the sentence for "нет" (absent) vs "есть" (present). The same applies to метастазов нет, асцита нет, выпота нет. If you are not certain of the polarity, do NOT assert either way — put "needs confirmation" in red_flags only and keep it OUT of overview. An inverted negation about fitness to fly, contraindications, or metastasis changes the entire plan.`,
    `RULES (medical redline): You are NOT the treating doctor. Do NOT give a definitive diagnosis, prescribe, or guarantee outcomes. Summarize what the records appear to show, carefully. Preserve any critical values/findings faithfully (do not invent). **Strictly separate what the patient STATED (goes in \`request\`) from your clinical INFERENCE (goes in \`points\`) — never present an inference as the patient's stated wish.** Keep it brief and skimmable. **Write every output field in ${L}** (medical terms may keep their standard Latin/technical form).`,
    `Return ONLY the JSON object.`,
  ].join("\n");
}


/**
 * 한국어 칸에 섞여 나온 «러시아어 원문»을 걷어낸다.
 *
 * 왜 코드로도 막나 (2026-08-04): 프롬프트에 「원문을 붙이지 마라」를 적었는데도 모델이
 *   괄호 안에 계속 끼워 넣었다 — 「'항공이송 금기(Противопоказаний к авиаперелетам
 *   нет/есть)' 관련 언급」처럼. 읽는 사람은 러시아어를 모르니 이건 «없는 정보 + 방해»다.
 *   검출 조건이 «키릴 문자가 있나»로 기계적으로 명확해서 코드로 막을 수 있는 부류다.
 *   괄호째 지우고, 남는 겹공백·빈 괄호를 정리한다. 문장 전체가 러시아어면 그 줄은 버린다.
 */
function clean(v: any): string {
  let s = String(v ?? "");
  if (!/[Ѐ-ӿ]/.test(s)) return s.trim();
  s = s.replace(/[（(][^)）]*[Ѐ-ӿ][^)）]*[)）]/g, "");   // 키릴이 든 괄호 통째로
  s = s.replace(/['"“”'']\s*['"“”'']/g, "");                      // 안이 비어버린 따옴표
  s = s.replace(/[Ѐ-ӿ][Ѐ-ӿ\s.,;:/-]*/g, "");   // 그래도 남은 키릴 덩어리
  return s.replace(/\s{2,}/g, " ").replace(/\s+([,.)])/g, "$1").trim();
}

/** CT 묶음인가 — 모델에 통째로는 못 넣는다(압축 파일). */
function isImagingBundle(a: Attachment): boolean {
  const n = String(a?.name || a?.path || "").toLowerCase();
  const t = String(a?.type || "").toLowerCase();
  return /\.(rar|zip|dcm)$/.test(n) || t.includes("rar") || t.includes("zip") || t.includes("dicom");
}

// CT 초견용 대표 장면 수. 12장이면 몸통을 위아래로 훑는다(정밀 판독용 아님).
const IMAGING_SLICES = 12;

/**
 * CT 묶음 → ①글(촬영 목록·기기 기록) ②대표 장면 그림.
 *
 * ⚠️ **이미 풀어 둔 묶음만** 쓴다. 안 풀린 걸 여기서 풀면 브리프 한 번에 20초가 더 붙는다
 *   (코디가 「영상 보기」를 한 번이라도 눌렀으면 풀려 있다). 안 풀린 건 «못 읽음»으로 남는다.
 */
async function imagingSummary(
  attachments: Attachment[]
): Promise<{ text: string; parts: any[]; covered: number }> {
  const out: string[] = [];
  const parts: any[] = [];
  let covered = 0;
  for (const a of (attachments || []).slice(0, MAX_FILES)) {
    if (!a?.path || !isImagingBundle(a)) continue;
    const prepared = await readPreparedStudy(a.path).catch(() => null);
    if (!prepared) continue;
    covered++;
    if (prepared.series.length) {
      out.push(`series: ${prepared.series.map((s) => `${s.desc} (${s.modality}, ${s.count} slices)`).join("; ")}`);
    }
    for (const d of prepared.docs) {
      out.push(`${d.desc} (machine record):\n${d.lines.slice(0, 120).join("\n")}`);
    }
    if (parts.length === 0) {
      const shots = await renderSlicesPng(a.path, IMAGING_SLICES).catch(() => null);
      if (shots) {
        out.push(`attached slices: ${shots.images.length} images evenly sampled from "${shots.seriesDesc}" (${shots.total} slices total)`);
        for (const b64 of shots.images) parts.push({ inlineData: { mimeType: "image/png", data: b64 } });
      }
    }
  }
  return { text: out.join("\n"), parts, covered };
}

/**
 * 문의 1건의 케이스 브리프를 생성한다. inquiry 는 복호화된 상세(API 가 넘김).
 * 결과만 반환(저장은 API 몫). 모델 실패/키없음이면 error 코드형 반환.
 */
export async function generateCaseBrief(opts: {
  inquiry: any;
  attachments: Attachment[];
  lang?: string;   // 읽는 사람 언어(백오피스 언어). 없으면 한국어.
}): Promise<CaseBriefResult> {
  const lang = normalizeBriefLang(opts.lang);
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return { ok: false, error: "no_api_key" };

  const { parts: fileParts, unreadable: rawUnreadable } = await loadInlineParts(opts.attachments || []);
  const context = buildContext(opts.inquiry, lang);
  // CT 묶음(.rar/.zip)은 모델에 통째로 못 넣는다. 대신 **이미 풀어 둔 게 있으면**
  // 촬영 목록과 기기가 남긴 글 기록(선량 기록 등)을 글로 넣는다. 그림 판독은 넣지 않는다.
  const { text: imagingText, parts: imagingParts, covered } = await imagingSummary(opts.attachments || []);
  const unreadable = Math.max(0, rawUnreadable - covered);
  const rawMsg = typeof opts.inquiry?.message === "string" ? opts.inquiry.message : "";
  const safeMsg = redactModelPii(rawMsg).trim();

  const userText =
    `Structured intake:\n${context || "(none)"}\n\n` +
    (safeMsg ? `Patient message: "${safeMsg}"\n\n` : "") +
    (imagingText
      ? `Imaging study on file${imagingParts.length ? " — representative CT slices are attached as images below (sampled, not the whole series)" : " (series list and machine records only; the images were NOT read — do not infer findings from this)"}:\n${imagingText}\n\n`
      : "") +
    (fileParts.length ? "Uploaded medical documents are attached — read them.\n" : "No documents uploaded.\n") +
    "Produce the JSON brief.";

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    // 별칭 세대 교체 생존 사다리 — thinkingBudget 거절(400) 시 강등 재시도(geminiThinkingCompat).
    const res = await fetchGeminiWithCompat(url, {
      systemInstruction: { parts: [{ text: buildPrompt(lang, imagingParts.length > 0) }] },
      contents: [{ role: "user", parts: [{ text: userText }, ...fileParts, ...imagingParts] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
      generationConfig: {
        temperature: 0.2,
        // CT 초견까지 담으면 2048 에서 끊겨 JSON 이 깨졌다(실측 2026-08-03: parse_error).
        maxOutputTokens: 16384,
        thinkingConfig: { thinkingLevel: "minimal" },
        responseMimeType: "application/json",
        responseSchema: responseSchema(imagingParts.length > 0),
      },
    });

    if (!res.ok) return { ok: false, error: "model_http_error" };
    const json = await res.json();

    logAiUsage({
      surface: "case_brief",
      model: MODEL,
      promptTokens: json?.usageMetadata?.promptTokenCount ?? null,
      completionTokens: json?.usageMetadata?.candidatesTokenCount ?? null,
      meta: { attachments: fileParts.length, lang },
    }).catch(() => {});

    // 길이 상한에서 끊기면 JSON 이 깨진 채 온다 — «파싱 실패»로 뭉뚱그리지 말고 이유를 남긴다.
    const finish = json?.candidates?.[0]?.finishReason;
    const raw = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch {
      if (finish === "MAX_TOKENS") console.error("[caseBrief] 길이 상한에서 끊겼다(maxOutputTokens)");
      return { ok: false, error: finish === "MAX_TOKENS" ? "too_long" : "parse_error" };
    }
    if (!parsed || !parsed.overview) return { ok: false, error: "empty_result" };

    return {
      ok: true,
      unreadableCount: unreadable,
      brief: {
        overview: clean(parsed.overview),
        request: clean(parsed.request),
        points: Array.isArray(parsed.points) ? parsed.points.map(clean).filter(Boolean) : [],
        red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map(clean).filter(Boolean) : [],
        // CT 초견 — 담는 걸 빠뜨리면 모델이 잘 써 줘도 화면엔 «없음»으로 뜬다(실제로 그랬다).
        ...(parsed.imaging_note ? { imaging_note: clean(parsed.imaging_note) } : {}),
      },
    };
  } catch {
    return { ok: false, error: "internal_error" };
  }
}
