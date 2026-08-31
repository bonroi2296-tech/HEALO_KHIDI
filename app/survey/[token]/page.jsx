/**
 * /survey/[token] — 환자 만족도 설문 페이지
 *
 * 서버 컴포넌트에서 토큰 검증 후 클라이언트 폼 렌더링
 */

import { headers } from "next/headers";

import { localizedMeta } from "@/lib/i18n/metadata";

import SurveyForm from "./_client/SurveyForm";

// 제목·설명을 방문자 언어로 (2026-08-31). /claim 과 같은 이유로 여기는 «탭 제목»만이 아니다 —
// 설문 링크는 코디가 메신저·메일로 보내므로 **미리보기 카드가 이 두 줄을 그대로 읽는다.**
// 한국어 카드가 뜨면 러·카 환자 응답률이 그대로 깎이고, 그 응답률이 곧 KHIDI 정량지표
// (사후관리 건수·만족도 점수)다. 옛 값은 "healwith 서비스 만족도 설문" — 앞의 브랜드가
// 루트 template("%s | healwith")과 겹쳐 브랜드가 두 번 떴다(이제 사전 값 안에 한 번만).
// ⚠️ alternates: null 은 지우지 마라 — 근거는 app/claim/[token]/page.jsx 주석과 같다.
export async function generateMetadata() {
  return localizedMeta(
    { robots: { index: false, follow: false }, alternates: null },
    "seo.survey.title",
    "seo.survey.desc"
  );
}

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
