# 🎯 가장 간단한 방법 (3단계)

## 방법 1: 이미 CSV 파일이 있는 경우 (가장 빠름!)

Colab에서 아래 코드만 복사해서 실행:

```python
import pandas as pd

# 파일명을 본인이 생성한 것으로 변경하세요!
df = pd.read_csv("evaluation_demo_2026-01-25T05-36-29.csv")

# boolean 변환
df["intent_match_baseline"] = df["intent_match_baseline"].apply(lambda x: x.lower() == "true" if isinstance(x, str) else bool(x))
df["intent_match_rag"] = df["intent_match_rag"].apply(lambda x: x.lower() == "true" if isinstance(x, str) else bool(x))
df["grounding_rag"] = df["grounding_rag"].apply(lambda x: x.lower() == "true" if isinstance(x, str) else bool(x))

# 통계 출력
print(f"Intent Match (Baseline): {df['intent_match_baseline'].mean()*100:.1f}%")
print(f"Intent Match (RAG): {df['intent_match_rag'].mean()*100:.1f}%")
print(f"Grounding (RAG): {df['grounding_rag'].mean()*100:.1f}%")
```

끝! 통계가 제대로 나옵니다.

---

## 방법 2: 처음부터 다시 실행 (수정된 버전)

1. `colab_complete_demo.py` **전체** 복사
2. Colab **새 셀**에 붙여넣기
3. ▶️ 실행

이제 통계가 제대로 나옵니다.

---

## 📊 결과 해석

- **Intent Match**: 문의 의도가 응답에 반영되었는지 비율
- **Grounding**: RAG 응답이 실제 컨텍스트를 참조했는지 비율
- **RAG가 Baseline보다 높으면** → RAG가 더 나은 것!
