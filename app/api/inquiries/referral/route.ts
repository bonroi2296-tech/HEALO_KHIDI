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
import { safeLink, toCanonicalConsents, toDateOrNull, pickFilledFromDocs, normalizeDocDate, Schema } from "@/lib/inquiry/referralSubmit";
import { contactKey, RECENT_INQUIRY_WINDOW_HOURS } from "@/lib/inquiry/contactKey";
import { CONSENT_VERSION } from "@/lib/legal/consentForms";

// 🛑 스키마는 여기 두지 마라 — App Router 라우트 파일은 정해진 이름(POST·runtime …)만
//    내보낼 수 있어서, 시험이 부르라고 export 를 붙이면 «tsc 는 통과하는데 빌드가 깨진다»
//    (2026-09-08 실측). 그래서 referralSubmit.ts 에 두고 여기서 가져다 쓴다.

const REQUIRED_CONSENTS = ["pipa", "sensitive", "thirdParty", "crossBorder"];

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.INQUIRY);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limit_exceeded" },
      { status: 429, headers: getRateLimitHeaders(rl) });
  }

  // 🔎 접수가 거절될 때마다 «어느 칸 때문인지»를 우리 로그에 남긴다.
  //    2026-09-08 사고: 실서비스에서 400 이 4번 났는데 로그가 없어서 사유를 알 수 없었고,
  //    나중에 스키마를 재현해서야 원인(첨부 개수)을 확정했다. 값은 절대 안 찍는다 —
  //    환자 이름·이메일·진단이 로그에 남으면 그게 개인정보 유출이다. «필드 이름과 위반 종류»만.
  const rejected = (code: string, detail?: string) => {
    console.warn(`[/api/inquiries/referral] 접수 거절: ${code}${detail ? ` — ${detail}` : ""}`);
    return Response.json({ ok: false, error: code }, { status: 400 });
  };

  let body: unknown;
  try { body = await request.json(); }
  catch { return rejected("invalid_json"); }

  // CP949 등으로 깨진 한글이 DB·알림메일에 그대로 박히는 걸 막는다(POSTMORTEMS #92).
  if (hasMojibake(body)) {
    return rejected("broken_encoding");
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    // 「무엇이 잘못됐나」를 «코드»로만 갈라 준다 — 원문 메시지는 절대 내보내지 않는다(보안 규칙).
    // 갈라야 하는 이유: 서류를 너무 많이 올린 것과 칸 형식이 틀린 것은 사람이 할 일이 정반대다.
    // 뭉쳐 두었더니 화면이 「이메일 주소를 확인해 주세요」로 옮겼고, 실제로는 첨부 개수가
    // 넘친 것이라 PO 가 멀쩡한 이메일을 계속 고쳤다(2026-09-08).
    // 🛑 «서류가 너무 많다»는 envelope «배열 자체»가 넘쳤을 때뿐이다.
    //    배열 «안»의 한 칸이 길어서 난 too_big 까지 여기로 넣으면, 사람에게 「서류를 줄이세요」라고
    //    말하면서 서류를 아무리 지워도 안 풀리는 상태가 된다(2026-09-08 독립 리뷰).
    //    path 가 ["envelope"] 하나뿐일 때만 «개수»다. ["envelope", 3, "diagnosisText"] 는 «길이»다.
    const tooManyDocs = parsed.error.issues.some(
      (i) => i.code === "too_big" && i.path[0] === "envelope" && i.path.length === 1
    );
    // 로그에는 «어느 칸이 어떤 종류로 틀렸나»만 (값 없이). 다음에 같은 제보가 오면 이 한 줄로 끝난다.
    const where = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(root)"}:${i.code}`).join(", ");
    return rejected(tooManyDocs ? "too_many_documents" : "validation_error", where);
  }
  const d = parsed.data;

  // PIPA 필수 동의 서버 재확인 — 화면 관문을 우회한 직접 호출도 막는다.
  const consents = d.consents ?? {};
  const missing = REQUIRED_CONSENTS.filter((k) => consents[k] !== true);
  if (missing.length) {
    return rejected("consent_required", missing.join(","));
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
        link: safeLink(f.link),   // 상한을 넘어 못 올린 경우 사람이 남긴 대용량 저장소 주소
        // 🛑 이 매퍼는 «새 객체»를 짓는다 — 스키마에 칸을 늘려도 여기 안 적으면 그대로 사라진다.
        //    2026-09-08 에 실제로 그랬다: docDate 를 스키마에 넣어 놓고 여기서 빠뜨려,
        //    「검사일 순 정렬」이라고 이름 붙인 기능이 실은 파일명 알파벳 순으로 돌았다.
        //    칸을 늘릴 땐 ①스키마 ②이 매퍼 ③아래 attachments — 셋을 같이 봐라.
        docDate: normalizeDocDate(f.docDate),
        // 🛑 진단명은 «민감정보»다 — 세 줄 위 diagnosisNameRaw 와 같이 암호화한다.
        //    처음엔 맨몸으로 넣었는데(2026-09-08 독립 리뷰), 판독이 뽑은 병리 진단문이
        //    그대로 JSONB 에 남는 것이라 형제 칸만 암호화하는 것은 아무 의미가 없다.
        diagnosisText: enc(f.diagnosisText || null),
      })),
      cdFolder: d.cdFolder ? { ...d.cdFolder, path: d.cdFolder.path && isOwnPath("inquiry", d.cdFolder.path) ? d.cdFolder.path : null, link: safeLink(d.cdFolder.link) } : null,
      consents: toCanonicalConsents(consents),   // intake.consents 와 같은 공용 이름 — 두 표기가 있으면 다음 사람이 잘못 읽는다
      consentAt: new Date().toISOString(),
      // 「이 값 누가 넣었나」 — 기계가 서류에서 읽은 칸만 남긴다. 코디 화면·브리프가 이걸 보고
      // 환자가 직접 적은 값과 무게를 가른다. 화면이 보내지 않은 칸(quick 모드)은 자연히 빠진다.
      _filledFromDocs: pickFilledFromDocs(d.autoFilled, d),
    };

    // 첨부 목록 — 새 건에도 쓰고, 재접수 합치기에도 쓴다(한 자리에서 만든다).
    // 🛑 경로 없는 항목(올리다 만 것·너무 커서 못 올린 것)은 첨부가 아니다 — 넣으면 코디 화면에
    //    «있는데 못 여는 서류»가 생긴다(독립 리뷰). 링크로 대신한 건 intake_data.envelope 에 남는다.
    const newAttachments: { path: string | null; name: string | null; kind: string; docDate?: string | null }[] = [
      // docDate 는 코디 화면이 «검사일 순»으로 세우는 기준이다(없으면 이름순으로 주저앉는다).
      ...intakeData.envelope
        .filter((f) => !!f.path)
        .map((f) => ({ path: f.path, name: f.name, kind: f.kind, docDate: f.docDate ?? null })),
      // CD 묶음(zip)도 첨부다 — 여기 넣어야 코디 첨부 카드에서 열린다
      ...(intakeData.cdFolder?.path
        ? [{ path: intakeData.cdFolder.path, name: d.cdFolder?.name || "CD.zip", kind: "imaging_file" }]
        : []),
    ];

    // ── 재접수인가: 같은 이메일로 최근에 이미 보냈나 ──────────────────────────
    // 2026-09-08 실사고: 한 분이 25분 동안 네 번 보냈다. 화면에 접수번호가 떴는데도
    // 확신하지 못하고 다시 보낸 것이다. 코디 화면엔 세 명처럼 섰고 메일도 세 통 나갔다.
    // → 새 건을 만들지 않고 «이미 있는 건»에 자료를 더한 뒤, 그 번호를 그대로 돌려준다.
    const ckey = contactKey(d.email);
    type PrevInquiry = { id: number; public_token: string | null; attachments: unknown };
    let existing: PrevInquiry | null = null;
    if (ckey) {
      const since = new Date(Date.now() - RECENT_INQUIRY_WINDOW_HOURS * 3600_000).toISOString();
      const { data: prev } = await supabaseAdmin
        .from("inquiries")
        .select("id, public_token, attachments")
        .eq("contact_key", ckey)
        .gte("created_at", since)
        // 🛑 이미 «종료»로 정리된 건에는 붙이지 마라 — 코디가 닫은 것을 되살리게 된다.
        .is("outcome", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      existing = (prev as unknown as PrevInquiry | null) ?? null;
    }

    if (existing) {
      // 새로 올라온 첨부만 더한다(경로가 같으면 같은 파일이라 안 더한다).
      const before = Array.isArray(existing.attachments) ? (existing.attachments as any[]) : [];
      const seen = new Set(before.map((a) => String(a?.path || "")));
      const added = newAttachments.filter((a) => a.path && !seen.has(String(a.path)));

      const { error: mergeErr } = await supabaseAdmin
        .from("inquiries")
        .update({
          attachments: [...before, ...added],
          // 사람이 다시 보냈다는 사실 자체를 남긴다 — 코디가 «왜 자료가 늘었나»를 알 수 있게.
          case_status_note: `${new Date().toISOString().slice(0, 16).replace("T", " ")} 같은 이메일로 다시 접수하셔서 이 건에 합쳤습니다(자료 ${added.length}건 추가).`,
        })
        .eq("id", existing.id);
      if (mergeErr) {
        console.error("[/api/inquiries/referral] merge error:", mergeErr.message);
        return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
      }

      console.log(`[/api/inquiries/referral] 재접수 합침 → #${existing.id} (자료 +${added.length})`);
      // 🛑 코디 알림·접수확인 메일을 다시 보내지 마라 — 이번 사고에서 메일이 세 통 나갔다.
      //    화면은 «이미 접수됨»으로 안내하고, 자료가 늘어난 것은 위 메모로 코디가 본다.
      return Response.json({
        ok: true,
        inquiryId: existing.id,
        alreadyReceived: true,
        addedAttachments: added.length,
        trackUrl: existing.public_token
          ? trackingUrl(siteUrl(), existing.public_token, toTrackingLang(d.patientLang))
          : null,
      });
    }

    const { data: row, error: insertError } = await supabaseAdmin
      .from("inquiries")
      .insert({
        contact_key: ckey,
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
        attachments: newAttachments,
        // 🛑 «어느 판 문안에 동의했나»는 동의 시각과 한 쌍이다 — 문안이 바뀌면 예전 동의는 그 판에 대한
        //    동의가 아니게 되므로, 판 번호가 없으면 동의 기록만으로는 무엇에 동의한 건지 되짚을 수 없다.
        //    화면이 보낸 값을 믿지 않고 서버 상수를 찍는다(폼 관문을 건너뛴 직접 호출도 같은 값이 남는다).
        //    코디 화면(CoordinatorInboxDetailClient)이 intake.consentVersion 을 이미 그린다.
        intake: { consents: toCanonicalConsents(consents), consentAt: intakeData.consentAt, consentVersion: CONSENT_VERSION },
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
