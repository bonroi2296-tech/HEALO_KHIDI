# 다국어 준비 점검 (SSOT/설계 문서)

목적: 현재는 영어만 유지하되, 향후 다국어 확장 시 깨지지 않도록 **변경 지점**과 **우선순위**를 문서로 정리한다.  
범위: 코드 변경 없음 (점검 문서만).

## 1) 지금 문제되는 핵심 포인트 (쉬운 설명)
- 서버는 항상 영어로 렌더링하는데, 브라우저는 쿠키를 보고 다른 언어를 표시하려고 해서 **화면이 깨질 수 있음**.
- 글자가 여러 파일에 흩어져 있어서, **나중에 언어 추가하려면 수십 군데를 수정해야 함**.
- 가격/날짜가 항상 미국식으로 표시되어, **다른 언어에 맞게 바꾸기 어려움**.

## 2) 다국어 확장 시 반드시 손봐야 하는 파일 (핵심)
1. 언어 감지/쿠키
   - `src/components.jsx`
   - `src/lib/language.js`

2. 하드코딩된 영문 UI
   - `src/components.jsx` (헤더/버튼/문구)
   - `src/lib/siteSettings.js` (푸터/회사 정보)
   - `src/lib/mapper.js` (가격/문구)
   - `app/layout.jsx` (메타데이터/HTML lang)

3. 숫자/가격/날짜 포맷
   - `src/lib/mapper.js`
   - `src/legacy-pages/TreatmentDetailPage.jsx`
   - `src/legacy-pages/admin/AnalyticsTab.jsx`

## 3) 향후 다국어를 위한 최소 설계 (권장)
1. 언어 코드를 통일
   - 현재: `ENG`, `KOR`, `CHN`, `JPN`
   - 권장: `en`, `ko`, `zh`, `ja`

2. 문자열을 한 곳에 모으기
   - 예: `src/lib/i18n/en.json`, `ko.json`, `zh.json`, `ja.json`
   - 모든 화면 문구는 키로 접근 (예: `t('header.login')`)

3. 서버에서도 언어를 알 수 있게 만들기
   - Next.js `cookies()`로 서버에서 언어 쿠키 읽기
   - `app/layout.jsx`에서 `<html lang="...">` 동적으로 적용

4. 포맷 유틸 만들기
   - `formatPrice(amount, locale)`
   - `formatDate(date, locale)`

## 4) 단계별 진행 순서 (현실적인 순서)
1. **기초 설계만 추가** (문자열 파일 + 유틸 + 서버 쿠키 읽기)
2. **헤더/푸터/CTA부터 교체**
3. **나머지 페이지 순차 교체**

## 5) 결론 (한 줄 요약)
지금은 영어만 유지하되, **문구/언어 감지/포맷을 한 곳으로 모을 준비**가 필요하다. 이 준비만 해두면 다국어 추가 비용이 크게 줄어든다.
