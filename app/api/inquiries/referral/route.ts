/**
 * /api/inquiries/referral — 새 의뢰서 한 장 제출 (공개)
 *
 * 기존 step1/step2 를 대체한다. 제출은 «한 번»이고, 못 채운 칸은 그냥 비어서 들어온다.
 * 「연락처만(quick)」으로 보내도 같은 주소로 들어온다 — 나중에 이어서 채운 것도 같은 건에 붙는다.
 *
 * 저장 자리
 *   inquiries              — 이미 있는 칸(이름·이메일·국적·암종·언어·전화·내원희망일)에 그대로
 *   inquiries.intake_data  — 새 칸들. **스키마 변경 없이** 늘어난다(jsonb)
 *   cancer_patient_intakes — 병기·진단시기. 코디 화면과 KHIDI 집계가 이미 이 표를 읽는다
 *
 * 🛑 기존 칸의 «이름을 바꾸거나 지우지» 마라 — /admin/khidi/conversion 이 읽는다.
 *
 * 보안(공개 창구라 전부 필요하다)
 *   · IP 분당 5회 제한        · 인코딩 깨짐(U+FFFD) 거부
 *   · PIPA 필수 동의 서버 재확인 — 화면 관문을 건너뛴 직접 호출도 막는다
 *   · 환자 PII·건강정보는 AES-256-GCM 암호화 후 저장
 *   · 오류는 코드형만 — error.message 를 그대로 내보내지 않는다
 */
export const runtime = "nodejs";

import "server-only";
import { NextRequest, after } from "next/server";
import { z } from "zod";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { encryptString, encryptStringNullable } from "@/lib/security/encryptionV2";
import {
  checkRateLimitPersistent, getClientIp, RATE_LIMITS, getRateLimitHeaders,
} from "@/lib/rateLimit";
import { hasMojibake } from "@/lib/inquiry/noMojibake";
import { detectInquiryIsTest } from "@/lib/khidi/testData";
import { resolveAgencyIdForUser } from "@/lib/auth/resolveAgencyIdForUser";
import { sendAdminNotification } from "@/lib/notifications/adminNotifier";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderInquiryReceivedEmail } from "@/lib/email/templates/inquiryReceived";
import { trackingUrl, toTrackingLang } from "@/lib/inquiry/trackingLink";
import { siteUrl } from "@/lib/siteUrl";
import { isOwnPath } from "@/lib/storage/directUpload";
import { safeLink, toCanonicalConsents, toDateOrNull } from "@/lib/inquiry/referralSubmit";

