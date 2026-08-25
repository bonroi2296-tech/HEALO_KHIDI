/**
 * healwith: 「로그인한 이 사람의 문의는 어느 것인가」 — 단일 판정 창구
 *
 * inquiries.email 은 AES-256-GCM(IV 랜덤) 암호화라 WHERE 로 못 찾는다 → 최근 건을 읽어
 * 복호화-매칭한다(파일럿 규모라 이 방식이 맞다. admin/users·journey 와 같은 패턴).
 *
 * ⚠️ 판정에는 **인증된 주소**만 쓴다(getConfirmedEmail) — 남의 주소로 가입만 해서
 * 남의 건강정보에 글·파일을 붙이는 길을 막는다(2026-08-13 점검).
 * ⚠️ 클라이언트가 보낸 inquiryId 를 믿지 마라(IDOR) — 반드시 이 목록으로 교차검증한다.
 *
 * 2026-08-25: 증상 기록(app/api/portal/symptoms)에만 있던 함수를 꺼냈다.
 * 환자 경과 업로드(app/api/portal/progress)가 같은 판정을 쓰는데, 복사하면 한쪽만
 * 고쳐져 «내 것인데 남의 것으로 보이는» 어긋남이 난다.
 */

import "server-only";
import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";
import { getConfirmedEmail } from "@/lib/auth/verifiedEmail";
import { decryptStringNullable } from "@/lib/security/encryptionV2";

function safeDecrypt(enc: unknown): string {
  try {
    return decryptStringNullable(enc as any) || "";
  } catch {
    return "";
  }
}

/** 이메일이 일치하는 본인 문의 id 목록(최근순). */
export async function findOwnInquiryIds(userEmail: string): Promise<number[]> {
  const target = (userEmail || "").trim().toLowerCase();
  if (!target) return [];
  const { data } = await supabaseAdmin
    .from("inquiries")
    .select("id, email, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data || [])
    .filter((i: any) => safeDecrypt(i.email).trim().toLowerCase() === target)
    .map((i: any) => i.id);
}

/** 로그인 사용자 → 본인 문의 id 목록. 인증된 주소로만 판정한다. */
export async function findOwnInquiryIdsForUser(
  userId: string,
  email?: string | null
): Promise<number[]> {
  return findOwnInquiryIds((await getConfirmedEmail(userId, email)) || "");
}
