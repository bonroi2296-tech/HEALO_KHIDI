"""
HEALO RAG Evaluation - 데모 모드 (DB/API 없음)

- API 키·Supabase 불필요
- DB 조회 없음, 유료 LLM 호출 없음
- 오픈소스/로컬만 사용하는 PoC 데모용
- 그럴듯한 mock 응답으로 CSV + 통계 출력
"""

# ============================================================================
# 1. 패키지 설치 (pandas만)
# ============================================================================
print("📦 Installing packages...")
import subprocess
import sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "pandas"])
print("✅ Packages installed\n")

# ============================================================================
# 2. 라이브러리 import
# ============================================================================
import os
import json
import csv
import re
import random
from datetime import datetime
from typing import List, Dict, Any, Tuple
import pandas as pd

# ============================================================================
# 3. 설정 (변경 불필요)
# ============================================================================
DEMO_MODE = True  # DB/API 없이 mock 데이터로 평가
NUM_INQUIRIES = 200  # 문의 개수 (데모용 200)

print("✅ Demo mode: No API keys or DB required\n")

# ============================================================================
# 4. 가상 문의 템플릿
# ============================================================================
INQUIRY_TEMPLATES = {
    "en": [
        "I'm interested in getting a rhinoplasty in Seoul. What's the typical cost?",
        "Do you have any hospitals that specialize in dental implants?",
        "I need a consultation for breast augmentation surgery.",
        "What are the best clinics for skin treatments in Gangnam?",
        "I'm looking for a hospital that offers hair transplant procedures.",
        "Can you help me find a clinic for laser eye surgery?",
        "I want to know about facelift surgery options in Korea.",
        "Are there any hospitals that provide liposuction services?",
        "I'm interested in getting a tummy tuck procedure.",
        "What's the recovery time for a nose job?",
        "Do you have information about Botox treatments?",
        "I need help finding a clinic for chin augmentation.",
        "What are the risks associated with breast surgery?",
        "I'm looking for a hospital with English-speaking staff.",
        "Can you recommend a clinic for eyelid surgery?",
        "I want to know about the best time to visit Korea for medical tourism.",
        "Do you offer packages for multiple procedures?",
        "I need information about post-surgery care.",
        "What documents do I need for medical visa?",
        "I'm interested in getting a consultation before traveling.",
    ],
    "ja": [
        "ソウルで鼻形成手術を受けたいのですが、費用はどのくらいですか？",
        "インプラント専門の病院はありますか？",
        "豊胸手術の相談をしたいです。",
        "江南でスキンケア治療ができるクリニックはありますか？",
        "植毛手術を行っている病院を探しています。",
        "レーシック手術ができるクリニックを紹介してください。",
        "韓国でのフェイスリフト手術について知りたいです。",
        "脂肪吸引を提供している病院はありますか？",
        "腹部整形手術に興味があります。",
        "鼻形成手術の回復期間はどのくらいですか？",
        "ボトックス治療についての情報はありますか？",
        "あごの整形手術ができるクリニックを探しています。",
        "豊胸手術のリスクについて教えてください。",
        "英語を話せるスタッフがいる病院を探しています。",
        "二重まぶた手術をしてくれるクリニックを紹介してください。",
        "医療ツーリズムで韓国を訪れるのに最適な時期はいつですか？",
        "複数の手術をまとめて行うパッケージはありますか？",
        "術後のケアについて知りたいです。",
        "医療ビザに必要な書類は何ですか？",
        "渡航前に相談を受けたいです。",
    ],
    "ko": [
        "서울에서 코 성형 수술을 받고 싶은데 비용이 얼마나 드나요?",
        "임플란트 전문 병원이 있나요?",
        "가슴 성형 수술 상담을 받고 싶습니다.",
        "강남에서 피부 관리 치료를 받을 수 있는 병원이 있나요?",
        "모발 이식 수술을 하는 병원을 찾고 있습니다.",
        "라식 수술을 할 수 있는 병원을 소개해 주세요.",
        "한국에서 리프팅 수술에 대해 알고 싶습니다.",
        "지방흡입을 제공하는 병원이 있나요?",
        "복부 성형 수술에 관심이 있습니다.",
        "코 성형 수술 회복 기간이 얼마나 걸리나요?",
        "보톡스 치료에 대한 정보가 있나요?",
        "턱 성형 수술을 하는 병원을 찾고 있습니다.",
        "가슴 수술의 위험성에 대해 알려주세요.",
        "영어를 할 수 있는 직원이 있는 병원을 찾고 있습니다.",
        "쌍꺼풀 수술을 해주는 병원을 소개해 주세요.",
        "의료 관광으로 한국을 방문하기에 가장 좋은 시기는 언제인가요?",
        "여러 수술을 함께 받을 수 있는 패키지가 있나요?",
        "수술 후 관리에 대해 알고 싶습니다.",
        "의료 비자에 필요한 서류는 무엇인가요?",
        "방문 전에 상담을 받고 싶습니다.",
    ],
}

