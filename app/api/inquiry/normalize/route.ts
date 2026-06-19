/**
 * ✅ P0 수정: 런타임 명시 (Node.js)
 * ✅ 운영 안정화: Rate limit + 운영 로그 추가
 * 
 * 이유:
 * - 암호화 처리 (Node.js crypto 의존)
 * - DB 관리자 접근 (SERVICE_ROLE_KEY 사용)
 * - Edge 런타임에서 발생할 수 있는 예측 불가 오류 방지
 * - 봇/도배 방지 및 운영 추적성 확보
 */
export const runtime = "nodejs";

import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import {
  createEmptyIntake,
  type Intake,
  type IntakeMeta,
} from "@/lib/intakeSchema";
import {
  bodyPartFromText,
  contraindicationsAndFlagsFromMessage,
} from "@/lib/intakeExtract";
import { encryptString, decryptAuto } from "@/lib/security/encryptionV2";
import crypto from "crypto";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS, getRateLimitHeaders } from "@/lib/rateLimit";
import { logOperational, logRateLimitExceeded, logEncryptionFailed, logInquiryFailed } from "@/lib/operationalLog";
import { evaluateLeadQuality } from "@/lib/leadQuality/scoring";
import { trackFunnelEvent } from "@/lib/events/funnelTracking";
import { checkEncryptionFailures, alertHighPriorityLead } from "@/lib/alerts/operationalAlerts";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

const detectLanguage = (value: string | null | undefined) => {
  const v = String(value || "").toLowerCase();
  if (v.includes("ko") || v.includes("kr") || v.includes("korean")) return "ko";
  if (v.includes("ja") || v.includes("jp") || v.includes("japanese")) return "ja";
  return "en";
};

/** Step2 intake → constraints.intake 표준 구조 (direct mapping) */
function mapIntakeToConstraints(inq: { intake?: any; preferred_date?: string | null; preferred_date_flex?: boolean }): {
  complaint: { body_part: string[] | null; duration: string | null; severity: number | null };
  history: { diagnosis: { has: boolean; text: string } | null; meds: { has: boolean; text: string } | null };
  logistics: { preferred_date: string | null; flex: boolean };
} {
  const i = inq?.intake && typeof inq.intake === "object" ? inq.intake : {};
  const c = i?.complaint && typeof i.complaint === "object" ? i.complaint : {};
  const h = i?.history && typeof i.history === "object" ? i.history : {};
  const pref = inq?.preferred_date ? String(inq.preferred_date).slice(0, 10) : null;
  const flex = !!inq?.preferred_date_flex;

  const sev = typeof c.severity === "number" ? c.severity : (c.severity != null && c.severity !== "" ? Number(c.severity) : null);
  return {
    complaint: {
      body_part: Array.isArray(c.body_part) ? c.body_part : (c.body_part ? [c.body_part] : null),
      duration: (c.duration && typeof c.duration === "string") ? c.duration : null,
      severity: sev != null && !Number.isNaN(sev) ? sev : null,
    },
    history: {
      diagnosis: h.diagnosis && typeof h.diagnosis === "object"
        ? { has: !!h.diagnosis.has, text: String(h.diagnosis.text || "") }
        : null,
      meds: h.meds && typeof h.meds === "object"
        ? { has: !!h.meds.has, text: String(h.meds.text || "") }
        : null,
    },
    logistics: {
      preferred_date: pref,
      flex,
    },
  };
}

/** 필수 충족 여부 기반 missing_fields (contact, nationality, spoken_language, treatment, preferred) */
function computeRequiredMissing(row: {
  email?: string | null;
  contact_method?: string | null;
  contact_id?: string | null;
  nationality?: string | null;
  spoken_language?: string | null;
  treatment_type?: string | null;
  preferred_date?: string | null;
  preferred_date_flex?: boolean;
}): string[] {
  const missing: string[] = [];
  const contactOk = !!(row?.email?.trim()) || !!(row?.contact_method && row?.contact_id?.trim());
  if (!contactOk) missing.push("contact_reachable");
  if (!row?.nationality?.trim()) missing.push("nationality");
  if (!row?.spoken_language?.trim()) missing.push("spoken_language");
  if (!row?.treatment_type?.trim()) missing.push("treatment_type");
  const preferredOk = !!(row?.preferred_date?.trim()) || !!row?.preferred_date_flex;
  if (!preferredOk) missing.push("preferred_date_or_flex");
  return missing;
}

