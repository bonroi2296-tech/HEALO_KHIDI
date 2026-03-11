import type { CrawlSource, CrawlSearchParams, CrawlResult, CrawlHospitalRow, FieldMeta } from "../types";
import { SPECIALTY_GROUPS, getSearchKeywordsForGroups } from "../specialty-groups";

const CLIENT_ID = process.env.NAVER_CLIENT_ID || "";
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || "";
const BASE_URL = "https://openapi.naver.com/v1/search/local.json";

const REGIONS: Record<string, string> = {
  gangwon: "강원", gyeonggi: "경기", gyeongnam: "경남", gyeongbuk: "경북",
  gwangju: "광주", daegu: "대구", daejeon: "대전", busan: "부산",
  seoul: "서울", sejong: "세종", ulsan: "울산", incheon: "인천",
  jeonnam: "전남", jeonbuk: "전북", jeju: "제주", chungnam: "충남",
  chungbuk: "충북",
};

// 진료과목은 공통 그룹 사용

const FIELDS: FieldMeta[] = [
  { key: "name",        label: "업체명",       description: "title — 업체명 (HTML 태그 포함 가능)",       category: "basic",    defaultOn: true },
  { key: "location_kr", label: "도로명주소",   description: "roadAddress — 도로명 주소",                  category: "location", defaultOn: true },
  { key: "address",     label: "지번주소",     description: "address — 지번 주소",                        category: "location", defaultOn: false },
  { key: "latitude",    label: "위도",         description: "mapy — 위도 좌표 (KATECH → WGS84 변환)",    category: "location", defaultOn: true },
  { key: "longitude",   label: "경도",         description: "mapx — 경도 좌표 (KATECH → WGS84 변환)",    category: "location", defaultOn: true },
  { key: "phone",       label: "전화번호",     description: "telephone — 전화번호",                       category: "contact",  defaultOn: true },
  { key: "link",        label: "네이버 링크",  description: "link — 네이버 상세 페이지 URL",              category: "contact",  defaultOn: true },
  { key: "category",    label: "카테고리",     description: "category — 병원 > 성형외과 > 코성형 등",    category: "medical",  defaultOn: true },
  { key: "description", label: "설명",         description: "description — 업체 설명 텍스트",             category: "extra",    defaultOn: false },
];

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, "").trim();
}

function mapItem(item: any, fields: Set<string>): CrawlHospitalRow {
  const name = stripHtml(item.title || "");
  const addr = item.roadAddress || item.address || "";
  const phone = item.telephone || null;
  const link = item.link || null;

  const meta: Record<string, any> = {};
  if (fields.has("category"))    meta.category = item.category;
  if (fields.has("link"))        meta.link = link;
  if (fields.has("description")) meta.description = item.description;
  if (fields.has("address"))     meta.jibunAddress = item.address;

  return {
    name,
    location_kr: fields.has("location_kr") ? addr : null,
    location_en: null,
    description: [item.category, addr, phone].filter(Boolean).join(" | "),
    latitude: fields.has("latitude") && item.mapy ? Number(item.mapy) / 1e7 : null,
    longitude: fields.has("longitude") && item.mapx ? Number(item.mapx) / 1e7 : null,
    tags: (item.category || "").split(">").map((s: string) => s.trim()).filter(Boolean),
    specialties: [],
    doctor_count: null,
    phone: fields.has("phone") ? phone : null,
    website: fields.has("link") ? link : null,
    _sourceId: "naver_local",
    _dedupeKey: `naver:${name}:${addr}`,
    _meta: meta,
  };
}

export const naverLocalSource: CrawlSource = {
  id: "naver_local",
  name: "Naver 지역검색",
  description: "네이버 지역검색 — 병원명, 주소, 전화, 카테고리, 네이버 링크, 설명",
  icon: "Search",
  regions: Object.entries(REGIONS).map(([key, label]) => ({ key, label })),
  specialties: SPECIALTY_GROUPS.map((g) => ({ key: g.key, label: g.label })),
  fields: FIELDS,
  requiredEnvKeys: ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],

  isAvailable() { return !!(CLIENT_ID && CLIENT_SECRET); },

  async search(params: CrawlSearchParams): Promise<CrawlResult> {
    const regionLabels = params.regions?.length ? params.regions.map((r) => REGIONS[r] || r) : ["서울"];
    const groupKeys = params.specialties?.length ? params.specialties : ["plastic"];
    const searchKeywords = getSearchKeywordsForGroups(groupKeys);
    const keyword = params.keyword || "";
    const limit = Math.min(params.limit || 5, 5);
    const selectedFields = new Set(
      params.fields?.length ? params.fields : FIELDS.filter((f) => f.defaultOn).map((f) => f.key)
    );

    const dedupeMap = new Map<string, CrawlHospitalRow>();

    for (const regionLabel of regionLabels) {
      for (const specLabel of searchKeywords) {
        const query = [keyword, regionLabel, specLabel].filter(Boolean).join(" ");

        try {
          const url = new URL(BASE_URL);
          url.searchParams.set("query", query);
          url.searchParams.set("display", String(limit));
          url.searchParams.set("sort", "comment");

          const res = await fetch(url.toString(), {
            headers: {
              "X-Naver-Client-Id": CLIENT_ID,
              "X-Naver-Client-Secret": CLIENT_SECRET,
            },
          });
          if (!res.ok) continue;
          const data = await res.json();
          for (const item of data.items || []) {
            const mapped = mapItem(item, selectedFields);
            if (!dedupeMap.has(mapped._dedupeKey)) dedupeMap.set(mapped._dedupeKey, mapped);
          }
        } catch {}
      }
    }

    const items = Array.from(dedupeMap.values());
    return { sourceId: "naver_local", total: items.length, items, hasMore: false };
  },
};
