import { redirect } from 'next/navigation';

// 이 화면은 곧바로 /education 으로 되돌리는 «문»일 뿐이다 — 본문 없는 리다이렉트 응답이라
// <head> 가 나가지 않고, 따라서 제목·설명을 붙여도 브라우저 탭에 뜨는 일이 없다.
// 2026-08-31 에 여기 다국어 metadata 를 붙였다가 **실측으로 걷어냈다**: 러시아어 설정으로
// /ru/education 을 열어 보니 영어 제목이 그대로였고, 정작 색인되는 화면은 app/education/page.jsx
// 였다. 번역 키(seo.patientEducation.*)는 그쪽으로 옮겼다.
// 「나중에 리다이렉트를 걷어낼지 모르니 남겨두자」는 명분이 아니다(CLAUDE.md: 죽은 코드는 삭제).
export default function PatientEducationPage() {
  redirect('/education');
}