function buildIntakeFromForm(row: {
  message?: string | null;
  treatment_type?: string | null;
  preferred_date?: string | null;
  attachments?: unknown;
}): Intake {
  const { intake } = createEmptyIntake("inquiry_form");
  try {
    const msg = row?.message ?? null;
    const tt = row?.treatment_type ?? null;
    const pref = row?.preferred_date ?? null;
    const arr = Array.isArray(row?.attachments) ? row.attachments : [];
    const hasAtt = arr.length > 0;

    intake.chief_complaint = msg ? String(msg).trim().slice(0, 2000) : null;
    intake.goal = tt ? String(tt) : (msg ? String(msg).trim().split(/\n/)[0]?.slice(0, 300) || null : null);
    intake.body_part = bodyPartFromText(tt || msg) ?? null;
    intake.timeline = pref
      ? `preferred_date:${String(pref).slice(0, 10)}`
      : null;
    intake.budget = null;
    intake.duration = null;
    intake.severity = null;

    const { contraindications, allergy, medications } = contraindicationsAndFlagsFromMessage(msg);
    intake.contraindications = contraindications.length ? contraindications : null;
    intake.allergy_flag = allergy || null;
    intake.medications_flag = medications || null;
    intake.medical_history_flag = null;
    intake.previous_procedure_flag = null;
    intake.attachments_present = hasAtt;
  } catch {
    /* no-op: use empty intake */
  }
  return intake;
}

function _buildIntakeFromTextOnly(text: string): Intake {
  const { intake } = createEmptyIntake("ai_agent");
  try {
    const s = String(text || "").trim().slice(0, 300);
    intake.chief_complaint = s || null;
    intake.goal = null;
    intake.body_part = bodyPartFromText(text) ?? null;
    intake.timeline = null;
    intake.budget = null;
    intake.duration = null;
    intake.severity = null;
    const { contraindications, allergy, medications } = contraindicationsAndFlagsFromMessage(text);
    intake.contraindications = contraindications.length ? contraindications : null;
    intake.allergy_flag = allergy || null;
    intake.medications_flag = medications || null;
    intake.medical_history_flag = null;
    intake.previous_procedure_flag = null;
    intake.attachments_present = false;
  } catch {
    /* no-op */
  }
  return intake;
}

