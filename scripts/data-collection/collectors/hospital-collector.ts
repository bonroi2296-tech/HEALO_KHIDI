/**
 * Hospital Data Collector
 * 여러 소스에서 병원 데이터 수집 및 통합
 */

import { HIRAAPIClient, HIRAHospital } from '../sources/hira-api';
import { GeoAPIClient } from '../sources/geo-api';
import { normalizeHospital } from '../transformers/normalize-hospital';

export interface CollectedHospitalData {
  name: string;
  location_kr: string;
  location_en: string | null;
  address_detail: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  images: string[];
  supported_languages: string[];
  amenities: string[];
  specialties: string[];
  operating_hours: any;
  doctor_profile: any;
  business_registration_number: string | null;
  medical_institution_code: string;
  certifications: any[];
  medical_equipment: string[];
  insurance_accepted: boolean;
  insurance_details: any;
  annual_surgery_count: number | null;
  establishment_date: string | null;
  total_staff_count: number | null;
  doctor_count: number | null;
  external_ratings: any;
  display_order: number | null;
  is_published: boolean;
}

export class HospitalCollector {
  private hiraClient: HIRAAPIClient;
  private geoClient: GeoAPIClient;

  constructor() {
    this.hiraClient = new HIRAAPIClient();
    this.geoClient = new GeoAPIClient();
  }

  /**
   * 서울 지역 성형외과/피부과 병원 수집
   */
  async collectSeoulCosmeticHospitals(): Promise<CollectedHospitalData[]> {
    console.log('서울 지역 병원 데이터 수집 시작...');
    
    // HIRA에서 기본 정보 수집
    const hiraHospitals = await this.hiraClient.collectSeoulCosmeticHospitals();
    console.log(`HIRA에서 ${hiraHospitals.length}개 병원 정보 수집 완료`);

    // 성형외과, 피부과 필터링 (병원명에 키워드 포함)
    const keywords = ['성형', '피부', '미용', '뷰티', '클리닉', '의원'];
    const filteredHospitals = hiraHospitals.filter(hospital => 
      keywords.some(keyword => hospital.yadmNm.includes(keyword))
    );
    console.log(`필터링 후 ${filteredHospitals.length}개 병원`);

    const results: CollectedHospitalData[] = [];

    // 각 병원 정보 보강
    for (let i = 0; i < filteredHospitals.length; i++) {
      const hospital = filteredHospitals[i];
      console.log(`[${i + 1}/${filteredHospitals.length}] ${hospital.yadmNm} 처리 중...`);

      try {
        // 위치 정보 보강
        const location = await this.geoClient.enrichLocation(
          hospital.yadmNm,
          hospital.addr
        );

        // 평가 정보 조회
        const evaluations = await this.hiraClient.getHospitalEvaluation(hospital.ykiho);

        // 정규화
        const normalized = normalizeHospital(hospital, location, evaluations);
        results.push(normalized);

        // Rate limiting
        await this.delay(200);
      } catch (error) {
        console.error(`병원 ${hospital.yadmNm} 처리 실패:`, error);
      }
    }

    console.log(`총 ${results.length}개 병원 데이터 수집 완료`);
    return results;
  }

  /**
   * 특정 지역 병원 수집
   */
  async collectHospitalsByRegion(sidoCd: string, regionName: string): Promise<CollectedHospitalData[]> {
    console.log(`${regionName} 지역 병원 데이터 수집 시작...`);
    
    const hospitals = await this.hiraClient.getHospitals({
      sidoCd,
      clCd: '03', // 의원
      numOfRows: 100,
    });

    const results: CollectedHospitalData[] = [];

    for (const hospital of hospitals) {
      try {
        const location = await this.geoClient.enrichLocation(
          hospital.yadmNm,
          hospital.addr
        );

        const evaluations = await this.hiraClient.getHospitalEvaluation(hospital.ykiho);
        const normalized = normalizeHospital(hospital, location, evaluations);
        results.push(normalized);

        await this.delay(200);
      } catch (error) {
        console.error(`병원 처리 실패:`, error);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
