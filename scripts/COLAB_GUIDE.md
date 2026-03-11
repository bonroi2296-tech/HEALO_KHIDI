# Google Colab에서 Evaluation 실행 가이드

## 빠른 시작

### 1. Colab 노트북 열기

1. Google Colab 접속: https://colab.research.google.com/
2. 새 노트북 생성
3. 아래 단계를 따라 진행

### 2. 패키지 설치

```python
!pip install openai google-generativeai supabase pandas
```

### 3. 환경 변수 설정

```python
import os

# LLM Provider 선택
os.environ["LLM_PROVIDER"] = "openai"  # 또는 "google"

# API 키 설정
os.environ["OPENAI_API_KEY"] = "your_openai_api_key"
# 또는
os.environ["GOOGLE_GENERATIVE_AI_API_KEY"] = "your_google_api_key"

# Supabase 설정 (필수)
os.environ["SUPABASE_URL"] = "your_supabase_url"
os.environ["SUPABASE_SERVICE_KEY"] = "your_service_role_key"
```

### 4. 스크립트 실행

**방법 A: 파일 업로드**
1. `evaluation_colab.py` 파일을 Colab에 업로드
2. 실행:
```python
exec(open('evaluation_colab.py').read())
results, csv_path = main()
```

**방법 B: 코드 직접 붙여넣기**
1. `evaluation_colab.py`의 전체 코드를 복사
2. Colab 셀에 붙여넣고 실행

### 5. 결과 확인

```python
import pandas as pd

# CSV 읽기
df = pd.read_csv(csv_path)

# 샘플 확인
print(df.head())

# 통계
print(f"Intent Match (Baseline): {df['intent_match_baseline'].mean()*100:.1f}%")
print(f"Intent Match (RAG): {df['intent_match_rag'].mean()*100:.1f}%")
print(f"Grounding (RAG): {df['grounding_rag'].mean()*100:.1f}%")
```

### 6. 결과 다운로드

```python
from google.colab import files
files.download(csv_path)
```

## 주의사항

- **실행 시간**: 200개 문의 처리에 약 30분~1시간 소요
- **API 비용**: LLM API 호출 비용 발생 가능
- **RAG 데이터**: Supabase에 RAG 데이터가 적재되어 있어야 정확한 평가 가능
- **Rate Limiting**: API 호출 간 0.5초 대기 시간 포함

## 문제 해결

### Supabase 연결 오류
- `SUPABASE_URL`과 `SUPABASE_SERVICE_KEY` 확인
- Supabase 대시보드에서 Service Role Key 확인

### LLM API 오류
- API 키가 올바른지 확인
- Quota/Rate Limit 확인
- `LLM_PROVIDER` 설정 확인

### RAG 검색 결과 없음
- Supabase에 `rag_chunks`, `rag_documents` 테이블이 있는지 확인
- 데이터가 적재되어 있는지 확인
