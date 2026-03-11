/**
 * ⚠️ EXPERIMENTAL: 번역 품질 비교 모듈
 * 
 * 목적:
 * - Admin 전용 번역 품질 실험
 * - 2개 번역 엔진 비교 (A: 오픈소스, B: 외부 API)
 * 
 * 중요 제약:
 * - ❌ RAG/normalized_inquiries 파이프라인에 사용 금지
 * - ❌ 번역 결과를 DB/로그에 저장 금지
 * - ✅ Admin 화면에서 on-demand로만 사용
 * - ✅ 참고용 실험 데이터로만 활용
 * 
 * 현재 구현:
 * - Mock 함수로 구현 (실제 API는 향후 추가)
 * - 실제 번역 엔진으로 교체 시 함수 내부만 수정
 */

import "server-only";

export interface TranslationResult {
  original: string;
  translationA: string; // 오픈소스 모델
  translationB: string; // 외부 API
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

/**
 * 🔬 실험용 번역 A: 오픈소스 모델 (NLLB 계열)
 * 
 * 향후 구현 예정:
 * - HuggingFace Inference API
 * - facebook/nllb-200-distilled-600M
 * 
 * @param text 원문
 * @param sourceLang 원문 언어 (ISO 639-1)
 * @param targetLang 목표 언어 (ISO 639-1)
 * @returns 번역 결과
 */
async function translateWithModelA(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // ⚠️ MOCK: 실제 API로 교체 필요
  // TODO: HuggingFace NLLB API 호출
  
  await new Promise(resolve => setTimeout(resolve, 500)); // 네트워크 지연 시뮬레이션
  
  return `[Model A] ${text} (${sourceLang}→${targetLang})`;
}

/**
 * 🔬 실험용 번역 B: 외부 API (Papago 등)
 * 
 * 향후 구현 예정:
 * - Papago API
 * - 또는 다른 상용 번역 API
 * 
 * @param text 원문
 * @param sourceLang 원문 언어 (ISO 639-1)
 * @param targetLang 목표 언어 (ISO 639-1)
 * @returns 번역 결과
 */
async function translateWithModelB(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // ⚠️ MOCK: 실제 API로 교체 필요
  // TODO: Papago API 호출
  
  await new Promise(resolve => setTimeout(resolve, 300)); // 네트워크 지연 시뮬레이션
  
  return `[Model B] ${text} (${sourceLang}→${targetLang})`;
}

/**
 * ✅ 실험용 번역 비교 (2개 모델 동시 실행)
 * 
 * @param text 번역할 텍스트
 * @param sourceLang 원문 언어 (기본: "en")
 * @param targetLang 목표 언어 (기본: "ko")
 * @returns 번역 비교 결과
 */
export async function compareTranslations(
  text: string,
  sourceLang: string = "en",
  targetLang: string = "ko"
): Promise<TranslationResult> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text to translate is empty");
  }
  
  // 두 모델 병렬 실행
  const [translationA, translationB] = await Promise.all([
    translateWithModelA(text, sourceLang, targetLang),
    translateWithModelB(text, sourceLang, targetLang),
  ]);
  
  return {
    original: text,
    translationA,
    translationB,
    sourceLang,
    targetLang,
    timestamp: Date.now(),
  };
}

/**
 * ⚠️ 주의: 이 모듈의 함수들은 절대 다음 용도로 사용하지 마세요:
 * - RAG 파이프라인
 * - normalized_inquiries 생성
 * - 프로덕션 번역
 * - DB 저장
 * 
 * 오직 Admin 화면에서 품질 비교 참고용으로만 사용하세요.
 */
