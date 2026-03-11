/**
 * 진료과목 상위 그룹 정의
 *
 * 명칭 기준: ABMS(미국전문의위원회) + WHO ICD 분류 기반 국제 표준명
 * 한국어명은 대한의학회 공식 용어 사용
 *
 * HIRA는 hiraCodes로 세부 과목을 매핑,
 * Google/Kakao/Naver는 searchKeywords를 검색어로 사용.
 */

export interface SubSpecialty {
  code: string;
  name: string;
}

export interface SpecialtyGroup {
  key: string;
  label: string;
  labelEn: string;
  subSpecialties: SubSpecialty[];
  hiraCodes: string[];
  searchKeywords: string[];
}

export const SPECIALTY_GROUPS: SpecialtyGroup[] = [
  {
    key: "internal_medicine",
    label: "내과",
    labelEn: "Internal Medicine",
    subSpecialties: [{ code: "01", name: "내과" }],
    hiraCodes: ["01"],
    searchKeywords: ["내과"],
  },
  {
    key: "health_screening",
    label: "건강검진",
    labelEn: "Health Screening",
    subSpecialties: [
      { code: "23", name: "가정의학과" },
    ],
    hiraCodes: ["23"],
    searchKeywords: ["건강검진", "종합검진", "건강검진센터"],
  },
  {
    key: "neurosciences",
    label: "신경의학",
    labelEn: "Neurosciences",
    subSpecialties: [
      { code: "02", name: "신경과" },
      { code: "07", name: "신경외과" },
    ],
    hiraCodes: ["02", "07"],
    searchKeywords: ["신경과", "신경외과"],
  },
  {
    key: "urology",
    label: "비뇨의학",
    labelEn: "Urology",
    subSpecialties: [{ code: "15", name: "비뇨의학과" }],
    hiraCodes: ["15"],
    searchKeywords: ["비뇨의학과", "비뇨기과"],
  },
  {
    key: "obstetrics_gynecology",
    label: "산부인과",
    labelEn: "Obstetrics & Gynecology",
    subSpecialties: [{ code: "10", name: "산부인과" }],
    hiraCodes: ["10"],
    searchKeywords: ["산부인과"],
  },
  {
    key: "plastic_surgery",
    label: "성형외과",
    labelEn: "Plastic Surgery",
    subSpecialties: [{ code: "08", name: "성형외과" }],
    hiraCodes: ["08"],
    searchKeywords: ["성형외과"],
  },
  {
    key: "pediatrics",
    label: "소아청소년과",
    labelEn: "Pediatrics",
    subSpecialties: [{ code: "11", name: "소아청소년과" }],
    hiraCodes: ["11"],
    searchKeywords: ["소아청소년과", "소아과"],
  },
  {
    key: "ophthalmology",
    label: "안과",
    labelEn: "Ophthalmology",
    subSpecialties: [{ code: "12", name: "안과" }],
    hiraCodes: ["12"],
    searchKeywords: ["안과"],
  },
  {
    key: "general_surgery",
    label: "외과",
    labelEn: "General Surgery",
    subSpecialties: [
      { code: "04", name: "외과" },
      { code: "05", name: "흉부외과" },
    ],
    hiraCodes: ["04", "05"],
    searchKeywords: ["외과", "흉부외과"],
  },
  {
    key: "otolaryngology",
    label: "이비인후과",
    labelEn: "Otolaryngology",
    subSpecialties: [{ code: "13", name: "이비인후과" }],
    hiraCodes: ["13"],
    searchKeywords: ["이비인후과"],
  },
  {
    key: "rehabilitation",
    label: "재활의학",
    labelEn: "Rehabilitation Medicine",
    subSpecialties: [
      { code: "21", name: "재활의학과" },
      { code: "09", name: "마취통증의학과" },
    ],
    hiraCodes: ["21", "09"],
    searchKeywords: ["재활의학과", "마취통증의학과"],
  },
  {
    key: "psychiatry",
    label: "정신건강의학",
    labelEn: "Psychiatry",
    subSpecialties: [{ code: "03", name: "정신건강의학과" }],
    hiraCodes: ["03"],
    searchKeywords: ["정신건강의학과", "정신과"],
  },
  {
    key: "orthopedics",
    label: "정형외과",
    labelEn: "Orthopedics",
    subSpecialties: [{ code: "06", name: "정형외과" }],
    hiraCodes: ["06"],
    searchKeywords: ["정형외과"],
  },
  {
    key: "dentistry",
    label: "치과",
    labelEn: "Dentistry",
    subSpecialties: [
      { code: "49", name: "치과" },
      { code: "50", name: "구강악안면외과" },
      { code: "51", name: "치과교정과" },
      { code: "52", name: "소아치과" },
      { code: "53", name: "치주과" },
      { code: "54", name: "치과보철과" },
      { code: "55", name: "치과보존과" },
      { code: "56", name: "구강내과" },
      { code: "57", name: "구강병리과" },
      { code: "58", name: "영상치의학과" },
    ],
    hiraCodes: ["49", "50", "51", "52", "53", "54", "55", "56", "57", "58"],
    searchKeywords: ["치과"],
  },
  {
    key: "dermatology",
    label: "피부과",
    labelEn: "Dermatology",
    subSpecialties: [{ code: "14", name: "피부과" }],
    hiraCodes: ["14"],
    searchKeywords: ["피부과"],
  },
  {
    key: "korean_medicine",
    label: "한의학",
    labelEn: "Korean Medicine",
    subSpecialties: [
      { code: "28", name: "한방내과" },
      { code: "80", name: "한방부인과" },
      { code: "81", name: "한방소아과" },
      { code: "82", name: "한방안이비인후피부과" },
      { code: "83", name: "한방신경정신과" },
      { code: "84", name: "침구과" },
      { code: "85", name: "한방재활의학과" },
    ],
    hiraCodes: ["28", "80", "81", "82", "83", "84", "85"],
    searchKeywords: ["한의원", "한방병원"],
  },
  {
    key: "diagnostic_medicine",
    label: "진단의학",
    labelEn: "Diagnostic Medicine",
    subSpecialties: [
      { code: "16", name: "영상의학과" },
      { code: "17", name: "방사선종양학과" },
      { code: "18", name: "병리과" },
      { code: "19", name: "진단검사의학과" },
      { code: "22", name: "핵의학과" },
    ],
    hiraCodes: ["16", "17", "18", "19", "22"],
    searchKeywords: ["영상의학과", "진단검사의학과"],
  },
  {
    key: "emergency_medicine",
    label: "응급의학",
    labelEn: "Emergency Medicine",
    subSpecialties: [{ code: "24", name: "응급의학과" }],
    hiraCodes: ["24"],
    searchKeywords: ["응급의학과"],
  },
  {
    key: "other",
    label: "기타",
    labelEn: "Other",
    subSpecialties: [
      { code: "00", name: "일반의" },
      { code: "20", name: "결핵과" },
      { code: "25", name: "직업환경의학과" },
      { code: "26", name: "예방의학과" },
    ],
    hiraCodes: ["00", "20", "25", "26"],
    searchKeywords: ["병원"],
  },
];

export function getGroupByKey(key: string): SpecialtyGroup | undefined {
  return SPECIALTY_GROUPS.find((g) => g.key === key);
}

export function getHiraCodesForGroups(groupKeys: string[]): string[] {
  return groupKeys.flatMap((k) => getGroupByKey(k)?.hiraCodes || []);
}

export function getSearchKeywordsForGroups(groupKeys: string[]): string[] {
  return groupKeys.flatMap((k) => getGroupByKey(k)?.searchKeywords || []);
}