const s = (max: number) => z.string().max(max).nullable().optional();
const Schema = z.object({
  // 접수 문턱 — 화면과 «같은 5칸». 여기를 늘리려면 referralSchema.js 부터 고쳐라.
  lastName: z.string().min(1).max(100),
  firstName: z.string().min(1).max(100),
  email: z.string().email().max(200),
  patientLang: z.enum(["ko", "en", "ru", "kz", "kk", "zh", "ja"]),   // step1 과 같은 폭 — 낯선 코드는 코디 화면·메일 언어를 깨뜨린다
  cancerType: z.string().min(1).max(40),

  mode: z.enum(["quick", "full"]).optional(),
  phone: s(40),
  birthDate: s(20), sex: s(10), nationality: s(10), passportNo: s(60),
  stage: s(10), diagnosisNameRaw: s(600), icdCode: s(30),
  diagnosisDate: s(20), onsetDate: s(100),
  chiefComplaint: s(3000), testsAndTreatments: s(3000), localDoctorOpinion: s(3000),
  pastHistory: z.array(z.string().max(40)).max(20).optional(),
  pastHistoryNote: s(2000), medications: s(2000), familyHistory: s(2000),
  // 환자가 무엇을 받고 싶은가 — 병원에 보낼 의뢰서의 «질문»이 된다.
  // 개인정보가 아니라 고른 목록이므로 암호화 안 한다(코디가 목록에서 바로 보여야 한다).
  referralWants: z.array(z.string().max(20)).max(10).optional(),
  referralPurpose: s(2000), preferredDate: s(20),
  dateFlexible: z.boolean().optional(), flightFitness: s(20),

  // 봉투에 올린 서류 — 종류는 «추정»이거나 사용자가 고친 값이다. 사실로 다루지 마라.
  // link: 파일이 200MB 를 넘어 «못 올린» 경우, 사람이 그 자리에서 남긴 대용량 저장소 주소.
  // 안 받으면 화면에만 있고 조용히 버려진다(2026-08-18 실측으로 잡음).
  envelope: z.array(z.object({
    path: s(500), name: s(300), size: z.number().optional(),
    kind: s(40), confidence: z.number().nullable().optional(),
    corrected: z.boolean().optional(),
    link: s(600),
  })).max(30).optional(),
  // 🛑 zod 는 스키마에 없는 키를 «조용히» 버린다. 화면은 path(저장소 경로)를 보내는데 여기 없어서
  //    CD 묶음(수백 MB, 40초 묶고 몇 분 올린 것)이 저장소에만 남고 DB 어디에도 연결이 안 됐다
  //    (2026-08-19 독립 리뷰 2명이 동시에 짚음). 코디는 「CD 601개 · 100MB」만 보고 열 수가 없었다.
  cdFolder: z.object({
    name: s(300), size: z.number().optional(), count: z.number().optional(), rawSize: z.number().optional(),
    path: s(400), link: s(600),
  }).nullable().optional(),

  consents: z.record(z.string(), z.boolean()).optional(),
  sourceLocale: s(10), referrerHost: s(200), landingPath: s(300),
  utm: z.record(z.string(), z.string().max(200)).nullable().optional(),
});

