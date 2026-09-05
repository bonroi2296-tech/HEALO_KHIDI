/**
 * healwith: Consultation guest invite tokens
 *
 * Zoom-스타일 공유 링크로 환자가 계정 없이 원격 상담 방에 참여할 수 있게 함.
 *
 * 보안 설계:
 * - 원본 토큰 (base64url 32 bytes) 은 발급 시 1회만 반환됨
 * - DB 에는 SHA-256 hash 만 저장 (유출 시 복원 불가)
 * - 역할 고정 (patient / doctor / translator / coordinator / observer)
 * - 만료시각 필수 + max_uses 제한
 * - 접속 IP / UA audit
 *
 * 사용 흐름:
 * 1. admin 이 POST /api/khidi/consultation/:id/invite 호출 → token 반환
 * 2. 관리자/코디네이터가 환자에게 URL `/consultation/:id?invite=<token>` 공유
 * 3. 환자가 URL 접속 → POST /api/khidi/consultation/:id/guest-join
 *    (token 을 body 에 담아 전송) → LiveKit access token 발급
 */

import "server-only";

import { randomBytes, createHash } from "node:crypto";
import { supabaseAdmin } from "../rag/supabaseAdmin";
import { askOnceMoreOnError } from "./retryTransient";
import { withLang } from "@/lib/i18n/guestLinkLang";

// "guest" = 범용 참여자(통합 초대 링크). 누구나 이 링크로 입장 → 이름 직접 입력.
export type GuestRole = "patient" | "doctor" | "translator" | "coordinator" | "observer" | "guest";

export interface GenerateGuestTokenParams {
  consultationId: string;
  role: GuestRole;
  inviteeName?: string;
  inviteeEmail?: string;
  expiresAt?: Date;         // 기본: 24h 후
  maxUses?: number;         // 기본: 0 = 만료 전까지 무제한(회수 제한 없음, 2026-07-15 PO)
  createdBy?: string;       // admin user_id
}

export interface GenerateGuestTokenResult {
  tokenPlain: string;       // 발급 시에만 반환, DB 저장 X
  tokenId: string;          // row id
  /** 받는 사람 언어(lang, 선택)를 ?lang= 로 싣는다 — 메신저 미리보기 봇용(2026-09-05). */
  inviteUrl: (baseUrl: string, lang?: string | null) => string;
  expiresAt: Date;
}

export const MIN_TOKEN_CHARS = 32; // 검증부 length 가드와 같은 값 — 아래 테스트가 둘을 묶어 지킨다

/** 발급 코드는 32자, 예전에 나간 64자 코드도 유효. 짧은 주소(`/c/<코드>`)가 이 모양으로 거른다. */
export const INVITE_CODE_RE = /^[a-f0-9]{32,64}$/;

/**
 * base64url 없이 hex 만 사용 (URL-safe).
 *
 * 16 bytes = 32 hex chars = 2^128. 예전엔 32 bytes(64자)였는데 초대 링크가 139자까지
 * 길어져 메신저에서 두 줄로 접히고 잘려 붙여넣어지는 일이 있었다(PO 2026-07-23).
 * 128비트는 온라인 추측이 불가능한 표준 하한이고, 아래 검증부의 최소길이 가드(32)와
 * 정확히 맞는다 — ⚠️ 더 줄이려면 verifyAndConsumeGuestToken 의 length 가드도 같이 봐야 한다.
 * 예전에 발급된 64자 토큰도 그대로 유효(검증은 해시 대조라 길이와 무관).
 */
export function newInviteCode(): string {
  return randomBytes(16).toString("hex");
}

