/**
 * healwith: Public Chat Start API
 *
 * POST /api/public/chat/start
 * - 비회원도 사용 가능 (인증 불요)
 * - chat_thread 생성 + public_token 발급
 * - 게스트 식별 정보(이름·이메일·국적) 동시 저장 — AI 학습 데이터 캡처용
 * - browser_session_id 기록으로 재방문 시 이력 복구 가능
 */

export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { SYNTHETIC_TEST_HEADER, syntheticTestFromHeader } from "@/lib/chat/syntheticThread";
import { supabaseAdmin, assertSupabaseEnv } from "@/lib/rag/supabaseAdmin";
import { createSupabaseServerClientFromRequest } from "@/lib/supabase/server";
import { checkRateLimitPersistent, getClientIp, RATE_LIMITS } from "@/lib/rateLimit";
import { encryptStringNullable, safeHash } from "@/lib/security/encryptionV2";
import { hasMojibake } from "@/lib/inquiry/noMojibake";

// 공개 라우트지만 same-origin 쿠키로 로그인 사용자 식별 가능 → 새 스레드를 계정에 연결.
async function getOptionalUser(request: NextRequest) {
  // 인증 쿠키가 아예 없으면 익명 확정 → Supabase auth 네트워크 왕복 생략.
  if (!request.cookies.getAll().some((c) => /auth-token/.test(c.name))) return null;
  try {
    const supabase = createSupabaseServerClientFromRequest(request);
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  assertSupabaseEnv();

  const clientIp = getClientIp(request);
  const rl = await checkRateLimitPersistent(clientIp, RATE_LIMITS.CHAT);
  if (!rl.allowed) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const syntheticTest = syntheticTestFromHeader(request.headers.get(SYNTHETIC_TEST_HEADER));

    // 인코딩 깨진 본문(U+FFFD) 거부 — 깨진 한글이 chat_threads→inquiries 승격까지 그대로 박힘 (POSTMORTEMS #92)
    if (hasMojibake(body)) {
      return Response.json(
        { ok: false, error: "broken_encoding", detail: "body contains U+FFFD — send UTF-8" },
        { status: 400 }
      );
    }

    const {
      treatment_slug,
      language = "en",
      country,
      // 게스트 식별 정보 (선택이지만 권장)
      guest_name,
      guest_email,
      guest_country,
      guest_phone,
      browser_session_id,
      utm,
      landing_path,
      referrer,
      client_meta,
      // 브라우저 IANA 시간대(예: Asia/Almaty) — 어드민 챗의 "환자 현지 시각" 표시용(새벽 알림 방지).
      timezone,
      // PIPA: 게스트가 민감 건강정보를 AI(국외·Google)에 입력하기 전 필수 동의.
      consent,
      consent_version,
    } = body;

    // PIPA 필수 동의 서버 재확인 — 폼/게이트를 우회한 직접 호출도 차단.
    // (개인·민감 건강정보 수집 + 국외/AI 이전 1줄 동의)
    if (consent !== true) {
      return Response.json({ ok: false, error: "consent_required" }, { status: 400 });
    }

    // 입력 정규화·검증 (가벼운 수준)
    const name = typeof guest_name === "string" ? guest_name.trim().slice(0, 100) : null;
    const email = typeof guest_email === "string" ? guest_email.trim().slice(0, 200) : null;
    const ctry = typeof guest_country === "string" ? guest_country.trim().slice(0, 8) : (country || null);
    const phone = typeof guest_phone === "string" ? guest_phone.trim().slice(0, 32) : null;
    const sessionId = typeof browser_session_id === "string" ? browser_session_id.trim().slice(0, 64) : null;
    // IANA 형식("지역/도시")만 수용 — 임의 문자열 오염 방지. 시간대는 위치가 아니라 도시권 수준이라 PII 아님.
    const tz =
      typeof timezone === "string" && /^[A-Za-z_]+\/[A-Za-z_/+-]+$/.test(timezone.trim()) && timezone.length <= 64
        ? timezone.trim()
        : null;
    const consentRecord = {
      health_crossborder: true,
      version: typeof consent_version === "string" ? consent_version.slice(0, 20) : null,
      at: new Date().toISOString(),
    };

    // 로그인 사용자면 스레드를 계정에 연결(user_id) — 비로그인은 그대로 익명 게스트.
    const authUser = await getOptionalUser(request);

    const publicToken = crypto.randomUUID();

    // 게스트 PII(이름·이메일·전화)는 AES-256-GCM 암호화 후 저장(평문 저장 금지).
    // 재방문 검색(lookup)은 평문 대신 SHA256 해시로 매칭 → metadata 에 보관.
    // 국가코드(ctry)는 PII 가 아니고 필터·통계에 쓰여 평문 유지.
    const emailHash = email ? safeHash(email.toLowerCase()) : null;
    const nameHash = name ? safeHash(name.trim().toLowerCase()) : null;

    const { data, error } = await (supabaseAdmin as any)
      .from("chat_threads")
      .insert({
        status: "open",
        public_token: publicToken,
        user_id: authUser?.id ?? null,
        // 주의: subject 에 게스트 이름을 평문으로 넣지 않는다(PII 누출 방지).
        subject: treatment_slug ? `Inquiry: ${treatment_slug}` : "New Chat",
        guest_name: encryptStringNullable(name),
        guest_email: encryptStringNullable(email),
        guest_country: ctry,
        guest_phone: encryptStringNullable(phone),
        browser_session_id: sessionId,
        last_active_at: new Date().toISOString(),
        channel: "web",
        metadata: {
          language,
          utm: utm || null,
          landing_path: landing_path || null,
          referrer: referrer || null,
          // 점검·E2E 표식 — 헤더로 온 것을 여기 옮겨 적는다(판사가 이걸 보고 건너뛴다). syntheticThread.ts.
          client_meta: syntheticTest
            ? { ...(client_meta && typeof client_meta === "object" && !Array.isArray(client_meta) ? client_meta : {}), synthetic_test: syntheticTest }
            : client_meta || null,
          treatment_slug: treatment_slug || null,
          ...(tz ? { tz } : {}),
          started_at: new Date().toISOString(),
          ...(authUser ? { is_logged_in: true } : {}),
          // 재방문 검색용 블라인드 인덱스(평문 저장 아님)
          guest_email_hash: emailHash,
          guest_name_hash: nameHash,
          // PIPA 동의 기록(증빙). 민감정보·국외이전 1줄 동의.
          consent: consentRecord,
        },
      })
      .select("id, public_token, created_at")
      .single();

    if (error) {
      console.error("[POST /api/public/chat/start]", error.message);
      return Response.json({ ok: false, error: "insert_failed" }, { status: 500 });
    }

    return Response.json({
      ok: true,
      thread_id: data.id,
      public_token: data.public_token,
      created_at: data.created_at,
    });
  } catch (err: any) {
    console.error("[POST /api/public/chat/start] Unexpected:", err.message);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