const REQUIRED_CONSENTS = ["pipa", "sensitive", "thirdParty", "crossBorder"];

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: getRateLimitHeaders(rl) });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  // CP949 등으로 깨진 한글이 DB·알림메일에 그대로 박히는 걸 막는다(POSTMORTEMS #92).
  if (hasMojibake(body)) {
    return Response.json({ ok: false, error: "broken_encoding" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "validation_error" }, { status: 400 });
  }
  const d = parsed.data;

  // PIPA 필수 동의 서버 재확인 — 화면 관문을 우회한 직접 호출도 막는다.
  const consents = d.consents ?? {};
  if (REQUIRED_CONSENTS.some((k) => consents[k] !== true)) {
    return Response.json({ ok: false, error: "consent_required" }, { status: 400 });
  }

  let userId: string | null = null;
  let accountEmail: string | null = null;
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const { data: u } = await supabaseAdmin.auth.getUser(auth.substring(7));
      userId = u?.user?.id ?? null;
      accountEmail = u?.user?.email ?? null;
    } catch { /* 게스트로 처리 */ }
  }
  const agencyId = await resolveAgencyIdForUser(supabaseAdmin, userId);

  try {
    const enc = encryptStringNullable;
    // 건강정보·PII 는 전부 암호화해서 넣는다. 평문으로 두는 건 그 자체로는 사람을 특정할 수
    // 없는 값(성별·국적·병기·비행 가능 여부)뿐이다.
    const intakeData = {
      version: "referral_v1",
      mode: d.mode ?? "full",
      passportNo: enc(d.passportNo ?? null),
      birthDate: enc(d.birthDate ?? null),
      sex: d.sex ?? null,
      diagnosisNameRaw: enc(d.diagnosisNameRaw ?? null),
      // 화면의 「모르겠습니다」 표식(__unknown__)은 값이 아니다 — null 로. (독립 리뷰: 코디 카드에 날것이 떴다)
      icdCode: d.icdCode && d.icdCode !== "__unknown__" ? d.icdCode : null,
      stage: d.stage ?? null,                       // 병기는 그 자체로 사람을 특정하지 않는다 — 평문
      diagnosisDate: enc(d.diagnosisDate ?? null),  // 건강정보 — 암호화(옛 intake.diagnosis_date 와 같은 취급)
      onsetDate: enc(d.onsetDate ?? null),
      chiefComplaint: enc(d.chiefComplaint ?? null),
      testsAndTreatments: enc(d.testsAndTreatments ?? null),
      localDoctorOpinion: enc(d.localDoctorOpinion ?? null),
      pastHistory: d.pastHistory ?? [],
      pastHistoryNote: enc(d.pastHistoryNote ?? null),
      medications: enc(d.medications ?? null),
      familyHistory: enc(d.familyHistory ?? null),
      referralWants: d.referralWants ?? [],
      referralPurpose: enc(d.referralPurpose ?? null),
      flightFitness: d.flightFitness ?? null,
      // ⚠️ kind 는 «AI 추정 또는 사용자가 고친 값»이다. 의료 판단의 근거로 쓰지 마라.
      envelope: (d.envelope ?? []).map((f) => ({
        // 🛑 경로는 «우리 sign 이 만든 모양»만. 남의 파일 경로를 자기 문의에 붙이면 코디 화면이 그걸 열어 준다(독립 리뷰).
        path: f.path && isOwnPath("inquiry", f.path) ? f.path : null, name: f.name ?? null, size: f.size ?? null,
        kind: f.kind ?? "unknown", confidence: f.confidence ?? null,
        correctedByUser: f.corrected === true,
        link: safeLink(f.link),   // 200MB 를 넘어 못 올린 경우 사람이 남긴 대용량 저장소 주소
      })),
      cdFolder: d.cdFolder ? { ...d.cdFolder, path: d.cdFolder.path && isOwnPath("inquiry", d.cdFolder.path) ? d.cdFolder.path : null, link: safeLink(d.cdFolder.link) } : null,
      consents: toCanonicalConsents(consents),   // intake.consents 와 같은 공용 이름 — 두 표기가 있으면 다음 사람이 잘못 읽는다
      consentAt: new Date().toISOString(),
    };

    const { data: row, error: insertError } = await supabaseAdmin
      .from("inquiries")
      .insert({
        first_name: encryptString(d.firstName),
        last_name: enc(d.lastName),
        email: encryptString(d.email),
        nationality: d.nationality ?? null,
        spoken_language: d.patientLang,
        preferred_language: d.patientLang,
        cancer_type: d.cancerType,
        phone: enc(d.phone ?? null),
        treatment_type: d.cancerType,
        preferred_date: d.preferredDate || null,
        // 🛑 기본을 true 로 두지 마라 — 환자가 「날짜는 조율 가능합니다」를 안 눌렀는데 코디 화면에
        //    「(조율 가능)」이 붙는다(2026-08-19 실측 #119). 안 눌렀으면 아니오다.
        preferred_date_flex: d.dateFlexible === true,
        // 🛑 경로 없는 항목(올리다 만 것·너무 커서 못 올린 것)은 첨부가 아니다 — 넣으면 코디 화면에
        //    «있는데 못 여는 서류»가 생긴다(독립 리뷰). 링크로 대신한 건 intake_data.envelope 에 남는다.
        attachments: [
          ...intakeData.envelope.filter((f) => !!f.path).map((f) => ({ path: f.path, name: f.name, kind: f.kind })),
          // CD 묶음(zip)도 첨부다 — 여기 넣어야 코디 첨부 카드에서 열린다
          ...(intakeData.cdFolder?.path ? [{ path: intakeData.cdFolder.path, name: d.cdFolder?.name || "CD.zip", kind: "imaging_file" }] : []),
        ],
        intake: { consents: toCanonicalConsents(consents), consentAt: intakeData.consentAt },
        intake_data: intakeData,
        intake_step: d.mode === "quick" ? "referral_quick" : "referral_full",
        status: "received",
        step1_completed_at: new Date().toISOString(),
        source_locale: d.sourceLocale ?? null,
        referrer_host: d.referrerHost ?? null,
        landing_path: d.landingPath ?? null,
        utm: d.utm ?? null,
        user_id: userId,
        agency_id: agencyId,
        is_test: detectInquiryIsTest({
          ip: clientIp, email: d.email, accountEmail,
          // 🛑 공개 창구에서 body.isTest 를 받지 마라 — 화면은 안 보내고, 받으면 아무나 «진짜 문의를 시험으로»
          //    표시해 코디 화면·실적에서 사라지게 할 수 있다(독립 리뷰). 시험 판정은 IP·이메일 도메인으로만.
          manual: false,
        }),
      })
      .select("id, public_token")
      .single();

    if (insertError) {
      console.error("[/api/inquiries/referral] insert error:", insertError.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    // 병기·진단시기는 코디 화면과 KHIDI 집계가 «이 표»를 읽는다. intake_data 에만 넣으면
    // 기존 화면에서 안 보인다(2026-08-13: 병기가 회신 속도를 가르는 값이 됐다).
    if (d.stage || d.diagnosisDate || d.cancerType) {
      const { error: intakeErr } = await supabaseAdmin
        .from("cancer_patient_intakes")
        .upsert({
          inquiry_id: row.id,
          cancer_type: d.cancerType,
          cancer_stage: d.stage || null,
          // 🛑 읽는 쪽(khidi/intake·cost-estimate)은 *_encrypted 컬럼을 읽는다. 평문 diagnosis_date 는 옛 컬럼 — 쓰지 않는다(독립 리뷰 2건).
          diagnosis_date_encrypted: enc(toDateOrNull(d.diagnosisDate)),
          language_preference: d.patientLang,
        }, { onConflict: "inquiry_id" });
      // 실패해도 접수는 성공이다 — 본체는 이미 들어갔다.
      if (intakeErr) console.error("[/api/inquiries/referral] intake upsert:", intakeErr.message);
    }

    after(() => sendAdminNotification({
      inquiryId: row.id,
      nationality: d.nationality ?? "",
      treatmentType: d.cancerType,
      contactMethod: "email",
      createdAt: new Date().toISOString(),
    }).catch(() => {}));

    // 접수 확인 + 진행상황 주소 — 「접수되면 들어온 그 채널로 주소를 돌려준다」(PO 2026-08-03).
    // after(): 응답 뒤에도 함수를 살려 발송이 잘리지 않게 한다(서버리스 freeze 방지).
    // 메일이 실패해도 접수는 성공이다 — 그래서 삼킨다.
    const track = trackingUrl(siteUrl(), row.public_token, d.patientLang);
    after(async () => {
      try {
        const { subject, html, text } = renderInquiryReceivedEmail({
          recipientName: d.firstName || undefined,
          trackUrl: track,
          lang: toTrackingLang(d.patientLang),
        });
        const res = await sendEmail({
          to: d.email, subject, html, text,
          tags: { kind: "inquiry_received", inquiry: String(row.id) },
        });
        // 성공도 남긴다 — 「조용히 안 나간 메일」은 흔적이 없어 몇 주 뒤에야 들통난다(step1 과 같은 습관).
        console.log(`[/api/inquiries/referral] 접수확인 메일 #${row.id}: ${res.ok ? "발송" : "실패"} (${res.provider}${res.error ? ` — ${res.error}` : ""})`);
      } catch (e: any) { console.error("[/api/inquiries/referral] 접수확인 메일 실패(무시):", e?.message); }
    });

    return Response.json({
      ok: true, inquiryId: row.id, publicToken: row.public_token, trackUrl: track,
    });
  } catch (e) {
    console.error("[/api/inquiries/referral]", e instanceof Error ? e.message : e);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
