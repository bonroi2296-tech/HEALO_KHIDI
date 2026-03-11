/**
 * HEALO: Slug Generation Utility
 * 
 * 목적:
 * - Hospitals와 Treatments에서 사용하는 slug 생성 로직을 통합
 * - CREATE: 이름에서 slug 생성
 * - UPDATE: 기존 slug 유지 (명시적으로 변경하지 않는 한)
 * 
 * 정책:
 * - Hospitals: CREATE시 name에서 slug 자동 생성, UPDATE시 기존 slug 유지
 * - Treatments: slug REQUIRED, CREATE시 name에서 생성, UPDATE시 안정적으로 유지
 */

/**
 * 한글/영문 이름을 URL-safe slug로 변환
 * 
 * @param name - 병원명 또는 시술명
 * @returns slug (소문자, 하이픈으로 구분)
 * 
 * @example
 * generateSlug("강남 세브란스 병원") // "gangnam-sevrance-byeongwon"
 * generateSlug("Hair Transplant") // "hair-transplant"
 */
export function generateSlug(name: string): string {
  if (!name || !name.trim()) {
    // Fallback: 타임스탬프 기반 slug
    return `item-${Date.now()}`;
  }

  // 1. 소문자 변환
  let slug = name.toLowerCase().trim();

  // 2. 특수문자 제거 (단어, 공백, 하이픈만 유지)
  slug = slug.replace(/[^\w\s-]/g, '');

  // 3. 공백/언더스코어를 하이픈으로 변환
  slug = slug.replace(/[\s_-]+/g, '-');

  // 4. 앞뒤 하이픈 제거
  slug = slug.replace(/^-+|-+$/g, '');

  // 5. 빈 문자열인 경우 fallback
  if (!slug) {
    return `item-${Date.now()}`;
  }

  return slug;
}

/**
 * 기존 데이터에서 slug를 안전하게 추출
 * - UPDATE시 기존 slug를 유지하는데 사용
 * 
 * @param existingData - DB에서 가져온 기존 데이터
 * @returns 기존 slug 또는 null
 */
export function extractExistingSlug(existingData: { slug?: string } | null): string | null {
  return existingData?.slug || null;
}

/**
 * UPDATE 작업시 slug 결정 로직
 * - 명시적으로 slug가 제공되면 사용
 * - 그렇지 않으면 기존 slug 유지
 * - 둘 다 없으면 name에서 생성 (fallback)
 * 
 * @param providedSlug - 사용자가 명시적으로 제공한 slug (optional)
 * @param existingSlug - DB에 저장된 기존 slug (optional)
 * @param name - 현재 이름 (fallback용)
 * @returns 최종 slug
 */
export function resolveSlugForUpdate(
  providedSlug: string | null | undefined,
  existingSlug: string | null | undefined,
  name: string
): string {
  // 1. 명시적으로 제공된 slug가 있으면 사용
  if (providedSlug && providedSlug.trim()) {
    return providedSlug.trim();
  }

  // 2. 기존 slug가 있으면 유지
  if (existingSlug && existingSlug.trim()) {
    return existingSlug.trim();
  }

  // 3. Fallback: name에서 생성
  return generateSlug(name);
}