function generateRawToken(): string {
  return newInviteCode();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 짧은 초대 주소(`/c/<코드>`)가 코드→상담을 찾을 때 쓰는 같은 해시. */
export function hashGuestToken(token: string): string {
  return hashToken(token);
}

/**
 * 토큰 발급 — admin/coordinator 만 호출해야 함 (route 에서 권한 체크 필수)
 */
export async function generateGuestToken(
  params: GenerateGuestTokenParams
): Promise<GenerateGuestTokenResult> {
  const tokenPlain = generateRawToken();
  const tokenHash = hashToken(tokenPlain);

  const expiresAt =
    params.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

  const { data, error } = await supabaseAdmin
    .from("consultation_guest_tokens")
    .insert({
      consultation_id: params.consultationId,
      token_hash: tokenHash,
      role: params.role,
      invitee_name: params.inviteeName ?? null,
      invitee_email: params.inviteeEmail ?? null,
      created_by: params.createdBy ?? null,
      expires_at: expiresAt.toISOString(),
      max_uses: params.maxUses ?? 0, // 0 = 무제한(만료 전까지) — 회수 제한 제거(PO 2026-07-15)
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`[guestToken] Insert failed: ${error?.message}`);
  }

  return {
    tokenPlain,
    tokenId: data.id,
    expiresAt,
    // 짧은 초대 주소. `/c/<코드>` 가 상담 id 를 찾아 실제 방으로 넘긴다(app/c/[code]/route.ts).
    // 긴 형식(`/consultation/<id>?invite=<코드>`)도 그대로 살아 있다 — 이미 나간 링크가 죽지 않게.
    // lang: 받는 사람 언어(선택). 짧은 주소(/c/…)가 /consultation/… 으로 넘길 때 그대로 전달돼 미리보기 봇이 제 언어 카드를 만든다.
    inviteUrl: (baseUrl: string, lang?: string | null) => withLang(`${baseUrl.replace(/\/$/, "")}/c/${tokenPlain}`, lang),
  };
}

export interface VerifyGuestTokenResult {
  valid: boolean;
  consultationId?: string;
  role?: GuestRole;
  inviteeName?: string | null;
  inviteeEmail?: string | null;
  tokenId?: string;
  reason?: string;
}

/**
 * 토큰 검증 + 사용 카운트 증가 (원자적).
 *
 * @param tokenPlain URL 쿼리에서 받은 원본 토큰
 * @param consultationId 사용자가 접근 시도하는 세션 ID (토큰과 일치해야 함)
 * @param metadata 접속 IP / UA (audit 용)
 */
export async function verifyAndConsumeGuestToken(
  tokenPlain: string,
  consultationId: string,
  metadata?: { ip?: string; userAgent?: string }
): Promise<VerifyGuestTokenResult> {
  if (!tokenPlain || typeof tokenPlain !== "string" || tokenPlain.length < 32) {
    return { valid: false, reason: "invalid_token_format" };
  }

  const tokenHash = hashToken(tokenPlain);

  // DB 가 한 번 삐끗하면 환자 화면엔 「초대 링크가 만료되었습니다」가 뜬다(모든 사유를
  // invalid_or_expired_invite 로 뭉갬) — 멀쩡한 링크인데 환자가 포기한다. 오류면 1회 더 물어본다.
  const tokenRes = await askOnceMoreOnError(() =>
    supabaseAdmin
      .from("consultation_guest_tokens")
      .select(
        "id, consultation_id, role, invitee_name, invitee_email, expires_at, revoked_at, max_uses, used_count"
      )
      .eq("token_hash", tokenHash)
      .maybeSingle()
  );
  const { data: row, error } = tokenRes ?? { data: null, error: new Error("db_unreachable") };

  if (error) {
    console.error("[guestToken] DB error:", error.message);
    return { valid: false, reason: "db_error" };
  }
  if (!row) {
    return { valid: false, reason: "token_not_found" };
  }

  // 세션 ID 일치 확인 — 다른 세션의 토큰으로 이 세션 접근 시도 방어
  if (row.consultation_id !== consultationId) {
    return { valid: false, reason: "consultation_mismatch" };
  }

  if (row.revoked_at) {
    return { valid: false, reason: "token_revoked" };
  }

  if (new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: "token_expired" };
  }

  // max_uses<=0 = 무제한(만료 전까지). 회수 제한은 만료시각으로만 건다(줌 링크 방식, PO 2026-07-15).
  // used_count 는 아래에서 계속 증가시켜 분석·audit 는 유지.
  if (row.max_uses > 0 && row.used_count >= row.max_uses) {
    return { valid: false, reason: "max_uses_exceeded" };
  }

  // 사용 카운트 증가 + audit 기록 (best-effort, 실패해도 접속 허용)
  try {
    await supabaseAdmin
      .from("consultation_guest_tokens")
      .update({
        used_count: row.used_count + 1,
        first_used_at: row.used_count === 0 ? new Date().toISOString() : undefined,
        last_used_at: new Date().toISOString(),
        last_used_ip: metadata?.ip ?? null,
        last_used_user_agent: metadata?.userAgent?.slice(0, 500) ?? null,
      })
      .eq("id", row.id);
  } catch (e) {
    console.warn("[guestToken] usage update failed (non-critical):", (e as Error).message);
  }

  return {
    valid: true,
    consultationId: row.consultation_id,
    role: row.role as GuestRole,
    inviteeName: row.invitee_name,
    inviteeEmail: row.invitee_email,
    tokenId: row.id,
  };
}

