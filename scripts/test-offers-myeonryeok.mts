/**
 * 면력한방병원 대상 시술 자동생성(Preview) 파이프라인 테스트
 *
 * - DB에서 "면력"이 포함된 병원 1건 조회
 * - website가 있으면 해당 URL로, 없으면 테스트용 URL로 크롤 + LLM 추출
 * - 결과를 콘솔에 출력
 *
 * Usage: npx tsx scripts/test-offers-myeonryeok.mts
 * 필요: .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY 또는 OPENAI_API_KEY
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set .env.local");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// 파이프라인 모듈
const { crawlHospitalWebsite, normalizeWebsiteUrl } = await import("../src/lib/hospitalOffers/crawlPipeline.ts");
const { extractOffersFromText, isExtractOffersAvailable } = await import("../src/lib/hospitalOffers/extractOffersLLM.ts");

async function main() {
  console.log("=== 시술 자동생성 파이프라인 테스트 (면력한방병원) ===\n");

  const { data: hospitals, error: listError } = await supabase
    .from("hospitals")
    .select("id, name, slug, website")
    .or("name.ilike.%면력%,name.ilike.%immune%")
    .limit(1);

  if (listError) {
    console.error("DB 조회 실패:", listError.message);
    process.exit(1);
  }

  const hospital = hospitals?.[0];
  if (!hospital) {
    console.error("면력한방병원이 DB에 없습니다. seed-myeonryeok.cjs 실행 후 다시 시도하세요.");
    process.exit(1);
  }

  console.log("대상 병원:", hospital.name, "| id:", hospital.id);
  let website = (hospital.website || "").trim();
  let usedFallback = false;
  if (!website) {
    website = normalizeWebsiteUrl("https://immunehospital.com/");
    console.log("웹사이트 미등록 → 테스트 URL 사용:", website);
  } else {
    website = normalizeWebsiteUrl(website);
    console.log("웹사이트:", website);
  }

  console.log("\n1. 크롤링 중...");
  let crawl = await crawlHospitalWebsite(website);
  if (crawl.error) {
    const fallback = "https://example.com";
    console.warn("크롤 실패:", crawl.error);
    console.warn("→ 파이프라인 검증용 폴백 URL로 재시도:", fallback);
    crawl = await crawlHospitalWebsite(fallback);
    usedFallback = true;
  }
  if (crawl.error) {
    console.error("크롤 실패:", crawl.error);
    console.error("(네트워크/방화벽 확인. 관리자 UI에서 병원 웹사이트를 등록한 뒤 시도해 보세요.)");
    process.exit(1);
  }
  if (usedFallback) {
    console.log("   (폴백 URL로 수집 성공. 면력한방병원 실제 URL은 관리자에서 등록 후 다시 테스트하세요.)");
  }
  console.log("   수집 소스 수:", crawl.sources.length);
  console.log("   수집 텍스트 길이:", crawl.combinedText.length);
  if (crawl.combinedText.length > 0) {
    console.log("   텍스트 미리보기:", crawl.combinedText.slice(0, 200).replace(/\s+/g, " ") + "...");
  }

  if (!isExtractOffersAvailable()) {
    console.warn("\n2. LLM 미설정 (GOOGLE_GENERATIVE_AI_API_KEY 또는 OPENAI_API_KEY). 추출 건너뜀.");
    process.exit(0);
  }

  console.log("\n2. LLM 시술 추출 중...");
  const sourceUrls = crawl.sources.map((s) => s.url);
  const offers = await extractOffersFromText(crawl.combinedText, sourceUrls);
  console.log("   추출된 시술 수:", offers.length);
  if (offers.length > 0) {
    offers.forEach((o, i) => {
      console.log(`   [${i + 1}] ${o.treatment.name} (confidence: ${o.confidence})`);
    });
    console.log("\n전체 결과:", JSON.stringify(offers, null, 2));
  } else {
    console.log("   (추출된 시술 없음)");
  }
  console.log("\n=== 테스트 완료 ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
