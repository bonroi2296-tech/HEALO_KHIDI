/**
 * 면력한방병원 지점별 상세 정보
 * 출처: https://immunehospital.com, https://km.immunehospital.com,
 *       https://sc.immunehospital.com, https://sd.immunehospital.com
 *       https://immunehospital.com/pages/hospital/location.php
 * 수집일: 2026-04-21
 * 저작권: 면력한방병원 (자사 병원, 저작권 OK)
 */

export const IMMUNE_BRANCHES = {
  gangeo: {
    id: "gangeo",
    name: { ko: "강서 (마곡 본원)", en: "Gangeo (Magok Main Branch)", ru: "Канги (Главный офис Магок)" },
    address: {
      ko: "서울 강서구 마곡중앙6로 93 열린프라자 6층, 7층, 10층",
      en: "Yeolin Plaza 6F, 7F, 10F, 93 Magokjungang 6-ro, Gangseo-gu, Seoul",
      ru: "Сеул, Кансо-гу, Магокчунган 6-ро, 93, Ёрин Плаза, 6, 7, 10 этаж",
    },
    tel: "1588-2915",
    email: "dreamoriental@naver.com",
    siteUrl: "https://immunehospital.com",
    hours: {
      weekday: { open: "09:00", close: "20:00", note: { ko: "야간진료", en: "Night Clinic" } },
      weekend: { open: "09:00", close: "15:00" },
      lunch: { start: "13:00", end: "14:00" },
    },
    nearbyHospitals: [
      { name: "이대서울병원", distance: "약 1분", distanceEn: "~1 min" },
      { name: "이대목동병원", distance: "약 15분", distanceEn: "~15 min" },
      { name: "일산국립암센터", distance: "약 25분", distanceEn: "~25 min" },
      { name: "차병원", distance: "약 25분", distanceEn: "~25 min" },
      { name: "신촌세브란스", distance: "약 25분", distanceEn: "~25 min" },
      { name: "중앙대병원", distance: "약 25분", distanceEn: "~25 min" },
    ],
    banner: "/immune/misc/banner-gangeo-main.jpg",
    mapLinks: {
      kakao: "https://map.kakao.com/?q=면력한방병원+강서",
    },
    businessRegistration: "645-92-01641",
    privacyOfficer: "손효준",
  },

  gwangmyeong: {
    id: "gwangmyeong",
    name: { ko: "광명", en: "Gwangmyeong Branch", ru: "Кванмён" },
    address: {
      ko: "경기 광명시 철산로 16 트라이앵글빌딩 6층, 8층~11층",
      en: "Triangle Building 6F, 8F-11F, 16 Cheolsan-ro, Gwangmyeong-si, Gyeonggi-do",
      ru: "Кёнги-до, Кванмён-си, Чхольсан-ро, 16, Трайэнгл билдинг, 6, 8-11 этажи",
    },
    tel: "1588-2915",
    siteUrl: "https://km.immunehospital.com",
    hours: {
      weekday: { open: "09:00", close: "20:00", note: { ko: "야간진료", en: "Night Clinic" } },
      weekend: { open: "09:00", close: "15:00" },
      lunch: { start: "13:00", end: "14:00" },
    },
    banner: "/immune/misc/banner-gwangmyeong.jpg",
    mapLinks: {
      kakao: "https://kko.kakao.com/5u1r27wymw",
    },
  },

  sinchon: {
    id: "sinchon",
    name: { ko: "신촌", en: "Sinchon Branch", ru: "Синчон" },
    address: {
      ko: "서울 서대문구 연세로 12 8층~14층",
      en: "8F-14F, 12 Yonsei-ro, Seodaemun-gu, Seoul",
      ru: "Сеул, Содэмун-гу, Ёнсе-ро, 12, 8-14 этажи",
    },
    tel: "1588-2915",
    siteUrl: "https://sc.immunehospital.com",
    hours: {
      weekday: { open: "09:00", close: "20:00", note: { ko: "야간진료", en: "Night Clinic" } },
      weekend: { open: "09:00", close: "15:00" },
      lunch: { start: "13:00", end: "14:00" },
    },
    banner: "/immune/misc/banner-sinchon.jpg",
    mapLinks: {
      kakao: "https://map.kakao.com/?urlX=464150.0000000003&urlY=1127976.9999999995&itemId=326513764",
    },
  },

  seongdong: {
    id: "seongdong",
    name: { ko: "성동", en: "Seongdong Branch", ru: "Сондон" },
    address: {
      ko: "서울 성동구 천호대로 320, 2~7층, B101호 (용답동, 장안빌딩)",
      en: "2F-7F, B101, 320 Cheonho-daero, Seongdong-gu, Seoul (Jangan Building)",
      ru: "Сеул, Сондон-гу, Чхонхо-дэро, 320, 2-7 этажи, B101 (здание Чанган)",
    },
    tel: "1588-2915",
    siteUrl: "https://sd.immunehospital.com",
    hours: {
      weekday: { open: "09:00", close: "20:00", note: { ko: "야간진료", en: "Night Clinic" } },
      weekend: { open: "09:00", close: "15:00" },
      lunch: { start: "13:00", end: "14:00" },
    },
    banner: "/immune/misc/banner-seongdong.jpg",
    mapLinks: {
      kakao: "https://kko.kakao.com/5u1r27wymw",
    },
  },
};

// 공통 진료 시간 (모든 지점 동일)
export const COMMON_HOURS = {
  weekday: { open: "09:00", close: "20:00", ko: "평일 09:00–20:00 (야간진료)", en: "Mon–Fri 09:00–20:00 (Night Clinic)" },
  weekend: { open: "09:00", close: "15:00", ko: "토·일·공휴일 09:00–15:00", en: "Sat/Sun/Holiday 09:00–15:00" },
  lunch: { start: "13:00", end: "14:00", ko: "점심 13:00–14:00", en: "Lunch 13:00–14:00" },
};

export const BRANCH_LIST = Object.values(IMMUNE_BRANCHES);
