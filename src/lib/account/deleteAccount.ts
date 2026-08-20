import "server-only";

import { supabaseAdmin } from "@/lib/rag/supabaseAdmin";

/**
 * 계정 탈퇴 — 로그인 계정을 «실제로» 지우고 개인정보를 익명화한다.
 *
 * 왜 만들었나 (2026-08-20 PO 지적):
 *   여태 있던 것은 「데이터 삭제 요청」뿐이었다. 환자가 눌러도 표에 요청 한 줄이 쌓이고,
 *   관리자가 「완료」를 눌러도 **상태 글자만 바뀌었다.** 계정을 실제로 지우는 코드가 0줄이었다.
 *   애플 5.1.1(v)·구글 데이터 안전 모두 「앱 안에서 계정 삭제를 시작할 수 있어야 한다」를 요구하고,
 *   PIPA·GDPR 17조도 파기를 요구한다. 이름만 있고 동작이 없던 상태였다.
 *
 * 왜 「전부 삭제」가 아니라 「계정 삭제 + 진료성 기록 익명화」인가:
 *   문의(inquiries)는 **환자를 병원에 소개한 기록**이다. 의료해외진출법·유치업 등록에 따른
 *   보존 의무가 걸릴 수 있고, KHIDI 실적 집계의 근거이기도 하다. 통째로 지우면 실적이 사라지고
 *   법정 기록이 없어진다. 그래서 **사람을 식별하는 칸만 지우고 통계용 칸은 남긴다.**
 *   이 방침은 화면 안내 문구(patientAccount.delDesc)와 짝이다 — 한쪽만 바꾸지 마라.
 *
 * 🚫 **첨부파일 이름은 «일부러» 안 건드린다** (2026-08-20 PO 판단으로 되돌림).
 *    한 번 지우는 코드를 넣었다가 뺐다. 이유:
 *      ① 파일 «안»에 환자 이름이 그대로 적혀 있다. 이름표만 바꿔선 익명이 안 된다(효과 0에 가깝다).
 *      ② 한 문의에 첨부가 5개 넘는 경우가 있다(#93). 전부 "첨부파일.pdf" 가 되면
 *         어느 게 MRI 이고 어느 게 퇴원기록인지 구분이 안 된다.
 *      ③ 그 서류는 법으로 «남겨야 하는» 진료기록이다. 알아볼 수 없게 만드는 것은 보존이 아니라 훼손이다.
 *    → 고칠 것은 코드가 아니라 «우리가 화면에 적은 문장»이다. 지금 문구는 실제 동작 그대로 적혀 있다.
 *    PO: *«오히려 문서명을 바꾸는게 문제 아님?»*
 *
 * ⚠️ 되돌릴 수 없다. 부르기 «전»에 반드시 ①본인 로그인 세션 확인 ②화면에서 확인 절차를 거칠 것.
 */

/** 지우고 나서 무엇을 어떻게 했는지 (감사 기록·화면 표시에 쓴다) */
export type DeleteAccountResult = {
  ok: boolean;
  /** 연결을 끊고 개인정보를 지운 문의 건수 */
  anonymizedInquiries: number;
  /** 통째로 지운 줄 수 (알림·푸시토큰 등) */
  purgedRows: number;
  /** 실패한 단계 이름. 있으면 사람이 손봐야 한다 */
  failedSteps: string[];
};

/**
 * 개인을 식별하는 칸만 비운다. 통계용 칸(암종·국적·단계·날짜)은 남는다.
 * ⚠️ 새 개인정보 칸을 inquiries 에 추가하면 여기에도 반드시 추가하라.
 *    안 그러면 「탈퇴했는데 이름이 남아 있는」 상태가 조용히 생긴다.
 */
const INQUIRY_PII_NULLS = {
  user_id: null,
  email: null,
  phone: null,
  first_name: null,
  last_name: null,
  contact_id: null,
  encrypted_email: null,
  encrypted_name: null,
  encrypted_contact: null,
  insurance_policy_no_encrypted: null,
} as const;

/** 사용자에 딸린 것 중 «통째로 지워도 되는» 표. 통계에 안 쓰인다. */
const PURGE_TABLES = [
  "device_tokens", // 푸시 토큰. 남기면 지운 계정으로 알림이 계속 간다
  "notifications",
  "chat_feedback",
  "patient_visa_checklist",
  "user_roles",
] as const;

/**
 * 화면에서 친 확인 문구가 본인 이메일과 같은가.
 * 🛑 대소문자·앞뒤 공백만 눈감아 준다. 여기를 느슨하게 만들지 마라 —
 *    되돌릴 수 없는 삭제 앞의 «실수 클릭 방지»가 이 함수의 유일한 존재 이유다.
 */
export function confirmMatchesEmail(typed: unknown, email: string | null | undefined): boolean {
  const want = (email || "").trim().toLowerCase();
  if (!want) return false;
  return typeof typed === "string" && typed.trim().toLowerCase() === want;
}

export async function deleteAccountCompletely(userId: string): Promise<DeleteAccountResult> {
  const failedSteps: string[] = [];
  let anonymizedInquiries = 0;
  let purgedRows = 0;

  const admin = supabaseAdmin as any;

  // ① 진료성 기록: 사람만 지우고 기록은 남긴다
  try {
    const { data, error } = await admin
      .from("inquiries")
      .update(INQUIRY_PII_NULLS)
      .eq("user_id", userId)
      .select("id");
    if (error) throw error;
    anonymizedInquiries = data?.length ?? 0;
  } catch {
    failedSteps.push("inquiries");
  }

  // ② 상담 대화: 연결을 끊고 남아 있던 손님 정보 칸도 비운다
  try {
    const { error } = await admin
      .from("chat_threads")
      .update({ user_id: null, guest_email: null, guest_name: null, guest_phone: null })
      .eq("user_id", userId);
    if (error) throw error;
  } catch {
    failedSteps.push("chat_threads");
  }

  // ③ 통째로 지워도 되는 것들
  for (const table of PURGE_TABLES) {
    try {
      const { data, error } = await admin.from(table).delete().eq("user_id", userId).select("user_id");
      if (error) throw error;
      purgedRows += data?.length ?? 0;
    } catch {
      failedSteps.push(table);
    }
  }

  // ④ 로그인 계정 자체. **이게 진짜 탈퇴다** — 앞 단계가 일부 실패해도 여기는 시도한다.
  //    (계정이 남아 있으면 사용자는 「탈퇴했는데 로그인이 된다」를 겪는다. 그게 제일 나쁘다.)
  try {
    const { error } = await admin.auth.admin.deleteUser(userId);
    // 이미 없는 계정은 «성공»으로 본다 — 두 번 불러도 같은 결과여야 한다
    // (관리자가 이미 스스로 탈퇴한 사람의 옛 요청을 「완료」로 닫을 때 실제로 이 길로 온다).
    if (error && (error as { status?: number }).status !== 404) throw error;
  } catch {
    failedSteps.push("auth_user");
  }

  return {
    ok: !failedSteps.includes("auth_user"),
    anonymizedInquiries,
    purgedRows,
    failedSteps,
  };
}
