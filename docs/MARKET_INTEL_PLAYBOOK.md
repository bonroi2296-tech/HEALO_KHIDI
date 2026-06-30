# 시장 인텔리전스 수집 플레이북 (마케팅·운영용)

> **한 줄:** 공개 뉴스·커뮤니티에서 "한국 암치료 의료관광" 시장 신호를 자동 수집해 마케팅·운영 판단에 쓰는 도구. `npm run collect:intel` 한 줄이면 다국어 리포트 1장이 나온다.

PyTorch 포럼의 **Agent Reach**(AI가 SNS/웹을 읽게 해주는 도구) 발상을 우리 상황에 맞게 구현한 것. 환자 앱 기능이 아니라 **PO·마케팅이 돌리는 내부 운영 도구**.

---

## 1. 빠른 사용법

```bash
npm run collect:intel
```

- 결과물: `data/collected/intel/market-intel_<날짜>.md` (사람이 읽는 리포트) + `.json` (후속 가공용 원자료)
- `GOOGLE_GENERATIVE_AI_API_KEY` 가 있으면 맨 위에 **AI 마케팅 브리프**(핵심 동향·경쟁 신호·환자 관심사·우리 액션 아이디어)가 자동으로 붙는다. 없으면 수집 목록만(브리프는 스킵).
- 네트워크가 막힌 소스는 조용히 건너뛴다(전체 수집은 안 멈춤). 리포트 상단에 `응답 소스 N/M` 으로 가시화.

## 2. 무엇을 수집하나 (소스)

| 소스 | 내용 | 인증 |
|---|---|---|
| **Google News RSS** | 다국어(ru·kz·zh·en·ko) "한국 암치료/의료관광·경쟁국·KHIDI 정책" 뉴스 | 불필요(공개 RSS) |
| **Reddit 공개검색** | 영어권 환자·의료관광 커뮤니티(r/cancer·r/medicaltourism 등) | 불필요(공개 .json) |
| **추가 RSS 피드** | 경쟁사 블로그·유튜브 채널 등(운영자가 `config.intel.extraFeeds` 에 추가) | 불필요 |
| **범용 웹 리더** | 운영자가 지목한 URL 1건 본문 추출(`readUrl`, r.jina.ai) | 불필요 |

> ⚠️ 일부 소스는 데이터센터 IP(서버·CI)에서 차단될 수 있다(예: Reddit 403). 그럴 땐 PO 로컬 PC에서 돌리거나, 해당 소스는 스킵된 채 나머지로 리포트가 나온다.

## 3. 검색어·대상 바꾸기 (코드 수정 없이)

`scripts/data-collection/config.ts` 의 `intel` 블록만 손대면 된다 — 마케팅 담당이 직접 조정 가능:

- `topics[].queries` : 주제별 언어→검색어. 새 주제·언어 추가.
- `newsLangs` : 뉴스 수집 언어 목록.
- `subreddits` / `redditQuery` : 커뮤니티 대상.
- `extraFeeds` : `{ source, url }` 로 경쟁사 블로그·유튜브 채널 RSS 추가.
- `watchKeywords` : 브랜드·경쟁어(스니펫 매칭되면 리포트 「⭐ 주목 신호」 로 올라옴).

## 4. ⚠️ 수집 원칙 — 반드시 지킬 선 (의료 플랫폼 = 과장·PII 리스크)

> 의료 데이터·개인정보는 우리가 GDPR/PIPA 정렬 작업(처리방침·RoPA·제휴 DPA)을 하는 영역이다. 시장조사라도 아래를 어기면 법적·평판 리스크.

1. **공개 데이터만.** 공식 RSS·공개 API·리더로 접근. **로그인 뒤 콘텐츠·페이월·쿠키 스크래핑 금지**(플랫폼 ToS·법 위반).
2. **환자 개인식별정보(PII) 수집·저장 금지.** 뉴스·시장·경쟁·평판 *신호*만. 특정 환자의 건강글·신원을 타겟·축적하지 않는다(민감정보).
3. **과장 표현 차단 동일 적용.** AI 브리프도 근거 없는 수치·완치 단정 금지(환자에게 나가는 답변과 같은 톤 원칙).
4. **출처·날짜 보존.** 모든 항목에 원문 링크·발행일 — 2차 인용 시 추적 가능하게.
5. **생성물은 저장소에 커밋 안 함.** `data/collected/` 는 `.gitignore` — 수집 결과는 로컬/드라이브에만.

## 5. 구조 (개발자용)

기존 `scripts/data-collection/` 플러그형 패턴(`소스→수집기→변환→export`)에 얹음:

- `sources/google-news-rss.ts` · `sources/reddit-public.ts` · `sources/rss-feed.ts`(범용 RSS/Atom 파서, 무의존) · `sources/web-reader.ts`
- `collectors/market-intel-collector.ts` — 병렬 수집·URL 중복제거·키워드 태깅·최신순
- `transformers/summarize-intel.ts` — Gemini 마케팅 브리프(선택)
- `export/to-markdown.ts` — 리포트(.md) + 원자료(.json)
- CLI: `scripts/data-collection/index.ts intel` → `npm run collect:intel`

## 6. 다음 단계 아이디어 (선택)

- **CIS 전용 소스 보강**: Agent Reach·Google News는 VK·텔레그램·Odnoklassniki를 잘 못 본다. 핵심 타겟(러·카자흐)을 깊게 보려면 VK 공개 API·텔레그램 공개채널 RSS 등 별도 소스 추가.
- **중국(zh) 푸시 시**: 샤오홍슈(小红书)·웨이보 트렌드는 콘텐츠 마케팅에 강력 — 단 ToS·접근성 확인 필요.
- **정기 실행**: 주 1회 cron 으로 돌려 추세 비교(현재는 수동 1회성). `/trend` 스킬과 묶어도 됨.
- **브랜드 평판 알림**: `watchKeywords` 매칭이 뜨면 코디/PO에게 알림(현재는 리포트에 표시만).
