import type { CrawlSource, CrawlSearchParams, CrawlResult, CrawlHospitalRow, FieldMeta } from "../types";
import { SPECIALTY_GROUPS, getSearchKeywordsForGroups } from "../specialty-groups";

const API_KEY = process.env.KAKAO_REST_API_KEY || "";
const BASE_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

// 17개 시도 중심 좌표 — 가나다순
const REGIONS: Record<string, { label: string; x: number; y: number }> = {
  gangwon:   { label: "강원", x: 128.1555, y: 37.8228 },
  gyeonggi:  { label: "경기", x: 127.0094, y: 37.2750 },
  gyeongnam: { label: "경남", x: 128.6924, y: 35.2380 },
  gyeongbuk: { label: "경북", x: 128.5056, y: 36.5760 },
  gwangju:   { label: "광주", x: 126.8526, y: 35.1595 },
  daegu:     { label: "대구", x: 128.6014, y: 35.8714 },
  daejeon:   { label: "대전", x: 127.3845, y: 36.3504 },
  busan:     { label: "부산", x: 129.0756, y: 35.1796 },
  seoul:     { label: "서울", x: 126.9780, y: 37.5665 },
  sejong:    { label: "세종", x: 127.2590, y: 36.4800 },
  ulsan:     { label: "울산", x: 129.3114, y: 35.5384 },
  incheon:   { label: "인천", x: 126.7052, y: 37.4563 },
  jeonnam:   { label: "전남", x: 126.4629, y: 34.8161 },
  jeonbuk:   { label: "전북", x: 127.1089, y: 35.8203 },
  jeju:      { label: "제주", x: 126.5312, y: 33.4996 },
  chungnam:  { label: "충남", x: 126.6728, y: 36.6588 },
  chungbuk:  { label: "충북", x: 127.4913, y: 36.6357 },
};

// 진료과목은 공통 그룹 사용

const FIELDS: FieldMeta[] = [
  { key: "name",         label: "장소명",       description: "place_name — 장소명",                      category: "basic",    defaultOn: true },
  { key: "location_kr",  label: "도로명주소",   description: "road_address_name — 도로명 주소",          category: "location", defaultOn: true },
  { key: "address",      label: "지번주소",     description: "address_name — 지번 주소",                 category: "location", defaultOn: false },
  { key: "latitude",     label: "위도",         description: "y — 위도 좌표",                            category: "location", defaultOn: true },
  { key: "longitude",    label: "경도",         description: "x — 경도 좌표",                            category: "location", defaultOn: true },
  { key: "phone",        label: "전화번호",     description: "phone — 전화번호",                         category: "contact",  defaultOn: true },
  { key: "placeUrl",     label: "카카오맵 URL", description: "place_url — 카카오맵 상세 페이지 URL",     category: "contact",  defaultOn: true },
  { key: "category",     label: "카테고리",     description: "category_name — 의료,건강 > 병원 > 성형외과 등", category: "medical", defaultOn: true },
  { key: "categoryCode", label: "카테고리코드", description: "category_group_code — HP8(병원) 등",       category: "extra",    defaultOn: false },
  { key: "kakaoId",      label: "Kakao ID",     description: "id — 카카오 장소 고유 ID",                 category: "extra",    defaultOn: false },
  { key: "distance",     label: "검색거리(m)",  description: "distance — 중심좌표로부터 거리",           category: "extra",    defaultOn: false },
];

function mapItem(item: any, fields: Set<string>): CrawlHospitalRow {
  const meta: Record<string, any> = {};
  if (fields.has("kakaoId"))      meta.kakaoId = item.id;
  if (fields.has("category"))     meta.categoryName = item.category_name;
  if (fields.has("categoryCode")) meta.categoryGroupCode = item.category_group_code;
  if (fields.has("placeUrl"))     meta.placeUrl = item.place_url;
  if (fields.has("distance"))     meta.distance = item.distance;
  if (fields.has("address"))      meta.jibunAddress = item.address_name;

  return {
    name: item.place_name || "",
    location_kr: fields.has("location_kr") ? (item.road_address_name || item.address_name || "") : null,
    location_en: null,
    description: [item.category_name, item.road_address_name, item.phone].filter(Boolean).join(" | "),
    latitude: fields.has("latitude") && item.y ? Number(item.y) : null,
    longitude: fields.has("longitude") && item.x ? Number(item.x) : null,
    tags: (item.category_name || "").split(" > ").filter(Boolean),
    specialties: [],
    doctor_count: null,
    phone: fields.has("phone") ? (item.phone || null) : null,
    website: fields.has("placeUrl") ? (item.place_url || null) : null,
    _sourceId: "kakao_local",
    _dedupeKey: `kakao:${item.id || item.place_name}`,
    _meta: meta,
  };
}

export const kakaoLocalSource: CrawlSource = {
  id: "kakao_local",
  name: "Kakao 지도",
  description: "카카오맵 장소 검색 — 병원명, 주소, 전화, 카테고리, 카카오맵 URL",
  icon: "MessageCircle",
  regions: Object.entries(REGIONS).map(([key, v]) => ({ key, label: v.label })),
  specialties: SPECIALTY_GROUPS.map((g) => ({ key: g.key, label: g.label })),
  fields: FIELDS,
  requiredEnvKeys: ["KAKAO_REST_API_KEY"],

  isAvailable() { return !!API_KEY; },

  async search(params: CrawlSearchParams): Promise<CrawlResult> {
    const regionKeys = params.regions?.length ? params.regions : ["seoul"];
    const groupKeys = params.specialties?.length ? params.specialties : ["plastic"];
    const searchKeywords = getSearchKeywordsForGroups(groupKeys);
    const keyword = params.keyword || "";
    const limit = Math.min(params.limit || 15, 15);
    const selectedFields = new Set(
      params.fields?.length ? params.fields : FIELDS.filter((f) => f.defaultOn).map((f) => f.key)
    );

    const dedupeMap = new Map<string, CrawlHospitalRow>();

    for (const rKey of regionKeys) {
      const region = REGIONS[rKey] || REGIONS.seoul;
      for (const specLabel of searchKeywords) {
        const query = [keyword, specLabel, region.label].filter(Boolean).join(" ");

        try {
          const url = new URL(BASE_URL);
          url.searchParams.set("query", query);
          url.searchParams.set("category_group_code", "HP8");
          url.searchParams.set("x", String(region.x));
          url.searchParams.set("y", String(region.y));
          url.searchParams.set("radius", "10000");
          url.searchParams.set("size", String(limit));
          url.searchParams.set("sort", "accuracy");

          const res = await fetch(url.toString(), {
            headers: { Authorization: `KakaoAK ${API_KEY}` },
          });
          if (!res.ok) continue;
          const data = await res.json();
          for (const doc of data.documents || []) {
            const mapped = mapItem(doc, selectedFields);
            if (!dedupeMap.has(mapped._dedupeKey)) dedupeMap.set(mapped._dedupeKey, mapped);
          }
        } catch {}
      }
    }

    const items = Array.from(dedupeMap.values());
    return { sourceId: "kakao_local", total: items.length, items, hasMore: false };
  },
};
