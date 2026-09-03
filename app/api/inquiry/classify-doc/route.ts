/**
 * /api/inquiry/classify-doc — 환자가 올린 서류를 «열어보고» 무슨 서류인지 추정한다.
 *
 * 왜 필요한가: 실서비스 문의에 실제로 올라온 파일 이름이 `папка 2.rar`·`мед доки.pdf`·
 * `image01.png` 였다. 종류별 칸을 나눠 달라고 해도 사람은 뭐가 뭔지 모르고 넣는다.
 * 그래서 «분류는 우리가 한다» — 환자는 가진 걸 그대로 올리고, 화면이 그 자리에서
 * 「이건 조직검사네요 / 진단서가 아직 없습니다」를 말해준다.
 *
 * 실측(2026-08-11, 실제 환자 서류): 원본 6개 중 6개가 글자를 못 뽑는다
 * (3개는 사진 스캔, 2개는 글꼴 깨짐). 그래서 글자 추출이 아니라 «AI 가 보는» 방식이다.
 * 사진 스캔 5쪽 PDF 기준 7.0~7.5초 / 약 3,700 토큰에 종류·환자명·날짜·진단명까지 나왔다.
 *
 * ⚠️ 결과는 «추정»이다. 사용자가 화면에서 고칠 수 있어야 하고(PO 결정 2026-08-12),
 *    이 값만 보고 의료 판단을 하면 안 된다.
 *
 * 🔒 이 주소는 «로그인 없이» 열려 있어야 한다 — 환자는 계정 없이 서류를 올린다.
 *    그래서 돈이 새지 않게 막는 건 «신분»이 아니라 «양»이다. 세 겹:
 *      ① 분당 20회(IP)  ② AI 공용 하루 상한(IP·전체) = 다른 AI 창구와 «같은 계량기»
 *      ③ 경로 모양 검사 — 우리 문의 폴더의 파일만(남의 서류 읽히기 차단)
 *    ✋ «서명 표(HMAC 티켓)»는 일부러 «안» 만들었다(2026-08-19 검토). 표를 화면 HTML 에 심든
 *       발급 주소를 두든, 그 표를 얻는 것 자체가 「화면을 한 번 더 불러오기」라 로봇이 그대로 따라 한다.
 *       막히는 건 제일 게으른 스크립트뿐인데, 화면을 오래 열어둔 «진짜 환자»는 표가 만료돼 판독이 죽는다.
 *       돈이 새는 걸 진짜로 막는 건 ②의 하루 상한이다(넘으면 자동 차단 + 알림). 되살리려면 이 근거부터 반박해라.
 */
export const runtime = "nodejs";

import "server-only";
import { NextRequest } from "next/server";
import {
  checkRateLimitPersistent,
  getClientIp,
  RATE_LIMITS,
  getRateLimitHeaders,
} from "@/lib/rateLimit";
import { checkAiGuards } from "@/lib/ai/aiGuard";
import { DOC_KINDS, isKnownKind } from "@/lib/inquiry/docKinds";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { renderForAi } from "@/lib/documents/pdfPage";

// 상한이 «둘»이고 서로 다른 것을 재는다 — 섮이지 마라(2026-08-14 PO 혼동):
//   · 보관 200MB : 브라우저 → 저장소 직행(우리 서버를 안 거친다)
//   · 자동 판독      : 이 주소. 예전엔 파일을 서버로 다시 보내서 Vercel 4.5MB 벽에
//                    걸려 4MB 가 상한이었다. 이젠 «저장소에서 서버가 직접 집어온다» →
//                    벽이 사라지고 상한은 Gemini 요청 크기(20MB)가 된다.
//                    base64 로 부풀면 3분의 4 배가 되므로 원본 12MB 까지만 받는다.
const MAX_BYTES = 12 * 1024 * 1024;