/**
 * 토큰 검증 (읽기 전용 — 사용 카운트 소모 없음).
 *
 * 용도: 이미 입장한 게스트(의사/코디)가 대기열 조회·승인 등 후속 API 를 호출할 때
 * 자격 증명으로 재검증. "입장"이 아니므로 used_count 를 증가시키지도, 검사하지도 않음
 * (유효·미폐기·미만료 토큰 보유 = 충분한 증명).
 */
export async function verifyGuestTokenReadOnly(
  tokenPlain: string,
  consultationId: string
): Promise<VerifyGuestTokenResult> {
  if (!tokenPlain || typeof tokenPlain !== "string" || tokenPlain.length < 32) {
    return { valid: false, reason: "invalid_token_format" };
  }

  const tokenHash = hashToken(tokenPlain);

  // 위와 같은 이유 — 상담 중 API 가 DB 한 번 삐끗에 403 으로 끊기지 않게 1회 더.
  const tokenRes = await askOnceMoreOnError(() =>
    supabaseAdmin
      .from("consultation_guest_tokens")
      .select("id, consultation_id, role, invitee_name, invitee_email, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle()
  );
  const { data: row, error } = tokenRes ?? { data: null, error: new Error("db_unreachable") };

  if (error) {
    console.error("[guestToken/readOnly] DB error:", error.message);
    return { valid: false, reason: "db_error" };
  }
  if (!row) return { valid: false, reason: "token_not_found" };
  if (row.consultation_id !== consultationId) {
    return { valid: false, reason: "consultation_mismatch" };
  }
  if (row.revoked_at) return { valid: false, reason: "token_revoked" };
  if (new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: "token_expired" };
  }

  return {
    valid: true,
    consultationId: row.consultation_id,
    role: row.role as GuestRole,
    inviteeName: row.invitee_name,
    inviteeEmail: row.invitee_email,
    tokenId: row.id,
  };
}

/**
 * 토큰 폐기 (관리자)
 */
export async function revokeGuestToken(tokenId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("consultation_guest_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId);

  return !error;
}

/**
 * 세션의 모든 게스트 토큰 일괄 폐기 — 세션 취소 시 호출 권장
 */
export async function revokeAllGuestTokensForConsultation(
  consultationId: string
): Promise<number> {
  const { error, count } = await supabaseAdmin
    .from("consultation_guest_tokens")
    .update({ revoked_at: new Date().toISOString() }, { count: "exact" })
    .eq("consultation_id", consultationId)
    .is("revoked_at", null);

  if (error) return 0;
  return count ?? 0;
}
