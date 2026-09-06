/**
 * healwith: 코디네이터 인박스 — 단일 문의 상세 (staff 전용)
 *
 * GET /api/portal/inbox/[id] → 문의 1건의 상세(연락처·의료정보·메시지).
 * inquiries 는 RLS상 service_role 전용 → 서버 경유 필수.
 * PII(이름·이메일·메시지·연락처)는 staff 인증 후 서버에서만 복호화해서 응답.
 */
export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logAdminAction, getIpFromRequest, getUserAgentFromRequest } from "@/lib/audit/adminAuditLog";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { decryptReferralData } from "@/lib/security/decryptForAdmin";
import { decryptStringNullable } from "@/lib/security/encryptionV2";
import { briefSig, readBriefMap, normalizeBriefLang } from "@/lib/inquiry/caseBrief";

// detail 화면에 필요한 필드만 SELECT (불필요한 PII·내부필드 노출 최소화)
const DETAIL_FIELDS = [
  "id",
  "created_at",
  "first_name",
  "last_name",
  "email",
  "phone",
  "nationality",
  "spoken_language",
  "preferred_language",
  "contact_method",
  "contact_id",
  "preferred_date",
  "preferred_date_flex",
  "cancer_type",
  "treatment_type",
  "message",
  "status",
  "case_status",
  "case_status_note",
  // 결과(유치 확정·종료) — 상세 「진행 단계」 카드의 종료/되돌리기 단추가 읽는다(2026-09-06)
  "outcome",
  "outcome_note",
  "outcome_updated_at",
  "match_accuracy",
  "source",
  "short_memo",
  "step1_completed_at",
  "step2_completed_at",
  "info_requested_at",
  "intake",
  "attachments",
  // 접수 주체 구분(에이전시 vs 환자) + 에이전시명 표시
  "agency_id",
  "agencies(name)",
  // 회원/비회원 배지: 접수한 계정(user_id)으로 이메일·role·테스트여부 조회(응답엔 submitter 만 실음)
  "user_id",
  // 환자 계정 연결(claim) 링크 생성용 — 비회원 케이스에서 코디가 "링크 복사" 버튼으로 공유
  "public_token",
  // 케이스 브리프 캐시(암호화) + 입력 서명 — 열람 즉시 표시, 첨부 바뀌면 stale 판정해 자동 재생성
  "coordinator_brief",
  "coordinator_brief_sig",
].join(",");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const rawId = params.id;

  // ID 검증: 양의 정수만
  if (!rawId || !/^\d+$/.test(rawId)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  // staff(코디·의사·관리자) 전용
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  try {
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select(DETAIL_FIELDS)
      .eq("id", Number(rawId))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      console.error("[portal/inbox/:id] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    // 「어디서 왔나」 네 칸은 «따로» 읽는다 — 위 목록에 섞으면 그 컬럼이 아직 없는 환경에서
    // 조회 «전체»가 죽어 문의 상세가 통째로 안 열린다(2026-08-04 동작 시험에서 실제로 그랬다:
    // 화면에 「조회 중 문제가 발생했습니다」만 떴다). 여기서 실패하면 그 줄만 안 보이면 된다.
    // ⚠️ 두 «따로 읽기»는 서로 상관이 없다 → 줄줄이 기다리지 말고 나란히(독립 리뷰: 상세 한 번에 왕복 3회).
    const [arrivalRow, referralRow, icdRow] = await Promise.all([
      supabaseAdmin.from("inquiries").select("source_locale, referrer_host, landing_path, utm").eq("id", Number(rawId)).single(),
      supabaseAdmin.from("inquiries").select("intake_data").eq("id", Number(rawId)).single(),
      // 코디가 확정한 진단코드(2026-08-26 신설). 같은 이유로 «따로» 읽는다.
      // src/types/database.types.ts 는 생성물이라 신규 컬럼을 아직 모른다 → 이 쿼리만 캐스팅.
      // 타입 재생성(supabase gen types) 시 이 캐스팅을 지워라.
      (supabaseAdmin.from as any)("inquiries").select("icd_code, icd_code_updated_at, icd_code_updated_by").eq("id", Number(rawId)).single(),
    ]);
    if (arrivalRow.data) Object.assign(data as object, arrivalRow.data as Record<string, unknown>);
    if (icdRow.data) Object.assign(data as object, icdRow.data as Record<string, unknown>);

    // 새 의뢰서(/inquiry/referral)가 채운 칸은 intake_data 에 있다 — 여기도 «따로» 읽는다(위와 같은 이유).
    // 🛑 2026-08-19 실측: 쓰는 곳(referral route)은 있는데 읽는 곳이 없어 환자가 채운 진단명·불편한 곳·
    //    약물·비행 가능·받고 싶은 것 전부가 코디 화면에 «안 떴다». 개편의 존재 이유가 통째로 빠져 있었다.
    //    암호화된 칸은 아래에서 복호화한다(referral route 의 enc() 목록과 짝).
    let referral: Record<string, unknown> | null = null;
    {
      const raw = (referralRow.data as any)?.intake_data;
      if (raw && typeof raw === "object" && raw.version === "referral_v1") referral = raw;
    }

    // PII 복호화 (staff 인증 통과 후 서버에서만). 실패해도 나머지는 반환(fail-safe).
    let inquiry: any = data;
    try {
      inquiry = await decryptInquiryForAdmin(data);
    } catch (e: any) {
      console.error("[portal/inbox/:id] decrypt error:", e?.message);
    }

    // 의뢰서 칸 복호화 — referral route 가 enc() 로 감싼 키만. 실패한 칸은 null(fail-safe).
    inquiry.referral = null;
    if (referral) {
      try {
        inquiry.referral = decryptReferralData(referral);
      } catch (e: any) {
        console.error("[portal/inbox/:id] referral decrypt error:", e?.message);
      }
    }

    // 에이전시명 평탄화(관계조인 → 단일 필드)
    inquiry.agency_name = (data as any)?.agencies?.name || null;

    // 접수 주체(회원/비회원) — user_id 로 계정 조회해 email·role·@test.com 여부만 실음(PII 최소).
    // 비번·토큰 등 절대 미노출. 조회 실패해도 본 응답은 진행(fail-safe).
    // has_account 는 submitter 조회 성공 여부와 무관하게 user_id 존재 자체로만 판정 —
    // "환자 연결 링크 복사" 버튼이 조회 실패(auth 유저 삭제·API 오류) 시에도 이미 연결된
    // 케이스를 비회원으로 오판해 불필요한 링크를 다시 보내는 걸 막는다.
    const submitterUserId = (data as any)?.user_id || null;
    inquiry.has_account = !!submitterUserId;
    inquiry.submitter = null;
    if (submitterUserId) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(submitterUserId);
        const email = u?.user?.email || null;
        if (email) {
          const role = (u?.user?.app_metadata as any)?.role || null;
          inquiry.submitter = { email, role, isTest: /@test\.com$/i.test(email) };
        }
      } catch (e: any) {
        console.error("[portal/inbox/:id] submitter lookup error:", e?.message);
      }
    }
    // user_id 자체는 응답에서 제거(PII 최소 — 배지엔 submitter 만 필요).
    delete (inquiry as any).user_id;

    // 케이스 브리프 캐시: 복호화해서 실음 + 첨부 서명 비교로 stale 판정(다르면 클라가 자동 재생성).
    // 브리프는 암호화 저장(민감내용) → staff 인증 통과 후 복호화. 원본 암호문 컬럼은 응답서 제거.
    inquiry.brief = null;
    inquiry.briefStale = true;
    try {
      const encBrief = (data as any)?.coordinator_brief;
      if (encBrief) {
        const dec = decryptStringNullable(encBrief);
        if (dec) {
          // 캐시는 언어별 묶음 { ko:…, ru:… }. 읽는 사람 언어 것만 골라 준다.
          // (옛 형식 = 브리프 한 개 → readBriefMap 이 한국어로 흡수)
          const map = readBriefMap(JSON.parse(dec));
          const want = normalizeBriefLang(request.nextUrl.searchParams.get("lang"));
          inquiry.brief = map[want] || null;
          inquiry.briefStale = ((data as any)?.coordinator_brief_sig || "") !== briefSig((data as any)?.attachments || [], (data as any)?.follow_ups);
          // 내 언어 것이 아직 없으면 «없음»으로 준다 → 화면이 그 언어로 새로 만든다.
          if (!inquiry.brief) inquiry.briefStale = true;
        }
      }
    } catch (e: any) {
      console.error("[portal/inbox/:id] brief decode error:", e?.message);
      inquiry.brief = null;
      inquiry.briefStale = true;
    }
    delete (inquiry as any).coordinator_brief;
    delete (inquiry as any).coordinator_brief_sig;

    // 감사로그: staff(코디·관리자)가 환자 PII(복호화된 이름·연락처·의료상세)를 열람했음 기록.
    // 정부 의료데이터 과제 추적성(GDPR/PIPA·복호화 열람 감사). 실패해도 본 응답은 진행.
    // 2026-09-05 부터 이 기록이 목록의 「환자 새 글 · 안 읽음」 배지를 떨어뜨리는 근거다 — `void` 로
    // 흘리면 서버리스가 응답 직후 얼어 INSERT 가 증발할 수 있으니 응답 뒤 실행을 보장하는 after() 로.
    after(() => logAdminAction({
      adminEmail: auth.email || `staff:${auth.userId || "unknown"}`,
      adminUserId: auth.userId,
      action: "VIEW_INQUIRY",
      inquiryIds: [Number(rawId)],
      ipAddress: getIpFromRequest(request),
      userAgent: getUserAgentFromRequest(request),
      metadata: { surface: "coordinator_inbox_detail", role: auth.appRole || (auth.isAdmin ? "admin" : "staff") },
    }));

    return Response.json({ ok: true, inquiry });
  } catch (e: any) {
    console.error("[portal/inbox/:id] internal error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
