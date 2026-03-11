/**
 * Image Fallback Utility
 * Unsplash 기반 임시 이미지 생성
 */

/**
 * 진료과목별 이미지 키워드 매핑
 */
const SPECIALTY_KEYWORDS: Record<string, string> = {
  '성형외과': 'plastic-surgery-clinic',
  '피부과': 'dermatology-clinic',
  '안과': 'ophthalmology-clinic',
  '치과': 'dental-clinic',
  '내과': 'hospital-interior',
  '정형외과': 'orthopedic-clinic',
  '이비인후과': 'ent-clinic',
  '산부인과': 'obstetrics-clinic',
  '소아과': 'pediatric-clinic',
  '신경외과': 'neurosurgery-clinic',
  '비뇨기과': 'urology-clinic',
  '마취통증의학과': 'anesthesiology-clinic',
};

/**
 * 시술 카테고리별 이미지 키워드 매핑
 */
const TREATMENT_KEYWORDS: Record<string, string> = {
  '보톡스': 'botox-injection',
  '필러': 'dermal-filler',
  '리프팅': 'face-lifting',
  '레이저': 'laser-treatment',
  '쌍꺼풀': 'double-eyelid-surgery',
  '코': 'rhinoplasty',
  '윤곽': 'facial-contouring',
  '지방': 'liposuction',
  '가슴': 'breast-surgery',
  '주름': 'wrinkle-treatment',
  '여드름': 'acne-treatment',
  '미백': 'skin-whitening',
};

/**
 * Unsplash 임시 이미지 생성 (진료과목 기반)
 * 
 * @param specialty 진료과목 또는 시술명
 * @param index 이미지 인덱스 (0-4, 갤러리용)
 * @param width 이미지 너비
 * @param height 이미지 높이
 * @returns Unsplash 이미지 URL
 */
export function getFallbackImage(
  specialty?: string,
  index: number = 0,
  width: number = 800,
  height: number = 600
): string {
  // 기본 키워드
  let keyword = 'modern-medical-clinic';

  // 진료과목 매칭
  if (specialty) {
    const matched = Object.keys(SPECIALTY_KEYWORDS).find(key => 
      specialty.includes(key)
    );
    if (matched) {
      keyword = SPECIALTY_KEYWORDS[matched];
    } else {
      // 시술명 매칭
      const treatmentMatched = Object.keys(TREATMENT_KEYWORDS).find(key =>
        specialty.includes(key)
      );
      if (treatmentMatched) {
        keyword = TREATMENT_KEYWORDS[treatmentMatched];
      }
    }
  }

  // Unsplash Source API (무료, 랜덤 이미지)
  // index를 시드로 사용해 일관된 이미지 제공
  const seed = specialty ? `${specialty}-${index}` : `default-${index}`;
  
  return `https://source.unsplash.com/${width}x${height}/?${keyword}&sig=${encodeURIComponent(seed)}`;
}

/**
 * 병원용 갤러리 이미지 세트 생성 (4장)
 */
export function getHospitalGalleryImages(specialty?: string): string[] {
  return [
    getFallbackImage(specialty, 1, 800, 600),
    getFallbackImage(specialty, 2, 800, 600),
    getFallbackImage(specialty, 3, 800, 600),
    getFallbackImage(specialty, 4, 800, 600),
  ];
}

/**
 * 시술용 갤러리 이미지 세트 생성
 */
export function getTreatmentGalleryImages(treatmentName?: string): string[] {
  return [
    getFallbackImage(treatmentName, 1, 800, 600),
    getFallbackImage(treatmentName, 2, 800, 600),
    getFallbackImage(treatmentName, 3, 800, 600),
  ];
}

/**
 * 원장 프로필 기본 이미지
 */
export function getDoctorPlaceholderImage(): string {
  return `https://source.unsplash.com/400x400/?professional-doctor-portrait&sig=doctor-profile`;
}

/**
 * 이미지가 임시 이미지인지 확인
 */
export function isPlaceholderImage(url?: string | null): boolean {
  if (!url) return true;
  return url.includes('unsplash.com') || url.includes('placeholder');
}
