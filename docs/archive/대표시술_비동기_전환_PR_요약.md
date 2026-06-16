# 대표 시술 자동 생성: 동기 → 비동기 전환 PR 요약

## 왜 Timeout이 사라지는가 (동기 → 비동기)

- **기존**: Preview API가 한 요청 안에서 크롤 + 페이지 랭킹 + 후보 추출 + (선택 시) LLM 호출까지 수행. 25초 라우트 타임아웃에 걸리거나 무한 로딩이 발생.
- **변경**: Preview를 **job 생성 + 폴링** 두 단계로 분리.
  - **POST /offers/preview**: DB에 `hospital_offer_jobs` 한 건 생성(또는 동일 병원의 기존 queued/running job 반환) 후 **즉시** `{ job_id, status }` 반환 (200~500ms 목표). 크롤/LLM 호출 없음.
  - **GET /offers/preview?job_id=xxx**: job 상태·진행률·결과만 조회 (폴링용).
- **Worker** (`POST /api/admin/offers-jobs/process`): 큐에서 job을 가져와 **백그라운드**에서 크롤 → 대표 페이지 선택 → chunk → 가격 힌트 → LLM 1회 배치 → 품질 필터 → `result_offers` 저장.
- 따라서 **요청 경로에서는 절대 오래 걸리는 작업을 하지 않아** 타임아웃과 무한 로딩이 사라짐.

## 대표성 점수화 로직

- **목적**: “대표 시술”은 **시술 소개·센터·클리닉·프로그램** 성격의 페이지에서만 뽑고, 비급여 테이블은 **가격 힌트**로만 사용.
- **구현**: `selectRepresentativePages.ts`에서 crawl.pages를 **규칙 기반 점수**로 정렬 후 상위 N개(기본 5)만 다음 단계로 전달.
  - **가산**: URL에 `/treatment`, `/clinic`, `/center`, `/program`, `/진료`, `/클리닉`, `/센터`, `/치료`, `/검사`, `/시술` 등 (+60)
  - **가산**: page_title / og_title / h1 / headings에 “센터|클리닉|치료|시술|검사|프로그램|도수|주사|면역|재활” (+40)
  - **감점**: URL에 login|member|privacy|terms|board|notice|faq|search|문의|예약|후기|블로그 (-80)
  - **감점**: “~입니다”, 물음표/말줄임, 슬로건(골든타임/72시간 등) 비율이 높은 페이지 (-60)
- 이렇게 선택된 페이지에서만 chunk를 만들고, LLM 1회 배치로 3~5개 시술 요약. 비급여 테이블은 `priceHints`로 이름→가격만 보강.

## 기타

- **품질 필터**: `offerQualityFilter.ts`에서 name_ko 규칙 reject/accept 적용 (슬로건·서술형 탈락).
- **다국어**: `treatment_translations` 테이블 추가. KO는 treatments에 canonical, EN/JA 등 번역은 별도 비동기 job으로 생성 가능.
- **디버깅**: job.debug에 selected_pages, chunks_count, total_chars, llm_model, llm_ms, llm_timeout, offers_count, dropped_by_rules_count, dropped_samples 저장. 프론트는 DEV에서만 Debug 토글 노출.
