/**
 * healwith: (폐쇄됨) 옛 문의 생성 API
 *
 * 경로: /api/inquiries/create → 410 Gone
 *
 * 왜 폐쇄(2026-07-02 전수 감사):
 * - 유일한 호출자였던 옛 상담 폼(ConsultWrapper — archive/dead-code 이동)이
 *   /inquiry 통합 퍼널로 통폐합돼 라이브 호출자 0 인데, 라우트만 공개로 살아 있었음.
 * - 이 경로는 통합 퍼널(step1)과 달리 PIPA 필수동의 서버 검증이 없어서,
 *   직접 POST 하면 동의 기록 없이 민감정보 문의를 만들 수 있는 우회로였음(컴플라이언스 구멍).
 * - 정식 접수 = /api/inquiries/step1 (zod 검증 + 동의 4종 서버 강제 + PII 암호화 + is_test 판정).
 *
 * 옛 구현은 git 히스토리 참조. 복원 시 step1 의 동의 강제를 반드시 이식할 것.
 */

export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { ok: false, error: "gone", detail: "Use /api/inquiries/step1 (unified funnel)." },
    { status: 410 }
  );
}
