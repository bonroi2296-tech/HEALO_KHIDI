/**
 * healwith: Consultation Session API
 *
 * POST /api/khidi/consultation — 신규 진료 세션 생성 (인증 필요)
 *   - 환자 본인은 자기 자신의 세션을 생성 가능
 *   - admin/coordinator 는 임의 환자 세션 생성 가능
 * GET  /api/khidi/consultation — 세션 목록 (admin only). 일반 사용자는 자기 세션만.
 *
 * 변경 이력:
 * - 2026-04-17 (보안):
 *   * POST: 미인증 → requireAuthenticatedUser. 환자 ID 강제 (본인 user.id 와
 *     일치 또는 admin/coordinator 만 임의 patientId 지정 가능)
 *   * GET: 미인증 → admin only (목록 dump 차단). 환자/의사는 본인 ID 필터 강제.
 *   * 응답에 livekit_token_patient/doctor 노출 제거 (별도 token endpoint 사용)
 *   * Schema drift 수정: patient_user_id, doctor_user_id 사용
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  requireAuthenticatedUser,
} from "@/lib/auth/requireConsultationAccess";
import {
  encryptSessionNotes,
  readSessionNotes,
  backfillSessionNotesEncryption,
} from "@/lib/khidi/consultationNotes";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (!auth.success) return auth.response;

    const payload = await request.json();

    // 입력 정규화: 어드민 폼은 snake_case(session_type 등), 일부 호출부는 camelCase 를
    // 보낸다. 과거엔 API 가 camelCase 만 읽어 폼 생성이 400 으로 실패했음 → 양쪽 모두 수용.
    const sessionType = payload.sessionType ?? payload.session_type;
    const scheduledAt = payload.scheduledAt ?? payload.scheduled_at;
    const patientId = payload.patientId ?? payload.patient_user_id;
    const doctorId = payload.doctorId ?? payload.doctor_user_id;
    const coordinatorId = payload.coordinatorId ?? payload.coordinator_user_id;
    const translatorId = payload.translatorId ?? payload.translator_id;
    const patientLanguage = payload.patientLanguage ?? payload.patient_language;
    const doctorLanguage = payload.doctorLanguage ?? payload.doctor_language;
    const notes = payload.notes;
    // 코디가 지정한 병원·제휴의사 (드롭다운) — 과거엔 insertData 에서 누락돼 저장 안 됨.
    const hospitalId = payload.hospitalId ?? payload.hospital_id ?? null;
    const partnerDoctorId = payload.partnerDoctorId ?? payload.partner_doctor_id ?? null;
    // 유치 전환 깔때기의 핵심: 상담을 원래 문의(inquiry)와 연결해야 자동 집계가 동작.
    const inquiryIdRaw =
      payload.inquiryId ?? payload.inquiry_id ?? payload.selected_inquiry_id;
    const inquiryId =
      inquiryIdRaw === undefined || inquiryIdRaw === null || inquiryIdRaw === ""
        ? null
        : Number(inquiryIdRaw);

    // Validation
    if (sessionType === undefined || sessionType === null) {
      return Response.json(
        { ok: false, error: "sessionType is required" },
        { status: 400 }
      );
    }
    if (scheduledAt === undefined || scheduledAt === null) {
      return Response.json(
        { ok: false, error: "scheduledAt is required" },
        { status: 400 }
      );
    }
    if (inquiryId !== null && !Number.isFinite(inquiryId)) {
      return Response.json(
        { ok: false, error: "Invalid inquiryId" },
        { status: 400 }
      );
    }

    const validSessionTypes = [
      "pre_consultation",
      "follow_up",
      "emergency",
      "diagnostic",
    ];
    if (!validSessionTypes.includes(sessionType)) {
      return Response.json(
        { ok: false, error: "Invalid sessionType" },
        { status: 400 }
      );
    }

    // 활성 6개 언어 전부 허용 — 모달 드롭다운(zh 포함)과 일치시킴. zh가 빠져 있어
    // 중국어 환자 상담 생성이 400으로 막히던 버그 수정(퍼널감사 #4). STT·초대메일은 이미 zh 지원.
    const validLanguages = ["ru", "kz", "en", "zh", "ko", "ja"];
    if (
      patientLanguage &&
      !validLanguages.includes(patientLanguage)
    ) {
      return Response.json(
        { ok: false, error: "Invalid patientLanguage" },
        { status: 400 }
      );
    }

    // 환자 ID 결정:
    // - admin: payload.patientId 임의 지정 가능
    // - 일반 사용자: 본인 user.id 강제 (남의 ID 로 세션 생성 불가)
    const patientUserId = auth.isAdmin
      ? patientId || auth.userId
      : auth.userId;

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    // K-02 오염 벡터 차단: 테스트 표식을 생성 시점에 세션 자체에 도장.
    // inquiry 미연결 세션은 inquiry 체인으로 못 거르므로(KNOWN_ISSUES K-02),
    // 연결 inquiry.is_test 상속 + notes '[TEST]' 마커 + 명시 지정 중 하나면 테스트.
    let inquiryIsTest: boolean | null = null;
    if (inquiryId !== null) {
      const { data: inqRow } = await supabaseAdmin
        .from("inquiries")
        .select("is_test")
        .eq("id", inquiryId)
        .maybeSingle();
      inquiryIsTest = (inqRow as any)?.is_test === true;
    }
    const { detectSessionIsTest } = await import("@/lib/khidi/testData");
    const isTestSession = detectSessionIsTest({
      inquiryIsTest,
      notes,
      manual: payload.isTest === true || payload.is_test === true,
    });

    // LiveKit room name (토큰은 별도 /token 엔드포인트에서 참가자 본인이 발급)
    const liveroomName = `khidi-${uuidv4()}`;

    const insertData: Record<string, any> = {
      patient_user_id: patientUserId,
      inquiry_id: inquiryId,
      hospital_id: hospitalId || null,
      partner_doctor_id: partnerDoctorId || null,
      doctor_user_id: doctorId || null,
      // 담당 코디 지정이 없으면 '만든 사람'(코디)을 담당으로. 안 그러면 코디가 만든 상담에서
      // 코디가 patient_user_id placeholder 로만 잡혀 'patient' 역할로 오인됨 → 링크발급 실패 등
      // 각종 역할 오작동의 원인이었음(PO 제보 insufficient_role). admin 이 만들면 admin 은 항상
      // admin 으로 판정되니 null 유지.
      coordinator_user_id: coordinatorId || (auth.isAdmin ? null : auth.userId),
      translator_id: translatorId || null,
      session_type: sessionType,
      scheduled_at: scheduledAt,
      patient_language: patientLanguage || "ru",
      doctor_language: doctorLanguage || "ko",
      status: "scheduled",
      livekit_room_name: liveroomName,
      // ⚠ livekit_token_*  필드는 더 이상 사전 발급하지 않음.
      //    참가자가 /api/khidi/consultation/token 에서 본인 인증으로 받음.
      // 메모는 PII 가 섞이므로 암호문으로만 저장 (is_test 판정은 위에서 평문으로 이미 끝남)
      notes: null,
      notes_encrypted: encryptSessionNotes(notes),
      is_test: isTestSession,
    };

    const { data, error } = await supabaseAdmin
      .from("consultation_sessions")
      .insert([insertData] as any)
      .select(
        "id, patient_user_id, session_type, scheduled_at, status, livekit_room_name, created_at"
      )
      .single();

    if (error) {
      console.error("[api/khidi/consultation] Insert error:", error.message);
      return Response.json(
        { ok: false, error: "create_failed" },
        { status: 500 }
      );
    }

    console.log(
      `[api/khidi/consultation] New session: ${data.id} (${data.session_type}) by ${auth.userId}`
    );

    // 환자 인앱 알림 (이메일 초대와 별개의 화면 내 신호) — best-effort, 절대 생성 실패시키지 않음.
    // patient_user_id 가 요청자 본인이면 placeholder(환자계정 미선택)이므로 보내지 않음.
    if (patientUserId && patientUserId !== auth.userId) {
      try {
        const { sendInAppNotification } = await import("@/lib/notifications/inApp");
        const NL: Record<string, { t: string; b: string }> = {
          ru: { t: "Назначена видеоконсультация", b: "Координатор назначил вам консультацию. Откройте, чтобы увидеть детали." },
          kz: { t: "Бейнекеңес тағайындалды", b: "Координатор сізге кеңес тағайындады. Толығырақ көру үшін ашыңыз." },
          en: { t: "Consultation scheduled", b: "Your coordinator scheduled a consultation. Open to see the details." },
          ko: { t: "상담이 예약되었습니다", b: "코디네이터가 상담을 예약했습니다. 눌러서 일정을 확인하세요." },
        };
        const m = NL[patientLanguage as string] || NL.ru;
        await sendInAppNotification({
          userId: patientUserId,
          type: "consultation_scheduled",
          title: m.t,
          body: m.b,
          link: "/patient/consultations",
          priority: "high",
          payload: { consultation_id: data.id },
        });
      } catch (notifErr: any) {
        console.warn("[consultation] in-app notify 실패:", notifErr?.message);
      }
    }

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("[api/khidi/consultation] Exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    const { supabaseAdmin } = await import("@/lib/rag/supabaseAdmin");

    let query = supabaseAdmin
      .from("consultation_sessions")
      .select(
        `
        id,
        patient_user_id,
        doctor_user_id,
        coordinator_user_id,
        session_type,
        scheduled_at,
        started_at,
        ended_at,
        status,
        patient_language,
        doctor_language,
        livekit_room_name,
        hospital_id,
        partner_doctor_id,
        created_at,
        notes,
        notes_encrypted,
        cancer_patient_intakes(id, cancer_type, cancer_stage),
        hospitals(id, name, address),
        partner_doctors(id, name_ko, name_en, subspecialty, position_ko)
      `,
        { count: "exact" }
      );

    if (status) query = query.eq("status", status);

    // 일반 사용자: 본인 관여 세션만 조회 (admin 은 전부)
    if (!auth.isAdmin) {
      // patient_user_id, doctor_user_id, coordinator_user_id, translator_id 중 하나가 본인
      query = query.or(
        `patient_user_id.eq.${auth.userId},doctor_user_id.eq.${auth.userId},coordinator_user_id.eq.${auth.userId},translator_id.eq.${auth.userId}`
      );
    }

    const { data, count, error } = await query
      .order("scheduled_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[api/khidi/consultation] GET error:", error.message);
      return Response.json(
        { ok: false, error: "list_failed" },
        { status: 500 }
      );
    }

    // 평문 잔존 행은 조회 김에 암호문으로 이전(기회주의적 백필, best-effort)
    const rows = (data || []) as any[];
    try {
      await backfillSessionNotesEncryption(supabaseAdmin, rows);
    } catch {}

    // 응답: 암호문은 감추고 복호화된 notes 만 (필드명 유지 — 화면 변경 불필요)
    const sanitized = rows.map(({ notes, notes_encrypted, ...rest }) => ({
      ...rest,
      notes: readSessionNotes({ notes, notes_encrypted }),
    }));

    return Response.json({
      ok: true,
      data: sanitized,
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[api/khidi/consultation] GET exception:", error?.message);
    return Response.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