export async function POST(request: Request) {
  // IDOR 방지: 과거엔 인증 없이 body 의 inquiry_id(순번 정수)로 임의 문의를 조회·재스코어·
  // 알림 발생시킬 수 있었음. 라이브 호출부는 어드민 RAG 도구뿐 → 어드민 전용으로 잠금.
  const auth = await requireAdminAuth(request as any);
  if (!auth.success) return auth.response;

  assertSupabaseEnv();
  const clientIp = getClientIp(request);
  const apiPath = '/api/inquiry/normalize';

  // ✅ 운영 안정화: Rate limit 체크 (DB 기반 — 인스턴스 간 공유)
  const rateLimitResult = await checkRateLimitPersistent(clientIp, RATE_LIMITS.NORMALIZE);
  if (!rateLimitResult.allowed) {
    logRateLimitExceeded(
      apiPath,
      clientIp,
      RATE_LIMITS.NORMALIZE.maxRequests,
      RATE_LIMITS.NORMALIZE.windowMs
    );
    
    return Response.json(
      { 
        ok: false, 
        error: "rate_limit_exceeded",
        message: rateLimitResult.reason,
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }

  // ✅ Security: 암호화 키 검증 (encryptionV2는 자동 검증)

  try {
    const body = await request.json().catch(() => ({}));
    const text = body?.text ? String(body.text) : "";
    const inquiryId = body?.inquiry_id != null ? Number(body.inquiry_id) : null;
    const sourceTypePayload = body?.source_type === "inquiry_form" ? "inquiry_form" : null;
    const sourceInquiryIdPayload = body?.source_inquiry_id != null ? Number(body.source_inquiry_id) : null;
    const sessionId = body?.session_id != null ? String(body.session_id) : null;
    const page = body?.page != null ? String(body.page) : null;
    const utm = body?.utm && typeof body.utm === "object" ? body.utm : null;

    const hasInquiryId = inquiryId != null || sourceInquiryIdPayload != null;
    if (!text && !hasInquiryId) {
      return Response.json(
        { ok: false, error: "text_or_inquiry_id_required" },
        { status: 400 }
      );
    }

    if (sourceTypePayload === "inquiry_form" && !hasInquiryId) {
      console.warn("[api/inquiry/normalize] inquiry_form requires inquiry_id / source_inquiry_id");
      return Response.json(
        { ok: false, error: "inquiry_id_required_for_inquiry_form" },
        { status: 400 }
      );
    }

    const effectiveInquiryId = inquiryId ?? sourceInquiryIdPayload;

    let inquiryRow: any = null;
    if (effectiveInquiryId) {
      const { data, error } = await supabaseAdmin
        .from("inquiries")
        .select(
          "id, first_name, last_name, email, nationality, spoken_language, contact_method, contact_id, treatment_type, message, preferred_date, preferred_date_flex, attachment, attachments, intake"
        )
        .eq("id", effectiveInquiryId)
        .single();
      if (error) {
        console.error("[api/inquiry/normalize] inquiries fetch error:", error);
        return Response.json(
          { ok: false, error: "inquiry_fetch_failed" },
          { status: 500 }
        );
      }
      inquiryRow = data;
    }

    // inquiry_form 경로의 email/contact_id/message 는 이미 V2 암호문 → 재암호화/해시 전에
    // 반드시 복호화한다. (과거엔 암호문을 또 암호화하고 암호문을 SHA256 해 연락처 PII·
    // email_hash dedup·lead emailDomain 이 전부 깨졌음. AI agent 경로의 text 는 평문이라 무관.)
    const plainEmail = inquiryRow?.email ? await decryptAuto(inquiryRow.email).catch(() => null) : null;
    const plainContactId = inquiryRow?.contact_id ? await decryptAuto(inquiryRow.contact_id).catch(() => null) : null;
    const plainInquiryMessage = inquiryRow?.message ? await decryptAuto(inquiryRow.message).catch(() => null) : null;

    const rawMessage = text || plainInquiryMessage || null;
    const language = detectLanguage(inquiryRow?.spoken_language);
    const sourceType = inquiryRow ? "inquiry_form" : "ai_agent";

    const rawIntake = inquiryRow?.intake;
    const hasIntake = rawIntake && typeof rawIntake === "object" && !Array.isArray(rawIntake) && Object.keys(rawIntake).length > 0;
    const stepSource = hasIntake ? "step2" : "step1";

    let constraintsIntake: {
      complaint: { body_part: string[] | null; duration: string | null; severity: number | null };
      history: { diagnosis: { has: boolean; text: string } | null; meds: { has: boolean; text: string } | null };
      logistics: { preferred_date: string | null; flex: boolean };
    };

    if (hasIntake && inquiryRow) {
      constraintsIntake = mapIntakeToConstraints({
        intake: inquiryRow.intake,
        preferred_date: inquiryRow.preferred_date ?? null,
        preferred_date_flex: inquiryRow.preferred_date_flex ?? false,
      });
    } else {
      const legacy = buildIntakeFromForm(inquiryRow || {});
      const pref = legacy.timeline?.startsWith("preferred_date:")
        ? String(legacy.timeline).replace("preferred_date:", "").slice(0, 10)
        : (inquiryRow?.preferred_date ? String(inquiryRow.preferred_date).slice(0, 10) : null);
      constraintsIntake = {
        complaint: {
          body_part: legacy.body_part ? [legacy.body_part] : null,
          duration: legacy.duration ?? null,
          severity: legacy.severity != null ? Number(legacy.severity) : null,
        },
        history: {
          diagnosis: legacy.medical_history_flag != null ? { has: !!legacy.medical_history_flag, text: "" } : null,
          meds: legacy.medications_flag != null ? { has: !!legacy.medications_flag, text: "" } : null,
        },
        logistics: {
          preferred_date: pref,
          flex: !!inquiryRow?.preferred_date_flex,
        },
      };
    }

    const meta: IntakeMeta = {
      pipeline_version: "v1",
      source_type: sourceType,
      model: null,
      prompt_version: null,
    };

    const missing_fields = inquiryRow
      ? computeRequiredMissing({
          email: inquiryRow.email,
          contact_method: inquiryRow.contact_method,
          contact_id: inquiryRow.contact_id,
          nationality: inquiryRow.nationality,
          spoken_language: inquiryRow.spoken_language,
          treatment_type: inquiryRow.treatment_type,
          preferred_date: inquiryRow.preferred_date,
          preferred_date_flex: inquiryRow.preferred_date_flex,
        })
      : [];
    const requiredCount = 5;
    const extraction_confidence = missing_fields.length < requiredCount
      ? Math.min(1, Math.round((1 - missing_fields.length / requiredCount) * 100) / 100)
      : 0;

    const constraints: Record<string, unknown> = {
      intake: constraintsIntake,
      meta: { ...meta, source: stepSource } as any,
    };
    if (sessionId != null) constraints.session_id = sessionId;
    if (page != null) constraints.page = page;
    if (utm != null) constraints.utm = utm;

    /**
     * ✅ P0 수정: Fail-Closed 원칙 적용 (암호화)
     * 
     * 수정 전:
     * - 암호화 실패 시 null로 fallback하여 평문 데이터가 저장될 가능성
     * - "best-effort" 패턴으로 개인정보 보호 리스크
     * 
     * 수정 후:
     * - 암호화 실패 시 DB insert를 중단하고 500 에러 반환
     * - 개인정보는 반드시 암호화된 상태로만 저장
     * 
     * 이유:
     * - 개인정보 보호법 준수 및 법적 리스크 제거
     * - 고객 신뢰 유지 (평문 저장 절대 방지)
     */
    let rawMessageEnc: string | null = null;
    let emailEnc: string | null = null;
    let contactIdEnc: string | null = null;
    let emailHash: string | null = null;
    
    try {
      // ✅ 새 암호화 방식 (encryptionV2 - Node.js crypto 직접 사용)
      rawMessageEnc = rawMessage ? encryptString(rawMessage) : null;
      emailEnc = plainEmail ? encryptString(plainEmail) : null;
      contactIdEnc = plainContactId ? encryptString(plainContactId) : null;

      // ✅ 이메일 해시 (검색용 - SHA256, 반드시 평문 기준)
      if (plainEmail) {
        emailHash = crypto
          .createHash('sha256')
          .update(plainEmail.toLowerCase().trim())
          .digest('hex');
      }
    } catch (encryptErr: any) {
      console.error("[api/inquiry/normalize] encryption failed - aborting DB insert:", encryptErr?.message);
      // ✅ 운영 로그: 암호화 실패 기록
      logEncryptionFailed(apiPath, clientIp, encryptErr?.message || 'unknown_error');
      
      // ✅ P2: 운영 알림 - 암호화 실패 누적 체크
      checkEncryptionFailures().catch(err => console.error('[alert] checkEncryptionFailures failed:', err));
      
      // ✅ 암호화 실패 시 즉시 에러 반환 (DB insert 중단)
      return Response.json(
        { 
          ok: false, 
          error: "encryption_failed", 
          detail: "개인정보 암호화에 실패했습니다. 데이터 저장을 중단합니다." 
        },
        { status: 500 }
      );
    }
    
    // ✅ 추가 검증: 개인정보가 있는데 암호화되지 않은 경우도 차단
    if (rawMessage && !rawMessageEnc) {
      console.error("[api/inquiry/normalize] raw_message exists but encryption returned null");
      logInquiryFailed(apiPath, clientIp, 'encryption_returned_null', { field: 'raw_message' });
      return Response.json(
        { ok: false, error: "encryption_returned_null" },
        { status: 500 }
      );
    }
    if (plainEmail && !emailEnc) {
      console.error("[api/inquiry/normalize] email exists but encryption returned null");
      logInquiryFailed(apiPath, clientIp, 'encryption_returned_null', { field: 'email' });
      return Response.json(
        { ok: false, error: "email_encryption_returned_null" },
        { status: 500 }
      );
    }

    // 주의: raw_message는 암호화된 값 저장 (복호화는 서버에서만 가능)
    // contact.email, contact.messenger_handle도 암호화된 값 저장
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("normalized_inquiries")
      .insert({
        source_type: sourceType,
        source_inquiry_id: inquiryRow ? inquiryRow.id : null,
        language,
        country: inquiryRow?.nationality ?? null,
        treatment_slug: inquiryRow?.treatment_type ?? null,
        objective: null,
        constraints,
        raw_message: rawMessageEnc, // 암호화된 값
        extraction_confidence,
        missing_fields: missing_fields.length ? missing_fields : null,
        contact: inquiryRow
          ? {
              email: emailEnc, // 암호화된 값
              email_hash: emailHash, // 검색용 해시
              messenger_channel: inquiryRow.contact_method ?? null,
              messenger_handle: contactIdEnc, // 암호화된 값
            }
          : null,
      } as any)
      .select("*")
      .single();

    if (insertError) {
      console.error("[api/inquiry/normalize] normalized_inquiries insert failed:", insertError);
      logInquiryFailed(apiPath, clientIp, 'db_insert_failed', { error: insertError.message });
      return Response.json({ ok: true, normalized: null });
    }

    // ✅ P2: 리드 품질 평가 (원본 문의가 있는 경우만)
    if (inquiryRow && effectiveInquiryId) {
      try {
        const leadEvaluation = evaluateLeadQuality({
          country: inquiryRow.nationality,
          language: inquiryRow.spoken_language,
          treatmentType: inquiryRow.treatment_type,
          utmSource: utm?.source,
          messageLength: rawMessage?.length || 0,
          missingFieldsCount: missing_fields.length,
          emailDomain: plainEmail?.split('@')[1],
          intakeCompleteness: hasIntake ? 0.8 : 0.3,
        });

        // DB 업데이트 (리드 품질 정보)
        await supabaseAdmin
          .from("inquiries")
          .update({
            lead_quality: leadEvaluation.quality,
            priority_score: leadEvaluation.priorityScore,
            lead_tags: leadEvaluation.tags,
            quality_signals: leadEvaluation.signals,
            quality_evaluated_at: new Date().toISOString(),
          })
          .eq("id", effectiveInquiryId);

        // ✅ P2: 고가치 리드 알림
        if (leadEvaluation.quality === 'hot') {
          alertHighPriorityLead({
            inquiryId: effectiveInquiryId,
            priorityScore: leadEvaluation.priorityScore,
            country: inquiryRow.nationality,
            treatmentType: inquiryRow.treatment_type,
          }).catch(err => console.error('[alert] alertHighPriorityLead failed:', err));
        }

        console.log('[api/inquiry/normalize] Lead quality evaluated:', {
          inquiryId: effectiveInquiryId,
          quality: leadEvaluation.quality,
          score: leadEvaluation.priorityScore,
        });
      } catch (evalError) {
        // 리드 품질 평가 실패해도 메인 로직 영향 없음
        console.error('[api/inquiry/normalize] Lead quality evaluation failed:', evalError);
      }
    }

    // ✅ P2: 퍼널 이벤트 추적
    trackFunnelEvent({
      stage: 'form_complete',
      sessionId: sessionId ?? undefined,
      page: page ?? undefined,
      utm: utm ?? undefined,
      language: language,
      country: inquiryRow?.nationality ?? undefined,
      treatmentType: inquiryRow?.treatment_type ?? undefined,
    });

    // ✅ 운영 로그: 정규화 성공
    logOperational('info', {
      event: 'normalize_success',
      api: apiPath,
      clientIp: clientIp || undefined,
      statusCode: 200,
      context: { 
        sourceType,
        language,
        hasInquiryId: !!effectiveInquiryId 
      }
    });

    return Response.json({ ok: true, normalized: inserted });
  } catch (error: any) {
    console.error("[api/inquiry/normalize] error:", error);
    return Response.json(
      { ok: false, error: "normalize_failed" },
      { status: 500 }
    );
  }
}
