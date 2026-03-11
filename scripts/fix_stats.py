"""
이미 생성된 CSV 파일의 통계를 다시 계산하는 간단한 스크립트
Colab에서 이 코드만 복사해서 실행하세요!
"""

import pandas as pd

# 1. CSV 파일 읽기 (파일명은 본인이 생성한 것으로 변경)
csv_path = "evaluation_demo_2026-01-25T05-36-29.csv"  # ⚠️ 여기를 본인 파일명으로 변경!

# 2. CSV 읽기
df = pd.read_csv(csv_path)

# 3. boolean 변환 (문자열 'true'/'false' → True/False)
df["intent_match_baseline"] = df["intent_match_baseline"].apply(lambda x: x.lower() == "true" if isinstance(x, str) else bool(x))
df["intent_match_rag"] = df["intent_match_rag"].apply(lambda x: x.lower() == "true" if isinstance(x, str) else bool(x))
df["grounding_rag"] = df["grounding_rag"].apply(lambda x: x.lower() == "true" if isinstance(x, str) else bool(x))

# 4. 통계 출력
print("=" * 60)
print("📊 Evaluation Statistics")
print("=" * 60)
print(f"Total Inquiries: {len(df)}")
print(f"\nIntent Match (Baseline): {df['intent_match_baseline'].mean()*100:.1f}%")
print(f"Intent Match (RAG): {df['intent_match_rag'].mean()*100:.1f}%")
print(f"Grounding (RAG): {df['grounding_rag'].mean()*100:.1f}%")
print("=" * 60)

# 5. 샘플 데이터 확인
print("\n📋 Sample Results (first 3 rows):")
print(df[["inquiry", "language", "intent_match_baseline", "intent_match_rag", "grounding_rag"]].head(3))