// 이 주소는 «서류 안의 진단명·이름·여권번호»를 돌려준다. 아무 주소나 받으면
// 남의 서류를 읽힐 수 있다 → 문의 첨부 폴더만 허용한다.
// (경로 자체는 난수 UUID 가 박혀 있어 찍어맞힐 수 없다 — src/lib/storage/directUpload.ts)
const BUCKET = "attachments";
const PATH_OK = /^inquiry\/[a-f0-9-]{36}_[A-Za-z0-9._-]{1,200}$/;

// 음성 메모도 읽는다(2026-09-02 PO). 환자·에이전시가 왓츠앱·텔레그램으로 «말로» 병력을 보내는
// 경로가 실제로 있고, 코디가 그걸 일일이 듣고 정리하느라 시간을 쓰고 있었다.
// 대표 이름만 둔다 — 별칭(audio/x-m4a 등)은 올릴 때 normalizeMime 이 이미 모아준다.
const AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm", "audio/amr",
]);

const ACCEPT = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp",
  ...AUDIO_TYPES,
]);

export const maxDuration = 300; // 큰 서류는 다시 그리기 4초 + AI 8초 (실측 130.9MB 기준)

const KIND_LIST = DOC_KINDS.map((k) => k.value).join("|");

// 종류 판별과 «칸 채우기»를 한 번에 한다. 두 번 부르면 비용도 두 배고 기다림도 두 배다.
// 실측(2026-08-12, 실제 환자 서류): 종합소견서+수술기록+MRI 판독지 3장으로 21칸 중 14칸이 찼다.
// 🛑 «문서에 적혀 있는 것만» 채운다. 추론·번역 금지 — 지어낸 값이 의뢰서에 실리면 안 된다.
const PROMPT = `You are looking at medical document(s) a patient uploaded.

1) Identify what the document is.
2) Fill in ONLY the fields that are literally written in it.

Return ONLY JSON:
{"kind":"${KIND_LIST}",
 "confidence":0..1,
 "patient_name": null,
 "doc_date": "YYYY-MM-DD" or null,
 "fields": {
   "lastName": null, "firstName": null, "birthDate": "YYYY-MM-DD" or null,
   "sex": "female"|"male"|null, "passportNo": null,
   "email": null, "phone": null,
   "nationality": "KZ"|"RU"|"UZ"|"KG"|"MN"|"CN"|"JP"|"KR"|"OTHER"|null,
   "diagnosisNameRaw": null, "icdCode": null,
   "diagnosisDate": "YYYY-MM" or null, "onsetDate": null, "stage": "I"|"II"|"III"|"IV"|null,
   "chiefComplaint": null, "testsAndTreatments": null, "localDoctorOpinion": null,
   "pastHistoryNote": null, "medications": null, "familyHistory": null
 }}

Rules:
- Use null for anything not stated in the document. Do NOT infer, do NOT guess, do NOT translate.
- Copy source wording exactly, in the original language.
- Codes and staging (ICD, TNM such as cT4N1M1) must be copied CHARACTER BY CHARACTER. Never normalise
  them to a more familiar-looking pattern. A changed letter changes the diagnosis.
- These uploads often bundle several documents from DIFFERENT hospitals and DIFFERENT dates, and they
  can disagree (measured 2026-08-14: the same file said cT4N1M1 on 15.07 and cT3NxM1 on 28.07).
  When they disagree, take the value from the MOST RECENT document. Never merge or average them.
- NAMES: passports and CIS documents print the name TWICE - in Cyrillic and in Latin. For lastName and
  firstName always return the LATIN spelling exactly as printed (the one in the machine-readable zone
  at the bottom of a passport). Never return the Cyrillic form, never return both, never join them with
  a slash. Measured 2026-08-14: 1 run in 3 returned "ТАТЕПБАЕВА / TATEPBAYEVA" - that value on a referral
  form does not match the passport and the hospital rejects the registration.
  There is often NO passport in the upload. In that case still take the Latin spelling from ANY document
  that prints one - a medical report header, a lab slip, an insurance card, a referral letter. Only when
  no document anywhere prints a Latin spelling do you return null. Do NOT transliterate Cyrillic
  yourself: your guess would differ from the passport and the hospital would reject the registration.
- CONTACT: "email" and "phone" are the patient's own contact details when a document prints them
  (patient information blocks on medical reports and referral letters usually do). Copy them exactly.
  Return null for a HOSPITAL's or a DOCTOR's email/phone - only the patient's own. If a document shows
  several patient phone numbers, take the one from the most recent document. Phone keeps its country
  code and digits as printed.
- NATIONALITY: from a passport's 3-letter country code (KAZ->KZ, RUS->RU, UZB->UZ, KGZ->KG,
  MNG->MN, CHN->CN, JPN->JP, KOR->KR; anything else -> "OTHER"), or from a citizenship field that a
  document states explicitly (e.g. "Гражданство: Казахстан"). Never infer it from the language a
  medical record happens to be written in, and never from the country the hospital is in - Russian-language
  records are routine across all of Central Asia.
- If unsure of the kind, use "unknown".

DATES — read carefully. These documents come from Russia, Kazakhstan and other CIS countries,
where dates are written DAY.MONTH.YEAR. So "07.08.1992" means 7 August 1992 -> "1992-08-07",
NOT 8 July. If the day/month order is genuinely ambiguous and unmarked, return null for that
date rather than guessing. A wrong date of birth gets the patient rejected at hospital registration.`;

