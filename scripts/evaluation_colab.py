"""
HEALO RAG Evaluation Script (Google Colab 버전)

성능 검증 PoC용 평가 스크립트
- 가상의 의료 문의 200개 생성 (다국어 혼합)
- 일반 LLM vs HEALO RAG + 정규화 비교
- Intent match / Grounding 평가
- CSV 및 통계 출력

주의: 실제 모델 학습은 포함하지 않음
"""

import os
import json
import csv
import time
import re
from datetime import datetime
from typing import List, Dict, Any, Tuple
from openai import OpenAI
import google.generativeai as genai
from supabase import create_client, Client

# ============================================================================
# 설정
# ============================================================================

# 환경 변수 (Colab에서 설정)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GOOGLE_GENERATIVE_AI_API_KEY = os.getenv("GOOGLE_GENERATIVE_AI_API_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# ============================================================================
# 가상 문의 템플릿
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

# ============================================================================
# 유틸리티 함수
# ============================================================================

def generate_inquiries(count: int = 200) -> List[Dict[str, Any]]:
    """가상 문의 200개 생성 (다국어 혼합)"""
    inquiries = []
    langs = ["en", "ja", "ko"]
    
    for i in range(count):
        lang = langs[i % len(langs)]
        templates = INQUIRY_TEMPLATES[lang]
        template_index = (i // len(langs)) % len(templates)
        
        base_text = templates[template_index]
        variations = [
            base_text,
            base_text.replace("?", "?").replace(".", "."),
            base_text + " Please help me.",
            base_text + " I need more information.",
        ]
        text = variations[i % len(variations)]
        
        inquiries.append({
            "id": i + 1,
            "text": text,
            "lang": lang,
        })
    
    return inquiries


def detect_language(value: str) -> str:
    """언어 감지"""
    v = value.lower() if value else ""
    if "ko" in v or "kr" in v or "korean" in v:
        return "ko"
    if "ja" in v or "jp" in v or "japanese" in v:
        return "ja"
    return "en"


# ============================================================================
# LLM 호출
# ============================================================================

def get_baseline_response(inquiry: str, lang: str) -> str:
    """일반 LLM 응답 (RAG 없이)"""
    system_prompt = """You are a medical concierge assistant for HEALO.
Do not provide diagnosis, medical advice, or guarantees.
Ask clarifying questions when constraints are missing.
Primary objective: guide the user to submit an inquiry."""

    try:
        if LLM_PROVIDER == "google":
            genai.configure(api_key=GOOGLE_GENERATIVE_AI_API_KEY)
            model = genai.GenerativeModel("gemini-flash-latest")
            response = model.generate_content(
                f"{system_prompt}\n\nUser: {inquiry}\n\nAssistant:"
            )
            return response.text
        else:
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": inquiry},
                ],
            )
            return response.choices[0].message.content
    except Exception as e:
        print(f"[Baseline] Error: {str(e)}")
        return f"[ERROR: {str(e)}]"


def get_rag_response(inquiry: str, lang: str, supabase: Client) -> Tuple[str, str, Dict]:
    """HEALO RAG + 정규화 응답"""
    # 1. 정규화
    normalized = None
    try:
        language = detect_language(lang)
        result = supabase.table("normalized_inquiries").insert({
            "source_type": "ai_agent",
            "language": language,
            "raw_message": inquiry,
            "constraints": {},
            "treatment_slug": None,
            "objective": None,
        }).execute()
        if result.data:
            normalized = result.data[0]
    except Exception as e:
        print(f"[Normalize] Error: {str(e)}")
    
    # 2. RAG 검색
    rag_chunks = search_rag(inquiry, lang, supabase)
    context = build_context(rag_chunks)
    
    # 3. LLM 응답 (RAG 컨텍스트 포함)
    system_prompt = f"""You are a medical concierge assistant for HEALO.
Do not provide diagnosis, medical advice, or guarantees.
Ask clarifying questions when constraints are missing.
Primary objective: guide the user to submit an inquiry.
If relevant, reference the provided context briefly.

{('Context:\n' + context) if context else ''}"""

    try:
        if LLM_PROVIDER == "google":
            genai.configure(api_key=GOOGLE_GENERATIVE_AI_API_KEY)
            model = genai.GenerativeModel("gemini-flash-latest")
            response = model.generate_content(
                f"{system_prompt}\n\nUser: {inquiry}\n\nAssistant:"
            )
            response_text = response.text
        else:
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": inquiry},
                ],
            )
            response_text = response.choices[0].message.content
        
        return response_text, context, normalized or {}
    except Exception as e:
        print(f"[RAG] Error: {str(e)}")
        return f"[ERROR: {str(e)}]", context, normalized or {}


