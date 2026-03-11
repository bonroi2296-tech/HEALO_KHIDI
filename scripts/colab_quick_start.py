"""
Colab 빠른 시작 스크립트
이 파일을 Colab에 복사해서 사용하세요.
"""

# ============================================================================
# 1. 패키지 설치 (첫 실행 시만)
# ============================================================================
try:
    import pandas as pd
    print("✅ pandas already installed")
except ImportError:
    print("Installing packages...")
    import subprocess
    subprocess.check_call(["pip", "install", "openai", "google-generativeai", "supabase", "pandas", "-q"])
    import pandas as pd
    print("✅ Packages installed")

# ============================================================================
# 2. 환경 변수 설정 (여기에 실제 값 입력)
# ============================================================================
import os

os.environ["LLM_PROVIDER"] = "openai"  # 또는 "google"
os.environ["OPENAI_API_KEY"] = "your_openai_api_key_here"
os.environ["GOOGLE_GENERATIVE_AI_API_KEY"] = "your_google_api_key_here"
os.environ["SUPABASE_URL"] = "your_supabase_url_here"
os.environ["SUPABASE_SERVICE_KEY"] = "your_service_role_key_here"

print("✅ Environment variables set")

# ============================================================================
# 3. evaluation_colab.py 코드를 여기에 붙여넣기
# ============================================================================
# evaluation_colab.py의 전체 코드를 아래에 붙여넣으세요
# 또는 파일을 업로드한 경우:
# exec(open('evaluation_colab.py').read())

# ============================================================================
# 4. 실행
# ============================================================================
# results, csv_path = main()

# ============================================================================
# 5. 결과 확인 (pandas 사용)
# ============================================================================
"""
import pandas as pd

# CSV 읽기
df = pd.read_csv(csv_path)

# 샘플 확인
print("Sample Results:")
print(df.head())

# 통계 (boolean 값을 숫자로 변환)
df['intent_match_baseline'] = df['intent_match_baseline'].map({'true': True, 'false': False, True: True, False: False})
df['intent_match_rag'] = df['intent_match_rag'].map({'true': True, 'false': False, True: True, False: False})
df['grounding_rag'] = df['grounding_rag'].map({'true': True, 'false': False, True: True, False: False})

print(f"\nIntent Match (Baseline): {df['intent_match_baseline'].mean()*100:.1f}%")
print(f"Intent Match (RAG): {df['intent_match_rag'].mean()*100:.1f}%")
print(f"Grounding (RAG): {df['grounding_rag'].mean()*100:.1f}%")
"""