// 음성용 프롬프트. 서류와 «다른 것»을 요구한다 — 서류는 인쇄된 값을 베끼는 일이고,
// 음성은 말한 사람이 더듬고 스스로 고치기 때문에 «무엇이 확실하지 않은지»가 함께 나와야 한다.
// 🛑 확실하지 않은 값을 칸에 채우지 마라. 실측(2026-09-02): 환자가 「3기라고 들었는데 정확히는
//    모르겠다」고 한 것을 stage 칸에 넣지 않고 uncertain 으로 보냈다 — 이 동작이 유지돼야 한다.
const AUDIO_PROMPT = `This is a voice message from a patient or a partner agency about a cancer patient.
A medical coordinator must be able to act on it WITHOUT listening to the audio.

🛑 Rules
- Write only what is actually said. Never invent. Use "[불명]" for parts you cannot hear.
- If the speaker corrects themselves, use the LAST value they said, and record the correction in "uncertain".
- If the speaker hedges ("I think", "I'm not sure", "about"), do NOT put that value in "fields".
  Put it in "uncertain" instead. A hedged staging or date must never look confirmed.
- Do not give medical opinions or advice. Only report what was said.
- "transcript" keeps the speaker's own language, verbatim. "summaryKo", "uncertain" and "askNext"
  are all written in KOREAN - they are read on a Korean-language coordinator screen. Keep medical
  terms and drug names in their original form inside the Korean text (트라스투주맙 / trastuzumab).

Return ONLY JSON:
{"kind":"voice_memo",
 "confidence":0..1,
 "language":"language actually spoken",
 "transcript":"verbatim, in the spoken language, including filler words",
 "summaryKo":"3~5 lines in Korean — what a coordinator reads in 5 seconds",
 "fields": {
   "lastName": null, "firstName": null, "birthDate": "YYYY-MM-DD" or null,
   "sex": "female"|"male"|null, "email": null, "phone": null,
   "diagnosisNameRaw": null, "icdCode": null,
   "diagnosisDate": "YYYY-MM" or null, "stage": "I"|"II"|"III"|"IV"|null,
   "chiefComplaint": null, "testsAndTreatments": null, "medications": null,
   "pastHistoryNote": null, "familyHistory": null
 },
 "uncertain":["what was hedged or self-corrected, and why it is uncertain"],
 "askNext":["what the coordinator should confirm or reply to next"]}

DATES — speakers from Russia and Central Asia say day, then month. Return null rather than guessing
an ambiguous date. A wrong date of birth gets the patient rejected at hospital registration.`;

