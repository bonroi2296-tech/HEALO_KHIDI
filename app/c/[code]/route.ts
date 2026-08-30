/**
 * healwith: 짧은 초대 주소 — `/c/<코드>` → 실제 상담방으로 넘김
 *
 * 왜: 초대 링크가 139자(`/consultation/<36자>?invite=<64자>`)라 메신저에서 두 줄로 접히고
 * 잘려서 붙여넣어졌다(PO 2026-07-23). 코드 자체가 곧 입장권이라 표를 따로 두지 않는다 —
 * DB 에는 여전히 해시만 있고(원본 저장 X), 여기서는 해시로 상담 id 만 찾아 넘긴다.
 *
 * 보안: 넘기기만 하고 아무것도 통과시키지 않는다. 만료·폐기·사용횟수 검사는 예전 그대로
 * 입장 시점(guest-join 의 verifyAndConsumeGuestToken)에 한다. 코드 추측 방어는 2^128 +
 * IP 레이트리밋. 없는 코드·잘못된 모양은 같은 404 로 답한다(존재 여부 노출 방지).
 * 만료·폐기된 코드는 행이 남아 있어 여기선 302 로 넘어가고, 입장 시점 검사가 거른다.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { hashGuestToken, INVITE_CODE_RE } from "@/lib/auth/guestToken";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { checkRateLimitPersistent, getClientIp } from "@/lib/rateLimit";

const RATE = {
  windowMs: 60 * 1000,
  maxRequests: 30, // 링크 한 번 누르면 1회. 같은 방에 여러 명이 몰려도 넉넉.
  apiName: "consultation_short_link",
};

/**
 * 없는 코드·삭제된 코드·잘못된 모양 — 전부 같은 응답(어느 쪽인지 알려주지 않는다).
 * 언어 감지 없이 활성 6개 언어(ko·en·ru·kz·zh·ja)를 전부 보여준다 — 첫 방문 착지점이라
 * 쿠키·Accept-Language 를 믿을 수 없고, 고정 텍스트라 어떤 언어 사용자도 폴백 없이 읽는다.
 */
function notFound() {
  return new NextResponse(
    "이 초대 링크는 더 이상 유효하지 않습니다. 담당자에게 새 링크를 요청해 주세요.\n" +
      "This invitation link is no longer valid. Please ask your coordinator for a new one.\n" +
      "Эта ссылка‑приглашение больше не действует. Запросите новую у координатора.\n" +
      "Бұл шақыру сілтемесі енді жарамсыз. Үйлестірушіден жаңа сілтеме сұраңыз.\n" +
      "此邀请链接已失效。请向您的协调员索取新链接。\n" +
      "この招待リンクは無効になりました。コーディネーターに新しいリンクをご依頼ください。",
    { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const ip = getClientIp(request) || "unknown";
    if (!(await checkRateLimitPersistent(ip, RATE)).allowed) {
      return new NextResponse("too_many_requests", { status: 429 });
    }

    const { code } = await params;
    if (!code || !INVITE_CODE_RE.test(code)) return notFound();

    const { data: row, error } = await supabaseAdmin
      .from("consultation_guest_tokens")
      .select("consultation_id")
      .eq("token_hash", hashGuestToken(code))
      .maybeSingle();

    // DB 가 삐끗한 걸 「링크가 죽었다」로 보여주면 멀쩡한 환자가 포기한다 — 원인을 구분해 알린다.
    if (error) {
      console.error("[short-link] DB error:", error.message);
      return new NextResponse("temporarily_unavailable", { status: 503 });
    }
    if (!row) return notFound();

    const target = new URL(
      `/consultation/${row.consultation_id}?invite=${encodeURIComponent(code)}`,
      request.url
    );
    // 302 + no-store: 링크가 폐기돼도 브라우저·중간 캐시가 옛 목적지를 계속 들고 있지 않게.
    return NextResponse.redirect(target, {
      status: 302,
      headers: { "cache-control": "no-store" },
    });
  } catch (err: any) {
    console.error("[short-link] error:", err?.message);
    return new NextResponse("internal_error", { status: 500 });
  }
}
