# 하청업체 DPA 서명 가이드 (PO 액션 — 무료·온라인)

> 2026-06-29 · 컴플라이언스 점검(`COMPLIANCE_ASSESSMENT_HIPAA_GDPR.md`) 갭#1 닫기용.
> DPA(Data Processing Agreement, 데이터 처리계약) = "우리가 맡긴 환자정보를 너희도 안전하게·법대로 다뤄라"를 못박는 계약. GDPR Art.28·PIPA §26이 요구. **대부분 대시보드 클릭 또는 자동 적용 = 무료.**
> ⚠️ 정확한 메뉴 위치는 업체가 종종 바꾸니, 안 보이면 각사 대시보드에서 "DPA/Legal/Privacy/Compliance" 검색하거나 지원팀에 "Please share/sign your DPA" 요청.

## 왜 필요한가 (한 줄)
환자 의료정보가 거쳐가는 외부 서비스(클라우드·메일·영상·AI)와 DPA를 맺어야 "우리는 GDPR/PIPA대로 위탁한다"가 성립. 안 맺으면 점검 갭으로 남음.

## 업체별 처리법 (우리가 실제로 쓰는 6곳)

| # | 업체 | 역할 | 처리 방법 | 비고 |
|---|---|---|---|---|
| 1 | **Supabase** | DB·인증·스토리지(환자정보 본체) | ✅ **할 일 없음 — 서명 자체가 불필요하다(2026-09-04 화면 실측).** 대시보드 원문: *"DPA 는 이용약관에 포함되어 있어 모든 조직이 자동으로 보호를 받습니다. **별도 서명본은 필요 없습니다.**"* | 데이터는 서울 리전. 같은 화면에서 **TIA(국외이전 영향평가서)를 무료로 내려받을 수 있다** — 카자흐·러시아 환자 데이터 반출 근거라 우리에게 쓸모가 있다. SOC2·ISO 27001 은 **Team 플랜 이상만**(우리는 Pro 라 불가). HIPAA 는 Pro 에서도 «요청»은 되지만 승인 후 Team 승격이 조건. |
| 2 | **Google (Gemini API)** | AI 챗봇·번역 | Google Cloud/AI 사용 시 **Cloud Data Processing Addendum(CDPA)** 가 약관에 포함·자동 적용. 콘솔에서 동의 상태 확인. | "API는 입력을 학습에 미사용" 약관 함께 확인. |
| 3 | **Resend** | 알림 이메일 | 사이트/대시보드 Legal에서 **DPA 요청·서명**(보통 셀프서비스 폼 또는 support 요청). | |
| 4 | **LiveKit** | 원격협진 영상 | 지원팀/Legal에 **DPA 요청**(보통 요청 시 제공). | |
| 5 | **Vercel** | 웹 호스팅 | Vercel **DPA가 약관에 포함**(자동). 팀/엔터프라이즈는 별도 서명본 요청 가능. | |
| 6 | **(선택) Google OAuth·Analytics·Maps** | 인증·분석·지도 | Google 계정 약관/Analytics DPA에 포함. Analytics 쓰면 데이터처리 조건 동의 확인. | PII 최소(분석은 동의 기반). |

## 순서 (추천)
1. **Supabase 먼저** (환자정보 본체 — 영향 제일 큼).
2. Resend → LiveKit → Google(Gemini) → Vercel.
3. 각 단계에서 **서명본 PDF/확인 메일을 보관**(증빙). 폴더: 회사 문서함 「컴플라이언스/DPA」.
4. 끝나면 `docs/RECORDS_OF_PROCESSING.md`(RoPA) §9 "처리자 DPA 서명" 체크 + `COMPLIANCE_ASSESSMENT` 갭#1 닫힘 표시.

## 끝나면 말할 수 있는 것
"환자정보를 위탁하는 모든 외부 서비스와 데이터 처리계약(DPA)을 체결했고, 데이터는 한국(서울) 리전에 암호화 저장된다" — 계약서·대외 설명의 **신뢰 근거**가 완성됨.

> ⚠️ "HIPAA 인증"은 여전히 주장 금지. BAA(HIPAA용 계약)는 미국 의료 대상일 때만 의미 — 우리는 "GDPR/HIPAA 수준 안전조치 + 처리자 DPA"가 정확한 표현.