def search_rag(query: str, lang: str, supabase: Client) -> List[Dict]:
    """RAG 검색"""
    try:
        # 토큰 추출
        query_clean = re.sub(r"[^a-z0-9가-힣\s]", " ", query.lower())
        tokens = [t for t in query_clean.split() if len(t) >= 3][:6]
        
        if not tokens:
            tokens = [query]
        
        # Supabase 쿼리 (간단한 버전)
        # 실제로는 더 복잡한 쿼리가 필요하지만, 여기서는 기본 구조만
        result = supabase.table("rag_chunks").select(
            "id, document_id, chunk_index, content, metadata, rag_documents(id, source_type, source_id, lang, title)"
        ).ilike("content", f"%{query}%").limit(6).execute()
        
        if lang:
            # 언어 필터링은 클라이언트 측에서
            chunks = [c for c in (result.data or []) if c.get("rag_documents", {}).get("lang") == lang]
        else:
            chunks = result.data or []
        
        # 스코어링
        scored = []
        for chunk in chunks:
            content = (chunk.get("content") or "").lower()
            score = sum(1 for t in tokens if t in content)
            scored.append({**chunk, "_score": score})
        
        scored.sort(key=lambda x: x.get("_score", 0), reverse=True)
        return scored[:6]
    except Exception as e:
        print(f"[RAG Search] Error: {str(e)}")
        return []


def build_context(chunks: List[Dict]) -> str:
    """RAG 컨텍스트 빌드"""
    if not chunks:
        return ""
    
    lines = []
    for c in chunks:
        doc = c.get("rag_documents", {})
        title = f" | {doc.get('title', '')}" if doc.get("title") else ""
        source = f"[{doc.get('source_type', 'source')}{title}]" if doc.get("source_type") else "[source]"
        content = (c.get("content") or "").strip()
        lines.append(f"{source} {content}")
    
    return "\n\n".join(lines)


# ============================================================================
# 평가 함수
# ============================================================================

def evaluate_intent_match(inquiry: str, response: str, lang: str) -> bool:
    """Intent Match 평가"""
    inquiry_lower = inquiry.lower()
    response_lower = response.lower()
    
    keywords = {
        "en": ["surgery", "treatment", "procedure", "clinic", "hospital", "consultation", "cost", "price"],
        "ja": ["手術", "治療", "クリニック", "病院", "相談", "費用", "価格"],
        "ko": ["수술", "치료", "병원", "상담", "비용", "가격"],
    }
    
    lang_keywords = keywords.get(lang, keywords["en"])
    medical_keywords = [kw for kw in lang_keywords if kw in inquiry_lower]
    
    if not medical_keywords:
        return True
    
    return any(kw in response_lower for kw in medical_keywords)


def evaluate_grounding(response: str, context: str) -> bool:
    """Grounding 평가"""
    if not context or not context.strip():
        return False
    
    # 컨텍스트에서 주요 키워드 추출
    context_clean = re.sub(r"[^a-z0-9가-힣\s]", " ", context.lower())
    context_words = [w for w in context_clean.split() if len(w) >= 4][:10]
    
    if not context_words:
        return False
    
    # 응답이 컨텍스트 키워드를 포함하는지 확인
    response_lower = response.lower()
    matches = [w for w in context_words if w in response_lower]
    
    # 30% 이상 매칭되면 grounded로 간주
    return len(matches) / len(context_words) >= 0.3


# ============================================================================
# 출력 함수
# ============================================================================

