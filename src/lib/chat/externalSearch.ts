/**
 * 외부 API 검색: HIRA 공공데이터 + 네이버 지역 검색 병렬 호출
 *
 * 챗봇에서 healwith DB(RAG + 직접검색) 결과가 부족할 때 사용.
 * Promise.allSettled로 병렬 호출, 개별 3초 타임아웃.
 * API 키가 없으면 해당 소스는 조용히 스킵.
 */

import "server-only";

const HIRA_API_KEY = process.env.HIRA_API_KEY || "";
const HIRA_BASE_URL = "http://apis.data.go.kr/B551182/hospInfoServicev2";

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || "";
const NAVER_LOCAL_URL = "https://openapi.naver.com/v1/search/local.json";

const TIMEOUT_MS = 3000;

function stripHtml(str: string): string {
  return (str || "").replace(/<[^>]+>/g, "").trim();
}

// ─── HIRA 공공 API ───

interface HIRAItem {
  name: string;
  type: string;
  address: string;
  phone: string | null;
  specialties: string;
  doctorCount: number | null;
}

async function searchHIRA(query: string): Promise<HIRAItem[]> {
  if (!HIRA_API_KEY) return [];

  const url = new URL(`${HIRA_BASE_URL}/getHospBasisList`);
  url.searchParams.set("serviceKey", HIRA_API_KEY);
  url.searchParams.set("_type", "json");
  url.searchParams.set("numOfRows", "5");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("yadmNm", query.trim());

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HIRA ${res.status}`);

  const json = await res.json();
  const header = json?.response?.header;
  if (header?.resultCode !== "00") {
    throw new Error(`HIRA [${header?.resultCode}]: ${header?.resultMsg}`);
  }

  const raw = json?.response?.body?.items?.item;
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : [raw];

  return items.map((it: any) => ({
    name: (it.yadmNm || "").trim(),
    type: (it.clCdNm || "").trim(),
    address: (it.addr || "").trim(),
    phone: it.telno || null,
    specialties: (it.dgsbjtCdNm || "").trim(),
    doctorCount: it.drTotCnt ? Number(it.drTotCnt) : null,
  }));
}

function formatHIRAResults(items: HIRAItem[]): string {
  if (!items.length) return "";
  const lines = items.map((h) => {
    const parts = [h.name];
    if (h.type) parts.push(`(${h.type})`);
    if (h.address) parts.push(`- ${h.address}`);
    if (h.specialties) parts.push(`| 진료과: ${h.specialties}`);
    if (h.phone) parts.push(`| Tel: ${h.phone}`);
    if (h.doctorCount) parts.push(`| 의사 ${h.doctorCount}명`);
    return `• ${parts.join(" ")}`;
  });
  return `[공공 의료데이터 - HIRA]\n${lines.join("\n")}`;
}

// ─── 네이버 지역 검색 ───

interface NaverItem {
  name: string;
  address: string;
  phone: string | null;
  category: string;
  link: string | null;
}

async function searchNaver(query: string): Promise<NaverItem[]> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) return [];

  const searchQuery = query.includes("병원") || query.includes("의원") || query.includes("클리닉")
    ? query.trim()
    : `${query.trim()} 병원`;

  const url = new URL(NAVER_LOCAL_URL);
  url.searchParams.set("query", searchQuery);
  url.searchParams.set("display", "5");
  url.searchParams.set("sort", "comment");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Naver ${res.status}`);

  const data = await res.json();
  const items = Array.isArray(data?.items) ? data.items : [];

  return items.map((it: any) => ({
    name: stripHtml(it.title || ""),
    address: it.roadAddress || it.address || "",
    phone: it.telephone || null,
    category: it.category || "",
    link: it.link || null,
  }));
}

function formatNaverResults(items: NaverItem[]): string {
  if (!items.length) return "";
  const lines = items.map((n) => {
    const parts = [n.name];
    if (n.category) parts.push(`(${n.category})`);
    if (n.address) parts.push(`- ${n.address}`);
    if (n.phone) parts.push(`| Tel: ${n.phone}`);
    return `• ${parts.join(" ")}`;
  });
  return `[네이버 검색]\n${lines.join("\n")}`;
}

// ─── 통합 병렬 검색 ───

export interface ExternalSearchResult {
  context: string;
  hiraCount: number;
  naverCount: number;
  sources: ("hira" | "naver")[];
}

export async function searchExternal(query: string): Promise<ExternalSearchResult> {
  const keywords = query
    .replace(/[?？！!。.，,：:；;~\s]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((k) => k.length >= 2);

  if (keywords.length === 0) {
    return { context: "", hiraCount: 0, naverCount: 0, sources: [] };
  }

  const searchTerm = keywords.slice(0, 4).join(" ");

  const [hiraResult, naverResult] = await Promise.allSettled([
    searchHIRA(searchTerm),
    searchNaver(searchTerm),
  ]);

  const hiraItems = hiraResult.status === "fulfilled" ? hiraResult.value : [];
  const naverItems = naverResult.status === "fulfilled" ? naverResult.value : [];

  if (hiraResult.status === "rejected") {
    console.warn("[externalSearch] HIRA failed:", hiraResult.reason?.message || hiraResult.reason);
  }
  if (naverResult.status === "rejected") {
    console.warn("[externalSearch] Naver failed:", naverResult.reason?.message || naverResult.reason);
  }

  const parts: string[] = [];
  const sources: ("hira" | "naver")[] = [];

  const hiraFormatted = formatHIRAResults(hiraItems);
  if (hiraFormatted) {
    parts.push(hiraFormatted);
    sources.push("hira");
  }

  const naverFormatted = formatNaverResults(naverItems);
  if (naverFormatted) {
    parts.push(naverFormatted);
    sources.push("naver");
  }

  return {
    context: parts.join("\n\n"),
    hiraCount: hiraItems.length,
    naverCount: naverItems.length,
    sources,
  };
}