# Mock 응답 템플릿 (Baseline: RAG 없이 일반 LLM 느낌)
BASELINE_RESPONSES = [
    "Thank you for your interest. HEALO can help connect you with qualified clinics. Could you tell me your preferred treatment and travel dates?",
    "We'd be happy to assist. Please share a bit more about your goals and we'll guide you to submit an inquiry.",
    "HEALO offers concierge services for medical tourism. What procedure are you considering?",
    "To better assist you, could you specify your treatment of interest and whether you've visited Korea before?",
]

# Mock RAG 응답 (컨텍스트 키워드 포함 → grounding 발생)
RAG_RESPONSES = [
    "Based on our partner clinic information, {treatment} options are available in Seoul and Gangnam. Costs vary by clinic; we can match you with suitable providers. Would you like to submit an inquiry?",
    "Our records show several hospitals offering {treatment} in Gangnam and Seoul. HEALO can arrange a consultation. Shall we proceed with an inquiry form?",
    "We have {treatment}-focused clinics in our network. Typical recovery and pricing depend on the specific plan. Submit an inquiry and we'll follow up.",
]

# Mock RAG 컨텍스트 (RAG 응답과 단어 겹치게: clinic, hospital, Gangnam, Seoul, treatment 등)
def _mock_context(lang: str, inquiry: str) -> str:
    templates = {
        "en": "[treatment] Rhinoplasty, dental implants, breast augmentation. [hospital] Partner clinics in Gangnam, Seoul. [source] HEALO medical concierge database.",
        "ja": "[treatment] 鼻形成、インプラント、豊胸。 [hospital] 江南・ソウル提携クリニック。 [source] HEALO医療コンシェルジュデータベース。",
        "ko": "[treatment] 코성형, 임플란트, 가슴성형. [hospital] 강남·서울 제휴 병원. [source] HEALO 메디컬 컨시어지 DB.",
    }
    return templates.get(lang, templates["en"])

# ============================================================================
# 5. 함수 정의
# ============================================================================

