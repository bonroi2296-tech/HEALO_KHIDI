/**
 * healwith: 리마인더 스케줄 등록
 *
 * 목적:
 *   consultation_sessions.scheduled_at - 30분 시점에
 *   reminders_scheduled 테이블에 채널별 row 삽입.
 *
 * 호출 시점:
 *   - 컨설테이션 생성 API (POST /api/consultations)
 *   - 컨설테이션 reschedule API (PATCH /api/consultations/:id)
 *
 * 채널: 'email' | 'kakao' | 'in_app'
 * 역할: 환자, 의사, 통역사, 코디네이터 각각 별도 row
 */

import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

// ── 타입 ─────────────────────────────────────────────────────
export type ReminderChannel = "email" | "kakao" | "in_app";
export type ReminderType =
  | "30min_before"
  | "survey_request"
  | "followup_30d"
  | "symptom_alert";

export interface ReminderTarget {
  /** auth.users.id (등록 사용자) */
  userId?: string;
  /** 이메일 주소 (게스트 환자 포함) */
  email?: string;
  /** 전화번호 (카카오 알림톡용) */
  phone?: string;
  /** 역할 (patient / doctor / interpreter / coordinator) */
  role: string;
  /** 표시용 이름 */
  name?: string;
  /** 언어 코드 */
  lang?: string;
}

export interface ScheduleConsultationReminderOptions {
  sessionId: string;
  /** ISO 문자열 — 예약 시각 */
  scheduledAt: string;
  /** 리마인더 발송 대상 목록 */
  targets: ReminderTarget[];
  /** 리마인더 타입 (기본: 30min_before) */
  reminderType?: ReminderType;
  /** 기존 리마인더 덮어쓰기 여부 (reschedule 시) */
  replaceExisting?: boolean;
}

// ── 메인 함수 ────────────────────────────────────────────────
/**
 * 컨설테이션 리마인더 스케줄 등록
 *
 * - scheduled_at - 30분 시점에 fire_at 설정
 * - 채널 (email / kakao / in_app) 별, 대상 역할별로 row 삽입
 * - 이미 pending 상태 리마인더 있으면 skip (replaceExisting=true 이면 삭제 후 재삽입)
 * - fire_at 이 현재보다 5분 미만이면 너무 늦어서 등록 생략
 */
export async function scheduleConsultationReminder(
  opts: ScheduleConsultationReminderOptions
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const reminderType = opts.reminderType ?? "30min_before";

  // 30분 전 시점 계산
  const scheduledMs = new Date(opts.scheduledAt).getTime();
  const fireAt = new Date(scheduledMs - 30 * 60 * 1000);
  const now = new Date();

  // 너무 늦음 (5분 미만 남음)
  if (fireAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.warn(
      `[reminders] scheduleConsultationReminder: fire_at too close or past — session=${opts.sessionId}`
    );
    return { inserted: 0, skipped: 0, errors: ["fire_at too close to now (< 5min)"] };
  }

  // 기존 pending 리마인더 교체 처리
  if (opts.replaceExisting) {
    await supabaseAdmin
      .from("reminders_scheduled")
      .update({ status: "cancelled" })
      .eq("consultation_session_id", opts.sessionId)
      .eq("reminder_type", reminderType)
      .eq("status", "pending");
  }

  const rows: Record<string, unknown>[] = [];

  for (const target of opts.targets) {
    // 이메일 채널
    if (target.email) {
      rows.push(buildRow({
        sessionId: opts.sessionId,
        reminderType,
        fireAt: fireAt.toISOString(),
        channel: "email",
        userId: target.userId,
        address: target.email,
        role: target.role,
        name: target.name,
        lang: target.lang,
      }));
    }

    // 카카오 채널 (전화번호 있을 때만)
    if (target.phone) {
      rows.push(buildRow({
        sessionId: opts.sessionId,
        reminderType,
        fireAt: fireAt.toISOString(),
        channel: "kakao",
        userId: target.userId,
        address: target.phone,
        role: target.role,
        name: target.name,
        lang: target.lang,
      }));
    }

    // In-app 채널 (userId 있을 때만)
    if (target.userId) {
      rows.push(buildRow({
        sessionId: opts.sessionId,
        reminderType,
        fireAt: fireAt.toISOString(),
        channel: "in_app",
        userId: target.userId,
        address: null,
        role: target.role,
        name: target.name,
        lang: target.lang,
      }));
    }
  }

  if (rows.length === 0) {
    return { inserted: 0, skipped: 0, errors: ["no valid targets"] };
  }

  const { error, count } = await (supabaseAdmin as any)
    .from("reminders_scheduled")
    .insert(rows, { count: "exact" });

  if (error) {
    console.error("[reminders] insert error:", error.message);
    return { inserted: 0, skipped: 0, errors: [error.message] };
  }

  return { inserted: count ?? rows.length, skipped: 0, errors: [] };
}

