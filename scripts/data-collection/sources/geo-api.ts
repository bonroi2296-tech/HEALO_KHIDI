/**
 * Geographic API Client (Kakao/Naver)
 * 위치 정보, 평점, 리뷰 수 수집
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // 경도
  y: string; // 위도
  place_url: string;
  distance: string;
}

export interface NaverPlace {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string; // 경도
  mapy: string; // 위도
}

export class GeoAPIClient {
  private kakaoClient: AxiosInstance;
  private naverClient: AxiosInstance;

  constructor() {
    this.kakaoClient = axios.create({
      baseURL: config.kakao.baseUrl,
      timeout: config.collection.timeout,
      headers: {
        Authorization: `KakaoAK ${config.kakao.apiKey}`,
      },
    });

    this.naverClient = axios.create({
      baseURL: config.naver.baseUrl,
      timeout: config.collection.timeout,
      headers: {
        'X-Naver-Client-Id': config.naver.clientId,
        'X-Naver-Client-Secret': config.naver.clientSecret,
      },
    });
  }

  /**
   * Kakao: 병원명으로 장소 검색
   */
  async searchKakaoPlace(query: string, category?: string): Promise<KakaoPlace[]> {
    try {
      const response = await this.kakaoClient.get(config.kakao.endpoints.search, {
        params: {
          query,
          category_group_code: category, // HP8=병원, PM9=약국
          size: 15,
        },
      });

      return response.data?.documents || [];
    } catch (error) {
      console.error('Kakao API 호출 실패:', error);
      return [];
    }
  }

  /**
   * Kakao: 주소로 좌표 검색
   */
  async searchKakaoAddress(address: string): Promise<{ x: string; y: string } | null> {
    try {
      const response = await this.kakaoClient.get(config.kakao.endpoints.address, {
        params: {
          query: address,
        },
      });

      const doc = response.data?.documents?.[0];
      if (doc) {
        return {
          x: doc.x,
          y: doc.y,
        };
      }
      return null;
    } catch (error) {
      console.error('Kakao 주소 검색 실패:', error);
      return null;
    }
  }

  /**
   * Naver: 지역 검색
   */
  async searchNaverLocal(query: string): Promise<NaverPlace[]> {
    try {
      const response = await this.naverClient.get(config.naver.endpoints.local, {
        params: {
          query,
          display: 5,
          start: 1,
          sort: 'random',
        },
      });

      return response.data?.items || [];
    } catch (error) {
      console.error('Naver API 호출 실패:', error);
      return [];
    }
  }

  /**
   * 병원명과 주소로 위치 정보 보강
   */
  async enrichLocation(hospitalName: string, address: string): Promise<{
    latitude: number | null;
    longitude: number | null;
    external_ratings: any;
  }> {
    const result = {
      latitude: null as number | null,
      longitude: null as number | null,
      external_ratings: {} as any,
    };

    // Kakao 검색
    const kakaoPlaces = await this.searchKakaoPlace(hospitalName, 'HP8');
    if (kakaoPlaces.length > 0) {
      const place = kakaoPlaces[0];
      result.longitude = parseFloat(place.x);
      result.latitude = parseFloat(place.y);
    }

    // 좌표를 못 찾은 경우 주소로 검색
    if (!result.latitude || !result.longitude) {
      const coords = await this.searchKakaoAddress(address);
      if (coords) {
        result.longitude = parseFloat(coords.x);
        result.latitude = parseFloat(coords.y);
      }
    }

    // Rate limiting
    await this.delay(100);

    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
