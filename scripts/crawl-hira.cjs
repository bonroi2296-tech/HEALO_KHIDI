/**
 * HIRA (건강보험심사평가원) 병원 데이터 크롤링 스크립트
 *
 * 사전 조건:
 *   1. data.go.kr 회원가입 → "건강보험심사평가원_의료기관별상세정보서비스" 활용신청
 *   2. .env.local에 HIRA_API_KEY=<일반 인증키(Encoding)> 설정
 *
 * 사용법:
 *   node scripts/crawl-hira.cjs                          # 전국 전체 과목
 *   node scripts/crawl-hira.cjs --region seoul            # 서울만
 *   node scripts/crawl-hira.cjs --dept plastic,derma      # 성형+피부과만
 *   node scripts/crawl-hira.cjs --region seoul --dept plastic  # 서울 성형외과만
 *   node scripts/crawl-hira.cjs --enrich                  # 의료장비 보강 포함
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

// ============================================================
// 설정
// ============================================================

const API_KEY = process.env.HIRA_API_KEY;
if (!API_KEY) {
  console.error("HIRA_API_KEY가 .env.local에 설정되어 있지 않습니다.");
  console.error("data.go.kr에서 인증키를 발급받아 설정해주세요.");
  process.exit(1);
}

const BASE_URL = "http://apis.data.go.kr/B551182/hospInfoServicev2";

const REGIONS = {
  seoul:   { code: "110000", name: "서울" },
  busan:   { code: "260000", name: "부산" },
  daegu:   { code: "270000", name: "대구" },
  incheon: { code: "280000", name: "인천" },
  gwangju: { code: "290000", name: "광주" },
  daejeon: { code: "300000", name: "대전" },
  ulsan:   { code: "310000", name: "울산" },
  sejong:  { code: "360000", name: "세종" },
  gyeonggi:{ code: "410000", name: "경기" },
  jeju:    { code: "390000", name: "제주" },
};

const DEPARTMENTS = {
  plastic: { code: "08", name: "성형외과" },
  derma:   { code: "14", name: "피부과" },
  dental:  { code: "49", name: "치과" },
  eye:     { code: "12", name: "안과" },
  korean1: { code: "28", name: "한방내과" },
  korean2: { code: "80", name: "한방부인과" },
  korean3: { code: "81", name: "한방소아과" },
};

const ROWS_PER_PAGE = 100;
const REQUEST_DELAY_MS = 350;

// ============================================================
// CLI 인자 파싱
// ============================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { regions: null, depts: null, enrich: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--region" && args[i + 1]) {
      opts.regions = args[++i].split(",").map((s) => s.trim().toLowerCase());
    } else if (args[i] === "--dept" && args[i + 1]) {
      opts.depts = args[++i].split(",").map((s) => s.trim().toLowerCase());
    } else if (args[i] === "--enrich") {
      opts.enrich = true;
    }
  }

  return opts;
}

// ============================================================
// API 호출 유틸
// ============================================================

let totalApiCalls = 0;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchApi(endpoint, params) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("_type", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  totalApiCalls++;
  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText} — ${url.toString()}`);
  }

  const json = await res.json();

  const header = json?.response?.header;
  if (header && header.resultCode !== "00") {
    throw new Error(`API Error [${header.resultCode}]: ${header.resultMsg}`);
  }

  return json?.response?.body;
}

// ============================================================
// 기본 병원 목록 수집
// ============================================================

async function fetchHospitalList(sidoCd, dgsbjtCd) {
  const hospitals = [];
  let pageNo = 1;
  let totalCount = null;

  while (true) {
    const body = await fetchApi("getHospBasisList", {
      sidoCd,
      dgsbjtCd,
      numOfRows: ROWS_PER_PAGE,
      pageNo,
    });

    if (!body) break;

    if (totalCount === null) {
      totalCount = body.totalCount || 0;
    }

    const items = body.items?.item;
    if (!items) break;

    const list = Array.isArray(items) ? items : [items];
    hospitals.push(...list);

    if (hospitals.length >= totalCount || list.length < ROWS_PER_PAGE) break;

    pageNo++;
    await sleep(REQUEST_DELAY_MS);
  }

  return { hospitals, totalCount: totalCount || 0 };
}

// ============================================================
// 의료장비 보강 (선택)
// ============================================================

async function fetchEquipment(ykiho) {
  try {
    const body = await fetchApi("getHospBasisItem", {
      ykiho,
      numOfRows: 50,
      pageNo: 1,
    });

    const items = body?.items?.item;
    if (!items) return [];
    const list = Array.isArray(items) ? items : [items];
    return list
      .map((i) => i.typeCdNm || i.eqpNm)
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ============================================================
// HIRA → HEALO 스키마 매핑
// ============================================================

function mapToHealo(item, deptName) {
  const name = (item.yadmNm || "").trim();
  const addr = (item.addr || "").trim();
  const clCdNm = (item.clCdNm || "").trim();

  const tags = [deptName];
  if (clCdNm && !tags.includes(clCdNm)) tags.push(clCdNm);

  const regionTag = extractRegionTag(addr);
  if (regionTag) tags.push(regionTag);

  return {
    name,
    location_kr: addr,
    location_en: null,
    address_detail: null,
    description: [clCdNm, deptName, addr].filter(Boolean).join(" | "),
    latitude: item.YPos ? Number(item.YPos) : null,
    longitude: item.XPos ? Number(item.XPos) : null,
    tags,
    images: [],
    supported_languages: ["한국어"],
    amenities: [],
    specialties: [deptName],
    medical_equipment: item._equipment || [],
    operating_hours: null,
    doctor_profile: null,
    certifications: [],
    insurance_accepted: false,
    insurance_details: null,
    doctor_count: item.drTotCnt ? Number(item.drTotCnt) : null,
    external_ratings: null,
    display_order: null,
    is_published: false,
    _meta: {
      ykiho: item.ykiho,
      telno: item.telno || null,
      hospUrl: item.hospUrl || null,
      clCd: item.clCd,
      clCdNm,
      dgsbjtCd: item._dgsbjtCd,
      dgsbjtNm: deptName,
      crawledAt: new Date().toISOString(),
    },
  };
}

function extractRegionTag(addr) {
  if (!addr) return null;
  const match = addr.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|제주)/);
  return match ? match[1] : null;
}

// ============================================================
// 메인 크롤링 로직
// ============================================================

async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  const regionKeys = opts.regions || Object.keys(REGIONS);
  const deptKeys = opts.depts || Object.keys(DEPARTMENTS);

  const invalidRegions = regionKeys.filter((r) => !REGIONS[r]);
  if (invalidRegions.length > 0) {
    console.error(`알 수 없는 지역: ${invalidRegions.join(", ")}`);
    console.error(`사용 가능: ${Object.keys(REGIONS).join(", ")}`);
    process.exit(1);
  }
  const invalidDepts = deptKeys.filter((d) => !DEPARTMENTS[d]);
  if (invalidDepts.length > 0) {
    console.error(`알 수 없는 과목: ${invalidDepts.join(", ")}`);
    console.error(`사용 가능: ${Object.keys(DEPARTMENTS).join(", ")}`);
    process.exit(1);
  }

  console.log("=== HIRA 병원 데이터 크롤링 ===\n");
  console.log(`지역: ${regionKeys.map((r) => REGIONS[r].name).join(", ")}`);
  console.log(`과목: ${deptKeys.map((d) => DEPARTMENTS[d].name).join(", ")}`);
  console.log(`장비 보강: ${opts.enrich ? "ON" : "OFF"}\n`);

  const allHospitals = new Map(); // ykiho → hospital (중복 제거)
  let fetchErrors = 0;

  for (const regionKey of regionKeys) {
    const region = REGIONS[regionKey];

    for (const deptKey of deptKeys) {
      const dept = DEPARTMENTS[deptKey];
      process.stdout.write(`[${region.name}] ${dept.name} 수집 중...`);

      try {
        const { hospitals, totalCount } = await fetchHospitalList(region.code, dept.code);
        process.stdout.write(` ${hospitals.length}/${totalCount}건\n`);

        for (const h of hospitals) {
          h._dgsbjtCd = dept.code;
          const key = h.ykiho || `${h.yadmNm}_${h.addr}`;

          if (allHospitals.has(key)) {
            const existing = allHospitals.get(key);
            if (!existing.specialties.includes(dept.name)) {
              existing.specialties.push(dept.name);
            }
            if (!existing.tags.includes(dept.name)) {
              existing.tags.push(dept.name);
            }
          } else {
            const mapped = mapToHealo(h, dept.name);
            allHospitals.set(key, mapped);
          }
        }
      } catch (err) {
        fetchErrors++;
        process.stdout.write(` 오류: ${err.message}\n`);
      }

      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`\n기본 수집 완료: ${allHospitals.size}개 병원 (API 호출 ${totalApiCalls}회)\n`);

  // 의료장비 보강 (옵션)
  if (opts.enrich) {
    console.log("의료장비 보강 시작...");
    let enriched = 0;
    let enrichErrors = 0;
    const entries = [...allHospitals.entries()];

    for (let i = 0; i < entries.length; i++) {
      const [key, hospital] = entries[i];
      const ykiho = hospital._meta?.ykiho;
      if (!ykiho) continue;

      if (totalApiCalls >= 9500) {
        console.log(`  API 호출 한도 근접 (${totalApiCalls}회), 장비 보강 중단`);
        break;
      }

      try {
        const equipment = await fetchEquipment(ykiho);
        if (equipment.length > 0) {
          hospital.medical_equipment = equipment;
          enriched++;
        }
      } catch {
        enrichErrors++;
      }

      if ((i + 1) % 100 === 0) {
        process.stdout.write(`  ${i + 1}/${entries.length} 처리 (보강 ${enriched}건)\n`);
      }

      await sleep(REQUEST_DELAY_MS);
    }

    console.log(`장비 보강 완료: ${enriched}건 (오류 ${enrichErrors}건)\n`);
  }

  // 결과 정리 — _meta 필드에서 전화번호/URL을 description에 추가
  const results = [...allHospitals.values()].map((h) => {
    const parts = [h.description];
    if (h._meta?.telno) parts.push(`Tel: ${h._meta.telno}`);
    if (h._meta?.hospUrl) parts.push(h._meta.hospUrl);
    h.description = parts.join(" | ");

    const meta = h._meta;
    delete h._meta;
    h.__hira_meta = meta; // Import에서 무시되지만 디버깅용으로 보존
    return h;
  });

  // 출력
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const regionSuffix = opts.regions ? opts.regions.join("-") : "nationwide";
  const deptSuffix = opts.depts ? opts.depts.join("-") : "all";
  const fileName = `hira-hospitals-${regionSuffix}-${deptSuffix}-${dateStr}.json`;
  const outputPath = path.join(outputDir, fileName);

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("=== 결과 ===");
  console.log(`총 병원 수: ${results.length}`);
  console.log(`API 호출 수: ${totalApiCalls}`);
  console.log(`수집 오류: ${fetchErrors}건`);
  console.log(`소요 시간: ${elapsed}초`);
  console.log(`출력 파일: ${outputPath}`);
  console.log(`\n다음 단계: /admin/import 에서 이 JSON 파일을 업로드하세요.`);

  // Import 호환용 파일 (순수 HEALO 스키마, __hira_meta 제거)
  const cleanResults = results.map((h) => {
    const { __hira_meta, ...clean } = h;
    return clean;
  });
  const cleanFileName = `hira-import-${regionSuffix}-${deptSuffix}-${dateStr}.json`;
  const cleanPath = path.join(outputDir, cleanFileName);
  fs.writeFileSync(cleanPath, JSON.stringify(cleanResults, null, 2), "utf-8");
  console.log(`Import용 파일: ${cleanPath}`);
}

main().catch((err) => {
  console.error("\n치명적 오류:", err);
  process.exit(1);
});
