/**
 * HIRA (건강보험심사평가원) API Client
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export interface HIRAHospital {
  yadmNm: string; // 병원명
  addr: string; // 주소
  telno: string; // 전화번호
  ykiho: string; // 요양기관기호
  clCd: string; // 병원 분류 코드
  clCdNm: string; // 병원 분류명
  sidoCd: string; // 시도 코드
  sidoCdNm: string; // 시도명
  sgguCd: string; // 시군구 코드
  sgguCdNm: string; // 시군구명
  emdongCd: string; // 읍면동 코드
  emdongCdNm: string; // 읍면동명
  postNo: string; // 우편번호
  XPos: string; // X좌표
  YPos: string; // Y좌표
  hospUrl: string; // 병원 URL
  estbDd: string; // 개설일자
  drTotCnt: number; // 의사 총수
  pnursCnt: number; // 간호사 수
  [key: string]: any;
}

export interface HIRAEvaluation {
  ykiho: string; // 요양기관기호
  evlGrade: string; // 평가등급
  evlYear: string; // 평가연도
  evlItem: string; // 평가항목
  [key: string]: any;
}

export class HIRAAPIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.hira.baseUrl,
      timeout: config.collection.timeout,
      params: {
        serviceKey: config.hira.apiKey,
        numOfRows: 100,
        pageNo: 1,
      },
    });
  }

  /**
   * 병원 기본 정보 조회
   */
  async getHospitals(params: {
    sidoCd?: string; // 시도 코드
    sgguCd?: string; // 시군구 코드
    yadmNm?: string; // 병원명
    clCd?: string; // 병원 분류 코드 (예: 01=종합병원, 02=병원, 03=의원)
    pageNo?: number;
    numOfRows?: number;
  }): Promise<HIRAHospital[]> {
    try {
      const response = await this.client.get(config.hira.endpoints.hospitals, {
        params: {
          ...params,
          numOfRows: params.numOfRows || 100,
          pageNo: params.pageNo || 1,
        },
      });

      const items = response.data?.response?.body?.items?.item;
      return Array.isArray(items) ? items : items ? [items] : [];
    } catch (error) {
      console.error('HIRA API 호출 실패:', error);
      throw error;
    }
  }

  /**
   * 병원 평가 정보 조회
   */
  async getHospitalEvaluation(ykiho: string): Promise<HIRAEvaluation[]> {
    try {
      const response = await this.client.get(config.hira.endpoints.evaluation, {
        params: {
          ykiho,
        },
      });

      const items = response.data?.response?.body?.items?.item;
      return Array.isArray(items) ? items : items ? [items] : [];
    } catch (error) {
      console.error('HIRA 평가 정보 조회 실패:', error);
      return [];
    }
  }

  /**
   * 서울 지역 성형외과/피부과 병원 수집
   */
  async collectSeoulCosmeticHospitals(): Promise<HIRAHospital[]> {
    const hospitals: HIRAHospital[] = [];
    
    // 서울시 코드: 11
    const sidoCd = '11';
    
    // 성형외과, 피부과 등 관련 병원 수집
    // clCd: 01=종합병원, 02=병원, 03=의원
    const clCodes = ['01', '02', '03'];
    
    for (const clCd of clCodes) {
      let pageNo = 1;
      let hasMore = true;
      
      while (hasMore) {
        const results = await this.getHospitals({
          sidoCd,
          clCd,
          pageNo,
          numOfRows: 100,
        });
        
        if (results.length === 0) {
          hasMore = false;
        } else {
          hospitals.push(...results);
          pageNo++;
          
          // Rate limiting
          await this.delay(100);
        }
      }
    }
    
    return hospitals;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
