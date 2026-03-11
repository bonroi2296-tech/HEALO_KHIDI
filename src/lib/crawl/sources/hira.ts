import type { CrawlSource, CrawlSearchParams, CrawlResult, CrawlHospitalRow, FieldMeta } from "../types";
import { SPECIALTY_GROUPS, getHiraCodesForGroups } from "../specialty-groups";

const API_KEY = process.env.HIRA_API_KEY || "";
const BASE_URL = "http://apis.data.go.kr/B551182/hospInfoServicev2";

// HIRA 공식 시도코드 (요양기관기호지역구분코드) — 가나다순
const REGIONS: Record<string, { code: string; name: string }> = {
  gangwon:   { code: "320000", name: "강원" },
  gyeonggi:  { code: "310000", name: "경기" },
  gyeongnam: { code: "380000", name: "경남" },
  gyeongbuk: { code: "370000", name: "경북" },
  gwangju:   { code: "240000", name: "광주" },
  daegu:     { code: "230000", name: "대구" },
  daejeon:   { code: "250000", name: "대전" },
  busan:     { code: "210000", name: "부산" },
  seoul:     { code: "110000", name: "서울" },
  sejong:    { code: "410000", name: "세종" },
  ulsan:     { code: "260000", name: "울산" },
  incheon:   { code: "220000", name: "인천" },
  jeonnam:   { code: "360000", name: "전남" },
  jeonbuk:   { code: "350000", name: "전북" },
  jeju:      { code: "390000", name: "제주" },
  chungnam:  { code: "340000", name: "충남" },
  chungbuk:  { code: "330000", name: "충북" },
};

// HIRA 진료과목코드 (dgsbjtCd) — 전체
const DEPARTMENTS: Record<string, { code: string; name: string }> = {
  general:     { code: "00", name: "일반의" },
  internal:    { code: "01", name: "내과" },
  neurology:   { code: "02", name: "신경과" },
  psychiatry:  { code: "03", name: "정신건강의학과" },
  surgery:     { code: "04", name: "외과" },
  thoracic:    { code: "05", name: "흉부외과" },
  ortho:       { code: "06", name: "정형외과" },
  neurosurg:   { code: "07", name: "신경외과" },
  plastic:     { code: "08", name: "성형외과" },
  anesthesia:  { code: "09", name: "마취통증의학과" },
  obgyn:       { code: "10", name: "산부인과" },
  pediatric:   { code: "11", name: "소아청소년과" },
  eye:         { code: "12", name: "안과" },
  ent:         { code: "13", name: "이비인후과" },
  derma:       { code: "14", name: "피부과" },
  urology:     { code: "15", name: "비뇨의학과" },
  radiology:   { code: "16", name: "영상의학과" },
  radiation:   { code: "17", name: "방사선종양학과" },
  pathology:   { code: "18", name: "병리과" },
  labmed:      { code: "19", name: "진단검사의학과" },
  tb:          { code: "20", name: "결핵과" },
  rehab:       { code: "21", name: "재활의학과" },
  nuclear:     { code: "22", name: "핵의학과" },
  family:      { code: "23", name: "가정의학과" },
  emergency:   { code: "24", name: "응급의학과" },
  occup:       { code: "25", name: "직업환경의학과" },
  preventive:  { code: "26", name: "예방의학과" },
  korean_int:  { code: "28", name: "한방내과" },
  dental:      { code: "49", name: "치과" },
  oral_surg:   { code: "50", name: "구강악안면외과" },
  orthodont:   { code: "51", name: "치과교정과" },
  pedodont:    { code: "52", name: "소아치과" },
  perio:       { code: "53", name: "치주과" },
  prosthod:    { code: "54", name: "치과보철과" },
  conserv:     { code: "55", name: "치과보존과" },
  oral_med:    { code: "56", name: "구강내과" },
  oral_path:   { code: "57", name: "구강병리과" },
  oral_radio:  { code: "58", name: "영상치의학과" },
  korean_ob:   { code: "80", name: "한방부인과" },
  korean_ped:  { code: "81", name: "한방소아과" },
  korean_ent:  { code: "82", name: "한방안이비인후피부과" },
  korean_psy:  { code: "83", name: "한방신경정신과" },
  acupunc:     { code: "84", name: "침구과" },
  korean_reh:  { code: "85", name: "한방재활의학과" },
};

// 코드 → 과목명 역매핑
const DEPT_BY_CODE: Record<string, string> = {};
for (const [, v] of Object.entries(DEPARTMENTS)) {
  DEPT_BY_CODE[v.code] = v.name;
}

