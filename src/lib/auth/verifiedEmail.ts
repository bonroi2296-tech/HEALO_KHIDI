import "server-only";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

/**
 * 「로그인 이메일이 같으면 본인 것」 판정에 쓸 «인증된» 이메일만 돌려준다.
 *
 * 왜 필요한가:
 *   환자 화면 몇 곳은 문의를 계정 번호가 아니라 «이메일 일치»로 본인 것이라고 판정한다.
 *   (문의는 로그인 전에도 넣을 수 있어서, 나중에 가입한 계정과 이어 붙이려면 이메일밖에 없다.)
 *   그런데 메일 인증을 안 거친 계정이 세션을 받을 수 있게 되는 순간,
 *   남의 이메일로 가입만 하면 그 사람의 문의·증상기록·여정이 통째로 보인다.
 *
 *   2026-08-13 점검: `portal/followup` 만 `email_confirmed_at` 을 확인하고 있었고
 *   `my-inquiries`·`symptoms`·`journey` 세 곳은 확인 없이 이메일만 맞춰봤다.
 *   같은 위험을 한 곳은 막고 세 곳은 안 막은 상태였다.
 *
 *   ※ 지금 로그인 설정은 메일 확인을 요구하는 것으로 «보인다»(실측: 미인증 계정 1개,
 *     그 계정의 로그인 이력 0). 다만 그건 설정 하나가 바뀌면 사라지는 방어라
 *     여기서 한 겹 더 잠근다.
 *
 * @returns 인증된 이메일(소문자·공백제거). 미인증·조회실패·이메일 없음이면 null.
 */
export async function getConfirmedEmail(
  userId: string | null | undefined,
  fallbackEmail?: string | null
): Promise<string | null> {
  if (!userId) return null;
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    const user = (data as any)?.user;
    if (!user?.email_confirmed_at) return null;
    const email = (user.email || fallbackEmail || "").trim().toLowerCase();
    return email || null;
  } catch {
    // 조회 실패는 «확인 못 함» → 본인으로 안 쳐준다(열어두는 쪽으로 실패하지 않는다).
    return null;
  }
}
