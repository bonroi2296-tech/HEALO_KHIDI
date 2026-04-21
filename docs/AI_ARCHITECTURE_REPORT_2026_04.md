# HEALO AI 아키텍처 리서치 보고서
**2026년 4월 기준 | Provider 비교 · 비용 시뮬레이션 · 의료 버티컬 분석**

---

## 1. Executive Summary

- **현재 스택(Gemini 2.5 Flash)은 레거시 전환 구간 진입.** 2.5 Flash의 무료 티어가 2026년 4월 1일 부로 종료됐고, 3세대(Gemini 3 Flash, $0.50/M)가 신규 기본 모델로 채택됨. 마이그레이션이 필요하다.
- **Claude Opus 4.7이 Chatbot Arena 1위 계열(Anthropic 상위권 독점).** 코딩·에이전틱 태스크에서 압도적이나, 한국어 의료 도메인 특화 벤치마크(KorMedMCQA)에서는 Claude Opus 4(구버전) 96.55%로 GPT-5.1(90.1%)·Gemini 2.5 Pro(90.8%)를 앞서 Anthropic이 한국어 의료에서도 유리함이 확인됨.
- **MedGemma 1.5 (오픈웨이트, 상업 사용 가능)는 온프레미스 옵션으로 실현 가능.** 27B 모델이 단일 GPU에서 실행되며, MedQA 87.7%(50B 이하 오픈 모델 1위). PIPA 데이터 로컬라이제이션 리스크를 회피할 수 있는 현실적 대안.
- **한국 PIPA 2026년 9월 개정 시행 예정 — AI 훈련 데이터의 서버 한국 내 보관 의무화(행정 지침 수준).** OpenAI·Anthropic·Google 모두 한국 내 데이터센터 BAA를 제공하지 않으므로, PHI(환자 개인정보) 처리 시 반드시 온프레미스 또는 한국 클라우드(NCP 등) 레이어를 검토해야 함.
- **권장 아키텍처(Phase 2):** 실시간 챗 → Gemini 3 Flash, 장문 분석 → Claude Sonnet 4.6, 의료 이미지/문서 → GPT-5.4 + MedGemma 1.5 병렬 검증, 임베딩 → Gemini Embedding 2 Preview 또는 text-embedding-005.

---

## 2. Provider별 스펙 비교표

### 2-A. OpenAI (2026년 4월 기준)

| 모델 | 출시 | 컨텍스트 | 최대 출력 | Input $/1M | Output $/1M | 멀티모달 | 비고 |
|---|---|---|---|---|---|---|---|
| GPT-5.4 | 2026-03-05 | 270K | 128K | $2.50 | $15.00 | 텍스트·이미지·오디오 | 캐시 $0.25 (90% 할인) |
| GPT-5.4 mini | 2026-03-17 | 270K | 128K | $0.75 | $4.50 | 텍스트·이미지 | - |
| GPT-5.4 nano | 2026-03-17 | 270K | 128K | $0.20 | $1.25 | 텍스트 | 고볼륨 배치용 |
| o3 | 2026 초 | 200K | 100K | $2.00 | $8.00 | 텍스트·이미지 | 복잡 추론 특화 |
| o4-mini | 2026 초 | 200K | 100K | $1.10 | $4.40 | 텍스트·이미지 | o3-mini 대체, 코스트 최적 추론 |
| GPT-4o | 2024-05-13 | 128K | 16K | $2.50 | $10.00 | 텍스트·이미지·오디오 | 레거시 |

**HIPAA:** API에서 BAA 체결 가능 (baa@openai.com). Zero data retention 필수. ChatGPT UI는 비해당.
**데이터 잔류:** 한국 내 서버 미제공. Enterprise API는 미국/EU 데이터 잔류 옵션.

