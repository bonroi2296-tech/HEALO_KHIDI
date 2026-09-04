/**
 * healwith: 코디 → 환자 '추가 정보 요청' (staff 전용)
 *
 * POST /api/coordinator/inquiries/[id]/request-info
 *   - 환자에게 Step2 상세 인테이크 폼 링크를 보낸다(로그인 불필요 = public_token 링크).
 *   - public_token 이 없으면 생성해 저장(이후 환자가 링크로 폼 작성 → 같은 문의에 반영).
 *   - 환자 이메일이 있으면 6개 언어 중 본인 언어로 메일 발송(없거나 실패해도 링크는 반환 →
 *     코디가 왓츠앱/텔레그램 등 환자가 쓴 채널로 직접 보낼 수 있게).
 *
 * 저마찰 전략: 회원가입·앱설치를 입구에 두지 않는다. 토큰 링크가 신원을 들고 있어
 * 가입 없이 ICT 인테이크가 동작. 계정 유도는 폼 제출 후(소프트).
 */
export const runtime = "nodejs";

import { NextRequest, after } from "next/server";
import { randomUUID } from "node:crypto";
import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logPiiAccess } from "@/lib/audit/logPiiAccess";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { decryptInquiryForAdmin } from "@/lib/security/decryptForAdmin";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderInfoRequestEmail, type EmailLang } from "@/lib/email/templates/infoRequest";
import { siteUrl } from "@/lib/siteUrl";

// 기준 주소는 siteUrl() 하나로 (env 폴백 금지 — 환자에게 나가는 폼 링크가 배포 임시주소로 새면 안 됨)
const SITE_URL = siteUrl();

const VALID_LANGS: EmailLang[] = ["ko", "en", "ru", "kz", "zh", "ja"];

function maskEmail(email: string): string {
  const [u, d] = email.split("@");
  if (!d) return "***";
  return `${u.slice(0, 2)}***@${d}`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const rawId = params.id;
  if (!rawId || !/^\d+$/.test(rawId)) {
    return Response.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  // staff(코디·의사·관리자) 전용
  const auth = await requirePortalAuth(request, { staffOnly: true });
  if (!auth.success) return auth.response;

  const id = Number(rawId);

  try {
    const { data: row, error } = await supabaseAdmin
      .from("inquiries")
      .select("id, public_token, email, first_name, spoken_language, preferred_language")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      console.error("[request-info] query error:", error.message);
      return Response.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    // public_token 없으면 생성·저장(가역적 — 그냥 토큰 부여).
    let token = (row as any).public_token as string | null;
    if (!token) {
      token = randomUUID();
      const { error: upErr } = await supabaseAdmin
        .from("inquiries")
        .update({ public_token: token } as any)
        .eq("id", id);
      if (upErr) {
        console.error("[request-info] token save error:", upErr.message);
        return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
      }
    }

    // PII(이메일·이름) 복호화 — staff 인증 후 서버에서만.
    let email: string | null = null;
    let name: string | null = null;
    let lang: EmailLang = "en";
    try {
      const dec: any = await decryptInquiryForAdmin(row);
      email = (dec?.email || "").trim() || null;
      name = (dec?.first_name || "").trim() || null;
      const rawLang = (dec?.spoken_language || dec?.preferred_language || "").toString().toLowerCase();
      if (VALID_LANGS.includes(rawLang as EmailLang)) lang = rawLang as EmailLang;
    } catch (e: any) {
      console.error("[request-info] decrypt error:", e?.message);
    }

    // 폼 링크는 환자 언어 prefix 로 — 러시아어 환자가 한국어 폼으로 열리지 않게.
    const formUrl = `${SITE_URL}/${lang}/inquiry/intake?inquiryId=${id}&token=${encodeURIComponent(token)}`;

    // 이메일 발송(있을 때만). 실패해도 링크는 반환(코디가 다른 채널로 보냄).
    let emailSent = false;
    if (email) {
      try {
        const { subject, html, text } = renderInfoRequestEmail({
          recipientName: name || undefined,
          formUrl,
          lang,
        });
        const res = await sendEmail({ to: email, subject, html, text, tags: { kind: "info_request", inquiry: String(id) } });
        emailSent = !!res.ok;
      } catch (e: any) {
        console.error("[request-info] send error:", e?.message);
      }
    }

    // 요청 시각 기록(중복 발송·진행상태 표시용).
    await supabaseAdmin
      .from("inquiries")
      .update({ info_requested_at: new Date().toISOString() } as any)
      .eq("id", id);

    // 접속기록(법정 의무): 환자 연락처를 복호화해 안내 메일을 보낸 작업이다.
    after(() =>
      logPiiAccess(request, auth, {
        action: "VIEW_INQUIRY",
        inquiryIds: [Number(id)],
        metadata: { screen: "request_info", emailSent, lang },
      })
    );

    return Response.json({
      ok: true,
      link: formUrl,
      lang,
      emailSent,
      email: email ? maskEmail(email) : null,
    });
  } catch (e: any) {
    console.error("[request-info] internal error:", e?.message);
    return Response.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
