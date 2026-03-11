# Colab에서 실행하는 방법 (단계별 가이드)

## 🎯 추천: 데모 모드 (API/DB 없음)

**API 키·Supabase·결제 없이** 그냥 돌리고 결과만 그럴듯하게 보려면 → **`colab_complete_demo.py`** 사용.

1. `colab_complete_demo.py` **전체** 복사
2. Colab **첫 셀**에 붙여넣기
3. ▶️ 실행

끝. DB 조회 없고, OpenAI/Google API 호출 없음. mock 응답으로 CSV + 통계만 냅니다.

---

## 🔧 실제 API/DB 쓸 때 (colab_complete.py)

### 1단계: Colab 노트북 열기
- https://colab.research.google.com/ 접속
- 새 노트북 생성

### 2단계: 코드 붙여넣기
1. `colab_complete.py` 파일을 열어서 **전체 내용을 복사**
2. Colab의 **첫 번째 셀**에 붙여넣기
3. **⚠️ 중요**: 환경 변수 부분(3번 섹션)에서 실제 API 키 입력:
   ```python
   os.environ["OPENAI_API_KEY"] = "sk-..."  # 실제 키로 변경
   os.environ["SUPABASE_URL"] = "https://..."  # 실제 URL로 변경
   os.environ["SUPABASE_SERVICE_KEY"] = "eyJ..."  # 실제 키로 변경
   ```

### 3단계: 실행
- 셀 왼쪽의 ▶️ 버튼 클릭 또는 `Shift + Enter`

### 4단계: 결과 확인
- 스크립트가 자동으로 실행되고 결과를 출력합니다
- CSV 파일이 생성되며, pandas로 분석 결과도 자동 출력됩니다

### 5단계: CSV 다운로드 (선택)
```python
from google.colab import files
files.download(csv_path)  # csv_path는 스크립트 실행 후 자동으로 생성됨
```

---

## 📋 파일 설명

| 파일 | 용도 |
|------|------|
| **`colab_complete_demo.py`** | **데모용 추천.** API/DB 없음. mock만 사용, 그럴듯한 CSV·통계 출력 |
| `colab_complete.py` | OpenAI/Supabase 연동 실제 평가 (API 키·DB 필요) |
| `evaluation_colab.py` | 원본 스크립트 (함수 정의만, 실행 코드 없음) |
| `colab_setup.ipynb` | 노트북 템플릿 (여러 셀로 나눠서 실행) |

---

## ⚠️ 주의사항

1. **API 키 입력 필수**: `colab_complete.py`의 3번 섹션에서 실제 키를 입력해야 합니다
2. **실행 시간**: 200개 문의 처리에 약 30분~1시간 소요
3. **API 비용**: LLM API 호출 비용 발생
4. **RAG 데이터**: Supabase에 RAG 데이터가 있어야 정확한 평가 가능

---

## 🔧 문제 해결

### "pandas not found" 에러
- 스크립트가 자동으로 설치하므로 문제 없어야 합니다
- 그래도 안 되면: `!pip install pandas` 실행

### "CSV file not found" 에러
- 스크립트가 완전히 실행되지 않았을 수 있습니다
- 다시 실행하거나, `csv_path` 변수를 확인하세요

### Supabase 연결 오류
- `SUPABASE_URL`과 `SUPABASE_SERVICE_KEY` 확인
- Supabase 대시보드 → Settings → API에서 Service Role Key 확인
