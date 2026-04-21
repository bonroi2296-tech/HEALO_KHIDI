/**
 * 면력한방병원 의료진 정보
 * 출처: https://immunehospital.com/pages/hospital/doctor.php
 *       https://km.immunehospital.com/, https://sc.immunehospital.com/, https://sd.immunehospital.com/
 * 수집일: 2026-04-21
 * 저작권: 면력한방병원 (자사 병원, 저작권 OK)
 */

export const IMMUNE_DOCTORS = {
  gangeo: {
    branchName: { ko: "강서 (마곡 본원)", en: "Gangeo (Magok Main)" },
    branchUrl: "https://immunehospital.com",
    doctors: [
      {
        id: "hwang-ijun",
        name: { ko: "황이준", en: "Hwang I-Jun" },
        title: { ko: "대표원장", en: "Chief Director" },
        specialty: { ko: "한방내과, 면역통합의학", en: "Korean Internal Medicine, Integrative Immunology" },
        photo: "/immune/doctor/gangeo-dr-hwang-ijun.png",
        type: "korean",
      },
      {
        id: "lee-useok",
        name: { ko: "이우석", en: "Lee Woo-Seok" },
        title: { ko: "양방대표원장", en: "Western Medicine Director" },
        specialty: { ko: "통합면역, 부인과", en: "Integrative Immunology, Gynecology" },
        photo: "/immune/doctor/gangeo-dr-lee-useok.jpg",
        type: "western",
      },
      {
        id: "im-jisung",
        name: { ko: "임지성", en: "Im Ji-Seong" },
        title: { ko: "의무원장", en: "Medical Director" },
        specialty: { ko: "통증재활, 한방재활의학과", en: "Pain Rehabilitation, Korean Rehabilitation Medicine" },
        photo: "/immune/doctor/gangeo-dr-im-jisung.jpg",
        type: "korean",
      },
      {
        id: "kim-jiyoung",
        name: { ko: "김지영", en: "Kim Ji-Young" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "통합면역, 한방내과", en: "Integrative Immunology, Korean Internal Medicine" },
        photo: "/immune/doctor/gangeo-dr-kim-jiyoung.jpg",
        type: "korean",
      },
      {
        id: "kim-eunji",
        name: { ko: "김은지", en: "Kim Eun-Ji" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "통합면역, 한방내과", en: "Integrative Immunology, Korean Internal Medicine" },
        photo: "/immune/doctor/gangeo-dr-kim-eunji.jpg",
        type: "korean",
      },
      {
        id: "bae-sanggeun",
        name: { ko: "배상근", en: "Bae Sang-Geun" },
        title: { ko: "양방원장", en: "Western Medicine Doctor" },
        specialty: { ko: "통합면역, 가정의학", en: "Integrative Immunology, Family Medicine" },
        photo: "/immune/doctor/gangeo-dr-bae-sanggeun.jpg",
        type: "western",
      },
      {
        id: "kim-junghyun",
        name: { ko: "김정현", en: "Kim Jung-Hyun" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "통증재활", en: "Pain Rehabilitation" },
        photo: "/immune/doctor/gangeo-dr-kim-junghyun.jpg",
        type: "korean",
      },
    ],
  },

  gwangmyeong: {
    branchName: { ko: "광명", en: "Gwangmyeong" },
    branchUrl: "https://km.immunehospital.com",
    doctors: [
      {
        id: "baek-giljun",
        name: { ko: "배길준", en: "Baek Gil-Jun" },
        title: { ko: "대표원장", en: "Chief Director" },
        specialty: { ko: "한방내과, 면역통합의학", en: "Korean Internal Medicine, Integrative Immunology" },
        photo: null,
        type: "korean",
      },
      {
        id: "ha-jungbin",
        name: { ko: "하정빈", en: "Ha Jeong-Bin" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "한방내과", en: "Korean Internal Medicine" },
        photo: null,
        type: "korean",
      },
      {
        id: "oh-jaewoo",
        name: { ko: "오재우", en: "Oh Jae-Woo" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "한방내과", en: "Korean Internal Medicine" },
        photo: null,
        type: "korean",
      },
      {
        id: "kim-sanghyun",
        name: { ko: "김상현", en: "Kim Sang-Hyun" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "한방내과", en: "Korean Internal Medicine" },
        photo: null,
        type: "korean",
      },
      {
        id: "kim-juwan",
        name: { ko: "김주완", en: "Kim Ju-Wan" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "한방내과", en: "Korean Internal Medicine" },
        photo: null,
        type: "korean",
      },
      {
        id: "jo-seongwon",
        name: { ko: "조성원", en: "Jo Seong-Won" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "한방내과", en: "Korean Internal Medicine" },
        photo: null,
        type: "korean",
      },
      {
        id: "lee-junghun-km",
        name: { ko: "이정훈", en: "Lee Jeong-Hun" },
        title: { ko: "양방대표원장", en: "Western Medicine Director" },
        specialty: { ko: "통합면역", en: "Integrative Immunology" },
        photo: null,
        type: "western",
      },
    ],
  },

  sinchon: {
    branchName: { ko: "신촌", en: "Sinchon" },
    branchUrl: "https://sc.immunehospital.com",
    doctors: [
      {
        id: "yoo-hyungjin",
        name: { ko: "유형진", en: "Yoo Hyung-Jin" },
        title: { ko: "대표원장", en: "Chief Director" },
        specialty: { ko: "한방내과, 면역통합의학", en: "Korean Internal Medicine, Integrative Immunology" },
        photo: null,
        type: "korean",
      },
      {
        id: "jung-yujin",
        name: { ko: "정유진", en: "Jeong Yu-Jin" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "한방내과", en: "Korean Internal Medicine" },
        photo: null,
        type: "korean",
      },
      {
        id: "jo-suho",
        name: { ko: "조수호", en: "Jo Su-Ho" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "한방내과", en: "Korean Internal Medicine" },
        photo: null,
        type: "korean",
      },
      {
        id: "kim-minjeong",
        name: { ko: "김민정", en: "Kim Min-Jeong" },
        title: { ko: "진료원장", en: "Clinical Director" },
        specialty: { ko: "한방내과", en: "Korean Internal Medicine" },
        photo: null,
        type: "korean",
      },
      {
        id: "jo-hyunsil",
        name: { ko: "조현실", en: "Jo Hyeon-Sil" },
        title: { ko: "양방대표원장", en: "Western Medicine Director" },
        specialty: { ko: "통합면역", en: "Integrative Immunology" },
        photo: null,
        type: "western",
      },
    ],
  },

  seongdong: {
    branchName: { ko: "성동", en: "Seongdong" },
    branchUrl: "https://sd.immunehospital.com",
    doctors: [
      {
        id: "kang-juan",
        name: { ko: "강주안", en: "Kang Ju-An" },
        title: { ko: "대표원장", en: "Chief Director" },
        specialty: { ko: "한방내과, 면역통합의학", en: "Korean Internal Medicine, Integrative Immunology" },
        photo: "/immune/doctor/seongdong-dr-kang-juan.png",
        type: "korean",
      },
    ],
  },
};

// 전체 의료진 수 (2026-04-21 기준)
export const HOSPITAL_STAFF_STATS = {
  doctors: 29,
  nurses: 101,
  counselors: 7,
  nutritionTeam: 37,
  cleaningTeam: 14,
  helpers: 11,
};
