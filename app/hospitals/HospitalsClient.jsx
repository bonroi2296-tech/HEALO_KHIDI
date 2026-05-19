'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MapPin, Users, Shield, Leaf,
  ArrowRight, Award, Heart, CheckCircle2, Clock,
  ChevronRight, Stethoscope, ChevronDown, ChevronUp,
  Phone, GraduationCap, Briefcase, BookOpen, Activity,
  X,
} from 'lucide-react';
import { getLangCodeFromCookie } from '../../src/lib/i18n';
import { supabaseClient } from '../../src/lib/data/supabaseClient';
import { mapHospitalRow } from '../../src/lib/mapper';

/* ───────────────── i18n Labels ───────────────── */
const L = {
  consortium: {
    badge: { ko: '핵심 컨소시엄 파트너', en: 'Core Consortium Partner', ru: 'Основной партнёр консорциума', kz: 'Негізгі консорциум серіктес', zh: '核心联盟合作伙伴', ja: 'コアコンソーシアムパートナー' },
    name: { ko: '면력한방병원', en: 'Immune Hospital of Korean Medicine', ru: 'Клиника Мёнрёк', kz: 'Мёнрёк клиникасы', zh: '免疫医院', ja: '免疫病院' },
    role: { ko: 'HEALO 플랫폼의 한방 면역치료 및 사후관리 총괄', en: 'Korean Medicine immune therapy & post-care for HEALO', ru: 'Иммунная терапия и послеоперационный уход', kz: 'Иммундық терапия және емнен кейінгі күтім', zh: '韩方免疫治疗及术后管理', ja: '韓方免疫治療・術後管理' },
    desc: { ko: '면력한방병원은 서울 강서구에 본원을 두고 신촌·광명·성동에 분원을 운영하는 한방 면역치료 전문 의료기관입니다. 암 환자의 면역력 강화, 항암 부작용 완화, 체력 회복을 위한 통합 한방 프로그램을 제공합니다.', en: 'Immune Hospital is a Korean Medicine institution headquartered in Gangseo-gu, Seoul, with branches in Sinchon, Gwangmyeong, and Seongdong. We provide integrated Korean Medicine programs for cancer patients including immune enhancement, chemotherapy side-effect relief, and physical recovery.', ru: 'Иммунная Клиника — учреждение корейской медицины с главным офисом в Кансо-гу, Сеул, и филиалами в Синчоне, Кванмёне и Сондоне. Мы предоставляем комплексные программы для онкопациентов.', kz: 'Иммунная Клиника — Кансо-гудағы бас кеңсесі мен Синчон, Кванмён, Сондон филиалдары бар корей медицинасы мекемесі.', zh: '免疫医院总部位于首尔江西区，在新村、光明和城东设有分院。为癌症患者提供综合韩方项目。', ja: '免疫病院はソウル江西区に本院を置き、新村・光明・城東に分院を展開する免疫治療専門韓方医療機関です。' },
  },
  branches: { ko: '지점 네트워크', en: 'Branch Network', ru: 'Сеть филиалов', kz: 'Филиал желісі', zh: '分院网络', ja: '分院ネットワーク' },
  branchesDesc: { ko: '면력한방병원은 서울·경기 4개 지점을 운영하고 있습니다.', en: 'Immune Hospital operates 4 branches across Seoul & Gyeonggi.', ru: 'Иммунная Клиника работает в 4 филиалах.', kz: 'Иммунная Клиника 4 филиалда жұмыс істейді.', zh: '免疫医院在首尔及京畿道运营4家分院。', ja: '免疫病院は4拠点で運営しています。' },
  status: {
    registered: { ko: '외국인환자 유치기관 등록', en: 'Registered for Foreign Patients', ru: 'Зарегистрирован для иностранных пациентов', kz: 'Шетелдік пациенттер үшін тіркелген', zh: '已注册外国患者招引机构', ja: '外国人患者誘致機関登録済み' },
    preparing: { ko: '등록 준비 중', en: 'Registration in Progress', ru: 'Регистрация в процессе', kz: 'Тіркеу дайындалуда', zh: '注册准备中', ja: '登録準備中' },
    upcoming: { ko: '오픈 예정', en: 'Coming Soon', ru: 'Скоро открытие', kz: 'Жақында ашылады', zh: '即将开业', ja: '近日オープン予定' },
  },
  section: {
    career: { ko: '경력', en: 'Career', ru: 'Карьера', kz: 'Мансап', zh: '经历', ja: '経歴' },
    education: { ko: '학력', en: 'Education', ru: 'Образование', kz: 'Білім', zh: '学历', ja: '学歴' },
    activities: { ko: '활동', en: 'Activities & Memberships', ru: 'Деятельность и членство', kz: 'Қызмет және мүшелік', zh: '活动与会员', ja: '活動・所属' },
    publications: { ko: '저서 및 논문', en: 'Publications & Papers', ru: 'Публикации и статьи', kz: 'Жарияланымдар және мақалалар', zh: '著作与论文', ja: '著書・論文' },
  },
  doctors_label: { ko: '명 전문의', en: ' Doctors', ru: ' врачей', kz: ' дәрігер', zh: '名医生', ja: '名の医師' },
  view_profile: { ko: '상세 프로필', en: 'Full Profile', ru: 'Полный профиль', kz: 'Толық профиль', zh: '详细简历', ja: '詳細プロフィール' },
  close: { ko: '닫기', en: 'Close', ru: 'Закрыть', kz: 'Жабу', zh: '关闭', ja: '閉じる' },
  strengths: {
    title: { ko: '면력한방병원의 강점', en: 'Our Strengths', ru: 'Наши преимущества', kz: 'Артықшылықтарымыз', zh: '我们的优势', ja: '強み' },
    items: [
      { icon: 'Shield', title: { ko: '면역 강화 전문', en: 'Immune Enhancement', ru: 'Укрепление иммунитета', kz: 'Иммунитетті нығайту', zh: '免疫增强', ja: '免疫強化' }, desc: { ko: '사상체질 진단 기반 맞춤형 면역 프로그램', en: 'Customized immune programs based on Sasang constitutional diagnosis', ru: 'Индивидуальные программы на основе диагностики Сасан', kz: 'Сасан диагностикасы негізіндегі бағдарламалар', zh: '基于四象体质诊断的定制免疫方案', ja: '四象体質診断に基づくプログラム' } },
      { icon: 'Heart', title: { ko: '항암 부작용 관리', en: 'Chemo Side-effect Care', ru: 'Побочные эффекты химиотерапии', kz: 'Химиотерапия жанама әсерлері', zh: '化疗副作用管理', ja: '抗がん副作用ケア' }, desc: { ko: '구토, 피로, 식욕부진 등 항암 부작용 한방 치료', en: 'Korean Medicine for nausea, fatigue, appetite loss from chemo', ru: 'Лечение тошноты, усталости, потери аппетита', kz: 'Жүрек айну, шаршау, тәбет жоғалуын емдеу', zh: '针对化疗副作用的韩方治疗', ja: '吐き気・疲労・食欲不振の韓方治療' } },
      { icon: 'Leaf', title: { ko: '사후 회복 프로그램', en: 'Post-treatment Recovery', ru: 'Восстановление', kz: 'Қалпына келтіру', zh: '术后恢复', ja: '治療後回復' }, desc: { ko: '수술 후 체력 회복, 한약·침·약침 통합 치료', en: 'Integrated herbal medicine, acupuncture & pharmacopuncture', ru: 'Фитотерапия, акупунктура и фармакопунктура', kz: 'Фитотерапия, акупунктура және фармакопунктура', zh: '韩药·针灸·药针综合治疗', ja: '韓薬・鍼・薬鍼統合治療' } },
    ],
  },
  partnerHospitals: {
    title: { ko: '협진 암 전문 병원', en: 'Partner Oncology Hospitals', ru: 'Партнёрские онкобольницы', kz: 'Серіктес онкологиялық аурухналар', zh: '协诊肿瘤医院', ja: '協診がん専門病院' },
    desc: { ko: 'HEALO가 연계하는 한국 주요 암 전문 의료기관입니다.', en: 'Leading Korean oncology hospitals partnered with HEALO.', ru: 'Ведущие корейские онкобольницы — партнёры HEALO.', kz: 'HEALO серіктес корей онкологиялық аурухналары.', zh: 'HEALO合作的韩国肿瘤专科医院。', ja: 'HEALO提携の韓国がん専門病院。' },
  },
  cancerCare: {
    title: { ko: '암종별 치료 안내', en: 'Treatment by Cancer Type', ru: 'Лечение по типу рака', kz: 'Рак түрі бойынша емдеу', zh: '按癌症类型治疗', ja: 'がん種別治療' },
    desc: { ko: '각 암종에 대한 한국의 치료 접근법과 HEALO의 통합 케어를 확인하세요.', en: 'Korean treatment approaches for each cancer type with HEALO\'s integrated care.', ru: 'Корейские методы лечения с интегрированной помощью HEALO.', kz: 'HEALO кешенді көмегімен корей емдеу тәсілдері.', zh: '了解韩国治疗方法和HEALO综合护理。', ja: '韓国の治療アプローチとHEALO統合ケア。' },
  },
  cta: { ko: '사전상담 신청하기', en: 'Request Pre-consultation', ru: 'Запросить консультацию', kz: 'Кеңес сұрау', zh: '申请预咨询', ja: '事前相談を申請' },
  viewDetails: { ko: '상세 보기', en: 'View Details', ru: 'Подробнее', kz: 'Толығырақ', zh: '查看详情', ja: '詳細を見る' },
  comingSoon: { ko: '협진 병원 정보를 준비 중입니다', en: 'Partner hospital information coming soon', ru: 'Информация о больницах-партнёрах скоро появится', kz: 'Серіктес аурухналар туралы ақпарат жақында', zh: '合作医院信息即将推出', ja: '協診病院情報を準備中です' },
  ewTitle: { ko: '양·한방 통합 암 케어', en: 'Integrated East-West Cancer Care', ru: 'Интегрированная онкологическая помощь', kz: 'Кешенді онкологиялық көмек', zh: '中西医结合肿瘤护理', ja: '洋・韓方統合がんケア' },
  ewDesc: { ko: '전문 암 병원의 수술·항암 치료와 면력한방병원의 면역 강화·사후관리를 하나의 플랫폼에서.', en: 'Oncology surgery & chemotherapy from partner hospitals + Korean Medicine immune therapy & post-care — all on one platform.', ru: 'Хирургия и химиотерапия в партнёрских больницах + иммунная терапия и послеоперационный уход в Иммуногоспитале — на одной платформе.', kz: 'Серіктес аурухналардағы хирургия мен химиотерапия + Иммунная Клиникадегі иммундық терапия мен бақылау — бір платформада.', zh: '合作医院的手术与化疗 + 免疫医院的免疫强化与术后管理 — 一站式平台。', ja: '提携病院の手術・抗がん治療と免疫病院の免疫強化・術後管理を一つのプラットフォームで。' },
  hero_branches: { ko: '개 지점', en: 'Branches', ru: 'филиала', kz: 'филиал', zh: '家分院', ja: '拠点' },
  hero_doctors: { ko: '명 전문의', en: 'Doctors', ru: 'врачей', kz: 'дәрігер', zh: '名医生', ja: '名の医師' },
  hero_registered: { ko: '2개 지점 외국인환자 유치기관 등록', en: '2 Branches Registered for Foreign Patients', ru: '2 филиала зарегистрированы', kz: '2 филиал тіркелген', zh: '2家已注册外国患者招引', ja: '2拠点 外国人患者誘致登録済み' },
};