// HIRA getHospBasisList 응답 필드 전체
const FIELDS: FieldMeta[] = [
  // 기본 정보
  { key: "name",            label: "병원명",         description: "yadmNm — 요양기관명",                    category: "basic",    defaultOn: true },
  { key: "clCdNm",          label: "종별구분",       description: "clCdNm — 상급종합/종합/병원/의원/한의원", category: "basic",    defaultOn: true },
  { key: "specialties",     label: "진료과목",       description: "dgsbjtCdNm — 진료과목명",                 category: "basic",    defaultOn: true },
  // 위치
  { key: "location_kr",     label: "주소",           description: "addr — 전체 주소",                        category: "location", defaultOn: true },
  { key: "latitude",        label: "위도",           description: "YPos — GPS 위도",                         category: "location", defaultOn: true },
  { key: "longitude",       label: "경도",           description: "XPos — GPS 경도",                         category: "location", defaultOn: true },
  { key: "sidoCdNm",        label: "시도",           description: "sidoCdNm — 시도명",                       category: "location", defaultOn: false },
  { key: "sgguCdNm",        label: "시군구",         description: "sgguCdNm — 시군구명",                     category: "location", defaultOn: false },
  { key: "emdongNm",        label: "읍면동",         description: "emdongNm — 읍면동명",                     category: "location", defaultOn: false },
  { key: "postNo",          label: "우편번호",       description: "postNo — 우편번호",                       category: "location", defaultOn: false },
  // 연락처
  { key: "phone",           label: "전화번호",       description: "telno — 대표 전화번호",                   category: "contact",  defaultOn: true },
  { key: "website",         label: "홈페이지",       description: "hospUrl — 병원 홈페이지 URL",             category: "contact",  defaultOn: true },
  // 의료 인력
  { key: "doctor_count",    label: "의사 총수",      description: "drTotCnt — 전체 의사 수",                 category: "medical",  defaultOn: true },
  { key: "specialist_cnt",  label: "전문의 수",      description: "detyGdrCnt — 전문의 수",                  category: "medical",  defaultOn: false },
  { key: "gp_cnt",          label: "일반의 수",      description: "detyGnlMdCnt — 일반의 수",                category: "medical",  defaultOn: false },
  { key: "intern_cnt",      label: "인턴 수",        description: "detyIntnCnt — 인턴 수",                   category: "medical",  defaultOn: false },
  { key: "resident_cnt",    label: "레지던트 수",    description: "detyResdCnt — 레지던트 수",               category: "medical",  defaultOn: false },
  { key: "dental_dr_cnt",   label: "치과의사 수",    description: "sdrCnt — 치과의사 수",                    category: "medical",  defaultOn: false },
  { key: "km_specialist",   label: "한방전문의 수",  description: "cmdcGdrCnt — 한방전문의 수",              category: "medical",  defaultOn: false },
  { key: "km_gp",           label: "한방일반의 수",  description: "cmdcGnlMdCnt — 한방일반의 수",            category: "medical",  defaultOn: false },
  { key: "nurse_cnt",       label: "간호사 수",      description: "pnursCnt — 간호사 수",                    category: "medical",  defaultOn: false },
  // 시설
  { key: "bed_cnt",         label: "병상 수",        description: "hospBdCnt — 허가 병상 수",                category: "medical",  defaultOn: false },
  { key: "emy_day",         label: "응급실(주간)",   description: "emyDayYn — 응급실 주간 운영 여부 (Y/N)",  category: "medical",  defaultOn: false },
  { key: "emy_night",       label: "응급실(야간)",   description: "emyNgtYn — 응급실 야간 운영 여부 (Y/N)",  category: "medical",  defaultOn: false },
  // 기타
  { key: "ykiho",           label: "요양기관기호",   description: "ykiho — 고유 식별키 (중복검사·장비조회용)",category: "extra",    defaultOn: false },
  { key: "estbDd",          label: "개설일",         description: "estbDd — 개설일자 (YYYYMMDD)",            category: "extra",    defaultOn: false },
  { key: "clCd",            label: "종별코드",       description: "clCd — 종별 코드 (01,11,21,28...)",      category: "extra",    defaultOn: false },
];

const ROWS_PER_PAGE = 100;
const DELAY_MS = 350;

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchApi(endpoint: string, params: Record<string, string | number>) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("serviceKey", API_KEY);
  url.searchParams.set("_type", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HIRA API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  const header = json?.response?.header;
  if (header && header.resultCode !== "00") throw new Error(`HIRA [${header.resultCode}]: ${header.resultMsg}`);
  return json?.response?.body;
}

