# Evaluation Script

HEALO RAG 시스템의 성능 검증을 위한 평가 스크립트입니다.

## 사용법

### 1. 환경 변수 설정

`.env` 또는 `.env.local` 파일에 다음 변수를 설정하세요:

```bash
# LLM Provider (openai 또는 google)
LLM_PROVIDER=openai

# OpenAI API Key (LLM_PROVIDER=openai인 경우)
OPENAI_API_KEY=your_openai_api_key

# Google Generative AI API Key (LLM_PROVIDER=google인 경우)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 스크립트 실행

```bash
npm run eval
```

## 출력

- **CSV 파일**: `evaluation_results/evaluation_YYYY-MM-DDTHH-MM-SS.csv`
  - 각 문의에 대한 상세 결과 (baseline, RAG 응답, 평가 점수 등)
  
- **콘솔 통계**: 
  - Intent Match 비율 (Baseline vs RAG)
  - Grounding 비율 (RAG 응답이 컨텍스트를 참조했는지)

## 평가 지표

### Intent Match
문의의 의도가 응답에 올바르게 반영되었는지 평가합니다.
- 간단한 키워드 매칭 기반 (실제로는 더 정교한 방법 필요)

### Grounding
RAG 응답이 실제 RAG 컨텍스트를 참조했는지 평가합니다.
- 컨텍스트 키워드의 30% 이상이 응답에 포함되면 grounded로 간주

## 주의사항

- **실제 모델 학습은 포함하지 않습니다.** PoC용 평가 스크립트입니다.
- 200개 문의를 처리하므로 실행 시간이 오래 걸릴 수 있습니다 (약 30분~1시간).
- LLM API 호출 비용이 발생할 수 있습니다.
- Supabase에 RAG 데이터가 적재되어 있어야 정확한 평가가 가능합니다.
