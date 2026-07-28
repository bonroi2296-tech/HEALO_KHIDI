# AEO 가시성 기록 — "AI 가 우리를 인용하나"

> `node scripts/aeo-visibility.mjs` 를 돌리면 아래에 날짜별로 쌓인다.
> **한 번의 숫자로 단정하지 마라** — 검색 근거는 질문·시점·지역에 따라 흔들린다. 추세로 봐라.
> 챗GPT·퍼플렉시티는 자동 측정 대상이 아니다(유료 키 필요). 사람이 물어본 결과는 해당 날짜 절에 손으로 덧붙일 것.

## 2026-07-28 — 인용 0/9 · 본문 언급만 0/9

- 엔진: Google (Gemini `gemini-flash-latest` + Google Search 근거). **챗GPT·퍼플렉시티는 미포함**(유료 키 없음 — 사람이 직접 물어 아래에 손으로 추가할 것).
- 경쟁사 인용 횟수: bookimed.com 1 · medigence.com 1

| 질문 | 언어 | 우리 인용 | 본문 언급 | 인용된 경쟁사 | 주요 출처 |
|---|---|---|---|---|---|
| ru-where | ru | ✗ | ✗ | - |  |
| ru-cost | ru | ✗ | ✗ | bookimed.com, medigence.com | bookimed.com, medigence.com, health-travel.kz, carepioneerstour.com, medmost.org, icloudhospital.com |
| ru-remote | ru | ✗ | ✗ | - |  |
| ru-visa | ru | ✗ | ✗ | - | visitkorea.or.kr, med-union.info, medicalavenuekorea.com, medmost.org, doctorpusan.com, dsmc.or.kr |
| kz-where | kk | ✗ | ✗ | - |  |
| kz-help | kk | ✗ | ✗ | - | visitkorea.or.kr, medicalavenuekorea.com, medictel.org, health-travel.kz, kazmedikor.com, medicaltravelkorea.com |
| en-agency | en | ✗ | ✗ | - | prnewswire.com, wikipedia.org, gangnam.go.kr, ajupress.com, visitkorea.or.kr, medicalavenuekorea.com |
| en-second | en | ✗ | ✗ | - | amc.seoul.kr, mk.co.kr, cmcseoul.or.kr, samsunghospital.com, ncc.re.kr, acibademinternational.com |
| ko-agency | ko | ✗ | ✗ | - | mohw.go.kr, seoul.go.kr, gangseo.seoul.kr, gov.kr, severance.healthcare, snuh.org |

### 사람이 직접 물어본 결과 (자동 측정 밖)

- **탐지기 동작 확인(negative control)**: 「What is healwith.co.kr?」처럼 **이름을 대고** 물으면 Gemini 가
  `healwith.co.kr` 을 근거로 인용하고 설명도 정확하다("AI-powered medical concierge service for
  international patients seeking healthcare in South Korea"). → **위의 0/9 는 탐지기 고장이 아니라 진짜 값이다.**
- 즉 현재 상태 = **브랜드를 아는 사람에겐 보이지만, 브랜드를 모르는 사람의 질문에는 안 나온다.**
  AEO 의 목적이 정확히 후자라서, 이게 지금의 출발선이다.
- 챗GPT·퍼플렉시티: 미측정(유료 키 없음).

### 이 기준선에서 읽어낸 것 (2026-07-28)

**우리 자리를 차지하고 있는 건 경쟁 에이전시가 아니라 «공공·언론»이다.** 인용된 출처를 보면:

- `visitkorea.or.kr`(한국관광공사 의료관광) — 러시아어·카자흐어 질문 양쪽에 등장
- `mohw.go.kr`·`gov.kr`·`seoul.go.kr`·`gangnam.go.kr` — 정부/지자체
- `wikipedia.org`·`prnewswire.com`·`ajupress.com`·`mk.co.kr` — 백과사전·보도자료·언론
- 병원 자체 사이트 — `amc.seoul.kr`(서울아산)·`samsunghospital.com`·`cmcseoul.or.kr`·`ncc.re.kr`(국립암센터)·`severance.healthcare`
- 에이전시는 `bookimed.com`·`medigence.com` 이 **비용 질문에서만** 등장

**시사점 — AEO 는 내 사이트만 고쳐선 안 된다.** 답변엔진은 «공적으로 확인 가능한 출처»를 선호한다.
우리는 **보건복지부 등록 외국인환자 유치업체(A-2026-01-02-06761)** 이므로 공공 목록에 실릴 자격이 있고,
특히 `visitkorea.or.kr` 계열(메디컬코리아)은 **KHIDI(진흥원)가 운영 주체**라 중간평가 활동과도 겹친다.

**변동성 주의**: 같은 날 두 번 돌렸는데 경쟁사 인용 수가 3→1 로 바뀌었다(질문·시점에 따라 흔들림).
**단발 숫자로 판단하지 말고 여러 회차의 추세로 봐라.**
