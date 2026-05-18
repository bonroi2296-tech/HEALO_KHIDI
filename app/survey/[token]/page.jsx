/**
 * /survey/[token] — 환자 만족도 설문 페이지
 *
 * 서버 컴포넌트에서 토큰 검증 후 클라이언트 폼 렌더링
 */

import SurveyForm from "./_client/SurveyForm";

export const metadata = {
  title: "HEALO 서비스 만족도 설문",
  description: "HEALO 서비스 이용 후 만족도 설문에 참여해 주세요.",
  robots: { index: false },
};

export default async function SurveyPage({ params }) {
  const { token } = await params;

  // 서버에서 토큰 유효성 미리 확인 (조기 에러 처리)
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  let initialState = "loading";
  let surveyId = null;
  let responded = false;

  try {
    const res = await fetch(`${baseUrl}/api/survey/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    const data = await res.json();

    if (!data.ok) {
      initialState = data.error; // "not_found" | "expired" | "internal_error"
    } else {
      initialState = "ok";
      surveyId = data.surveyId;
      responded = data.responded;
    }
  } catch {
    initialState = "internal_error";
  }

  return (
    <SurveyForm
      token={token}
      surveyId={surveyId}
      initialState={initialState}
      alreadyResponded={responded}
    />
  );
}