const ICON_MAP = { Shield, Heart, Leaf };

/* ───────────────── Doctor Data ───────────────── */
const DOCTORS = [
  // ── 강서점 (7명) ──
  { id: 2, branch: 'gangseo',
    name: { ko: '황이준', en: 'Hwang Yi-jun' },
    position: { ko: '강서 대표원장', en: 'Gangseo Chief Director' },
    subspecialty: { ko: '통합면역 대표원장', en: 'Integrative Immuno-Oncology' },
    role: 'ceo',
    photo: 'https://immunehospital.com/uploads/doctors/6895e62074dc23.62228636.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68a674036de695.54364290.png',
    keywords: { ko: ['#꼼꼼한','#친절한','#예리한','#이성적인','#정확한'], en: ['#Thorough','#Friendly','#Sharp','#Rational','#Precise'] },
    경력: { ko: ['(現) 면력한방병원 대표원장'], en: ['(Current) Chief Director, Immune Hospital'] },
    학력: { ko: ['동국대학교 한의과대학 졸업', '통합암학회 인정의', '척추신경추나의학회 정회원'], en: ['Graduated from Dongguk University, College of Korean Medicine', 'Integrative Oncology Certified Specialist', 'Spinal Nerve Chuna Medicine Society Regular Member'] },
    활동: { ko: ['한방비만학회 전문가과정', '동의방약학회 정회원'], en: ['KM Obesity Academy Expert Course', 'Dong-Eui Herbal Medicine Society Regular Member'] },
  },
  { id: 3, branch: 'gangseo',
    name: { ko: '이우석', en: 'Lee Woo-seok' },
    position: { ko: '강서 양방대표원장', en: 'Gangseo Western Medicine Chief' },
    subspecialty: { ko: '통합면역 부인과', en: 'Gynecologic Oncology' },
    role: 'wm',
    photo: 'https://immunehospital.com/uploads/doctors/68a3efab789ed9.14338812.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68a42d8de9e095.75488957.jpg',
    keywords: { ko: ['#부담없는','#배려깊은','#상담이편한','#공감있는','#질문환영'], en: ['#Approachable','#Considerate','#EasyConsult','#Empathetic','#QuestionsWelcome'] },
    경력: { ko: ['(前) 삼성서울병원 전임의', '(前) 중앙대학교병원 전임의', '(現) 면력한방병원 원장'], en: ['(Former) Fellow, Samsung Seoul Hospital', '(Former) Fellow, Chung-Ang University Hospital', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['산부인과 전문의', '중앙대학교 의과대학 졸업', '중앙대학교 의과대학 박사'], en: ['OB/GYN Specialist', 'Graduated from Chung-Ang University, College of Medicine', 'Ph.D., Chung-Ang University College of Medicine'] },
    활동: { ko: ['University of Chicago 부인 종양학', '순천향대학교 부천병원 산부인과 조교수', '순천향대학교 구미병원 산부인과 조교수'], en: ['Gynecologic Oncology, University of Chicago', 'Assistant Professor of OB/GYN, Soonchunhyang Univ. Bucheon Hospital', 'Assistant Professor of OB/GYN, Soonchunhyang Univ. Gumi Hospital'] },
  },
  { id: 34, branch: 'gangseo',
    name: { ko: '임지성', en: 'Lim Ji-seong' },
    position: { ko: '강서 의무원장', en: 'Gangseo CMO' },
    subspecialty: { ko: '통증재활 한방재활의학과', en: 'Pain Rehab · KM Rehabilitation' },
    role: 'cmo',
    photo: 'https://immunehospital.com/uploads/doctors/68ff28295475d1.28021653.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ff2829546a03.48601548.jpg',
    keywords: { ko: ['#믿음을주는','#정성스러운','#쉬운설명','#신뢰가는'], en: ['#Trustworthy','#Devoted','#ClearExplanation','#Reliable'] },
    학력: { ko: ['한방재활의학과 전문의', '대전대학교 한의과 대학 졸업', '원광대학교 한방병원 한방재활 학과 전문의'], en: ['KM Rehabilitation Specialist', 'Graduated from Daejeon University, College of Korean Medicine', 'KM Rehabilitation Specialist, Wonkwang University KM Hospital'] },
    활동: { ko: ['한방재활의학과학회 평생회원', '척추신경추나의학회 정회원', '미국 근골격계 초음파 자격(RMSK)', '파워리프팅 협회 WPC 팀닥터'], en: ['KM Rehabilitation Society Lifetime Member', 'Spinal Nerve Chuna Medicine Society Regular Member', 'RMSK (Registered Musculoskeletal Sonographer, USA)', 'WPC Powerlifting Association Team Doctor'] },
    논문: { ko: ['疎經活血湯加味方의 관절염에 미치는효과 (2021)', '지질다당류로 유발한 염증성 뇌손상동물모델에 대한 황금작약탕의 억제효과연구 (2021)', '슬관절전치환술후 한방병원에 입원한환자 20명에대한 후향적분석 (2022)'], en: ['Effect of modified Sogyeonghwalhyeol-tang on arthritis (2021)', 'Inhibitory effect of Hwanggeumjakyak-tang on LPS-induced inflammatory brain injury model (2021)', 'Retrospective analysis of 20 patients admitted to KM hospital after total knee arthroplasty (2022)'] },
  },
  { id: 6, branch: 'gangseo',
    name: { ko: '김지영', en: 'Kim Ji-young' },
    position: { ko: '강서 진료원장', en: 'Gangseo Attending Physician' },
    subspecialty: { ko: '통합면역 한방내과', en: 'KM Internal Medicine' },
    photo: 'https://immunehospital.com/uploads/doctors/68a42f470e29d3.79526645.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68a42f470df8e0.51544383.jpg',
    keywords: { ko: ['#꼼꼼한','#친절한','#예리한','#이성적인','#정확한'], en: ['#Thorough','#Friendly','#Sharp','#Rational','#Precise'] },
    경력: { ko: ['(前) 인애가(대전,송파)한방병원 진료원장', '(前) 소람한방병원 진료원장', '(現) 면력한방병원 원장'], en: ['(Former) Attending Director, Inaega KM Hospital (Daejeon/Songpa)', '(Former) Attending Director, Soram KM Hospital', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['한방내과 전문의', '대전대학교 한의과 대학 졸업', '대전대학교 한방병원 한방내과 전문의'], en: ['KM Internal Medicine Specialist', 'Graduated from Daejeon University, College of Korean Medicine', 'KM Internal Medicine Specialist, Daejeon University KM Hospital'] },
    활동: { ko: ['대한 중풍순환신경학회 정회원', '대한 한방비만학회 정회원', '대한한방내과의원 정회원'], en: ['Korean Stroke & Circulatory Neurology Society Regular Member', 'Korean KM Obesity Society Regular Member', 'Korean KM Internal Medicine Clinics Regular Member'] },
  },
  { id: 7, branch: 'gangseo',
    name: { ko: '김은지', en: 'Kim Eun-ji' },
    position: { ko: '강서 진료원장', en: 'Gangseo Attending Physician' },
    subspecialty: { ko: '통합면역 한방내과', en: 'KM Internal Medicine' },
    photo: 'https://immunehospital.com/uploads/doctors/68a42d656c4665.58894230.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68a42d656c1818.66316770.jpg',
    keywords: { ko: ['#편안한분위기','#쉬운설명','#따뜻한','#신뢰가는','#섬세한','#공감있는'], en: ['#Comfortable','#ClearExplanation','#Warm','#Reliable','#Attentive','#Empathetic'] },
    경력: { ko: ['(前) 면력한방병원 면역내과 진료원장', '(前) 튼튼한방병원 항암면역센터 진료원장', '(現) 면력한방병원 원장'], en: ['(Former) Attending Director, Immune Hospital Immuno-Internal Medicine', '(Former) Attending Director, Teunteun KM Hospital Immuno-Oncology Center', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['한방내과 전문의', '동신대학교 한의과대학 졸업', '동신대학교 대학원 한의학과 석사', '목동동신한방병원 일반/전문수련의 수료'], en: ['KM Internal Medicine Specialist', 'Graduated from Dongshin University, College of Korean Medicine', 'M.S., Dongshin University Graduate School of Korean Medicine', 'Completed residency at Mokdong Dongshin KM Hospital'] },
    활동: { ko: ['대한한방내과학회 정회원', '대한통합암학회 정회원', '통합암치료 인정의', '한방비만학회 전문가과정 이수', '2018 평창동계올림픽 미디어촌 한의진료센터 진료', '한의약 홍보체험관(메디컬코리아 지원센터) 외국인 한방검진 및 상담'], en: ['Korean KM Internal Medicine Society Regular Member', 'Korean Society of Integrative Oncology Regular Member', 'Integrative Oncology Certified Specialist', 'KM Obesity Academy Expert Course', '2018 PyeongChang Winter Olympics Media Village KM Clinic', 'Medical Korea Support Center — foreign patient KM consultation'] },
    논문: { ko: ['조등산과 GB34 전침치료를 활용한 약인성 파킨슨증후군 환자의 증례 (2017)', '항암치료 후 식욕부진·오심에 대한 독활지황탕 가미방 투여 삶의 질 개선 증례보고 (2018)', '厚朴이 ob/ob 마우스의 대사성 염증과 인슐린저항성에 미치는 영향 연구 (2018)'], en: ['Case of drug-induced parkinsonism treated with Jodeungsan & GB34 electroacupuncture (2017)', 'QoL improvement with modified Dokhwaljihwang-tang for post-chemo anorexia/nausea (2018)', 'Effect of Magnolia bark on metabolic inflammation & insulin resistance in ob/ob mice (2018)'] },
  },
  { id: 11, branch: 'gangseo',
    name: { ko: '배상근', en: 'Bae Sang-geun' },
    position: { ko: '강서 양방원장', en: 'Gangseo Western Medicine Director' },
    subspecialty: { ko: '통합면역 가정의학', en: 'Family Medicine' },
    role: 'wm',
    photo: 'https://immunehospital.com/uploads/doctors/68a428b7697d23.50383418.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/690b00eb512ff3.09917549.jpg',
    keywords: { ko: ['#부담없는','#차분한','#편안한','#빠른대응','#부드러운','#침착한'], en: ['#Approachable','#Calm','#Comfortable','#Responsive','#Gentle','#Composed'] },
    경력: { ko: ['(前) 새빛요양병원 진료원장', '(前) 서울대학교 상산수리과학관 의학통계연구소장', '(前) 인천석병원 내과 진료원장', '(前) 국립춘천병원 내과 진료원장'], en: ['(Former) Attending Director, Saebit Long-term Care Hospital', '(Former) Director, Medical Statistics Lab, Seoul National University', '(Former) Attending Director, Internal Medicine, Incheon Seok Hospital', '(Former) Attending Director, Internal Medicine, National Chuncheon Hospital'] },
    학력: { ko: ['서울중앙보훈병원 가정의학과 전문의'], en: ['Family Medicine Specialist, Seoul Veterans Hospital'] },
    활동: { ko: ['대한임상갱년기학회 정회원', '한국임상고혈압학회 정회원', '대한임상노인학회 정회원', '대한통증학회 정회원'], en: ['Korean Menopause Society Regular Member', 'Korean Clinical Hypertension Society Regular Member', 'Korean Clinical Geriatrics Society Regular Member', 'Korean Pain Society Regular Member'] },
  },
  { id: 39, branch: 'gangseo',
    name: { ko: '김정현', en: 'Kim Jeong-hyeon' },
    position: { ko: '강서 진료원장', en: 'Gangseo Attending Physician' },
    subspecialty: { ko: '통증재활', en: 'Pain Rehabilitation' },
    photo: 'https://immunehospital.com/uploads/doctors/69cddc4eccde42.45651812.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/69cddc4eccce48.64445214.png',
    keywords: { ko: ['#세심한','#꼼꼼한','#따스한','#사려깊은','#믿음을주는','#편안한분위기'], en: ['#Attentive','#Thorough','#Warm','#Thoughtful','#Trustworthy','#Comfortable'] },
    경력: { ko: ['(前) 종로 통인한의원 진료원장', '(前) 터한의원 여의도점 진료원장', '(現) 면력한방병원 진료원장'], en: ['(Former) Attending Director, Jongno Tongin KM Clinic', '(Former) Attending Director, Teo KM Clinic Yeouido', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['동국대학교 한의과대학 한의학과 졸업'], en: ['Graduated from Dongguk University, College of Korean Medicine'] },
    활동: { ko: ['대한한의학회 회원', '대한통합레이저의학회 정회원', '임상약침학회 정회원', '한국한의약진흥원 [동남아 외국인 환자 유치 활성화 지원] 기획재정이사', '2025, 2026 서울특별시 학교 주치의', '2023 한의혜민대상 수상(잼버리 한의진료센터)', '2024 종로구 한의사회 표창장', '2025 하베스트 [신규 한의사 임상역량 강화프로그램] 교육위원'], en: ['Korean Medicine Society Member', 'Korean Integrative Laser Medicine Society Regular Member', 'Clinical Pharmacopuncture Society Regular Member', 'NIKOM — Planning & Finance Director for SE Asian patient attraction', 'Seoul Metropolitan School Doctor 2025–2026', '2023 KM Hyemin Award (Jamboree KM Clinic)', '2024 Jongno KM Association Commendation', '2025 Harvest New KM Practitioner Clinical Training Committee'] },
    논문: { ko: ['Research on Ways to Attract Foreign Patients to a Korean Medicine Clinic (Frontiers in Medicine, 2025)'], en: ['Research on Ways to Attract Foreign Patients to a Korean Medicine Clinic (Frontiers in Medicine, 2025)'] },
  },

  // ── 신촌점 (5명) ──
  { id: 25, branch: 'sinchon',
    name: { ko: '유형진', en: 'Yu Hyung-jin' },
    position: { ko: '신촌 대표원장', en: 'Sinchon Chief Director' },
    subspecialty: { ko: '통합면역 대표원장', en: 'Integrative Immuno-Oncology' },
    role: 'ceo',
    photo: 'https://immunehospital.com/uploads/doctors/68ac46bd43c9d4.37241186.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac46bd439598.83386960.png',
    keywords: { ko: ['#믿음을주는','#차분한','#쉬운설명','#공감있는','#부드러운','#따뜻한시선'], en: ['#Trustworthy','#Calm','#ClearExplanation','#Empathetic','#Gentle','#WarmGaze'] },
    경력: { ko: ['원광대학교 산본한방병원 일반수련의', '자생한방병원 한방재활의학과 전문수련의', '(前) 청주나비솔한방병원 진료원장', '(前) 강서면력한방병원 진료원장', '(現) 신촌면력한방병원 대표원장'], en: ['Resident, Wonkwang University Sanbon KM Hospital', 'KM Rehabilitation Fellow, Jaseng KM Hospital', '(Former) Attending Director, Cheongju Navisol KM Hospital', '(Former) Attending Director, Gangseo Immune Hospital', '(Current) Chief Director, Sinchon Immune Hospital'] },
    학력: { ko: ['원광대학교 한의과대학 졸업', '원광대학교 한의과대학 석사 및 박사 학위'], en: ['Graduated from Wonkwang University, College of Korean Medicine', 'M.S. & Ph.D., Wonkwang University College of Korean Medicine'] },
    활동: { ko: ['한방재활의학과 학회 평생회원', '척추신경추나의학회 정회원', '대한 스포츠학회 정회원', '한방비만학회 정회원', '대한 통합암학회 인정의', '대한 암한의학회 정회원'], en: ['KM Rehabilitation Society Lifetime Member', 'Spinal Nerve Chuna Medicine Society Regular Member', 'Korean Sports Medicine Society Regular Member', 'KM Obesity Society Regular Member', 'Korean Society of Integrative Oncology Certified Specialist', 'Korean Cancer KM Society Regular Member'] },
    논문: { ko: ['제 4~5번 요추 추간판 탈출 정도와 요통의 한의학적 치료 효과의 상관성 연구', '반월상 연골판 손상을 동반한 전방 십자인대 부분파열 환자의 한의학적 치료 효과 증례보고'], en: ['Correlation between L4-5 lumbar disc herniation severity and KM treatment outcomes for low back pain', 'Case report: KM treatment of partial ACL tear with meniscal injury'] },
  },
  { id: 37, branch: 'sinchon',
    name: { ko: '조현실', en: 'Cho Hyeon-sil' },
    position: { ko: '신촌 양방대표원장', en: 'Sinchon Western Medicine Chief' },
    subspecialty: { ko: '통합면역 부인과', en: 'OB/GYN · Integrative Medicine' },
    role: 'wm',
    photo: 'https://immunehospital.com/uploads/doctors/69cddae60209c3.18962833.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/69cddae601fbd8.12610287.jpg',
    keywords: { ko: ['#친절한','#세심한','#따뜻한','#신뢰가는','#사려깊은','#상담충분'], en: ['#Friendly','#Attentive','#Warm','#Reliable','#Thoughtful','#ThoroughConsult'] },
    학력: { ko: ['산부인과 전문의', '이화여대 의과대학 의학과 졸업', '이화여대부속병원 수련', '경희대학교 의과대학 석사', '흑룡강 중의약대학교 졸업(Traditional Chinese Medicine)'], en: ['OB/GYN Specialist', 'Graduated from Ewha Womans University, College of Medicine', 'Residency at Ewha Womans University Hospital', 'M.S., Kyung Hee University College of Medicine', 'Graduated from Heilongjiang University of Chinese Medicine (TCM)'] },
    활동: { ko: ['대한 IMS학회 정회원', '대한 폐경학회 회원', '대한 노인병학회 회원'], en: ['Korean IMS Society Regular Member', 'Korean Menopause Society Member', 'Korean Geriatrics Society Member'] },
  },
  { id: 24, branch: 'sinchon',
    name: { ko: '정유진', en: 'Jung Yu-jin' },
    position: { ko: '신촌 진료원장', en: 'Sinchon Attending Physician' },
    subspecialty: { ko: '한방내과 전문의', en: 'KM Internal Medicine Specialist' },
    photo: 'https://immunehospital.com/uploads/doctors/68ac464c700852.38470926.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac464c6fdee2.09872274.jpg',
    keywords: { ko: ['#친절한','#꼼꼼한','#세심한','#성실한','#편안한설명','#쉬운설명'], en: ['#Friendly','#Thorough','#Attentive','#Diligent','#ComfortExplanation','#ClearExplanation'] },
    경력: { ko: ['(前) 광덕안정한의원 부산하단점 수석원장', '(前) 휘림한방병원 진료원장', '(現) 신촌면력한방병원 진료원장'], en: ['(Former) Senior Director, Gwangdeok Anjeong KM Clinic Busan', '(Former) Attending Director, Hwirim KM Hospital', '(Current) Attending Director, Sinchon Immune Hospital'] },
    학력: { ko: ['동의대학교 한의학과 한방내과 박사', '동의대학교 한의과 대학 졸업', '동의대학교 부속 한방병원 한방내과 전문의'], en: ['Ph.D. in KM Internal Medicine, Dong-Eui University', 'Graduated from Dong-Eui University, College of Korean Medicine', 'KM Internal Medicine Specialist, Dong-Eui University KM Hospital'] },
    활동: { ko: ['대한 한의사 전문의 협회 정회원', '대한 한방 내과학회 정회원', '대한 암한의학회 정회원', '대한 통합암의학회 회원', '척추신경추나의학회 정회원'], en: ['Korean KM Specialist Association Regular Member', 'Korean KM Internal Medicine Society Regular Member', 'Korean Cancer KM Society Regular Member', 'Korean Society of Integrative Oncology Member', 'Spinal Nerve Chuna Medicine Society Regular Member'] },
    논문: { ko: ['통합 의학 치료로 5년 생존 및 완전 관해에 도달한 췌장암 증례보고 (2023)', '위식도 역류질환에 대한 반하사심탕의 효과 연구경향 (2020)', '뇌졸중 후 중추성 통증·시상증후군에 대한 한약치료 체계적 고찰 (2019)', '약물유발성 구강건조증 치험 1례 (2018)'], en: ['5-year survival & complete remission of pancreatic cancer with integrative medicine (2023)', 'Research trends on Banhasasim-tang for GERD (2020)', 'Systematic review of herbal medicine for post-stroke central pain/thalamic syndrome (2019)', 'Case of drug-induced xerostomia treated with herbal medicine (2018)'] },
  },
  { id: 23, branch: 'sinchon',
    name: { ko: '조수호', en: 'Cho Su-ho' },
    position: { ko: '신촌 진료원장', en: 'Sinchon Attending Physician' },
    subspecialty: { ko: '한방내과 전문의', en: 'KM Internal Medicine Specialist' },
    photo: 'https://immunehospital.com/uploads/doctors/68be43e0120336.44853403.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac45d97c31b7.54028297.jpg',
    keywords: { ko: ['#친절한','#부담없는','#배려깊은','#공감있는','#편안한','#친근한'], en: ['#Friendly','#Approachable','#Considerate','#Empathetic','#Comfortable','#Personable'] },
    경력: { ko: ['(前) 강동경희대학교 한방병원 한방내과 전문의', '(現) 신촌면력한방병원 진료원장'], en: ['(Former) KM Internal Medicine Specialist, Gangdong Kyung Hee University KM Hospital', '(Current) Attending Director, Sinchon Immune Hospital'] },
    학력: { ko: ['경희대학교 한의과대학 졸업', '경희대학교 임상한의학과(소화기내과학) 석사', '강동경희대학교 한방병원 전문수련의 수료'], en: ['Graduated from Kyung Hee University, College of Korean Medicine', 'M.S. in Clinical KM (Gastroenterology), Kyung Hee University', 'Completed fellowship at Gangdong Kyung Hee University KM Hospital'] },
    활동: { ko: ['대한한방내과학회 정회원', '기능성소화불량 한의표준임상진료지침 개발 참여 연구원(실행위원)'], en: ['Korean KM Internal Medicine Society Regular Member', 'Researcher, KM Standard Clinical Practice Guideline for Functional Dyspepsia (Executive Committee)'] },
    논문: { ko: ['초음파 위배출 측정과 한의설문 간의 상관성 분석 (2018)', '약침치료로 호전된 급성 충수염 환자 1례 (2019)', 'Herbal medicine Banha-sasim-tang for functional dyspepsia: systematic review protocol (Medicine, 2019)'], en: ['Correlation analysis of ultrasound gastric emptying and KM questionnaire (2018)', 'A case of acute appendicitis improved by pharmacopuncture (2019)', 'Herbal medicine Banha-sasim-tang for functional dyspepsia: systematic review protocol (Medicine, 2019)'] },
  },
  { id: 22, branch: 'sinchon',
    name: { ko: '김민정', en: 'Kim Min-jeong' },
    position: { ko: '신촌 진료원장', en: 'Sinchon Attending Physician' },
    subspecialty: { ko: '한방내과 전문의', en: 'KM Internal Medicine Specialist' },
    photo: 'https://immunehospital.com/uploads/doctors/68ac45367f95d4.17025580.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac45367f6ed2.58460098.jpg',
    keywords: { ko: ['#부담없는','#상냥한','#믿을수있는','#자세한설명','#공감있는','#부드러운'], en: ['#Approachable','#Kind','#Trustable','#DetailedExplanation','#Empathetic','#Gentle'] },
    경력: { ko: ['(現) 신촌면력한방병원 진료원장'], en: ['(Current) Attending Director, Sinchon Immune Hospital'] },
    학력: { ko: ['경희대학교 한의과대학 졸업', '경희대학교 임상한의학과(소화기내과학) 석사', '강동경희대학교한방병원 일반수련의 수료', '강동경희대학교한방병원 한방내과 전문수련의 수료'], en: ['Graduated from Kyung Hee University, College of Korean Medicine', 'M.S. in Clinical KM (Gastroenterology), Kyung Hee University', 'Completed internship at Gangdong Kyung Hee University KM Hospital', 'Completed KM Internal Medicine fellowship at Gangdong Kyung Hee University KM Hospital'] },
    활동: { ko: ['대한한방내과학회 정회원'], en: ['Korean KM Internal Medicine Society Regular Member'] },
    논문: { ko: ['Herbal medicine for non-erosive reflux disease: systematic review & meta-analysis (Medicine, 2024)', '헬리코박터 파일로리 연관 위궤양의 감초사심탕 치료 연구 동향 (2024)', '염증성 장 질환에서 전침 중심 미주신경자극 고찰 (2023)', '딸꾹질에 대한 침 치료의 최근 임상 연구 동향 (2022)'], en: ['Herbal medicine for non-erosive reflux disease: systematic review & meta-analysis (Medicine, 2024)', 'Research trends on Gamchosasim-tang for H. pylori-associated gastric ulcer (2024)', 'Review of vagus nerve stimulation via electroacupuncture in inflammatory bowel disease (2023)', 'Recent clinical research trends on acupuncture for hiccups (2022)'] },
  },

  // ── 광명점 (7명) ──
  { id: 15, branch: 'gwangmyeong',
    name: { ko: '배길준', en: 'Bae Gil-jun' },
    position: { ko: '광명 대표원장', en: 'Gwangmyeong Chief Director' },
    subspecialty: { ko: '통합면역 한방재활의학과', en: 'KM Rehabilitation · Immuno-Oncology' },
    role: 'ceo',
    photo: 'https://immunehospital.com/uploads/doctors/68ac21df896ae3.71046416.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/697feda49897b6.88772738.png',
    keywords: { ko: ['#친절한','#꼼꼼한','#신뢰가는','#정성스러운','#자세한설명'], en: ['#Friendly','#Thorough','#Reliable','#Devoted','#DetailedExplanation'] },
    경력: { ko: ['(前) 동신대학교 부속 광주한방병원 한방재활의학과 진료교수', '(前) 365다시재한방병원 진료부장', '(現) 면력한방병원 진료원장'], en: ['(Former) Clinical Professor, KM Rehabilitation, Dongshin University Gwangju KM Hospital', '(Former) Medical Director, 365 Dasijae KM Hospital', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['한방재활의학과 전문의, 한의학박사', '동신대학교 한의과대학 졸업', '동신대학교 한의과대학원 석/박사', '동신대학교 부속 목포한방병원 일반/전문수련의 수료'], en: ['KM Rehabilitation Specialist, Ph.D. in Korean Medicine', 'Graduated from Dongshin University, College of Korean Medicine', 'M.S. & Ph.D., Dongshin University Graduate School of Korean Medicine', 'Completed residency at Dongshin University Mokpo KM Hospital'] },
    활동: { ko: ['대한한의사전문의협회 부회장', '한방재활의학과학회', '대한오스테오파시학회', '척추신경추나의학회', '대한통합암학회', '네이버 지식인 상담한의사 (한방재활의학과)', '한의약선도기술개발사업 참여연구원', '노인장기요양보험 등급판정위원'], en: ['Vice President, Korean KM Specialist Association', 'KM Rehabilitation Society', 'Korean Osteopathy Society', 'Spinal Nerve Chuna Medicine Society', 'Korean Society of Integrative Oncology', 'Naver Knowledge-in KM Consultant (Rehabilitation)', 'Researcher, KM Leading Technology Development Project', 'Long-term Care Insurance Rating Committee Member'] },
    논문: { ko: ['Antiosteoarthritic Effects of ChondroT (Evidence-based CAM)', 'Inpatient treatment effect and MMPI of MVC injuries (Chinese J of Integrative Med)', 'Anti-osteoarthritic effects of ChondroT collagenase model (BMC CAM)', '외 10편'], en: ['Antiosteoarthritic Effects of ChondroT (Evidence-based CAM)', 'Inpatient treatment effect and MMPI of MVC injuries (Chinese J of Integrative Med)', 'Anti-osteoarthritic effects of ChondroT collagenase model (BMC CAM)', '+ 10 more'] },
  },
  { id: 38, branch: 'gwangmyeong',
    name: { ko: '이정훈', en: 'Lee Jeong-hun' },
    position: { ko: '광명 양방대표원장', en: 'Gwangmyeong Western Medicine Chief' },
    subspecialty: { ko: '통합면역 마취통증의학과', en: 'Anesthesiology & Pain Medicine' },
    role: 'wm',
    photo: 'https://immunehospital.com/uploads/doctors/69cddb97abdb81.98166856.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/69cddb97abcd76.76518423.png',
    keywords: { ko: ['#친절한','#따뜻한','#꼼꼼한','#사려깊은','#믿음을주는','#따뜻한시선'], en: ['#Friendly','#Warm','#Thorough','#Thoughtful','#Trustworthy','#WarmGaze'] },
    경력: { ko: ['한양대학교병원 마취통증의학과 전공의/전문의', '한양대학교병원 통증의학과 임상교수', '(前) 닥터투유의원 원장', '(前) 오정본병원 통증의학과 원장', '(前) 날아라정형외과 원장', '(前) 부평그린마취통증의학과의원 진료원장', '(現) 면력한방병원 양방원장'], en: ['Anesthesiology & Pain Medicine Resident/Specialist, Hanyang University Hospital', 'Clinical Professor, Pain Medicine, Hanyang University Hospital', '(Former) Director, Doctor To You Clinic', '(Former) Director, Pain Medicine, Ojeongbon Hospital', '(Former) Director, Narara Orthopedics', '(Former) Attending Director, Bupyeong Green Anesthesiology & Pain Clinic', '(Current) Western Medicine Director, Immune Hospital'] },
    학력: { ko: ['한양대학교 의과대학 의학과 졸업', '한양대학교 의과대학 마취통증의학과 석사', '한양대학교병원 통증의학과 전임의'], en: ['Graduated from Hanyang University, College of Medicine', 'M.S. in Anesthesiology & Pain Medicine, Hanyang University', 'Pain Medicine Fellow, Hanyang University Hospital'] },
    활동: { ko: ['대한마취통증의학회 정회원', '대한골대사학회 정회원', '대한통증학회 정회원', '대한근골격계초음파학회 정회원', '대한척추통증학회 정회원', 'TPI 연수교육 이수', 'prolotherapy(인대증식치료) 교육 이수'], en: ['Korean Society of Anesthesiology Regular Member', 'Korean Bone Metabolism Society Regular Member', 'Korean Pain Society Regular Member', 'Korean Musculoskeletal Ultrasound Society Regular Member', 'Korean Spinal Pain Society Regular Member', 'TPI (Trigger Point Injection) Training Completed', 'Prolotherapy Training Completed'] },
  },
  { id: 16, branch: 'gwangmyeong',
    name: { ko: '하정빈', en: 'Ha Jeong-bin' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통합면역 한방내과', en: 'KM Internal Medicine · Immuno-Oncology' },
    photo: 'https://immunehospital.com/uploads/doctors/68ac238878a855.69829943.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac2388788076.62890527.jpg',
    keywords: { ko: ['#친절한','#꼼꼼한','#빠른대응','#상담충분','#믿음을주는'], en: ['#Friendly','#Thorough','#Responsive','#ThoroughConsult','#Trustworthy'] },
    경력: { ko: ['한방내과 전문의', '대한통합암학회 인증 통합암치료 인정의', '대한한방비만학회 비만치료 인증 한의사', '(前) 사랑한방병원 진료원장', '(前) 참바른한방병원 수석원장', '(現) 면력한방병원 원장'], en: ['KM Internal Medicine Specialist', 'Integrative Oncology Certified Specialist, Korean Society of Integrative Oncology', 'Certified Obesity Treatment KM Doctor, Korean KM Obesity Society', '(Former) Attending Director, Sarang KM Hospital', '(Former) Senior Director, Chambareun KM Hospital', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['대구한의대학교 한의학과 차석 졸업', '경희대학교 동서의학대학원 한의학 석사', '경희대학교 한방병원 일반/전문 수련의 수료'], en: ['Graduated 2nd in class from Daegu Haany University, Korean Medicine', 'M.S. in KM, Kyung Hee University East-West Medicine Graduate School', 'Completed residency at Kyung Hee University KM Hospital'] },
    활동: { ko: ['대한한방내과학회 평생회원', '대한통합암학회 정회원', '대한한방비만학회 정회원', '경희대 CMS Winter Workshop on Data-Driven Medicine 수료', '경희대 동서의학대학원 우수 학위논문상 수상'], en: ['Korean KM Internal Medicine Society Lifetime Member', 'Korean Society of Integrative Oncology Regular Member', 'Korean KM Obesity Society Regular Member', 'Kyung Hee CMS Winter Workshop on Data-Driven Medicine', 'Outstanding Thesis Award, Kyung Hee East-West Medicine Graduate School'] },
    논문: { ko: ['경관 영양으로 유발된 소음인 설사에 관한 한방 처치 1례', '뇌졸중 환자의 실어증에 대한 전침 치료 : 체계적 문헌 고찰'], en: ['A case of Soeumin diarrhea induced by tube feeding treated with herbal medicine', 'Electroacupuncture for post-stroke aphasia: a systematic review'] },
  },
  { id: 17, branch: 'gwangmyeong',
    name: { ko: '오재우', en: 'Oh Jae-woo' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통증재활 한방신경정신과', en: 'KM Neuropsychiatry · Pain Rehab' },
    photo: 'https://immunehospital.com/uploads/doctors/68ac24c0008ac3.71274446.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac24c0006643.02621332.jpg',
    keywords: { ko: ['#정확한','#쉬운설명','#섬세한','#소통이좋은','#신뢰가는','#공감있는'], en: ['#Precise','#ClearExplanation','#Attentive','#Communicative','#Reliable','#Empathetic'] },
    경력: { ko: ['강남자생한방병원 한방신경정신과 전문의', '(前) 자생한방병원 진료원장', '(現) 면력한방병원 원장'], en: ['KM Neuropsychiatry Specialist, Gangnam Jaseng KM Hospital', '(Former) Attending Director, Jaseng KM Hospital', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['한방신경정신과 전문의', '경원대학교 한의과대학', '가천대학교 한의학대학원 석사'], en: ['KM Neuropsychiatry Specialist', 'Kyungwon University, College of Korean Medicine', 'M.S., Gachon University Graduate School of Korean Medicine'] },
    활동: { ko: ['대한한방신경정신과학회 평생회원', '대한한방신경정신과학회 전문의이사', '척추신경추나의학회 정회원'], en: ['Korean KM Neuropsychiatry Society Lifetime Member', 'Board Director, Korean KM Neuropsychiatry Society', 'Spinal Nerve Chuna Medicine Society Regular Member'] },
    논문: { ko: ['Long term follow-up of cervical disc herniation with integrated CAM (BMC CAM, 2016)', 'Snake Venom synergized Cytotoxic Effect of NK Cells on Lung Cancer (2016)', '외 4편'], en: ['Long term follow-up of cervical disc herniation with integrated CAM (BMC CAM, 2016)', 'Snake Venom synergized Cytotoxic Effect of NK Cells on Lung Cancer (2016)', '+ 4 more'] },
  },
  { id: 18, branch: 'gwangmyeong',
    name: { ko: '김상현', en: 'Kim Sang-hyeon' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통합면역', en: 'Integrative Immunology' },
    photo: 'https://immunehospital.com/uploads/doctors/68ac25e7cc1487.42823820.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac25e7cbec30.65434200.jpg',
    keywords: { ko: ['#자세한설명','#상담충분','#질문환영','#진심있는','#침착한'], en: ['#DetailedExplanation','#ThoroughConsult','#QuestionsWelcome','#Sincere','#Composed'] },
    경력: { ko: ['(前) 힘찬큐한방병원 수석원장', '(現) 면력한방병원 진료원장'], en: ['(Former) Senior Director, Himchan Q KM Hospital', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['경원대 한의학과 졸업'], en: ['Graduated from Kyungwon University, Korean Medicine'] },
    활동: { ko: ['스위스 정부 장학생', '제네바의대 면역학 연구실 연구원', '(사)대한통합암학회 인증 통합암치료 인정의'], en: ['Swiss Government Scholarship Recipient', 'Researcher, Immunology Lab, University of Geneva Medical School', 'Integrative Oncology Certified Specialist, Korean Society of Integrative Oncology'] },
  },
  { id: 19, branch: 'gwangmyeong',
    name: { ko: '김주완', en: 'Kim Ju-wan' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통증재활', en: 'Pain Rehabilitation' },
    photo: 'https://immunehospital.com/uploads/doctors/68ac266eec3443.90360671.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac266eec0d10.41842964.jpg',
    keywords: { ko: ['#친절한','#꼼꼼한','#정확한','#배려깊은','#소통이좋은','#신뢰가는'], en: ['#Friendly','#Thorough','#Precise','#Considerate','#Communicative','#Reliable'] },
    경력: { ko: ['(前) 구산한의원 원장', '(前) 김정기한의원 원장', '(現) 면력한방병원 원장'], en: ['(Former) Director, Gusan KM Clinic', '(Former) Director, Kim Jeonggi KM Clinic', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['대구한의대학교 한의학과대학 졸업', '대구한의대 부속한방병원 수련의', '울진군 보건의료원 한방진료과장', '성주군 보건소 한방진료과장'], en: ['Graduated from Daegu Haany University, College of Korean Medicine', 'Resident, Daegu Haany University KM Hospital', 'KM Department Chief, Uljin Public Health Center', 'KM Department Chief, Seongju Public Health Center'] },
    활동: { ko: ['척추 신경 추나 의학회 정회원', '[MBC] \'이상한 나라의 며느리\' 방송'], en: ['Spinal Nerve Chuna Medicine Society Regular Member', '[MBC] TV appearance on "Wonderful Daughter-in-Law"'] },
  },
  { id: 20, branch: 'gwangmyeong',
    name: { ko: '조성원', en: 'Cho Seong-won' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통증재활', en: 'Pain Rehabilitation' },
    photo: 'https://immunehospital.com/uploads/doctors/68ac27045a5df4.11570705.jpg',
    thumb: 'https://immunehospital.com/uploads/doctors/68ac27045a39e4.56645724.jpg',
    keywords: { ko: ['#꼼꼼한','#정확한','#빠른대응','#정성스러운','#진심있는','#친화적인'], en: ['#Thorough','#Precise','#Responsive','#Devoted','#Sincere','#Personable'] },
    경력: { ko: ['(前) 숭실한의원 진료원장', '(前) 자양으뜸한의원 대표원장', '(前) 맘편한요양병원 한의과장', '(現) 면력한방병원 진료원장'], en: ['(Former) Attending Director, Soongsil KM Clinic', '(Former) Chief Director, Jayang Eutteum KM Clinic', '(Former) KM Department Chief, Mampyeonhan Long-term Care Hospital', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['경희대학교 한의과대학 졸업', '진천군 보건소 공중보건의사'], en: ['Graduated from Kyung Hee University, College of Korean Medicine', 'Public Health Doctor, Jincheon Public Health Center'] },
    활동: { ko: ['한방비만학회 회원', '산돌한의원 통증치료사관학교 과정 이수', '대한스포츠한의학회 팀닥터과정 수료'], en: ['KM Obesity Society Member', 'Sandol KM Clinic Pain Treatment Academy Completed', 'Korean Sports KM Society Team Doctor Course Completed'] },
  },
];

/* ───────────────── Branch Config ───────────────── */
const BRANCH_CONFIG = [
  { id: 'gangseo', name: { ko: '강서점 (본원)', en: 'Gangseo HQ', ru: 'Кансо (гл. офис)', kz: 'Кансо (бас)', zh: '江西总院', ja: '江西本院' }, addr: { ko: '서울특별시 강서구 마곡중앙6로 93 (마곡동, 열린프라자) 6,7,10층', en: 'F6,7,10, 93 Magokjungang 6-ro, Gangseo-gu, Seoul', ru: 'Магок, Кансо-гу, Сеул', kz: 'Магок, Кансо-гу, Сеул', zh: '首尔江西区麻谷中央6路93号 6,7,10层', ja: 'ソウル江西区麻谷中央6路93 6·7·10階' }, status: 'registered', tel: '02-2039-8510' },
  { id: 'sinchon', name: { ko: '신촌점', en: 'Sinchon', ru: 'Синчон', kz: 'Синчон', zh: '新村分院', ja: '新村分院' }, addr: { ko: '서울특별시 서대문구 연세로 12 (창천동, 피델리아타워) 8-14층', en: '8-14F, 12 Yonsei-ro, Seodaemun-gu, Seoul', ru: 'Содэмун-гу, Сеул', kz: 'Содэмун-гу, Сеул', zh: '首尔西大门区延世路12号 8-14层', ja: 'ソウル西大門区延世路12 8-14階' }, status: 'registered', tel: '02-393-8510' },
  { id: 'gwangmyeong', name: { ko: '광명점', en: 'Gwangmyeong', ru: 'Кванмён', kz: 'Кванмён', zh: '光明分院', ja: '光明分院' }, addr: { ko: '경기 광명시 오리로 876', en: '876 Ori-ro, Gwangmyeong, Gyeonggi', ru: 'Кванмён, Кёнги-до', kz: 'Кванмён, Кёнги-до', zh: '京畿道光明市梧里路876号', ja: '京畿道光明市梧里路876' }, status: 'preparing', tel: '02-898-8510' },
  { id: 'seongdong', name: { ko: '성동점', en: 'Seongdong', ru: 'Сондон', kz: 'Сондон', zh: '城东分院', ja: '城東分院' }, addr: { ko: '서울 성동구', en: 'Seongdong-gu, Seoul', ru: 'Сондон-гу, Сеул', kz: 'Сондон-гу, Сеул', zh: '首尔城东区', ja: 'ソウル城東区' }, status: 'preparing', tel: '02-2295-8510' },
];

const CANCER_GUIDES = [
  { emoji: '🫁', type: { ko: '위암', en: 'Stomach Cancer', ru: 'Рак желудка', kz: 'Асқазан обыры', zh: '胃癌', ja: '胃がん' }, approach: { ko: '내시경 절제 · 위절제술 · 항암 → 한방 소화기능 회복', en: 'Endoscopic resection · Gastrectomy · Chemo → KM digestive recovery', ru: 'Эндоскопия · Гастрэктомия · Химиотерапия → Восстановление ЖКТ', kz: 'Эндоскопия → АЖ қалпына келтіру', zh: '内镜切除·化疗→韩方消化功能恢复', ja: '内視鏡切除・抗がん→韓方消化機能回復' } },
  { emoji: '🩷', type: { ko: '유방암', en: 'Breast Cancer', ru: 'Рак молочной железы', kz: 'Сүт безі обыры', zh: '乳腺癌', ja: '乳がん' }, approach: { ko: '유방보존술 · 항암/호르몬 → 한방 면역·체력 회복', en: 'Breast-conserving surgery · Chemo → KM immune recovery', ru: 'Органосберегающая · Химио → Иммунное восстановление', kz: 'Сақтау · Химио → Қалпына келтіру', zh: '保乳手术·化疗→韩方免疫恢复', ja: '乳房温存術・抗がん→韓方免疫回復' } },
  { emoji: '🫀', type: { ko: '간암', en: 'Liver Cancer', ru: 'Рак печени', kz: 'Бауыр обыры', zh: '肝癌', ja: '肝がん' }, approach: { ko: '간절제 · 색전술 · 표적항암 → 한방 간기능 보호', en: 'Hepatectomy · Embolization · Targeted → KM liver protection', ru: 'Гепатэктомия · Эмболизация → Защита печени', kz: 'Гепатэктомия → Бауырды қорғау', zh: '肝切除·栓塞→韩方肝功能保护', ja: '肝切除・塞栓術→韓方肝機能保護' } },
  { emoji: '🌬️', type: { ko: '폐암', en: 'Lung Cancer', ru: 'Рак лёгких', kz: 'Өкпе обыры', zh: '肺癌', ja: '肺がん' }, approach: { ko: '흉강경 수술 · 면역항암 → 한방 호흡기·체력 관리', en: 'VATS · Immunotherapy → KM respiratory care', ru: 'ВАТС · Иммунотерапия → Респираторная помощь', kz: 'ВАТС · Иммунотерапия → Тыныс алу', zh: '胸腔镜·免疫→韩方呼吸管理', ja: 'VATS・免疫療法→韓方呼吸器管理' } },
  { emoji: '🦋', type: { ko: '갑상선암', en: 'Thyroid Cancer', ru: 'Рак щитовидной железы', kz: 'Қалқанша без обыры', zh: '甲状腺癌', ja: '甲状腺がん' }, approach: { ko: '갑상선 절제 · 방사성요오드 → 한방 호르몬 균형', en: 'Thyroidectomy · Radioiodine → KM hormonal balance', ru: 'Тиреоидэктомия · Радиойод → Баланс гормонов', kz: 'Тиреоидэктомия → Гормондық тепе-теңдік', zh: '甲状腺切除→韩方激素平衡', ja: '甲状腺切除→韓方ホルモンバランス' } },
  { emoji: '🎗️', type: { ko: '대장암', en: 'Colorectal Cancer', ru: 'Рак толстой кишки', kz: 'Тоқ ішек обыры', zh: '大肠癌', ja: '大腸がん' }, approach: { ko: '복강경 절제 · 항암 → 한방 장기능 회복·면역 강화', en: 'Laparoscopic resection · Chemo → KM bowel & immune recovery', ru: 'Лапароскопия · Химио → Восстановление кишечника', kz: 'Лапароскопия → Ішек қалпына келтіру', zh: '腹腔镜切除→韩方肠功能·免疫恢复', ja: '腹腔鏡切除→韓方腸機能・免疫回復' } },
];

/* ───────────────── Sub-components ───────────────── */

function StatusBadge({ status, l }) {
  const cfg = {
    registered: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle2 size={14} /> },
    preparing:  { bg: 'bg-amber-100',   text: 'text-amber-800',   icon: <Clock size={14} /> },
    upcoming:   { bg: 'bg-gray-100',     text: 'text-gray-600',    icon: <Clock size={14} /> },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${c.bg} ${c.text} text-sm font-bold rounded-full`}>
      {c.icon} {l(L.status[status])}
    </span>
  );
}

/* Helper: get localized array data (supports both plain arrays and {ko,en,...} objects) */
const la = (obj, lang) => {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return obj[lang] || obj.en || obj.ko || [];
};

/* ── Doctor Profile Modal (Large) ── */
function DoctorModal({ doc, l, lang, onClose }) {
  if (!doc) return null;
  const sections = [
    { key: '경력', icon: <Briefcase size={16} />, label: l(L.section.career), data: la(doc.경력, lang) },
    { key: '학력', icon: <GraduationCap size={16} />, label: l(L.section.education), data: la(doc.학력, lang) },
    { key: '활동', icon: <Activity size={16} />, label: l(L.section.activities), data: la(doc.활동, lang) },
    { key: '논문', icon: <BookOpen size={16} />, label: l(L.section.publications), data: la(doc.논문, lang) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-700 to-teal-600 rounded-t-3xl p-8 text-white">
          <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
            <X size={20} />
          </button>
          <div className="flex items-center gap-6">
            <img src={doc.photo} alt={l(doc.name)} className="w-32 h-32 rounded-2xl object-cover border-4 border-white/30 shadow-lg bg-white/10" />
            <div>
              <h3 className="text-2xl font-extrabold">{l(doc.name)}</h3>
              <p className="text-emerald-200 text-base font-semibold mt-1">{l(doc.position)}</p>
              {doc.subspecialty && <p className="text-white/70 text-sm mt-1">{l(doc.subspecialty)}</p>}
            </div>
          </div>
          {la(doc.keywords, lang).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {la(doc.keywords, lang).map((kw, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/15 text-white/90 text-xs rounded-full">{kw}</span>
              ))}
            </div>
          )}
        </div>
        {/* Content */}
        <div className="p-8 space-y-6">
          {sections.map(sec => {
            if (!sec.data || sec.data.length === 0) return null;
            return (
              <div key={sec.key}>
                <h4 className="flex items-center gap-2 text-base font-bold text-gray-700 mb-3">
                  <span className="text-emerald-600">{sec.icon}</span>{sec.label}
                </h4>
                <ul className="space-y-1.5">
                  {sec.data.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 leading-relaxed pl-4 relative before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:bg-emerald-400 before:rounded-full">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Doctor Card (Large PC / Compact Mobile) ── */
function DoctorCard({ doc, l, lang, onSelect }) {
  const isLeader = !!doc.role;
  const roleBadge = doc.role === 'ceo' ? { label: 'CEO', color: 'bg-emerald-600 text-white' }
    : doc.role === 'wm' ? { label: 'WM', color: 'bg-blue-600 text-white' }
    : doc.role === 'cmo' ? { label: 'CMO', color: 'bg-purple-600 text-white' }
    : null;

  // 대표들은 경력 첫줄, 일반은 학력 첫줄 미리보기
  const career = la(doc.경력, lang);
  const edu = la(doc.학력, lang);
  const previewLines = [];
  if (career.length) previewLines.push(...career.slice(0, 2));
  if (edu.length && previewLines.length < 2) previewLines.push(...edu.slice(0, 2 - previewLines.length));

  return (
    <div
      onClick={() => onSelect(doc)}
      className={`bg-white rounded-2xl border cursor-pointer hover:shadow-xl transition-all group overflow-hidden ${
        isLeader ? 'border-emerald-200 ring-1 ring-emerald-50' : 'border-gray-200'
      }`}
    >
      {/* PC: horizontal layout / Mobile: compact */}
      <div className="flex flex-col sm:flex-row">
        {/* Photo — big on PC */}
        <div className="sm:w-40 lg:w-48 shrink-0">
          <img
            src={doc.thumb}
            alt={l(doc.name)}
            className="w-full h-48 sm:h-full object-cover object-top bg-gray-100 group-hover:scale-[1.02] transition"
          />
        </div>

        {/* Info */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-extrabold text-lg">{l(doc.name)}</h4>
            {roleBadge && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${roleBadge.color}`}>{roleBadge.label}</span>
            )}
          </div>
          <p className="text-emerald-700 font-semibold text-sm">{l(doc.position)}</p>
          {doc.subspecialty && (
            <p className="text-gray-400 text-xs mt-0.5">{l(doc.subspecialty)}</p>
          )}

          {/* Keywords */}
          {la(doc.keywords, lang).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {la(doc.keywords, lang).slice(0, 5).map((kw, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[11px] rounded-full">{kw}</span>
              ))}
            </div>
          )}

          {/* Preview lines */}
          {previewLines.length > 0 && (
            <div className="mt-3 space-y-0.5 hidden sm:block">
              {previewLines.map((line, i) => (
                <p key={i} className="text-xs text-gray-400 truncate">{line}</p>
              ))}
            </div>
          )}

          {/* Footer stats */}
          <div className="flex items-center gap-4 mt-auto pt-3 text-xs text-gray-300">
            {la(doc.논문, lang).length > 0 && (
              <span className="flex items-center gap-1 text-gray-400"><BookOpen size={11} /> {la(doc.논문, lang).length}</span>
            )}
            {career.length > 0 && (
              <span className="flex items-center gap-1 text-gray-400"><Briefcase size={11} /> {career.length}</span>
            )}
            {la(doc.활동, lang).length > 0 && (
              <span className="flex items-center gap-1 text-gray-400"><Activity size={11} /> {la(doc.활동, lang).length}</span>
            )}
            <span className="ml-auto text-emerald-600 font-semibold group-hover:text-emerald-700 transition text-xs">
              {l(L.view_profile)} →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Main Component ───────────────── */
export default function HospitalsClient() {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const [partnerHospitals, setPartnerHospitals] = useState([]);
  const [expandedBranch, setExpandedBranch] = useState('gangseo');
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj['en'] || '';
  };

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabaseClient
        .from('hospitals')
        .select('*')
        .eq('is_published', true)
        .not('slug', 'like', 'immunehospital%')
        .order('display_order', { ascending: true, nullsFirst: false })
        .limit(6);
      if (data) {
        const langCode = getLangCodeFromCookie();
        setPartnerHospitals(data.map(r => mapHospitalRow(r, langCode)).filter(Boolean));
      }
    };
    fetchPartners();
  }, []);

  const toggleBranch = (id) => setExpandedBranch(prev => prev === id ? null : id);
  const branchDoctors = (branchId) => DOCTORS.filter(d => d.branch === branchId);

  return (
    <div className="min-h-screen bg-white">
      {selectedDoctor && <DoctorModal doc={selectedDoctor} l={l} lang={lang} onClose={() => setSelectedDoctor(null)} />}

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-emerald-800 via-teal-700 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <Award size={16} /> {l(L.consortium.badge)}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">{l(L.consortium.name)}</h1>
          <p className="text-emerald-200 text-xl font-medium mb-4">{l(L.consortium.role)}</p>
          <p className="text-white/80 text-base md:text-lg max-w-3xl leading-relaxed mb-10">{l(L.consortium.desc)}</p>

          <div className="flex flex-wrap gap-3 mb-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base">
              <span className="text-white font-bold text-xl">4</span>
              <span className="text-emerald-200 ml-2">{l(L.hero_branches)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base">
              <span className="text-white font-bold text-xl">19</span>
              <span className="text-emerald-200 ml-2">{l(L.hero_doctors)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-300" />
              <span className="text-emerald-200">{l(L.hero_registered)}</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/intake')}
            className="bg-white text-emerald-800 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center gap-2 text-lg"
          >
            {l(L.cta)} <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Branch Network + Doctors ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{l(L.branches)}</h2>
        <p className="text-gray-500 text-base mb-8">{l(L.branchesDesc)}</p>

        <div className="space-y-5">
          {BRANCH_CONFIG.map(branch => {
            const docs = branchDoctors(branch.id);
            const isOpen = expandedBranch === branch.id;
            const isUpcoming = branch.status === 'upcoming';

            return (
              <div key={branch.id} className={`border-2 rounded-3xl overflow-hidden transition-all ${
                branch.status === 'registered' ? 'border-emerald-200' :
                branch.status === 'preparing' ? 'border-amber-200' : 'border-gray-200'
              } ${isOpen ? 'shadow-xl' : 'hover:shadow-md'}`}>
                {/* Branch header */}
                <div
                  className={`p-6 md:p-8 cursor-pointer transition ${isOpen ? 'bg-gray-50/50' : 'hover:bg-gray-50/30'}`}
                  onClick={() => !isUpcoming && docs.length > 0 && toggleBranch(branch.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        branch.status === 'registered' ? 'bg-emerald-100' :
                        branch.status === 'preparing' ? 'bg-amber-50' : 'bg-gray-100'
                      }`}>
                        <Building2 size={28} className={
                          branch.status === 'registered' ? 'text-emerald-700' :
                          branch.status === 'preparing' ? 'text-amber-600' : 'text-gray-400'
                        } />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl md:text-2xl">{l(branch.name)}</h3>
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin size={14} /> {l(branch.addr)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {docs.length > 0 && (
                        <span className="text-sm text-gray-500 flex items-center gap-1 hidden sm:flex">
                          <Users size={16} /> {docs.length}{l(L.doctors_label)}
                        </span>
                      )}
                      {branch.tel && (
                        <span className="text-sm text-gray-400 hidden md:flex items-center gap-1">
                          <Phone size={14} /> {branch.tel}
                        </span>
                      )}
                      {docs.length > 0 && (
                        isOpen
                          ? <ChevronUp size={24} className="text-gray-400" />
                          : <ChevronDown size={24} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <StatusBadge status={branch.status} l={l} />
                  </div>
                </div>

                {/* Expanded: Doctor grid — 2col PC, 1col mobile */}
                {isOpen && docs.length > 0 && (
                  <div className="border-t-2 border-gray-100 bg-gray-50/30 px-4 sm:px-6 md:px-8 py-6 md:py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                      {docs.map(doc => (
                        <DoctorCard key={doc.id} doc={doc} l={l} lang={lang} onSelect={setSelectedDoctor} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Strengths ── */}
      <section className="bg-emerald-50 py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">{l(L.strengths.title)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {L.strengths.items.map((item, i) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <div key={i} className="bg-white rounded-2xl p-8 border border-emerald-100">
                  <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-5">
                    <Icon size={28} className="text-emerald-700" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{l(item.title)}</h3>
                  <p className="text-base text-gray-500 leading-relaxed">{l(item.desc)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Partner Hospitals ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{l(L.partnerHospitals.title)}</h2>
        <p className="text-gray-500 text-base mb-8">{l(L.partnerHospitals.desc)}</p>
        {partnerHospitals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {partnerHospitals.map(h => (
              <div key={h.id} onClick={() => router.push(`/hospitals/${h.slug || h.id}`)} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-teal-300 transition cursor-pointer group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                    <Stethoscope size={24} className="text-teal-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base group-hover:text-teal-600 transition line-clamp-1">{h.name}</h3>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={12} /><span className="truncate">{h.location}</span></p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{h.description}</p>
                {h.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {h.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-teal-600 font-medium">
                  {l(L.viewDetails)} <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">{l(L.comingSoon)}</p>
          </div>
        )}
      </section>

      {/* ── Cancer Type Guide ── */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{l(L.cancerCare.title)}</h2>
          <p className="text-gray-500 text-base mb-8">{l(L.cancerCare.desc)}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CANCER_GUIDES.map((guide, i) => (
              <div key={i} onClick={() => router.push('/inquiry')} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-teal-200 transition cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{guide.emoji}</span>
                  <h3 className="font-bold text-lg group-hover:text-teal-600 transition">{l(guide.type)}</h3>
                </div>
                <p className="text-base text-gray-500 leading-relaxed">{l(guide.approach)}</p>
                <div className="flex items-center gap-1 mt-4 text-sm text-teal-600 font-medium">
                  {l(L.cta)} <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-3xl bg-gradient-to-r from-teal-600 to-emerald-600 p-10 md:p-16 text-center text-white">
          <div className="flex justify-center gap-3 mb-5">
            <Stethoscope size={28} className="text-teal-200" />
            <span className="text-teal-200 text-xl">+</span>
            <Leaf size={28} className="text-emerald-200" />
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">
            {l(L.ewTitle)}
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8 text-lg">
            {l(L.ewDesc)}
          </p>
          <button onClick={() => router.push('/intake')} className="bg-white text-teal-700 font-bold px-10 py-5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all inline-flex items-center gap-2 text-lg">
            {l(L.cta)} <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
