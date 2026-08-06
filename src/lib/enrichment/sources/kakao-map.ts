import type { EnrichmentSource, EnrichmentResult, HospitalRow } from "../types";

const KAKAO_API_KEY = process.env.KAKAO_REST_API_KEY;
const BASE_URL = "https://dapi.kakao.com/v2/local";

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
}

// 위도·경도는 실DB 에서 null 일 수 있다(값이 없는 병원). 아래 if (lat && lng) 가 이미 걸러낸다.
async function searchKeyword(
  query: string,
  lat?: number | null,
  lng?: number | null,
): Promise<KakaoPlace | null> {
  const params = new URLSearchParams({
    query,
    category_group_code: "HP8",
    size: "1",
  });

  if (lat && lng) {
    params.set("y", lat.toString());
    params.set("x", lng.toString());
    params.set("radius", "500");
    params.set("sort", "distance");
  }

  const res = await fetch(`${BASE_URL}/search/keyword.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` },
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Kakao API 접근이 거부됨 - developers.kakao.com에서 Local API 활성화 필요");
    }
    throw new Error(`Kakao API ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.documents?.[0] || null;
}

export const kakaoMapSource: EnrichmentSource = {
  id: "kakao",
  name: "Kakao Map",
  description: "카카오맵 장소 정보, 카테고리, 전화번호, 장소 URL",
  icon: "MessageCircle",
  requiredEnvKeys: ["KAKAO_REST_API_KEY"],

  isAvailable() {
    return !!KAKAO_API_KEY;
  },

  async enrich(hospital: HospitalRow): Promise<EnrichmentResult> {
    const start = Date.now();

    try {
      const place = await searchKeyword(
        hospital.name,
        hospital.latitude,
        hospital.longitude,
      );

      if (!place) {
        return {
          sourceId: "kakao",
          success: false,
          data: {},
          metadata: { itemsCollected: [], duration: Date.now() - start },
          error: "카카오맵에서 해당 병원을 찾을 수 없습니다",
        };
      }

      const items: string[] = [];
      const data: Partial<HospitalRow> = {};
      const ext: Record<string, any> = { ...(hospital.external_ratings || {}) };

      ext.kakao = {
        place_id: place.id,
        place_url: place.place_url,
        category: place.category_name,
      };
      items.push("kakao_place");

      if (place.phone && !ext.phone) {
        ext.phone = place.phone;
        items.push("phone");
      }

      if (place.road_address_name && !hospital.location_kr) {
        data.location_kr = place.road_address_name;
        items.push("address");
      }

      if (place.category_name) {
        const categories = place.category_name.split(" > ").filter(Boolean);
        const newSpecs = categories.filter(
          (c) => c !== "의료,건강" && c !== "병원" && !(hospital.specialties || []).includes(c),
        );
        if (newSpecs.length > 0) {
          data.specialties = [...(hospital.specialties || []), ...newSpecs];
          items.push(`specialties:${newSpecs.length}`);
        }
      }

      data.external_ratings = ext;

      return {
        sourceId: "kakao",
        success: true,
        data,
        metadata: { itemsCollected: items, duration: Date.now() - start },
      };
    } catch (err: any) {
      return {
        sourceId: "kakao",
        success: false,
        data: {},
        metadata: { itemsCollected: [], duration: Date.now() - start },
        error: err.message,
      };
    }
  },
};