> 출처: [OpenAI API Pricing](https://openai.com/api/pricing/), [AI Pricing Guru OpenAI](https://www.aipricing.guru/openai-pricing/), [o4-mini guide](https://tokenmix.ai/blog/openai-o4-mini-o3-pro)

---

### 2-B. Anthropic (2026년 4월 기준)

| 모델 | 출시 | 컨텍스트 | 최대 출력 | Input $/1M | Output $/1M | 특수 기능 |
|---|---|---|---|---|---|---|
| Claude Opus 4.7 | 2026-04-16 | 1M 토큰 | 128K | $5.00 | $25.00 | Adaptive Thinking, 고해상도 비전 (3.75MP), 새 토크나이저 |
| Claude Sonnet 4.6 | 2025 하반기 | 1M 토큰 | 64K (Batch 300K) | $3.00 | $15.00 | Extended Thinking, Adaptive Thinking |
| Claude Haiku 4.5 | 2025-10-01 | 200K | 64K | $1.00 | $5.00 | 최고속, Extended Thinking |

**공통 할인:**
- 프롬프트 캐싱: 최대 90% 절감 (캐시 히트 $0.30/1M for Sonnet 4.6)
- Batch API: 50% 할인 (24시간 이내 처리)

**HIPAA:** Enterprise 플랜에서 PHI 처리 BAA 제공.
**LMSys Chatbot Arena (2026-04-06):** Claude Opus 4.6 Thinking 1위(1504), Opus 4.6 2위(1500). Opus 4.7은 출시 직후라 미등재.
**코딩 리더보드:** Claude Opus 4.6(1549) · Sonnet 4.6(1523) 등 Anthropic이 1~4위 독식.

> 출처: [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview), [Claude Opus 4.7 Review](https://www.buildfastwithai.com/blogs/claude-opus-4-7-review-benchmarks-2026), [Chatbot Arena April 2026](https://aidevdayindia.org/blogs/lmsys-chatbot-arena-current-rankings/lmsys-chatbot-arena-leaderboard-current-top-models.html)

---

### 2-C. Google Gemini (2026년 4월 기준)

| 모델 | 컨텍스트 | Input $/1M | Output $/1M | 무료 티어 | 멀티모달 |
|---|---|---|---|---|---|
| Gemini 3.1 Pro | 2M 토큰 | $2.00 (≤200K) / $4.00 (>200K) | $12.00 / $18.00 | 없음 (2026-04-01 종료) | 텍스트·이미지·영상·오디오 |
| Gemini 3 Pro | 2M (추정) | $2.00 | $12.00 | 없음 | 텍스트·이미지 |
| Gemini 3 Flash | - | $0.50 | $3.00 | 있음 (축소) | 텍스트·이미지 |
| Gemini 3.1 Flash-Lite | - | $0.25 | $1.50 | 있음 (축소) | 텍스트·이미지 |
| Gemini 2.5 Pro (레거시) | 2M | $1.25 | $10.00 | 없음 | 텍스트·이미지 |
| Gemini 2.5 Flash (레거시) | 1M | $0.30 | $2.50 | 없음 | 텍스트·이미지 |
| Gemini Embedding 2 Preview | - | $0.20 | - | - | 텍스트·이미지·영상·오디오 통합 임베딩 |
| text-embedding-005 | - | $0.006 | - | - | 텍스트 전용 (저가) |

**주요 변경 (2026-04-01):** Pro 계열 모든 모델 유료 전환. text-embedding-004는 2026-01-14 deprecate.
**HIPAA:** Google Cloud / Workspace Enterprise + BAA 체결 시 가능. 소비자 계정 불가.
**데이터 잔류:** 미국 또는 EU 선택 가능. 한국 내 리전 없음.
**LMSys Arena:** Gemini 3.1 Pro Preview 3위(1493), Gemini 3-Pro 5위(1486), Gemini 3-Flash 9위(1474).

> 출처: [AI Pricing Guru Google](https://www.aipricing.guru/google-ai-pricing/), [Gemini 3 Flash Blog](https://blog.google/products-and-platforms/products/gemini/gemini-3-flash/), [VentureBeat Gemini 3.1 Flash Lite](https://venturebeat.com/technology/google-releases-gemini-3-1-flash-lite-at-1-8th-the-cost-of-pro/), [Gemini Embedding 2 Pricing](https://tokencost.app/blog/gemini-embedding-2-pricing)

---

### 2-D. 한국 로컬 / 특화 모델

| 모델 | 개발사 | 파라미터 | 한국어 | Input $/1M | 비고 |
|---|---|---|---|---|---|
| Solar Pro 3 | Upstage | - | 우수 | $0.15 | Output $0.60. 2026-03 업데이트. 에이전틱 2× 향상 |
| HyperCLOVA X | Naver | - | 최상 | 비공개 | Clova X 서비스 2026-04-09 종료. B2B API는 CLOVA Studio |
| ALLM.H | Acryl | 31B | 최상 | 비공개 | Gemma 4 기반 파인튜닝. KorMedMCQA 96.78% (1위) |
| HARI | 서울대병원 | - | 최상 | 비공개 (내부) | KMLE 86.2%. 연구 단계 |

> 출처: [Seoulz Korean Medical AI](https://www.seoulz.com/korean-medical-ai-how-a-local-model-beat-gpt-5-1/), [Solar Pro 3 OpenRouter](https://openrouter.ai/upstage/solar-pro-3), [Naver Clova X 종료](https://en.sedaily.com/finance/2026/04/09/naver-shuts-down-clova-x-accelerates-ai-service-integration)

---

## 3. 태스크별 추천 매트릭스

| 태스크 | 현재 | 추천 | 근거 |
|---|---|---|---|
| 러시아·카자흐 의료 번역 | 미정 | **Claude Sonnet 4.6** | Anthropic 다국어 강점, 1M 컨텍스트로 긴 의료 문서 일괄 처리. 가격·속도 균형 |
| 환자 AI 챗봇 (실시간, 6개국어) | Gemini 2.5 Flash | **Gemini 3 Flash** | 직접 후속 모델($0.50/M), 무료 티어 유지, 멀티모달, 낮은 레이턴시 |
| 긴 EMR 문서 분석 (50K+ 토큰) | 미정 | **Claude Sonnet 4.6** | 1M 컨텍스트, Batch API 50% 할인($1.50/M), Extended Thinking |
| X-ray·처방전 이미지 분석 | 미정 | **GPT-5.4 + MedGemma 1.5 병렬** | GPT-5는 일반 영상 이해 강점. MedGemma 1.5는 의료 특화·무료 오픈웨이트로 검증 보조 |
| 의료 용어 표준화 (ICD-10 매핑) | 미정 | **Claude Haiku 4.5** | 고볼륨·짧은 입력 최적($1/M), 구조화 출력, 빠른 레이턴시 |
| 코드 생성·리팩터링 (개발 생산성) | Claude | **Claude Sonnet 4.6 / Opus 4.7** | 코딩 리더보드 압도적 1~4위 Anthropic. Sonnet 4.6이 비용 대비 최적 |
| 마케팅 카피 (다국어) | 미정 | **Claude Sonnet 4.6** | 창의적 글쓰기 + 6개국어 자연스러운 어조 |
| RAG (병원·치료법 DB 검색) | Gemini Embedding | **Gemini Embedding 2 Preview** | text-embedding-004 deprecate → Gemini Embedding 2가 후속 (멀티모달, $0.20/M). text-embedding-005($0.006/M)는 텍스트 전용 저가 대안 |

---

## 4. 비용 시뮬레이션 4개 안 비교

### 가정값
- 월 활성 환자: 100명
- 챗 사용량: 100명 × 20회 = 2,000회 / 평균 500 input + 300 output 토큰
  - 월 Input: 1,000,000 토큰 (1M)
  - 월 Output: 600,000 토큰 (0.6M)
- 장문 분석: 월 10건 / 평균 50K input + 5K output
  - 월 Input: 500,000 토큰 (0.5M)
  - 월 Output: 50,000 토큰 (0.05M)
- 이미지 분석: 월 50건 (이미지 토큰 = 텍스트 환산 약 1K input / 건)
  - 월 Input: 50,000 토큰 (0.05M)
  - 월 Output: 50,000 토큰 (0.05M)

---

### 안 A: 올 Gemini 3.1 Pro

| 용도 | 모델 | Input 토큰(M) | Output 토큰(M) | 비용 |
|---|---|---|---|---|
| 챗봇 | Gemini 3.1 Pro | 1.0 | 0.6 | $1.0×2 + $0.6×12 = **$9.20** |
| 장문 분석 | Gemini 3.1 Pro | 0.5 | 0.05 | $0.5×2 + $0.05×12 = **$1.60** |
| 이미지 분석 | Gemini 3.1 Pro | 0.05 | 0.05 | $0.05×2 + $0.05×12 = **$0.70** |
| **월 합계** | | | | **≈ $11.50** |

> 챗봇에 Pro를 쓰는 것은 과사양. 레이턴시 불리 우려.

---

### 안 B: Gemini Flash(챗) + Pro(장문) + MedGemma(의료)

| 용도 | 모델 | 단가 | 비용 |
|---|---|---|---|
| 챗봇 | Gemini 3 Flash | $0.50/$3.00 | $1.0×0.5 + $0.6×3.0 = **$2.30** |
| 장문 분석 | Gemini 3.1 Pro | $2.00/$12.00 | $0.5×2.0 + $0.05×12.0 = **$1.60** |
| 이미지 분석 | MedGemma 1.5 27B (온프레미스) | GPU 서버 비용 | GPU 임대 기준 ~$50/mo (단일 GPU) |
| **월 합계** | | | **≈ $53.90** (GPU 포함) |

> GPU 고정비가 있으나 이미지 분석 볼륨이 커질수록 유리. 단, 한국어 성능 검증 필요.

---

### 안 C: Claude Haiku(챗) + Opus(장문) + GPT-5.4(이미지)

| 용도 | 모델 | 단가 | 비용 |
|---|---|---|---|
| 챗봇 | Claude Haiku 4.5 | $1.00/$5.00 | $1.0×1.0 + $0.6×5.0 = **$4.00** |
| 장문 분석 | Claude Opus 4.7 | $5.00/$25.00 | $0.5×5.0 + $0.05×25.0 = **$3.75** |
| 이미지 분석 | GPT-5.4 | $2.50/$15.00 | $0.05×2.5 + $0.05×15.0 = **$0.88** |
| **월 합계** | | | **≈ $8.63** |

> 순수 API 비용 최저. 단, 3개 Provider 관리 복잡도 증가.

---

### 안 D: 하이브리드 최적 (HEALO 권장)

| 용도 | 모델 | 단가 | 비용 |
|---|---|---|---|
| 챗봇 | Gemini 3 Flash | $0.50/$3.00 | **$2.30** |
| 장문 분석 (Batch) | Claude Sonnet 4.6 (Batch 50%) | $1.50/$7.50 | $0.5×1.5 + $0.05×7.5 = **$1.13** |
| 이미지 분석 | GPT-5.4 mini | $0.75/$4.50 | $0.05×0.75 + $0.05×4.50 = **$0.26** |
| ICD 매핑/표준화 | Claude Haiku 4.5 (Batch) | $0.50/$2.50 | 소량, **≈ $0.10** |
| 임베딩 (RAG) | text-embedding-005 | $0.006/M | 월 5M 토큰 가정 **$0.03** |
| **월 합계** | | | **≈ $3.82** |

> 가장 저렴하며 각 태스크 최적화. 캐싱·배치 할인 최대 활용 시 추가 30~50% 절감 가능.

**비용 비교 요약:**

| 안 | 월 API 비용 | 복잡도 | 권장 여부 |
|---|---|---|---|
| A: 올 Gemini 3.1 Pro | ~$11.50 | 낮음 | 비추 (과사양) |
| B: Gemini + MedGemma | ~$53.90 | 중간 | 중장기 검토 |
| C: Claude + GPT | ~$8.63 | 높음 | 현실적 대안 |
| D: 하이브리드 최적 | ~$3.82 | 높음 | **Phase 2 권장** |

> 현재 월 100명 기준 어떤 안이든 비용 부담은 미미함. 스케일(1,000명+) 시 안 D 구조가 결정적으로 유리.

---

## 5. MedGemma · Vertical Medical AI

### MedGemma (Google)

| 버전 | 크기 | 모달리티 | 성능 | 라이선스 |
|---|---|---|---|---|
| MedGemma 1 (27B, 텍스트) | 27B | 텍스트 | MedQA 87.7% (50B↓ SOTA) | 상업 사용 가능 (오픈웨이트) |
| MedGemma 1 (27B, 멀티모달) | 27B | 텍스트+이미지 | EHR 종단 분석 | 상업 사용 가능 |
| MedGemma 1 (4B, 멀티모달) | 4B | 텍스트+이미지 | 모바일/엣지 가능 | 상업 사용 가능 |
| MedGemma 1.5 (4B, 멀티모달) | 4B | 텍스트+이미지 | 의료 영상 2세대 | 상업 사용 가능 (2026-01-13 업데이트) |

**주요 특징:**
- 단일 GPU에서 구동 (27B 기준 A100 80GB 1장)
- Hugging Face / GitHub 공개 다운로드
- Gemma 4 기반 (Apache 2.0 라이선스 계승)
- MedASR (의료 음성→텍스트) 함께 제공
- **한국어 지원:** Gemma 4 기반이나 한국어 의료 파인튜닝 데이터 없음. 범용 한국어는 가능하나 KorMedMCQA에서 독립 테스트 결과 미확인.

**HEALO 유스케이스:**
1. **처방전·진단서 OCR 후 의료 용어 표준화** — 27B 멀티모달로 이미지 인식 + ICD-10 매핑 로컬 처리
2. **환자 교육 콘텐츠 생성 검수** — 의료 정확도 검증 레이어로 Sonnet 4.6 출력을 MedGemma가 교차 검증
3. **온프레미스 배포 → PIPA 대응** — 환자 PHI가 외부 API에 전송되지 않는 아키텍처 구현 가능

### Med-PaLM 2 / 3 현황

- **Med-PaLM 3:** 확인 불가. 2024년 Google Cloud 파트너 프리뷰 이후 공개 업데이트 없음. MedGemma 라인으로 사실상 흡수된 것으로 판단.

### Anthropic / OpenAI 의료 특화 모델

- **Anthropic:** 의료 특화 모델 없음. Claude 계열의 범용 성능 + HIPAA Enterprise 플랜으로 의료 활용. KorMedMCQA에서 Claude Opus 4(96.55%)가 글로벌 모델 중 사실상 1위.
- **OpenAI:** "OpenAI for Healthcare" (2026-01 출시)는 GPT-5.4 기반 Enterprise 래퍼. 의료 특화 파인튜닝이 아닌 거버넌스/보안 레이어 추가.

> 출처: [MedGemma Google Research](https://research.google/blog/medgemma-our-most-capable-open-models-for-health-ai-development/), [MedGemma 1.5 업데이트](https://research.google/blog/next-generation-medical-image-interpretation-with-medgemma-15-and-medical-speech-to-text-with-medasr/), [MedGemma HuggingFace](https://huggingface.co/google/medgemma-27b-it)

---

## 6. 한국 특화: PIPA · 국내 AI

### PIPA 2026 개정 핵심 사항

1. **AI Framework Act 2026-01-22 시행:** 고영향·생성형 AI 서비스 제공자에 안전성·투명성 의무 부과.
2. **PIPA 개정 2026-03-10 (시행 2026-09-11):** AI 훈련 목적의 개인정보 재사용 허용 (익명화 없이 가능) — 단, 서버는 국내 민간 클라우드에 위치해야 함.
3. **데이터 로컬라이제이션 실무 영향:** OpenAI, Anthropic, Google 모두 한국 내 데이터센터 없음. 환자 PHI를 이들 API에 직접 전송 시 규정 위반 리스크 있음. NCP(Naver Cloud Platform) 또는 KT Cloud + Ollama/온프레미스 MedGemma 조합이 컴플라이언스 경로.

> 출처: [Chambers PIPA 2026](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/south-korea/trends-and-developments), [ITIF 데이터 로컬라이제이션](https://itif.org/publications/2026/03/18/why-korea-should-rethink-data-localization-become-powerhouse/)

### 한국어 의료 성능 벤치마크 (KorMedMCQA Doctor, 435문항, KMLE 2022~2024)

| 모델 | 정확도 | 출처 |
|---|---|---|
| ALLM.H (Acryl, 한국 스타트업) | **96.78%** | Seoulz 2026 |
| Claude Opus 4 | **96.55%** | Seoulz 2026 |
| HARI (서울대병원) | 89.2% | Seoulz 2026 |
| Gemini 2.5 Pro | 90.8% | Seoulz 2026 |
| GPT-5.1 | 90.11% | Seoulz 2026 |
| 의사 평균 | 79.7% | SNUH |

> ALLM.H는 비공개 API (상업화 진행 중). HEALO 파트너십 가능성 있음. Solar Pro 3는 KorMedMCQA 특화 수치 미공개.

### 국내 AI 포함 여부 판단

- **Solar Pro 3 (Upstage):** API 공개, $0.15/M 저렴. 한국어 강점. 의료 도메인 추가 검증 필요하나 비용 절감 대안으로 실용적. **ICD 매핑 / 소량 한국어 처리에 보조 활용 권장.**
- **HyperCLOVA X (Naver):** Clova X 서비스 2026-04-09 종료. B2B API (CLOVA Studio) 잔존하나 가격 비공개, 모델 스펙 불투명. 현 시점 **채택 보류.**
- **ALLM.H (Acryl):** KorMedMCQA 1위. 상업화 단계로 API 미공개. 향후 파트너십 협의 가치 있음.

---

## 7. HEALO 권장 아키텍처 (단계별 로드맵)

### Phase 1 — 현재 (즉시 실행)

```
현재 스택: Gemini 2.5 Flash (AI SDK)
           ↓
문제: 무료 티어 종료, 레거시 전환 구간
           ↓
즉시 조치: Gemini 3 Flash 마이그레이션
```

**변경 범위:** `@ai-sdk/google` 모델 ID를 `gemini-2.5-flash` → `gemini-3-flash`로 업데이트. API 비용 $0.30/M → $0.50/M 소폭 증가하나 성능 향상.

---

### Phase 2 — 베타 (2026 Q2~Q3)

```
[환자 챗봇] Gemini 3 Flash ($0.50/M)
      |
[의도 감지 → 분기]
      |
[장문 EMR 분석] Claude Sonnet 4.6 Batch ($1.50/M)
      |
[의료 이미지 (X-ray, 처방전)] GPT-5.4 mini ($0.75/M)
      |                            + MedGemma 1.5 27B 로컬 (교차 검증)
[ICD 매핑 / 용어 표준화] Claude Haiku 4.5 ($1.00/M)
      |
[RAG 임베딩] text-embedding-005 ($0.006/M)
```

**인프라:** PHI 처리 레이어는 NCP(Naver Cloud Platform) 한국 리전 래퍼 + MedGemma 온프레미스. 비-PHI 요청은 외부 API 직접 전송.

---

### Phase 3 — 스케일 (2026 Q4+, 환자 1,000명+)

```
[Streaming Chat] Gemini 3 Flash (저레이턴시 유지)
[Deep Analysis] Claude Opus 4.7 (복잡한 케이스)
[Medical Imaging] MedGemma 1.5 27B (온프레미스 전용)
[Korean Medical QA] ALLM.H API (파트너십 체결 시)
[Embedding] Gemini Embedding 2 (멀티모달 RAG)
[Compliance Layer] NCP + 자체 PII 마스킹 미들웨어
```

---

## 8. 실행 권고

### 지금 당장 (이번 주)

| 항목 | 조치 |
|---|---|
| Gemini 2.5 Flash → 3 Flash | `@ai-sdk/google` 모델 ID 변경. 빌드 테스트 필요 |
| text-embedding-004 deprecate 확인 | RAG 파이프라인에서 text-embedding-005 또는 Gemini Embedding 2로 교체 |
| Anthropic API 키 발급 | Claude Sonnet 4.6을 EMR 분석용으로 병렬 테스트 시작 |

### 보류 (검토 후 결정)

| 항목 | 이유 |
|---|---|
| MedGemma 온프레미스 배포 | GPU 비용($50+/월) 정당화할 이미지 볼륨 확보 후 진행 |
| o3 / o4-mini 추론 모델 | 의료 진단 추론은 가능성 있으나 레이턴시 불리. 배치 분석에만 적용 고려 |
| ALLM.H 파트너십 | 상업 API 출시 확인 후 |
| Solar Pro 3 | 한국어 특화 소량 태스크에 비용 절감용. A/B 테스트 후 결정 |

### 리스크

| 리스크 | 등급 | 대응 |
|---|---|---|
| PIPA 2026-09 시행 시 PHI 전송 위반 | **HIGH** | NCP + MedGemma 온프레미스 레이어 선제 구축 |
| Gemini 3 Flash 성능 회귀 | MEDIUM | A/B 테스트 2주 후 전환 결정 |
| 단일 Provider 의존 | MEDIUM | SDK 추상화 레이어 유지 (ai-sdk 멀티 프로바이더) |
| LMSys Arena에 Opus 4.7 미등재 | LOW | 출시 직후라 데이터 부족. 2026-05 Arena 업데이트 후 재평가 |

---

## 참고 출처 (Primary Sources)

| Provider | 문서 |
|---|---|
| OpenAI 가격 | https://openai.com/api/pricing/ |
| OpenAI 가격 분석 | https://www.aipricing.guru/openai-pricing/ |
| Anthropic 모델 공식 | https://platform.claude.com/docs/en/about-claude/models/overview |
| Anthropic 가격 | https://platform.claude.com/docs/en/about-claude/pricing |
| Google Gemini 가격 분석 | https://www.aipricing.guru/google-ai-pricing/ |
| Gemini 3 Flash 발표 | https://blog.google/products-and-platforms/products/gemini/gemini-3-flash/ |
| Gemini 3.1 Flash Lite | https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/ |
| MedGemma Google Research | https://research.google/blog/medgemma-our-most-capable-open-models-for-health-ai-development/ |
| MedGemma 1.5 업데이트 | https://research.google/blog/next-generation-medical-image-interpretation-with-medgemma-15-and-medical-speech-to-text-with-medasr/ |
| MedGemma HuggingFace | https://huggingface.co/google/medgemma-27b-it |
| LMSys Chatbot Arena Apr 2026 | https://aidevdayindia.org/blogs/lmsys-chatbot-arena-current-rankings/lmsys-chatbot-arena-leaderboard-current-top-models.html |
| Korean Medical AI Benchmark | https://www.seoulz.com/korean-medical-ai-how-a-local-model-beat-gpt-5-1/ |
| PIPA 2026 개정 | https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/south-korea/trends-and-developments |
| Korea 데이터 로컬라이제이션 | https://itif.org/publications/2026/03/18/why-korea-should-rethink-data-localization-become-powerpower/ |
| Solar Pro 3 가격 | https://openrouter.ai/upstage/solar-pro-3 |
| Naver Clova X 종료 | https://en.sedaily.com/finance/2026/04/09/naver-shuts-down-clova-x-accelerates-ai-service-integration |
| Gemini Embedding 2 가격 | https://tokencost.app/blog/gemini-embedding-2-pricing |
| OpenAI HIPAA BAA | https://help.openai.com/en/articles/8660679-how-can-i-get-a-business-associate-agreement-baa-with-openai |
| Google Gemini HIPAA | https://www.paubox.com/blog/is-googles-ai-gemini-hipaa-compliant |
| Anthropic HIPAA | https://www.buildfastwithai.com/blogs/claude-opus-4-7-review-benchmarks-2026 |

---

*작성일: 2026-04-21 | 작성자: Claude Agent (자동 리서치 기반)*
*데이터 수집 기준: 2026년 4월 공식 문서 및 독립 벤치마크. 가격은 변경될 수 있으므로 운영 환경 적용 전 공식 페이지 재확인 권장.*
