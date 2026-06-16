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
  team: "/images/immune-gangseo-team.jpg",

  // 시설
  facilityRoom: "https://immunehospital.com/resource/images/new-facility1.jpg",      // 프리미엄 입원실
  facilityTreatment: "https://immunehospital.com/resource/images/new-facility2.jpg",  // 온열 치료
  facilityCo2: "https://immunehospital.com/resource/images/new-facility3.jpg",        // CO2 치료

  // 프로그램 — 심신통합 케어
  programWalking: "https://immunehospital.com/resource/images/cancer-program1.jpg",      // 야외 산책
  programPicnic: "https://immunehospital.com/resource/images/cancer-program2.jpg",       // 힐링 소풍
  programExercise: "https://immunehospital.com/resource/images/cancer-program3.jpg",     // 운동치료
  programClass: "https://immunehospital.com/resource/images/cancer-program4.jpg",        // 원데이 클래스
  programFoodTherapy: "https://immunehospital.com/resource/images/cancer-program5.jpg",  // 셰프 푸드테라피

  // 배너
  bannerMain: "https://immunehospital.com/uploads/banners/6895825b600130.26433858.jpg",
  bannerSeason: "https://immunehospital.com/uploads/banners/68ad73ce876dc6.84077341.jpg",

  // 의료진
  drHwang: "https://immunehospital.com/uploads/doctors/68a674036de695.54364290.png",     // 황이준 대표원장
  drLee: "https://immunehospital.com/uploads/doctors/68a42d8de9e095.75488957.jpg",       // 이우석 양방대표
  drIm: "https://immunehospital.com/uploads/doctors/68ff2829546a03.48601548.jpg",        // 임지성 의무원장
  drKimJ: "https://immunehospital.com/uploads/doctors/68a42f470df8e0.51544383.jpg",      // 김지영
  drKimE: "https://immunehospital.com/uploads/doctors/68a42d656c1818.66316770.jpg",      // 김은지
  drBae: "https://immunehospital.com/uploads/doctors/690b00eb512ff3.09917549.jpg",       // 배상근
  drKimJH: "https://immunehospital.com/uploads/doctors/69d6ee664689b0.12934912.jpg",     // 김정현

  // 성동 의료진
  drKangJuan: "https://immunehospital.com/uploads/doctors/69e71eaa0bb548.83985851.png",      // 강주안 (성동 대표원장)
  drSeungHyeonsuk: "https://immunehospital.com/uploads/doctors/6a040390c37997.97100336.jpg", // 승현석 (의무원장)
  drImGyeongsu: "https://immunehospital.com/uploads/doctors/6a040420ccbe86.88350198.jpg",    // 임경수 (양방대표원장)
  drGoEunsang: "https://immunehospital.com/uploads/doctors/6a0404b0869a76.89735854.jpg",     // 고은상
  drLeeMunseong: "https://immunehospital.com/uploads/doctors/6a04046e2e7a86.09116902.jpg",   // 이문성
  drParkJeonghyang: "https://immunehospital.com/uploads/doctors/6a0405363d4b90.26971351.jpg",// 박정향
  drNohHyeonmin: "https://immunehospital.com/uploads/doctors/6a057a886c1dc8.77991002.jpg",   // 노현민
  drLeeJinyeong: "https://immunehospital.com/uploads/doctors/6a057b078fe633.40987548.jpg",   // 이진영

  // 로고
  logo: "https://immunehospital.com/uploads/logo/68c380cc245ef6.75534933.svg",
};

export const PHOTO_FILTER = "contrast(1.06) saturate(0.82) brightness(0.98)";

/**
 * Immune Hospital 이미지는 실사라서 filter 약하게
 * (너무 desaturate 하면 따뜻한 분위기 날아감)
 */
export const IMMUNE_PHOTO_FILTER = "contrast(1.02) saturate(0.95) brightness(1.0)";