function mapItem(item: any, deptName: string, fields: Set<string>): CrawlHospitalRow {
  const name = (item.yadmNm || "").trim();
  const addr = (item.addr || "").trim();
  const clCdNm = (item.clCdNm || "").trim();
  const phone = item.telno || null;
  const website = item.hospUrl || null;

  const descParts = [clCdNm, deptName, addr];
  if (phone) descParts.push(`Tel: ${phone}`);
  if (website) descParts.push(website);

  const meta: Record<string, any> = { ykiho: item.ykiho };
  if (fields.has("clCdNm"))         meta.clCdNm = clCdNm;
  if (fields.has("clCd"))           meta.clCd = item.clCd;
  if (fields.has("specialist_cnt")) meta.specialist_cnt = Number(item.detyGdrCnt) || null;
  if (fields.has("gp_cnt"))         meta.gp_cnt = Number(item.detyGnlMdCnt) || null;
  if (fields.has("intern_cnt"))     meta.intern_cnt = Number(item.detyIntnCnt) || null;
  if (fields.has("resident_cnt"))   meta.resident_cnt = Number(item.detyResdCnt) || null;
  if (fields.has("dental_dr_cnt"))  meta.dental_dr_cnt = Number(item.sdrCnt) || null;
  if (fields.has("km_specialist"))  meta.km_specialist = Number(item.cmdcGdrCnt) || null;
  if (fields.has("km_gp"))          meta.km_gp = Number(item.cmdcGnlMdCnt) || null;
  if (fields.has("nurse_cnt"))      meta.nurse_cnt = Number(item.pnursCnt) || null;
  if (fields.has("bed_cnt"))        meta.bed_cnt = Number(item.hospBdCnt) || null;
  if (fields.has("emy_day"))        meta.emy_day = item.emyDayYn || null;
  if (fields.has("emy_night"))      meta.emy_night = item.emyNgtYn || null;
  if (fields.has("sidoCdNm"))       meta.sidoCdNm = item.sidoCdNm || null;
  if (fields.has("sgguCdNm"))       meta.sgguCdNm = item.sgguCdNm || null;
  if (fields.has("emdongNm"))       meta.emdongNm = item.emdongNm || null;
  if (fields.has("postNo"))         meta.postNo = item.postNo || null;
  if (fields.has("estbDd"))         meta.estbDd = item.estbDd || null;

  return {
    name,
    location_kr: fields.has("location_kr") ? addr : null,
    location_en: null,
    description: descParts.filter(Boolean).join(" | "),
    latitude: fields.has("latitude") && item.YPos ? Number(item.YPos) : null,
    longitude: fields.has("longitude") && item.XPos ? Number(item.XPos) : null,
    tags: [deptName, clCdNm].filter(Boolean),
    specialties: fields.has("specialties") ? [deptName] : [],
    doctor_count: fields.has("doctor_count") && item.drTotCnt ? Number(item.drTotCnt) : null,
    phone: fields.has("phone") ? phone : null,
    website: fields.has("website") ? website : null,
    _sourceId: "hira",
    _dedupeKey: `hira:${item.ykiho || `${name}:${addr}`}`,
    _meta: meta,
  };
}

export const hiraCrawlSource: CrawlSource = {
  id: "hira",
  name: "HIRA (건강보험심사평가원)",
  description: "전국 의료기관 공식 데이터 — 병원명, 주소, 진료과, 의사수, 병상수, 응급실, 전화번호 등",
  icon: "Building2",
  regions: Object.entries(REGIONS).map(([key, v]) => ({ key, label: v.name })),
  specialties: SPECIALTY_GROUPS.map((g) => ({ key: g.key, label: g.label })),
  fields: FIELDS,
  requiredEnvKeys: ["HIRA_API_KEY"],

  isAvailable() { return !!API_KEY; },

  async search(params: CrawlSearchParams): Promise<CrawlResult> {
    const regionKeys = params.regions?.length ? params.regions : [null];
    const groupKeys = params.specialties?.length ? params.specialties : ["plastic"];
    const hiraCodes = getHiraCodesForGroups(groupKeys);
    const limit = Math.min(params.limit || ROWS_PER_PAGE, ROWS_PER_PAGE);
    const pageNo = params.page || 1;
    const selectedFields = new Set(
      params.fields?.length ? params.fields : FIELDS.filter((f) => f.defaultOn).map((f) => f.key)
    );

    const dedupeMap = new Map<string, CrawlHospitalRow>();
    let totalCount = 0;
    let hasMore = false;

    for (const regionKey of regionKeys) {
      const region = regionKey ? REGIONS[regionKey] : null;
      for (const code of hiraCodes) {
        const dept = DEPT_BY_CODE[code];
        if (!dept) continue;

        const apiParams: Record<string, string | number> = { dgsbjtCd: code, numOfRows: limit, pageNo };
        if (region) apiParams.sidoCd = region.code;
        if (params.keyword) apiParams.yadmNm = params.keyword;

        try {
          const body = await fetchApi("getHospBasisList", apiParams);
          totalCount += body?.totalCount || 0;
          if (pageNo * limit < (body?.totalCount || 0)) hasMore = true;

          const rawItems = body?.items?.item;
          if (!rawItems) continue;
          const list = Array.isArray(rawItems) ? rawItems : [rawItems];

          for (const item of list) {
            const mapped = mapItem(item, dept.name, selectedFields);
            const existing = dedupeMap.get(mapped._dedupeKey);
            if (existing) {
              if (!existing.specialties.includes(dept.name)) existing.specialties.push(dept.name);
              if (!existing.tags.includes(dept.name)) existing.tags.push(dept.name);
            } else {
              dedupeMap.set(mapped._dedupeKey, mapped);
            }
          }
        } catch {}
        await sleep(DELAY_MS);
      }
    }

    return { sourceId: "hira", total: totalCount, items: Array.from(dedupeMap.values()), hasMore };
  },
};
