/**
 * Hospital Data Normalizer
 * 여러 소스의 데이터를 HEALO DB 스키마에 맞게 정규화
 */

import { HIRAHospital, HIRAEvaluation } from '../sources/hira-api';
import { CollectedHospitalData } from '../collectors/hospital-collector';

/**
 * HIRA 병원 데이터를 HEALO 스키마로 정규화
 */
export function normalizeHospital(
  hiraData: HIRAHospital,
  locationData: {
    latitude: number | null;
    longitude: number | null;
    external_ratings: any;
  },
  evaluations: HIRAEvaluation[]
): CollectedHospitalData {
  // 병원 분류명에서 전문 분야 추출
  const specialties = extractSpecialties(hiraData.yadmNm, hiraData.clCdNm);

  // 인증 정보 생성
  // 변수명 'eval' 은 ESM/strict 예약어라 esbuild(tsx) 변환 실패 → 'ev' 로 변경(collect CLI 전체가 깨지던 기존 버그).
  const certifications = evaluations.map(ev => ({
    type: `HIRA_${ev.evlItem}`,
    issuer: '건강보험심사평가원',
    date: ev.evlYear,
    grade: ev.evlGrade,
  }));

  // 주소 분리 (시/구 vs 상세주소)
  const { location, addressDetail } = splitAddress(hiraData.addr);

  return {
    name: hiraData.yadmNm,
    location_kr: location,
    location_en: null, // 영문 주소는 추후 번역 API 사용
    address_detail: addressDetail,
    description: null, // 관리자가 직접 입력
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    tags: extractTags(hiraData.yadmNm),
    images: [],
    supported_languages: ['한국어'],
    amenities: [],
    specialties,
    operating_hours: null,
    doctor_profile: null,
    business_registration_number: null,
    medical_institution_code: hiraData.ykiho,
    certifications,
    medical_equipment: [],
    insurance_accepted: true, // 요양기관은 기본적으로 보험 적용
    insurance_details: {
      types: ['건강보험', '의료급여'],
    },
    annual_surgery_count: null,
    establishment_date: parseDate(hiraData.estbDd),
    total_staff_count: null,
    doctor_count: hiraData.drTotCnt || null,
    external_ratings: locationData.external_ratings,
    display_order: null,
    is_published: false, // 기본값은 비공개, 관리자 검토 후 공개
  };
}

/**
 * 병원명에서 전문 분야 추출
 */
function extractSpecialties(name: string, category: string): string[] {
  const specialties: string[] = [];
  
  const keywords: Record<string, string> = {
    '성형': '성형외과',
    '피부': '피부과',
    '미용': '미용의학',
    '비만': '비만클리닉',
    '레이저': '레이저 시술',
    '보톡스': '보톡스 시술',
    '필러': '필러 시술',
    '리프팅': '리프팅 시술',
    '안티에이징': '안티에이징',
  };

  for (const [keyword, specialty] of Object.entries(keywords)) {
    if (name.includes(keyword)) {
      specialties.push(specialty);
    }
  }

  if (specialties.length === 0) {
    specialties.push(category || '일반의원');
  }

  return [...new Set(specialties)];
}

/**
 * 병원명에서 태그 추출
 */
function extractTags(name: string): string[] {
  const tags: string[] = [];
  
  const keywords = [
    '성형',
    '피부',
    '미용',
    '비만',
    '뷰티',
    '클리닉',
    '의원',
    '병원',
    '센터',
  ];

  for (const keyword of keywords) {
    if (name.includes(keyword)) {
      tags.push(keyword);
    }
  }

  return tags;
}

/**
 * 주소를 location(시/구)과 addressDetail(상세주소)로 분리
 */
function splitAddress(fullAddress: string): { location: string; addressDetail: string } {
  // 예: "서울특별시 강남구 테헤란로 123" → location: "서울 강남구", addressDetail: "테헤란로 123"
  const parts = fullAddress.split(' ');
  
  if (parts.length >= 3) {
    const sido = parts[0].replace('특별시', '').replace('광역시', '');
    const sigungu = parts[1];
    const location = `${sido} ${sigungu}`;
    const addressDetail = parts.slice(2).join(' ');
    
    return { location, addressDetail };
  }
  
  return {
    location: parts[0] || fullAddress,
    addressDetail: parts.slice(1).join(' ') || '',
  };
}

/**
 * 날짜 문자열을 ISO 형식으로 변환
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.length !== 8) {
    return null;
  }
  
  try {
    // YYYYMMDD → YYYY-MM-DD
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}
