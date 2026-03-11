/**
 * DB 직접 검색: hospitals/treatments 테이블을 복합 검색
 *
 * 검색 전략 (병원명 보존 — 오타 자동교정 금지):
 * 1. 쿼리에서 키워드 추출 (2자 이상, 원문 보존, 의미 교정 없음)
 * 2. hospitals: name ILIKE 매칭 (exact-first), 그 다음 description/tags/location
 * 3. treatments: name, description + join된 hospital 정보로 검색
 * 4. matchType: "exact" (name에 직접 매칭) vs "keyword" (description 등에서 매칭)
 */

import "server-only";

import { supabaseAdmin } from "../rag/supabaseAdmin";

const NOISE_WORDS = new Set([
  "소개", "설명", "알려", "어떤", "뭐야", "뭘", "어때", "좋아", "추천",
  "해줘", "해주세요", "알려줘", "알려주세요", "말해줘", "있어", "있나요",
  "하는", "하나요", "인가요", "일까", "볼까", "정보", "후기", "리뷰",
  "tell", "about", "what", "how", "please", "recommend", "show", "info",
]);

function extractKeywords(query: string): string[] {
  return query
    .replace(/[?？！!。.，,：:；;~\s]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((k) => k.length >= 2 && !NOISE_WORDS.has(k))
    .slice(0, 5);
}

const HOSPITAL_NAME_PATTERN = /([가-힣]+(?:병원|의원|클리닉|한방병원|한의원|센터))/;

function extractHospitalPhrase(query: string): string | null {
  const match = query.match(HOSPITAL_NAME_PATTERN);
  return match ? match[1] : null;
}

function buildNameOnlyFilter(keywords: string[], hospitalPhrase: string | null): string {
  const nameConditions: string[] = [];
  if (hospitalPhrase) {
    nameConditions.push(`name.ilike.%${hospitalPhrase}%`);
  }
  for (const k of keywords) {
    if (k.length >= 2 && k !== hospitalPhrase) {
      nameConditions.push(`name.ilike.%${k}%`);
    }
  }
  return nameConditions.length > 0 ? nameConditions.join(",") : "";
}

function buildBroadHospitalFilter(keywords: string[]): string {
  const conditions: string[] = [];
  for (const k of keywords) {
    conditions.push(
      `name.ilike.%${k}%`,
      `description.ilike.%${k}%`,
      `location_kr.ilike.%${k}%`,
      `location_en.ilike.%${k}%`,
    );
  }
  return conditions.join(",");
}

function buildTreatmentFilter(keywords: string[]): string {
  const conditions: string[] = [];
  for (const k of keywords) {
    conditions.push(
      `name.ilike.%${k}%`,
      `description.ilike.%${k}%`,
      `full_description.ilike.%${k}%`,
    );
  }
  return conditions.join(",");
}

function formatHospital(h: any): string {
  const loc = h.location_kr || h.location_en || "";
  const desc = (h.description || "").slice(0, 200);
  const tags = h.tags?.length ? ` | 전문: ${h.tags.slice(0, 5).join(", ")}` : "";
  const rating = h.rating ? ` | 평점: ${h.rating}` : "";
  return `• ${h.name}${loc ? ` (${loc})` : ""}: ${desc}${tags}${rating}`;
}

function groupBranches(hospitals: any[], hospitalPhrase: string | null): string {
  if (!hospitalPhrase || hospitals.length <= 1) {
    return "[HEALO 등록 병원]\n" + hospitals.map(formatHospital).join("\n");
  }

  const branches = hospitals.filter((h: any) =>
    h.name?.includes(hospitalPhrase)
  );
  const others = hospitals.filter((h: any) =>
    !h.name?.includes(hospitalPhrase)
  );

  const parts: string[] = [];

  if (branches.length > 0) {
    parts.push(
      `[HEALO 등록 병원 — ${hospitalPhrase} (${branches.length}개 지점)]`,
      ...branches.map(formatHospital)
    );
  }

  if (others.length > 0) {
    parts.push(
      "[HEALO 등록 병원 — 기타]",
      ...others.map(formatHospital)
    );
  }

  return parts.join("\n");
}

function formatTreatment(tr: any): string {
  const hospName = tr.hospitals?.name ? ` @ ${tr.hospitals.name}` : "";
  const hospLoc = tr.hospitals?.location_kr ? ` (${tr.hospitals.location_kr})` : "";
  const desc = (tr.description || "").slice(0, 200);
  const price =
    tr.price_min != null
      ? ` | 가격: $${tr.price_min}${tr.price_max ? `–$${tr.price_max}` : "+"}`
      : "";
  const tags = tr.tags?.length ? ` | 태그: ${tr.tags.slice(0, 4).join(", ")}` : "";
  return `• ${tr.name}${hospName}${hospLoc}: ${desc}${price}${tags}`;
}

export type HospitalMatchType = "exact" | "keyword" | "none";

export interface DbSearchResult {
  context: string;
  hospitalCount: number;
  treatmentCount: number;
  matchedHospitalNames: string[];
  hospitalMatchType: HospitalMatchType;
}

const EMPTY_RESULT: DbSearchResult = {
  context: "",
  hospitalCount: 0,
  treatmentCount: 0,
  matchedHospitalNames: [],
  hospitalMatchType: "none",
};

export async function searchHospitalsAndTreatments(
  query: string
): Promise<DbSearchResult> {
  const keywords = extractKeywords(query);
  const hospitalPhrase = extractHospitalPhrase(query);

  if (keywords.length === 0 && !hospitalPhrase) return { ...EMPTY_RESULT };

  let context = "";
  let hospitalCount = 0;
  let treatmentCount = 0;
  let matchedHospitalNames: string[] = [];
  let hospitalMatchType: HospitalMatchType = "none";

  try {
    // 1차: name-only partial match (ILIKE '%phrase%' — 모든 지점 반환)
    const nameFilter = buildNameOnlyFilter(keywords, hospitalPhrase);
    if (nameFilter) {
      const { data: nameMatched } = await supabaseAdmin
        .from("hospitals")
        .select("name, description, tags, location_kr, location_en, rating")
        .or(nameFilter)
        .eq("is_published", true)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(10);

      if (nameMatched?.length) {
        hospitalCount = nameMatched.length;
        matchedHospitalNames = nameMatched.map((h: any) => h.name);
        hospitalMatchType = "exact";
        context += "\n" + groupBranches(nameMatched, hospitalPhrase);
        console.log(`[dbSearch] EXACT name match (${hospitalCount}):`, matchedHospitalNames);
      }
    }

    if (hospitalCount === 0) {
      // 2차: broad keyword match (name + description + location)
      const searchKeywords = hospitalPhrase
        ? [hospitalPhrase, ...keywords.filter((k) => k !== hospitalPhrase)]
        : keywords;
      const broadFilter = buildBroadHospitalFilter(searchKeywords);
      const { data: broadMatched } = await supabaseAdmin
        .from("hospitals")
        .select("name, description, tags, location_kr, location_en, rating")
        .or(broadFilter)
        .eq("is_published", true)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(10);

      if (broadMatched?.length) {
        hospitalCount = broadMatched.length;
        matchedHospitalNames = broadMatched.map((h: any) => h.name);
        hospitalMatchType = "keyword";
        context += "\n" + groupBranches(broadMatched, hospitalPhrase);
        console.log(`[dbSearch] KEYWORD match (${hospitalCount}):`, matchedHospitalNames);
      } else {
        console.log(`[dbSearch] no hospital match for keywords:`, keywords, "phrase:", hospitalPhrase);
      }
    }
  } catch (e: any) {
    console.error("[dbSearch] hospital search failed:", e?.message || e);
  }

  try {
    const treatFilter = buildTreatmentFilter(keywords);
    const { data: treatments } = await supabaseAdmin
      .from("treatments")
      .select(
        "name, description, price_min, price_max, tags, hospitals(name, location_kr)"
      )
      .or(treatFilter)
      .eq("is_published", true)
      .limit(5);

    if (treatments?.length) {
      treatmentCount = treatments.length;
      context +=
        "\n[HEALO 등록 시술/프로그램]\n" +
        treatments.map(formatTreatment).join("\n");
    }
  } catch (e: any) {
    console.error("[dbSearch] treatment search failed:", e?.message || e);
  }

  return { context, hospitalCount, treatmentCount, matchedHospitalNames, hospitalMatchType };
}
