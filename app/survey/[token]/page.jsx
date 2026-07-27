/**
 * /survey/[token] — 환자 만족도 설문 페이지
 *
 * 서버 컴포넌트에서 토큰 검증 후 클라이언트 폼 렌더링
 */

import { headers } from "next/headers";

import SurveyForm from "./_client/SurveyForm";

export const metadata = {
  title: "healwith 서비스 만족도 설문",
  description: "healwith 서비스 이용 후 만족도 설문에 참여해 주세요.",
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
  // 환자에게 기록된 언어(메일 발송에 쓴 것과 동일 기준). 없으면 폼이 브라우저 언어로 폴백.
  let patientLang = null;

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
      patientLang = data.lang || null;
    }
  } catch {
    initialState = "internal_error";
  }

  // 환자 언어가 없을 때의 폴백 — 브라우저가 아니라 **서버가** 헤더에서 읽는다.
  // (폼이 navigator 를 직접 읽으면 서버는 en, 브라우저는 ru/ko 로 그려 Hydration Error)
  const browserLang = (await headers()).get("accept-language")?.split(",")[0] || "en";

  return (
    <SurveyForm
      token={token}
      surveyId={surveyId}
      initialState={initialState}
      alreadyResponded={responded}
      patientLang={patientLang}
      browserLang={browserLang}
    />
  );
}