def write_csv(results: List[Dict], output_path: str):
    """CSV 출력"""
    if not results:
        return
    
    fieldnames = [
        "inquiry_id", "inquiry", "language",
        "baseline_response", "rag_response", "rag_context",
        "intent_match_baseline", "intent_match_rag", "grounding_rag",
        "normalized_data"
    ]
    
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for r in results:
            writer.writerow({
                "inquiry_id": r["inquiry_id"],
                "inquiry": r["inquiry"],
                "language": r["language"],
                "baseline_response": r["baseline_response"],
                "rag_response": r["rag_response"],
                "rag_context": r["rag_context"],
                "intent_match_baseline": "true" if r["intent_match_baseline"] else "false",
                "intent_match_rag": "true" if r["intent_match_rag"] else "false",
                "grounding_rag": "true" if r["grounding_rag"] else "false",
                "normalized_data": json.dumps(r["normalized_data"] or {}),
            })
    
    print(f"\n✅ CSV saved to: {output_path}")


def print_statistics(results: List[Dict]):
    """통계 출력"""
    total = len(results)
    intent_match_baseline = sum(1 for r in results if r["intent_match_baseline"])
    intent_match_rag = sum(1 for r in results if r["intent_match_rag"])
    grounding_rag = sum(1 for r in results if r["grounding_rag"])
    
    print("\n" + "=" * 60)
    print("📊 Evaluation Statistics")
    print("=" * 60)
    print(f"Total Inquiries: {total}")
    print(f"\nIntent Match:")
    print(f"  Baseline LLM: {intent_match_baseline}/{total} ({intent_match_baseline/total*100:.1f}%)")
    print(f"  RAG + Normalize: {intent_match_rag}/{total} ({intent_match_rag/total*100:.1f}%)")
    print(f"\nGrounding (RAG):")
    print(f"  RAG Response Grounded: {grounding_rag}/{total} ({grounding_rag/total*100:.1f}%)")
    print("=" * 60)


# ============================================================================
# 메인 실행
# ============================================================================

def main():
    """메인 실행 함수"""
    print("🚀 HEALO RAG Evaluation Script (Colab)")
    print("=" * 60)
    
    # 환경 변수 확인
    if LLM_PROVIDER == "openai" and not OPENAI_API_KEY:
        print("❌ Error: OPENAI_API_KEY is required")
        return
    if LLM_PROVIDER == "google" and not GOOGLE_GENERATIVE_AI_API_KEY:
        print("❌ Error: GOOGLE_GENERATIVE_AI_API_KEY is required")
        return
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required")
        return
    
    # Supabase 클라이언트
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # 가상 문의 생성
    print("\n📝 Generating 200 virtual inquiries (multilingual)...")
    inquiries = generate_inquiries(200)
    print(f"✅ Generated {len(inquiries)} inquiries")
    
    # 평가 실행
    print("\n🔄 Running evaluation...")
    results = []
    
    for i, inquiry in enumerate(inquiries):
        print(f"\n[{i+1}/{len(inquiries)}] Processing: {inquiry['text'][:50]}...")
        
        # Baseline LLM
        print("  → Baseline LLM...")
        baseline_response = get_baseline_response(inquiry["text"], inquiry["lang"])
        time.sleep(0.5)  # Rate limiting
        
        # RAG + Normalize
        print("  → RAG + Normalize...")
        rag_response, rag_context, normalized = get_rag_response(
            inquiry["text"], inquiry["lang"], supabase
        )
        time.sleep(0.5)  # Rate limiting
        
        # 평가
        intent_match_baseline = evaluate_intent_match(
            inquiry["text"], baseline_response, inquiry["lang"]
        )
        intent_match_rag = evaluate_intent_match(
            inquiry["text"], rag_response, inquiry["lang"]
        )
        grounding_rag = evaluate_grounding(rag_response, rag_context)
        
        results.append({
            "inquiry_id": inquiry["id"],
            "inquiry": inquiry["text"],
            "language": inquiry["lang"],
            "baseline_response": baseline_response,
            "rag_response": rag_response,
            "rag_context": rag_context,
            "intent_match_baseline": intent_match_baseline,
            "intent_match_rag": intent_match_rag,
            "grounding_rag": grounding_rag,
            "normalized_data": normalized,
        })
        
        # 진행률 표시
        if (i + 1) % 10 == 0:
            print(f"\n📈 Progress: {i+1}/{len(inquiries)} ({(i+1)/len(inquiries)*100:.1f}%)")
    
    # 결과 저장
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    csv_path = f"evaluation_{timestamp}.csv"
    write_csv(results, csv_path)
    
    # 통계 출력
    print_statistics(results)
    
    print("\n✅ Evaluation completed!")
    return results, csv_path


if __name__ == "__main__":
    results, csv_path = main()
