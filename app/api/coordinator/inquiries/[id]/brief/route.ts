/**
 * healwith: 코디 케이스 브리프 생성 API (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/brief
 * → 문의 1건의 인테이크+메시지+첨부를 Gemini가 읽고 코디용 브리프(개요·요청·볼포인트·플래그)를 만든다.
 * 저장하지 않음(on-demand). inquiries 는 service_role 전용 → 서버 경유. PII 복호화는 staff 인증 후.
 */
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin, decryptReferralData } from "@/lib/security/decryptForAdmin";
import { generateCaseBrief, briefSig, normalizeBriefLang, readBriefMap } from "@/lib/inquiry/caseBrief";
import { encryptStringNullable, decryptStringNullable } from "@/lib/security/encryptionV2";

const BRIEF_FIELDS = [
  "id", "nationality", "cancer_type", "message", "preferred_date", "intake", "attachments", "follow_ups",
  // ⚠️ 캐시 두 칸도 반드시 읽어와야 한다. 안 읽으면 «이전 값»이 늘 비어 보여서
  //    언어별 묶음을 덧붙이지 못하고 **통째로 덮어쓴다**(러시아어 만들면 한국어가 날아감).
  //    2026-07-29 실측으로 잡음: 러 → 한 → 러 순으로 열었더니 마지막 러시아어가 다시 만들어졌다.
  "coordinator_brief", "coordinator_brief_sig",
].join(",");

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  // 브리프를 «읽는 사람 언어»로 만든다(백오피스 언어). 값이 이상하면 한국어.
  let lang = "ko";
  try {
    const body = await request.json();
    lang = normalizeBriefLang(body?.lang);
  } catch { /* 본문 없이 부르면 한국어 */ }

  try {
    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select(BRIEF_FIELDS)
      .eq("id", Number(id))
      .single();

    if (error) {
      if (error.code === "PGRST116") return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      console.error("[coordinator/brief] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    // PII 복호화(staff 인증 후 서버에서만) — 브리프는 복호화된 message·intake 로 생성.
    let inquiry: any = data;
    try {
      inquiry = await decryptInquiryForAdmin(data);
      // 새 의뢰서(/inquiry/referral)가 채운 칸 — 안 읽으면 브리프가 진단명·불편한 곳·약물·현지 소견을 통째로 모른다.
      // 🛑 위 목록(BRIEF_FIELDS)에 섞지 마라 — 그 컬럼이 아직 없는 환경에서 조회 «전체»가 죽어 브리프가 안 만들어진다.
      const { data: refRow } = await supabaseAdmin.from("inquiries").select("intake_data").eq("id", Number(id)).single();
      // 코디가 확정한 진단코드도 «따로» 읽는다(위 목록에 섞으면 그 컬럼 없는 환경에서 브리프가 통째로 안 만들어진다).
      // 타입 정의는 생성물이라 신규 컬럼을 모른다 → 이 쿼리만 캐스팅. 타입 재생성 시 지워라.
      const { data: icdRow } = await (supabaseAdmin.from as any)("inquiries").select("icd_code").eq("id", Number(id)).single();
      if (icdRow?.icd_code) inquiry.icd_code = icdRow.icd_code;
      const ref = (refRow as any)?.intake_data;
      if (ref && typeof ref === "object" && ref.version === "referral_v1") inquiry.referral = decryptReferralData(ref);
    } catch (e: any) {
      console.error("[coordinator/brief] decrypt error:", e?.message);
    }

    const result = await generateCaseBrief({
      inquiry,
      attachments: Array.isArray(inquiry?.attachments) ? inquiry.attachments : [],
      lang,
    });

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 502 });
    }

    // 캐시 저장(암호화) — 열람 때 즉시 뜨게. 첨부 서명도 저장(바뀌면 자동 재생성). 실패해도 응답은 진행.
    // ⚠️ 언어별로 «덧붙인다». 통째로 덮으면 한국 직원이 볼 한국어 브리프가 러시아어 생성 한 번에 날아간다.
    try {
      let map: any = {};
      try {
        const prev = (data as any)?.coordinator_brief;
        const prevSig = (data as any)?.coordinator_brief_sig || "";
        // 첨부가 바뀌었으면 옛 언어 것도 낡았다 → 새로 시작(다음 열람 때 각 언어가 다시 만들어진다).
        if (prev && prevSig === briefSig(inquiry?.attachments || [], (inquiry as any)?.follow_ups)) {
          const dec = decryptStringNullable(prev);
          if (dec) map = readBriefMap(JSON.parse(dec));
        }
      } catch { /* 못 읽으면 새로 시작 */ }
      // 「못 읽은 첨부 수」를 브리프와 «같이» 저장한다. 안 그러면 캐시에서 꺼내 보여줄 때
      // 그 숫자가 사라져 «자료를 다 보고 쓴 브리프»처럼 보인다(문의 #60 에서 실제로 그랬다).
      map[lang] = { ...result.brief, unreadable: result.unreadableCount };
      const enc = encryptStringNullable(JSON.stringify(map));
      // 새 컬럼(coordinator_brief*)은 생성 타입(database.types)에 아직 없어 as any 로 우회(마이그레이션은 적용됨).
      await supabaseAdmin
        .from("inquiries")
        .update({ coordinator_brief: enc, coordinator_brief_sig: briefSig(inquiry?.attachments || [], (inquiry as any)?.follow_ups) } as any)
        .eq("id", Number(id));
    } catch (e: any) {
      console.error("[coordinator/brief] cache write error:", e?.message);
    }

    return Response.json({ ok: true, brief: result.brief, unreadableCount: result.unreadableCount });
  } catch (e: any) {
    console.error("[coordinator/brief] internal error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
