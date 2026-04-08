/**
 * Seed partner_branches and partner_doctors tables
 * from the immuneHospitalDoctors data.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/seed-partner-doctors.mjs
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Branch data ──
const BRANCHES = [
  {
    branch_code: "gangseo",
    name_ko: "면력한방병원 강서 (마곡본원)",
    name_en: "Immunehospital of Korean Medicine - Gangseo (Magok HQ)",
    address_ko: "서울특별시 강서구 마곡중앙6로 93 (마곡동, 열린프라자) 6,7,10층",
    address_en: "6F/7F/10F, 93 Magok Jungang 6-ro, Gangseo-gu, Seoul",
    phone: "1522-8850",
    status: "registered",
    display_order: 0,
    i18n: {
      ru: { name: "Иммуногоспиталь Кансо (главный)" },
      zh: { name: "免力韩方医院 江西本院" },
      ja: { name: "免力韓方病院 江西本院" },
      kz: { name: "Иммуногоспиталь Кансо (бас)" },
    },
  },
  {
    branch_code: "sinchon",
    name_ko: "신촌면력한방병원",
    name_en: "Sinchonimmunehospital of Korean Medicine",
    address_ko: "서울특별시 서대문구 연세로 12 (창천동, 피델리아타워) 8-14층",
    address_en: "8F-14F, 12 Yonsei-ro, Seodaemun-gu, Seoul (Fidelia Tower)",
    phone: "1522-8850",
    status: "registered",
    display_order: 1,
    i18n: {
      ru: { name: "Иммуногоспиталь Синчхон" },
      zh: { name: "新村免力韩方医院" },
      ja: { name: "新村免力韓方病院" },
      kz: { name: "Синчон Иммуногоспиталь" },
    },
  },
  {
    branch_code: "gwangmyeong",
    name_ko: "면력한방병원 광명점",
    name_en: "Immunehospital of Korean Medicine - Gwangmyeong",
    address_ko: "경기도 광명시 오리로 876 광명역 M클러스터 4층",
    address_en: "4F, M Cluster, 876 Ori-ro, Gwangmyeong-si, Gyeonggi-do",
    phone: "1522-8850",
    status: "registered",
    display_order: 2,
    i18n: {
      ru: { name: "Иммуногоспиталь Кванмён" },
      zh: { name: "免力韩方医院 光明院" },
      ja: { name: "免力韓方病院 光明院" },
      kz: { name: "Иммуногоспиталь Кванмён" },
    },
  },
  {
    branch_code: "seongdong",
    name_ko: "면력한방병원 성동점",
    name_en: "Immunehospital of Korean Medicine - Seongdong",
    address_ko: "서울특별시 성동구",
    address_en: "Seongdong-gu, Seoul",
    phone: "1522-8850",
    status: "preparing",
    display_order: 3,
    i18n: {
      ru: { name: "Иммуногоспиталь Сондон" },
      zh: { name: "免力韩方医院 城东院" },
      ja: { name: "免力韓方病院 城東院" },
      kz: { name: "Иммуногоспиталь Сондон" },
    },
  },
];

// ── Doctors data (from immuneHospitalDoctors.ts) ──
const DOCTORS = [
  { branch: "gangseo", name_ko: "황이준", position_ko: "강서 대표원장", subspecialty: "통합면역 대표원장", photo_url: "https://immunehospital.com/uploads/doctors/6895e62074dc23.62228636.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68a674036de695.54364290.png", keywords: ["#꼼꼼한","#친절한","#예리한","#이성적인","#정확한"], career: ["(現) 면력한방병원 대표원장"], activities: ["한방비만학회 전문가과정","동의방약학회 정회원"], education: ["동국대학교 한의과대학 졸업","통합암학회 인정의","척추신경추나의학회 정회원"], publications: [], i18n: { en: { name: "Dr. Hwang Yi-jun", position: "Chief Director, Gangseo" }, ru: { name: "Д-р Хван Иджун", position: "Главный директор, Кансо" }, zh: { name: "黄以俊 江西代表院长", position: "江西代表院长" }, ja: { name: "黄以俊 江西代表院長", position: "江西代表院長" }, kz: { name: "Д-р Хван Иджун", position: "Бас директор, Кансо" } }, display_order: 0 },
  { branch: "gangseo", name_ko: "이우석", position_ko: "강서 양방대표원장", subspecialty: "통합면역 부인과", photo_url: "https://immunehospital.com/uploads/doctors/68a3efab789ed9.14338812.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68a42d8de9e095.75488957.jpg", keywords: ["#부담없는","#배려깊은","#상담이편한","#공감있는","#질문환영"], career: ["(前) 삼성서울병원 전임의","(前) 중앙대학교병원 전임의","(現) 면력한방병원 원장"], activities: ["University of Chicago(시카고 대학) 부인 종양학","순천향대학교 부천병원 산부인과 조교수","순천향대학교 구미병원 산부인과 조교수"], education: ["산부인과 전문의","중앙대학교 의과대학 졸업","중앙대학교 의과대학 박사"], publications: ["Study on improvement of immune function..."], i18n: { en: { name: "Dr. Lee Woo-seok", position: "Western Medicine Director, Gangseo" }, ru: { name: "Д-р Ли Усок", position: "Директор западной медицины, Кансо" }, zh: { name: "李宇锡 江西洋方代表院长", position: "江西洋方代表院长" }, ja: { name: "李宇錫 江西洋方代表院長", position: "江西洋方代表院長" }, kz: { name: "Д-р Ли Усок", position: "Батыс медицинасы директоры, Кансо" } }, display_order: 1 },
  { branch: "gangseo", name_ko: "정의준", position_ko: "강서 진료원장", subspecialty: "통합면역", photo_url: "https://immunehospital.com/uploads/doctors/68a420edd59c31.26553019.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68a420edd57700.67821001.png", keywords: ["#따뜻한","#친절한","#진심있는","#부드러운","#경청하는","#배려깊은"], career: ["(前) 대전대학교 한방병원 내과 전공의","(前) 대전대학교 한방병원 외래교수","(前) 방배GF한의원 대표원장","(前) 함소아한의원 강남점 원장","(前) 제니스한의원 대표원장","(現) 면력한방병원 원장"], activities: ["KAIM 국제통합의학 인정의","한방내과 전문의"], education: ["대전대학교 한의과대학 졸업","대전대학교 대학원 비계내과학 석사"], publications: [], i18n: { en: { name: "Dr. Jung Eui-jun", position: "Clinical Director, Gangseo" }, ru: { name: "Д-р Чон Ыйджун", position: "Клинический директор, Кансо" }, zh: { name: "郑义准 江西诊疗院长", position: "江西诊疗院长" }, ja: { name: "鄭義俊 江西診療院長", position: "江西診療院長" }, kz: { name: "Д-р Чон Ыйджун", position: "Клиникалық директор, Кансо" } }, display_order: 2 },
  { branch: "gangseo", name_ko: "최인호", position_ko: "강서 진료원장", subspecialty: "한방재활의학과", photo_url: "https://immunehospital.com/uploads/doctors/68a42217aec6f8.72485361.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68a42217ae9df2.16826965.png", keywords: ["#꼼꼼한","#자세한설명","#따뜻한","#섬세한","#소통이좋은","#편안한"], career: ["(前) 참포도나무 병원 한의과 과장","(前) 대전대학교 한방재활의학과 전공의","(現) 면력한방병원 진료원장"], activities: ["대한한의학회 정회원","척추신경추나의학회 정회원","대한약침학회 정회원"], education: ["대전대학교 한의과대학 졸업","한방재활의학과 전문의"], publications: [], i18n: { en: { name: "Dr. Choi In-ho", position: "Clinical Director, Gangseo" }, ru: { name: "Д-р Цой Инхо", position: "Клинический директор, Кансо" }, zh: { name: "崔仁浩 江西诊疗院长", position: "江西诊疗院长" }, ja: { name: "崔仁浩 江西診療院長", position: "江西診療院長" }, kz: { name: "Д-р Цой Инхо", position: "Клиникалық директор, Кансо" } }, display_order: 3 },
  { branch: "gangseo", name_ko: "이정빈", position_ko: "강서 진료원장", subspecialty: "한방신경정신과", photo_url: "https://immunehospital.com/uploads/doctors/68a4239cb67ee1.45453553.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68a4239cb65a00.19816855.png", keywords: ["#자세한설명","#상담충분","#신뢰가는","#이성적인","#경청하는","#따뜻한시선"], career: ["(前) 수원아이윌한의원 진료원장","(前) 이음한방병원 진료원장","(前) 삼성수한의원 대표원장","(現) 면력한방병원 진료원장"], activities: ["대한한방신경정신과학회 정회원","척추신경추나의학회 정회원","한방비만학회 정회원","한방향기치료학회 정회원"], education: ["한방신경정신과 전문의","동의대학교 한의과대학 졸업","동의대학교 한의학대학원 석사"], publications: [], i18n: { en: { name: "Dr. Lee Jung-bin", position: "Clinical Director, Gangseo" }, ru: { name: "Д-р Ли Чонбин", position: "Клинический директор, Кансо" }, zh: { name: "李正斌 江西诊疗院长", position: "江西诊疗院长" }, ja: { name: "李正斌 江西診療院長", position: "江西診療院長" }, kz: { name: "Д-р Ли Чонбин", position: "Клиникалық директор, Кансо" } }, display_order: 4 },
  { branch: "gangseo", name_ko: "정유진", position_ko: "강서 진료원장", subspecialty: "한방내과", photo_url: "https://immunehospital.com/uploads/doctors/68a424fb94fac8.48917965.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68a424fb94d2e1.87963992.png", keywords: ["#친절한","#꼼꼼한","#부드러운","#따뜻한","#자세한설명","#정성스러운"], career: ["(前) 경희대학교 한방병원 소화기내과 전공의","(前) 강남경희한의원 진료원장","(前) 민들레한의원 대표원장","(現) 면력한방병원 진료원장"], activities: ["KAIM 국제통합의학 인정의","한방내과 전문의"], education: ["경희대학교 한의과대학 졸업","경희대학교 한의학 석사"], publications: [], i18n: { en: { name: "Dr. Jung Yu-jin", position: "Clinical Director, Gangseo" }, ru: { name: "Д-р Чон Юджин", position: "Клинический директор, Кансо" }, zh: { name: "郑有进 江西诊疗院长", position: "江西诊疗院长" }, ja: { name: "鄭有進 江西診療院長", position: "江西診療院長" }, kz: { name: "Д-р Чон Юджин", position: "Клиникалық директор, Кансо" } }, display_order: 5 },
  { branch: "gangseo", name_ko: "김혜송", position_ko: "강서 진료원장", subspecialty: "한방내과", photo_url: "https://immunehospital.com/uploads/doctors/68a426c07f8af2.51068001.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68a426c07f58f5.31508561.png", keywords: ["#친절한","#편안한","#배려깊은","#소통이좋은","#섬세한","#따뜻한시선"], career: ["(前) 자연중한의원 원장","(前) 신도림우리한의원 진료원장","(現) 면력한방병원 진료원장"], activities: ["KAIM 국제통합의학 인정의","한방내과 전문의"], education: ["동국대학교 한의과대학 졸업","경희대학교 한의학대학원 석사 수료"], publications: [], i18n: { en: { name: "Dr. Kim Hye-song", position: "Clinical Director, Gangseo" }, ru: { name: "Д-р Ким Хесон", position: "Клинический директор, Кансо" }, zh: { name: "金惠松 江西诊疗院长", position: "江西诊疗院长" }, ja: { name: "金恵松 江西診療院長", position: "江西診療院長" }, kz: { name: "Д-р Ким Хесон", position: "Клиникалық директор, Кансо" } }, display_order: 6 },
  { branch: "gangseo", name_ko: "김민지", position_ko: "강서 진료원장", subspecialty: "한방부인과", photo_url: "https://immunehospital.com/uploads/doctors/68a427f6bb27a2.63073453.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68a427f6baee94.16399741.png", keywords: ["#따뜻한","#친절한","#소통이좋은","#세심한","#정성스러운","#편안한"], career: ["(前) 자생한방병원 전공의","(前) 자생한방병원 전임의","(前) 전주자생한방병원 진료원장","(前) 일산자생한방병원 진료원장","(現) 면력한방병원 진료원장"], activities: ["한방부인과 전문의","대한한방부인과학회 정회원","척추신경추나의학회 정회원","대한약침학회 정회원"], education: ["세명대학교 한의과대학 졸업","세명대학교 한의학대학원 석사"], publications: [], i18n: { en: { name: "Dr. Kim Min-ji", position: "Clinical Director, Gangseo" }, ru: { name: "Д-р Ким Минджи", position: "Клинический директор, Кансо" }, zh: { name: "金敏智 江西诊疗院长", position: "江西诊疗院长" }, ja: { name: "金旻智 江西診療院長", position: "江西診療院長" }, kz: { name: "Д-р Ким Минджи", position: "Клиникалық директор, Кансо" } }, display_order: 7 },
  // Gwangmyeong
  { branch: "gwangmyeong", name_ko: "유재율", position_ko: "광명 대표원장", subspecialty: "통합면역 대표원장", photo_url: "https://immunehospital.com/uploads/doctors/68ac20f0df3613.38001416.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac20f0df11a4.67755168.jpg", keywords: ["#꼼꼼한","#친절한","#예리한","#이성적인","#정확한","#진심있는"], career: ["원광대학교 전주한방병원 일반수련의","원광대학교 전주한방병원 전공의 한방내과","원광대학교 전주한방병원 전임의","(前) 하나한방병원 부원장","(現) 면력한방병원 대표원장"], activities: ["한방내과 전문의","KAIM 국제통합의학 인정의","(사)대한통합암학회 인증 통합암치료 인정의","대한한방내과학회 정회원","대한한방소화기학회 정회원"], education: ["원광대학교 한의과대학 졸업","원광대학교 한의학대학원 석사"], publications: [], i18n: { en: { name: "Dr. Yoo Jae-yul", position: "Chief Director, Gwangmyeong" }, ru: { name: "Д-р Ю Чэюль", position: "Главный директор, Кванмён" }, zh: { name: "刘在律 光明代表院长", position: "光明代表院长" }, ja: { name: "柳在律 光明代表院長", position: "光明代表院長" }, kz: { name: "Д-р Ю Чэюль", position: "Бас директор, Кванмён" } }, display_order: 0 },
  { branch: "gwangmyeong", name_ko: "김민수", position_ko: "광명 진료원장", subspecialty: "통합면역 침구의학과", photo_url: "https://immunehospital.com/uploads/doctors/68ac229a461ad5.95429504.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac229a45f575.41965101.jpg", keywords: ["#정확한","#자세한설명","#섬세한","#쉬운설명","#따뜻한","#소통이좋은"], career: ["경희대학교 한방병원 수련의 수료","강남경희한의원 진료 한의사","올바로한의원 진료 한의사","부천자생한방병원 진료원장","(前) 마디힐한방병원 진료원장","(現) 면력한방병원 진료원장"], activities: ["대한침구의학회 정회원","척추신경추나의학회 정회원","대한스포츠한의학회 정회원","대한약침학회 정회원"], education: ["경희대학교 한의과대학 졸업"], publications: [], i18n: { en: { name: "Dr. Kim Min-su", position: "Clinical Director, Gwangmyeong" }, ru: { name: "Д-р Ким Минсу", position: "Клинический директор, Кванмён" }, zh: { name: "金民洙 光明诊疗院长", position: "光明诊疗院长" }, ja: { name: "金民洙 光明診療院長", position: "光明診療院長" }, kz: { name: "Д-р Ким Минсу", position: "Клиникалық директор, Кванмён" } }, display_order: 1 },
  { branch: "gwangmyeong", name_ko: "이종석", position_ko: "광명 진료원장", subspecialty: "통증재활 한방신경정신과", photo_url: "https://immunehospital.com/uploads/doctors/68ac24c0008ac3.71274446.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac24c0006643.02621332.jpg", keywords: ["#정확한","#쉬운설명","#섬세한","#소통이좋은","#신뢰가는","#공감있는"], career: ["강남자생한방병원 한방신경정신과 전문의","(前) 자생한방병원 진료원장","(現) 면력한방병원 원장"], activities: ["대한한방신경정신과학회 평생회원","대한한방신경정신과학회 전문의이사","척추신경추나의학회 정회원"], education: ["한방신경정신과 전문의","경원대학교 한의과대학","가천대학교 한의학대학원 석사"], publications: ["Long term follow-up of cervical intervertebral disc herniation...","Snake Venom synergized Cytotoxic Effect...","Case Report on Patients with Herniated Intervertebral Disc...","A Case Report on Ankle Pain Induced with Charcot Marie Tooth Disease...","The Domestic Trends of Traditional Korean Medicine Treatments on Degenerative Knee Arthritis","The Current Status about Alzheimer's Dementia in the Journal of Oriental Neuropsychiatry..."], i18n: { en: { name: "Dr. Lee Jong-seok", position: "Clinical Director, Gwangmyeong" }, ru: { name: "Д-р Ли Чонсок", position: "Клинический директор, Кванмён" }, zh: { name: "李宗硕 光明诊疗院长", position: "光明诊疗院长" }, ja: { name: "李宗碩 光明診療院長", position: "光明診療院長" }, kz: { name: "Д-р Ли Чонсок", position: "Клиникалық директор, Кванмён" } }, display_order: 2 },
  { branch: "gwangmyeong", name_ko: "김상현", position_ko: "광명 진료원장", subspecialty: "통합면역", photo_url: "https://immunehospital.com/uploads/doctors/68ac25e7cc1487.42823820.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac25e7cbec30.65434200.jpg", keywords: ["#자세한설명","#상담충분","#질문환영","#진심있는","#침착한"], career: ["(前) 힘찬큐한방병원 수석원장","(現) 면력한방병원 진료원장"], activities: ["스위스 정부 장학생","제네바의대 면역학 연구실 연구원","(사)대한통합암학회 인증 통합암치료 인정의"], education: ["경원대 한의학과 졸업"], publications: [], i18n: { en: { name: "Dr. Kim Sang-hyun", position: "Clinical Director, Gwangmyeong" }, ru: { name: "Д-р Ким Санхён", position: "Клинический директор, Кванмён" }, zh: { name: "金尚贤 光明诊疗院长", position: "光明诊疗院长" }, ja: { name: "金尚賢 光明診療院長", position: "光明診療院長" }, kz: { name: "Д-р Ким Санхён", position: "Клиникалық директор, Кванмён" } }, display_order: 3 },
  { branch: "gwangmyeong", name_ko: "김주완", position_ko: "광명 진료원장", subspecialty: "통증재활", photo_url: "https://immunehospital.com/uploads/doctors/68ac266eec3443.90360671.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac266eec0d10.41842964.jpg", keywords: ["#친절한","#꼼꼼한","#정확한","#배려깊은","#소통이좋은","#신뢰가는"], career: ["(現) 면력한방병원 진료원장"], activities: ["대한한의학회 정회원","척추신경추나의학회 정회원"], education: ["대구한의대학교 한의학과대학 졸업","대구한의대 부속한방병원 수련의","울진군 보건의료원 한방진료과장","성주군 보건소 한방진료과장"], publications: [], i18n: { en: { name: "Dr. Kim Ju-wan", position: "Clinical Director, Gwangmyeong" }, ru: { name: "Д-р Ким Чуван", position: "Клинический директор, Кванмён" }, zh: { name: "金主完 光明诊疗院长", position: "光明诊疗院长" }, ja: { name: "金主完 光明診療院長", position: "光明診療院長" }, kz: { name: "Д-р Ким Чуван", position: "Клиникалық директор, Кванмён" } }, display_order: 4 },
  { branch: "gwangmyeong", name_ko: "조성원", position_ko: "광명 진료원장", subspecialty: "통증재활", photo_url: "https://immunehospital.com/uploads/doctors/68ac27045a5df4.11570705.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac27045a39e4.56645724.jpg", keywords: ["#꼼꼼한","#정확한","#빠른대응","#정성스러운","#진심있는","#친화적인"], career: ["(前) 숭실한의원 진료원장","(前) 자양으뜸한의원 대표원장","(前) 맘편한요양병원 한의과장","(現) 면력한방병원 진료원장"], activities: ["한방비만학회 회원","산돌한의원 통증치료사관학교 과정 이수","대한스포츠한의학회 팀닥터과정 수료"], education: ["경희대학교 한의과대학 졸업","진천군 보건소 공중보건의사"], publications: [], i18n: { en: { name: "Dr. Cho Sung-won", position: "Clinical Director, Gwangmyeong" }, ru: { name: "Д-р Чо Сонвон", position: "Клинический директор, Кванмён" }, zh: { name: "赵成元 光明诊疗院长", position: "光明诊疗院长" }, ja: { name: "趙成元 光明診療院長", position: "光明診療院長" }, kz: { name: "Д-р Чо Сонвон", position: "Клиникалық директор, Кванмён" } }, display_order: 5 },
  { branch: "gwangmyeong", name_ko: "이정훈", position_ko: "광명 양방대표원장", subspecialty: "통합면역 마취통증의학과", photo_url: "https://immunehospital.com/uploads/doctors/69cddb97abdb81.98166856.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/69cddb97abcd76.76518423.png", keywords: ["#친절한","#따뜻한","#꼼꼼한","#사려깊은","#믿음을주는","#따뜻한시선"], career: ["한양대학교병원 마취통증의학과 전공의/전문의","한양대학교병원 통증의학과 임상교수","(前) 닥터투유의원 원장","(前) 오정본병원 통증의학과 원장","(前) 날아라정형외과 원장","(前) 부평그린마취통증의학과의원 진료원장","(現) 면력한방병원 양방원장"], activities: ["대한마취통증의학회 정회원","대한골대사학회 정회원","대한통증학회 정회원","대한근골격계초음파학회 정회원","대한척추통증학회 정회원"], education: ["한양대학교 의과대학 의학과 졸업","한양대학교 의과대학 마취통증의학과 석사","한양대학교병원 통증의학과 전임의"], publications: [], i18n: { en: { name: "Dr. Lee Jung-hoon", position: "Western Medicine Director, Gwangmyeong" }, ru: { name: "Д-р Ли Чонхун", position: "Директор западной медицины, Кванмён" }, zh: { name: "李正训 光明洋方代表院长", position: "光明洋方代表院长" }, ja: { name: "李正勲 光明洋方代表院長", position: "光明洋方代表院長" }, kz: { name: "Д-р Ли Чонхун", position: "Батыс медицинасы директоры, Кванмён" } }, display_order: 6 },
  // Sinchon
  { branch: "sinchon", name_ko: "유형진", position_ko: "신촌 대표원장", subspecialty: "통합면역 대표원장", photo_url: "https://immunehospital.com/uploads/doctors/68ac46bd43c9d4.37241186.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac46bd439766.05814277.jpg", keywords: ["#믿음을주는","#차분한","#쉬운설명","#공감있는","#부드러운","#따뜻한시선"], career: ["원광대학교 산본한방병원 일반수련의","원광대학교 산본한방병원 한방내과 전공의","(前) 이음한방병원 진료원장","(前) 와이즈한의원 대표원장","(前) 신촌하나한의원 대표원장","(現) 면력한방병원 대표원장"], activities: ["한방내과 전문의","KAIM 국제통합의학 인정의","(사)대한통합암학회 인증 통합암치료 인정의"], education: ["원광대학교 한의과대학 졸업","원광대학교 한의학대학원 석사"], publications: [], i18n: { en: { name: "Dr. Yoo Hyung-jin", position: "Chief Director, Sinchon" }, ru: { name: "Д-р Ю Хёнджин", position: "Главный директор, Синчхон" }, zh: { name: "刘炯进 新村代表院长", position: "新村代表院长" }, ja: { name: "柳炯進 新村代表院長", position: "新村代表院長" }, kz: { name: "Д-р Ю Хёнджин", position: "Бас директор, Синчон" } }, display_order: 0 },
  { branch: "sinchon", name_ko: "김택수", position_ko: "신촌 진료원장", subspecialty: "통합면역 한방재활의학과", photo_url: "https://immunehospital.com/uploads/doctors/68ac4764c5e8e7.14581519.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac4764c5b3e7.10282574.jpg", keywords: ["#친절한","#꼼꼼한","#자세한설명","#편안한","#정확한","#소통이좋은"], career: ["대전대학교 대전한방병원 인턴 수련의","대전대학교 대전한방병원 한방재활의학과 전공의","(前) 대전대학교 대전한방병원 외래교수","(前) 생생한의원 진료원장","(前) 연세으뜸한의원 진료원장","(現) 면력한방병원 진료원장"], activities: ["한방재활의학과 전문의","대한한방재활의학과학회 정회원","척추신경추나의학회 정회원","대한약침학회 정회원","대한스포츠한의학회 정회원"], education: ["대전대학교 한의과대학 졸업"], publications: [], i18n: { en: { name: "Dr. Kim Taek-su", position: "Clinical Director, Sinchon" }, ru: { name: "Д-р Ким Тэксу", position: "Клинический директор, Синчхон" }, zh: { name: "金宅洙 新村诊疗院长", position: "新村诊疗院长" }, ja: { name: "金宅洙 新村診療院長", position: "新村診療院長" }, kz: { name: "Д-р Ким Тэксу", position: "Клиникалық директор, Синчон" } }, display_order: 1 },
  { branch: "sinchon", name_ko: "정유진", position_ko: "신촌 진료원장", subspecialty: "한방내과 · 면역 치료", photo_url: "https://immunehospital.com/uploads/doctors/68ac464c6fdee2.09872274.jpg", listing_photo_url: "https://immunehospital.com/uploads/doctors/68ac464c6fdee2.09872274.jpg", keywords: [], career: ["(現) 면력한방병원 진료원장"], activities: [], education: ["한방내과 전문의"], publications: [], i18n: { en: { name: "Dr. Jung Yu-jin", position: "Korean Internal Medicine Specialist, Sinchon" }, ru: { name: "Д-р Чон Юджин", position: "Специалист корейской внутренней медицины, Синчхон" }, zh: { name: "郑有进 新村诊疗院长", position: "新村诊疗院长" }, ja: { name: "鄭有進 新村診療院長", position: "新村診療院長" }, kz: { name: "Д-р Чон Юджин", position: "Корей ішкі медицина маманы, Синчон" } }, display_order: 2 },
];

async function seed() {
  console.log("🌱 Seeding partner branches and doctors...\n");

  // 1. Upsert branches
  const branchIdMap = {};
  for (const branch of BRANCHES) {
    const { data, error } = await supabase
      .from("partner_branches")
      .upsert(branch, { onConflict: "branch_code" })
      .select("id, branch_code")
      .single();

    if (error) {
      console.error(`❌ Branch "${branch.branch_code}":`, error.message);
      continue;
    }
    branchIdMap[branch.branch_code] = data.id;
    console.log(`✅ Branch: ${branch.name_ko} → ${data.id}`);
  }

  // 2. Insert doctors
  let successCount = 0;
  for (const doc of DOCTORS) {
    const branchId = branchIdMap[doc.branch];
    if (!branchId) {
      console.error(`❌ Doctor "${doc.name_ko}": branch "${doc.branch}" not found`);
      continue;
    }

    const record = {
      branch_id: branchId,
      name_ko: doc.name_ko,
      name_en: doc.i18n?.en?.name || null,
      position_ko: doc.position_ko,
      position_en: doc.i18n?.en?.position || null,
      photo_url: doc.photo_url,
      listing_photo_url: doc.listing_photo_url,
      subspecialty: doc.subspecialty,
      career: doc.career,
      education: doc.education,
      activities: doc.activities,
      publications: doc.publications,
      keywords: doc.keywords,
      i18n: doc.i18n,
      display_order: doc.display_order,
      is_active: true,
    };

    const { error } = await supabase
      .from("partner_doctors")
      .insert(record);

    if (error) {
      console.error(`❌ Doctor "${doc.name_ko}":`, error.message);
    } else {
      successCount++;
      console.log(`  👨‍⚕️ ${doc.name_ko} (${doc.branch})`);
    }
  }

  console.log(`\n🎉 Done! ${successCount}/${DOCTORS.length} doctors seeded.`);
}

seed().catch(console.error);
