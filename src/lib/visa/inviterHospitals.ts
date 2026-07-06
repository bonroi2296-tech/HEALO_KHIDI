/**
 * 초청장 발급 주체 = 등록된 외국인환자 유치의료기관.
 *
 * 의료비자(C-3-3/G-1-10) 초청장은 "등록 유치의료기관(병원)" 명의로 발급하는 것이
 * 대사관 신뢰가 가장 높다(유치업자 단독보다 강함). 아래 두 병원은 서울시장 발급
 * '외국인환자 유치의료기관 등록증'을 보유(2028년까지 유효) — 초청장의 초청 의료기관·
 * 유치등록번호 칸을 실제 값으로 채운다. 본로이는 유치업자로 공동 표기.
 *
 * ※ 등록증 원본(PO 제공) 기준. 만료(validUntil) 지나면 재확인 필요.
 */

export interface InviterHospital {
  id: string;
  nameKo: string;
  nameEn: string;
  regNo: string; // 외국인환자 유치의료기관 등록번호
  repKo: string;
  repEn: string;
  addressKo: string;
  addressEn: string;
  specialtiesKo: string; // 유치 진료과목
  validUntil: string; // ISO — 등록 유효기간 만료일
}

export const INVITER_HOSPITALS: InviterHospital[] = [
  {
    id: "myeonryeok-magok",
    nameKo: "면력한방병원",
    nameEn: "Immunehospital of Korean Medicine",
    regNo: "M-2025-01-06-8596",
    repKo: "황이준",
    repEn: "Hwang Ijun",
    addressKo: "서울특별시 강서구 마곡중앙6로 93 (마곡동, 열린프라자) 6·7·10층",
    addressEn: "F6,7,10, 93 Magokjungang 6-ro, Gangseo-gu, Seoul, Republic of Korea",
    specialtiesKo: "산부인과, 한방과",
    validUntil: "2028-03-10",
  },
  {
    id: "sinchon-myeonryeok",
    nameKo: "신촌면력한방병원",
    nameEn: "Sinchon Immunehospital",
    regNo: "M-2025-01-06-8783",
    repKo: "유형진",
    repEn: "Yu Hyeong Jin",
    addressKo: "서울특별시 서대문구 연세로 12 (창천동, 피델리아타워) 8~14층",
    addressEn: "8-14F, 12 Yonsei-ro, Seodaemun-gu, Seoul, Republic of Korea",
    specialtiesKo: "가정의학과, 한방과",
    validUntil: "2028-04-30",
  },
];

export function getInviterHospital(id: string | null | undefined): InviterHospital | null {
  if (!id) return null;
  return INVITER_HOSPITALS.find((h) => h.id === id) || null;
}