// ── 헬퍼 ────────────────────────────────────────────────────
function buildRow(opts: {
  sessionId: string;
  reminderType: string;
  fireAt: string;
  channel: ReminderChannel;
  userId?: string;
  address: string | null;
  role: string;
  name?: string;
  lang?: string;
}): Record<string, unknown> {
  return {
    consultation_session_id: opts.sessionId,
    reminder_type: opts.reminderType,
    fire_at: opts.fireAt,
    channel: opts.channel,
    recipient_user_id: opts.userId ?? null,
    recipient_address: opts.address,
    payload: {
      role: opts.role,
      name: opts.name ?? null,
      lang: opts.lang ?? "ko",
    },
    status: "pending",
    attempts: 0,
  };
}

/**
 * 컨설테이션 세션 정보 자동 조회 후 리마인더 등록 (간편 함수)
 *
 * consultation_sessions + 연결된 guest_tokens 를 직접 조회해
 * 등록 대상을 자동 구성.
 */
export async function autoScheduleReminders(
  sessionId: string,
  opts?: { replaceExisting?: boolean }
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  // 세션 조회
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("consultation_sessions")
    .select("id, scheduled_at, patient_language, patient_id, doctor_id, coordinator_id")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    return { inserted: 0, skipped: 0, errors: ["session not found"] };
  }

  const targets: ReminderTarget[] = [];

  // 환자 (guest tokens 에서 이메일 수집)
  const { data: tokens } = await supabaseAdmin
    .from("consultation_guest_tokens")
    .select("role, invitee_name, invitee_email, metadata")
    .eq("consultation_id", sessionId)
    .is("revoked_at", null);

  for (const token of tokens ?? []) {
    if (token.invitee_email) {
      targets.push({
        email: token.invitee_email,
        role: token.role ?? "guest",
        name: token.invitee_name ?? undefined,
        lang: token.role === "patient" ? (session.patient_language ?? "ru") : "ko",
      });
    }
  }

  // 등록 사용자 (patient_id / doctor_id / coordinator_id → profiles 조회)
  const userIds = [
    session.patient_id,
    session.doctor_id,
    session.coordinator_id,
  ].filter(Boolean) as string[];

  if (userIds.length > 0) {
    const { data: profilesRaw } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, email, phone, name_ko, name_en, preferred_lang, role")
      .in("id", userIds);
    const profiles = (profilesRaw ?? []) as Array<{
      id: string;
      email?: string | null;
      phone?: string | null;
      name_ko?: string | null;
      name_en?: string | null;
      preferred_lang?: string | null;
      role?: string | null;
    }>;

    for (const profile of profiles) {
      targets.push({
        userId: profile.id,
        email: profile.email ?? undefined,
        phone: profile.phone ?? undefined,
        role: profile.role ?? "user",
        name: profile.name_ko ?? profile.name_en ?? undefined,
        lang: profile.preferred_lang ?? "ko",
      });
    }
  }

  if (targets.length === 0) {
    return { inserted: 0, skipped: 0, errors: ["no targets found for session"] };
  }

  return scheduleConsultationReminder({
    sessionId,
    scheduledAt: session.scheduled_at,
    targets,
    reminderType: "30min_before",
    replaceExisting: opts?.replaceExisting ?? false,
  });
}