// AI 가 채울 수 있는 칸 목록. 여기 없는 이름을 지어내도 받지 않는다.
const FILLABLE = new Set([
  "lastName", "firstName", "birthDate", "sex", "passportNo", "nationality",
  // 연락처 — 의료 문서의 환자 정보란에 적혀 있는 경우가 많다. 여권이 없어도 이 두 칸은 채워진다
  // (2026-09-02 PO: 「여권 안 줬더니 연락처·기본 정보가 안 채워지더라」).
  "email", "phone",
  "diagnosisNameRaw", "icdCode", "diagnosisDate", "onsetDate", "stage",
  "chiefComplaint", "testsAndTreatments", "localDoctorOpinion",
  "pastHistoryNote", "medications", "familyHistory",
]);
const STAGES = new Set(["I", "II", "III", "IV"]);
const NATIONS = new Set(["KZ", "RU", "UZ", "KG", "MN", "CN", "JP", "KR", "OTHER"]);

/** AI 가 준 칸 값을 «우리가 아는 모양»으로만 통과시킨다. */
function cleanFields(raw: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!FILLABLE.has(k)) continue;                       // 지어낸 칸 이름 차단
    if (typeof v !== "string" || !v.trim()) continue;
    const val = v.trim().slice(0, 3000);
    if (k === "sex" && val !== "female" && val !== "male") continue;
    if (k === "stage" && !STAGES.has(val)) continue;
    if (k === "nationality" && !NATIONS.has(val)) continue;   // 목록에 없는 값은 버린다
    // 연락처는 «화면·서버가 받아주는 모양»일 때만 채운다. 모양이 틀린 값을 채우면
    // 칸은 차 있는데 보내기 단추가 막히고, 환자 눈엔 이유가 안 보인다.
    if (k === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) continue;
    if (k === "phone") {
      const digits = val.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 20 || val.length > 30) continue;
    }
    out[k] = val;
  }
  return out;
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.DOC_CLASSIFY);
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  // 하루 상한(IP·전체) — 채팅·번역과 «같은 계량기»를 쓴다. 여기만 빠져 있어서, IP 를 바꿔 가며
  // 부르면 AI 요금이 상한 없이 늘어날 수 있었다(2026-08-19 독립 리뷰). 넘으면 자동 차단 + 알림.
  const guard = await checkAiGuards(clientIp, "inquiry_classify_doc");
  if (!guard.allowed) {
    return Response.json(
      { ok: false, error: guard.code },
      { status: guard.status, headers: { "Retry-After": String(guard.retryAfterSec) } }
    );
  }

  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  let path = "";
  let type = "";
  try {
    const body = await request.json();
    path = typeof body?.path === "string" ? body.path : "";
    type = typeof body?.type === "string" ? body.type : "";
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (!PATH_OK.test(path)) return Response.json({ ok: false, error: "file_required" }, { status: 400 });

  // 판별 안 되는 건 오류가 아니라 «못 봤다»로 돌려준다 — 화면이 이유를 그린다.
  if (!ACCEPT.has(type)) {
    return Response.json({ ok: true, skipped: "unsupported_type", kind: "unknown" });
  }
  const isAudio = AUDIO_TYPES.has(type);

  // 보낼 조각들. 작은 서류는 원본 그대로(글자 데이터가 살아 있어 정확하다),
  // 큰 서류는 «가벼운 쪽 그림»으로 다시 그려서 보낸다.
  let parts: Array<{ inline_data: { mime_type: string; data: string } }> = [];
  let readPages: number | null = null;
  let totalPages: number | null = null;
  try {
    const dl = await supabaseAdmin.storage.from(BUCKET).download(path);
    if (dl.error || !dl.data) {
      return Response.json({ ok: true, skipped: "internal_error", kind: "unknown" });
    }
    const buf = Buffer.from(await dl.data.arrayBuffer());
    if (buf.length <= MAX_BYTES) {
      parts = [{ inline_data: { mime_type: type, data: buf.toString("base64") } }];
    } else if (isAudio) {
      // 소리는 «쪽으로 다시 그릴» 수가 없다. 12MB 를 넘으면 그대로 접는다
      // (왓츠앱 음성은 1분에 약 0.5MB 라 20분이 넘어야 걸린다).
      return Response.json({ ok: true, skipped: "too_large", kind: "voice_memo" });
    } else {
      // 130.9MB 짜리 순수 스캔이 여기서 살아난다(실측 → 6.4MB).
      const shrunk = await renderForAi(buf, type);
      if (!shrunk) return Response.json({ ok: true, skipped: "too_large", kind: "unknown" });
      parts = shrunk.pages.map((p) => ({ inline_data: { mime_type: p.mime, data: p.b64 } }));
      readPages = shrunk.read;
      totalPages = shrunk.total;
    }
  } catch {
    return Response.json({ ok: true, skipped: "internal_error", kind: "unknown" });
  }

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: isAudio ? AUDIO_PROMPT : PROMPT }, ...parts] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
        // 종류만 판별할 땐 5~8초면 됐는데, 칸까지 뽑게 하니 응답이 길어져 45초를 넘기는
        // 경우가 생겼다(실측 2026-08-14: 2회 중 1회 시간초과 → 「못 읽었습니다」로 떨어짐).
        // 여기서 끊기면 «읽을 수 있었던 서류»를 못 읽은 걸로 버린다. 넉넉히 준다.
        signal: AbortSignal.timeout(120_000),
      }
    );
    if (!res.ok) return Response.json({ ok: true, skipped: "upstream_error", kind: "unknown" });

    const j = await res.json();
    const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { /* 형식이 깨졌으면 «판별 못 함»으로 */ }

    // AI 가 목록에 없는 종류를 지어내면 받지 않는다.
    const kind = isAudio
      ? "voice_memo"                                        // 소리는 종류가 정해져 있다
      : isKnownKind(parsed?.kind) ? parsed.kind : "unknown";
    const fields = cleanFields(parsed?.fields);

    // 소리에서만 나오는 것들. 목록 길이·글자 수를 여기서 잘라 «화면이 감당할 크기»로 넘긴다.
    const line = (v: any, max: number) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
    const list = (v: any, n: number, max: number) =>
      Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim())
        .slice(0, n).map((x) => x.trim().slice(0, max)) : [];

    return Response.json({
      ok: true,
      kind,
      ...(isAudio
        ? {
            language: line(parsed?.language, 40),
            transcript: line(parsed?.transcript, 20000),
            summaryKo: line(parsed?.summaryKo, 2000),
            // ⚠️ 「확실하지 않은 것」은 요약보다 먼저 읽혀야 한다 — 흐리게 말한 병기·날짜를
            //    확정으로 처리하면 그게 그대로 병원에 나간다.
            uncertain: list(parsed?.uncertain, 12, 300),
            askNext: list(parsed?.askNext, 12, 300),
          }
        : {}),
      confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
      patientName: parsed?.patient_name ?? null,
      docDate: parsed?.doc_date ?? null,
      // 쪽이 많아 앞만 읽었으면 숨기지 않는다 — 화면이 「앞 N쪽만 읽었습니다」를 표시한다.
      readPages, totalPages,
      diagnosisText: fields.diagnosisNameRaw ?? null,
      // ⚠️ «추정»이다. 화면은 이 값을 「저희가 읽었습니다 — 다르면 고쳐주세요」로 보여줘야 하고,
      //    사용자가 이미 쓴 칸은 덮어쓰면 안 된다.
      fields,
    });
  } catch {
    // 서버 오류 문구를 그대로 내보내지 않는다(보안 규칙). 화면은 코디 확인으로 넘긴다.
    return Response.json({ ok: true, skipped: "internal_error", kind: "unknown" });
  }
}