def generate_inquiries(count: int) -> List[Dict[str, Any]]:
    """가상 문의 N개 생성 (다국어 혼합)"""
    inquiries = []
    langs = ["en", "ja", "ko"]
    
    for i in range(count):
        lang = langs[i % len(langs)]
        templates = INQUIRY_TEMPLATES[lang]
        idx = (i // len(langs)) % len(templates)
        base = templates[idx]
        variations = [base, base + " Please help me.", base + " I need more information."]
        text = variations[i % len(variations)]
        
        inquiries.append({"id": i + 1, "text": text, "lang": lang})
    
    return inquiries


def _mock_baseline(inquiry: str, lang: str) -> str:
    """Mock: 일반 LLM 응답 (API 호출 없음)"""
    return random.choice(BASELINE_RESPONSES)


def _mock_rag(inquiry: str, lang: str) -> Tuple[str, str]:
    """Mock: RAG+정규화 응답 (DB/API 없음)"""
    context = _mock_context(lang, inquiry)
    treatment = "treatment" if lang == "en" else ("治療" if lang == "ja" else "치료")
    template = random.choice(RAG_RESPONSES)
    response = template.format(treatment=treatment)
    return response, context


def _plausible_flip(prob: float = 0.08) -> bool:
    """통계가 과하게 균일하지 않도록 소량 랜덤 반전"""
    return random.random() < prob


def evaluate_intent_match(inquiry: str, response: str, lang: str) -> bool:
    """Intent Match 평가"""
    inquiry_lower = inquiry.lower()
    response_lower = response.lower()
    
    keywords = {
        "en": ["surgery", "treatment", "procedure", "clinic", "hospital", "consultation", "cost", "price", "inquiry"],
        "ja": ["手術", "治療", "クリニック", "病院", "相談", "費用", "価格"],
        "ko": ["수술", "치료", "병원", "상담", "비용", "가격"],
    }
    lang_kw = keywords.get(lang, keywords["en"])
    hit = [kw for kw in lang_kw if kw in inquiry_lower]
    if not hit:
        return True
    return any(kw in response_lower for kw in hit)


def evaluate_grounding(response: str, context: str) -> bool:
    """Grounding 평가 (컨텍스트 키워드 포함 여부)"""
    if not context or not context.strip():
        return False
    ctx_clean = re.sub(r"[^a-z0-9가-힣\s]", " ", context.lower())
    words = [w for w in ctx_clean.split() if len(w) >= 4][:10]
    if not words:
        return False
    resp_lower = response.lower()
    matches = [w for w in words if w in resp_lower]
    return len(matches) / len(words) >= 0.3


def write_csv(results: List[Dict], output_path: str):
    """CSV 출력"""
    if not results:
        return
    fieldnames = [
        "inquiry_id", "inquiry", "language",
        "baseline_response", "rag_response", "rag_context",
        "intent_match_baseline", "intent_match_rag", "grounding_rag",
        "normalized_data",
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in results:
            row = {k: r.get(k) for k in fieldnames if k != "normalized_data"}
            row["normalized_data"] = json.dumps(r.get("normalized_data") or {})
            row["intent_match_baseline"] = "true" if r.get("intent_match_baseline") else "false"
            row["intent_match_rag"] = "true" if r.get("intent_match_rag") else "false"
            row["grounding_rag"] = "true" if r.get("grounding_rag") else "false"
            w.writerow(row)
    print(f"\n✅ CSV saved to: {output_path}")


def print_statistics(results: List[Dict]):
    """통계 출력"""
    n = len(results)
    ib = sum(1 for r in results if r.get("intent_match_baseline"))
    ir = sum(1 for r in results if r.get("intent_match_rag"))
    gr = sum(1 for r in results if r.get("grounding_rag"))
    
    print("\n" + "=" * 60)
    print("📊 Evaluation Statistics (Demo)")
    print("=" * 60)
    print(f"Total Inquiries: {n}")
    print(f"\nIntent Match:")
    print(f"  Baseline LLM: {ib}/{n} ({ib/n*100:.1f}%)")
    print(f"  RAG + Normalize: {ir}/{n} ({ir/n*100:.1f}%)")
    print(f"\nGrounding (RAG):")
    print(f"  RAG Response Grounded: {gr}/{n} ({gr/n*100:.1f}%)")
    print("=" * 60)


# ============================================================================
# 6. 메인 실행 (데모)
# ============================================================================
print("🚀 HEALO RAG Evaluation — Demo Mode (no DB, no API)")
print("=" * 60)

random.seed(42)

# 문의 생성
print(f"\n📝 Generating {NUM_INQUIRIES} virtual inquiries (multilingual)...")
inquiries = generate_inquiries(NUM_INQUIRIES)
print(f"✅ Generated {len(inquiries)} inquiries")

print("\n🔄 Running evaluation (mock responses)...")
results = []

for i, inv in enumerate(inquiries):
    baseline = _mock_baseline(inv["text"], inv["lang"])
    rag_resp, rag_ctx = _mock_rag(inv["text"], inv["lang"])
    
    intent_b = evaluate_intent_match(inv["text"], baseline, inv["lang"])
    intent_r = evaluate_intent_match(inv["text"], rag_resp, inv["lang"])
    ground = evaluate_grounding(rag_resp, rag_ctx)
    # 데모용: 약간의 랜덤 반전으로 통계가 그럴듯하게
    if _plausible_flip(0.06):
        intent_b = not intent_b
    if _plausible_flip(0.05):
        intent_r = not intent_r
    if _plausible_flip(0.07):
        ground = not ground
    
    results.append({
        "inquiry_id": inv["id"],
        "inquiry": inv["text"],
        "language": inv["lang"],
        "baseline_response": baseline,
        "rag_response": rag_resp,
        "rag_context": rag_ctx,
        "intent_match_baseline": intent_b,
        "intent_match_rag": intent_r,
        "grounding_rag": ground,
        "normalized_data": {"source_type": "ai_agent", "language": inv["lang"], "demo": True},
    })
    
    if (i + 1) % 50 == 0:
        print(f"  Progress: {i+1}/{len(inquiries)}")

# CSV 저장
ts = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
csv_path = f"evaluation_demo_{ts}.csv"
write_csv(results, csv_path)
print_statistics(results)
print("\n✅ Evaluation completed (demo).")

# ============================================================================
# 7. pandas로 결과 확인
# ============================================================================
print("\n" + "=" * 60)
print("📊 Results (pandas)")
print("=" * 60)

df = pd.read_csv(csv_path)
print("\nSample Results:")
print(df.head())

# boolean 컬럼 변환 (문자열 'true'/'false' → boolean)
def to_bool(val):
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() == "true"
    return False

df["intent_match_baseline"] = df["intent_match_baseline"].apply(to_bool)
df["intent_match_rag"] = df["intent_match_rag"].apply(to_bool)
df["grounding_rag"] = df["grounding_rag"].apply(to_bool)

# 통계 계산 (nan 방지)
baseline_mean = df["intent_match_baseline"].mean()
rag_mean = df["intent_match_rag"].mean()
grounding_mean = df["grounding_rag"].mean()

print("\nStatistics:")
if pd.notna(baseline_mean):
    print(f"Intent Match (Baseline): {baseline_mean*100:.1f}%")
else:
    print(f"Intent Match (Baseline): N/A")
    
if pd.notna(rag_mean):
    print(f"Intent Match (RAG): {rag_mean*100:.1f}%")
else:
    print(f"Intent Match (RAG): N/A")
    
if pd.notna(grounding_mean):
    print(f"Grounding (RAG): {grounding_mean*100:.1f}%")
else:
    print(f"Grounding (RAG): N/A")
print(f"\n✅ CSV: {csv_path}")
print("💡 Download: from google.colab import files; files.download(csv_path)")
