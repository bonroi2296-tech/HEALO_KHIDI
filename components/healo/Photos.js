/**
 * healwith Stock image registry
 *
 * 두 카테고리:
 * 1. 중립 스톡 (Unsplash) — 파트너 병원 전용 사진 없을 때 폴백
 * 2. Immune Hospital 실사 — immunehospital.com 공식 이미지 (파트너·직영)
 */

export const PHOTOS = {
  // ── Unsplash (stock) ─────────────────────────
  hero: "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1400&auto=format&fit=crop&q=85",
  hospital1: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1200&auto=format&fit=crop&q=85",
  hospital2: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&auto=format&fit=crop&q=85",
  hospital3: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&auto=format&fit=crop&q=85",
  clinical1: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1200&auto=format&fit=crop&q=85",
  clinical2: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&auto=format&fit=crop&q=85",
  interior1: "https://images.unsplash.com/photo-1587351177344-a59c5e4c9ab2?w=1200&auto=format&fit=crop&q=85",
  doctor1: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=85",
  doctor2: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=85",
};

/**
 * Immune Hospital (면력한방병원) 공식 이미지
 * 출처: immunehospital.com — 직영 파트너로 사용 권한 있음
 */
export const IMMUNE_PHOTOS = {
  // 팀 단체 사진 (면력한방병원 강서 — 원본 고해상도)
  // ⚠️ 히어로/대표 이미지로 쓰지 마라 — PO 지시(2026-07-22): 병원 페이지 대표는 현판·공간 실사.
  //    docs/PO_PREFERENCES.md 「병원 페이지 히어로 이미지」 참조. 아래 signage 를 쓸 것.
  team: "/images/immune-gangseo-team.jpg",

  // 현판 실사 — 벽에 「면력 한방병원」 간판이 박힌 마곡 본원 리셉션. 병원 페이지 대표 이미지.
  signage: "/images/hospitals/immunehospital-magok/1.jpg",

  // 시설
  facilityRoom: "/immune/site/resource/images/new-facility1.jpg",      // 프리미엄 입원실
  facilityTreatment: "/immune/site/resource/images/new-facility2.jpg",  // 온열 치료
  facilityCo2: "/immune/site/resource/images/new-facility3.jpg",        // CO2 치료

  // 프로그램 — 심신통합 케어
  programWalking: "/immune/site/resource/images/cancer-program1.jpg",      // 야외 산책
  programPicnic: "/immune/site/resource/images/cancer-program2.jpg",       // 힐링 소풍
  programExercise: "/immune/site/resource/images/cancer-program3.jpg",     // 운동치료
  programClass: "/immune/site/resource/images/cancer-program4.jpg",        // 원데이 클래스
  programFoodTherapy: "/immune/site/resource/images/cancer-program5.jpg",  // 셰프 푸드테라피

  // 배너
  bannerMain: "/immune/site/uploads/banners/6895825b600130.26433858.jpg",
  bannerSeason: "/immune/site/uploads/banners/6895825b600130.26433858.jpg",

  // 의료진 — self-host (핫링크 금지: 병원이 원본 교체/삭제하면 깨짐. 실제로 강주안 URL 死亡 확인됨)
  drHwang: "/immune/doctor/gangeo-dr-hwang-ijun.png",     // 황이준 대표원장
  drLee: "/immune/doctor/gangeo-dr-lee-useok.jpg",        // 이우석 양방대표
  drIm: "/immune/doctor/gangeo-dr-im-jisung.jpg",         // 임지성 의무원장
  drKimJ: "/immune/doctor/gangeo-dr-kim-jiyoung.jpg",     // 김지영
  drKimE: "/immune/doctor/gangeo-dr-kim-eunji.jpg",       // 김은지
  drBae: "/immune/doctor/gangeo-dr-bae-sanggeun.jpg",     // 배상근
  drKimJH: "/immune/doctor/gangeo-dr-kim-junghyun.jpg",   // 김정현

  // 성동 의료진 — self-host
  drKangJuan: "/immune/doctor/seongdong-dr-kang-juan.png",        // 강주안 (성동 대표원장)
  drSeungHyeonsuk: "/immune/doctor/seongdong-dr-seung-hyeonsuk.jpg", // 승현석 (의무원장)
  drImGyeongsu: "/immune/doctor/seongdong-dr-im-gyeongsu.jpg",    // 임경수 (양방대표원장)
  drGoEunsang: "/immune/doctor/seongdong-dr-go-eunsang.jpg",      // 고은상
  drLeeMunseong: "/immune/doctor/seongdong-dr-lee-munseong.jpg",  // 이문성
  drParkJeonghyang: "/immune/doctor/seongdong-dr-park-jeonghyang.jpg", // 박정향
  drNohHyeonmin: "/immune/doctor/seongdong-dr-noh-hyeonmin.jpg",  // 노현민
  drLeeJinyeong: "/immune/doctor/seongdong-dr-lee-jinyeong.jpg",  // 이진영

  // 로고
  logo: "/immune/site/uploads/logo/68c380cc245ef6.75534933.svg",
};

export const PHOTO_FILTER = "contrast(1.06) saturate(0.82) brightness(0.98)";

/**
 * Immune Hospital 이미지는 실사라서 filter 약하게
 * (너무 desaturate 하면 따뜻한 분위기 날아감)
 */
export const IMMUNE_PHOTO_FILTER = "contrast(1.02) saturate(0.95) brightness(1.0)";
