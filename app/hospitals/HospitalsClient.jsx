'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, MapPin, Users, Shield, Leaf,
  ArrowRight, Award, Heart, CheckCircle2, Clock,
  ChevronRight, Stethoscope, ChevronDown,
  Phone, GraduationCap, Briefcase, BookOpen, Activity,
  X,
} from 'lucide-react';
import OrganIcon from '../_components/OrganIcon';

// 의사 사진은 public/doctors/ 에 자체 호스팅(핫링크 금지 — 원본 immunehospital.com이 파일명 변경/삭제하면 깨졌었음).
// 새 의사 추가 시: scripts/fetch-doctor-photos.mjs 로 사진을 받아 public/doctors/ 에 넣고 로컬 경로로 참조.
// 그래도 깨지면(파일 누락 등) 회색 아바타로 대체해 깨진 이미지 아이콘이 노출되지 않게.
const DOCTOR_FALLBACK = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#eef2f5"/><circle cx="80" cy="60" r="28" fill="#b6c2cc"/><rect x="34" y="98" width="92" height="70" rx="34" fill="#b6c2cc"/></svg>'
);
const onImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = DOCTOR_FALLBACK; };

import { getLangCodeFromCookie, t } from '@/lib/i18n';
import { useLang } from '@/lib/i18n/LangContext';
import { localeHref } from '@/lib/i18n/config';
import { supabaseClient } from '@/lib/data/supabaseClient';
import { mapHospitalRow } from '@/lib/mapper';
import { DOCTOR_PHRASES } from '@/lib/content/doctorPhrases';

/* ───────────────── i18n Labels ─────────────────
   화면 문구는 중앙 사전(src/lib/i18n)의 "hospitalsPage.*" 키로 이전됨 — t(key, lang)로 조회. */
const ICON_MAP = { Shield, Heart, Leaf };
const STRENGTH_ICONS = ['Shield', 'Heart', 'Leaf']; // hospitalsPage.strengths.item{N}Title/Desc 와 순서 일치


/* ───────────────── Doctor Data ───────────────── */
const DOCTORS = [
  // ── 강서점 (7명) ──
  { id: 2, branch: 'gangseo',
    name: { ko: '황이준', en: 'Hwang Yi-jun' },
    position: { ko: '강서 대표원장', en: 'Gangseo Chief Director' },
    subspecialty: { ko: '통합면역 대표원장', en: 'Integrative Immuno-Oncology' },
    role: 'ceo',
    photo: '/doctors/6895e62074dc23.62228636.jpg',
    thumb: '/doctors/68a674036de695.54364290.png',
    keywords: { ko: ['#꼼꼼한','#친절한','#예리한','#이성적인','#정확한'], en: ['#Thorough','#Friendly','#Sharp','#Rational','#Precise'] },
    경력: { ko: ['(現) 면력한방병원 대표원장'], en: ['(Current) Chief Director, Immune Hospital'] },
    학력: { ko: ['동국대학교 한의과대학 졸업', '통합암학회 인정의', '척추신경추나의학회 정회원'], en: ['Graduated from Dongguk University, College of Korean Medicine', 'Integrative Oncology Certified Specialist', 'Spinal Nerve Chuna Medicine Society Regular Member'] },
    활동: { ko: ['한방비만학회 전문가과정', '동의방약학회 정회원'], en: ['Korean Medicine Obesity Academy Expert Course', 'Dong-Eui Herbal Medicine Society Regular Member'] },
  },
  { id: 3, branch: 'gangseo',
    name: { ko: '이우석', en: 'Lee Woo-seok' },
    position: { ko: '강서 양방대표원장', en: 'Gangseo Western Medicine Chief' },
    subspecialty: { ko: '통합면역 부인과', en: 'Gynecologic Oncology' },
    role: 'wm',
    photo: '/doctors/68a3efab789ed9.14338812.jpg',
    thumb: '/doctors/68a42d8de9e095.75488957.jpg',
    keywords: { ko: ['#부담없는','#배려깊은','#상담이편한','#공감있는','#질문환영'], en: ['#Approachable','#Considerate','#EasyConsult','#Empathetic','#QuestionsWelcome'] },
    경력: { ko: ['(前) 삼성서울병원 전임의', '(前) 중앙대학교병원 전임의', '(現) 면력한방병원 원장'], en: ['(Former) Fellow, Samsung Medical Center', '(Former) Fellow, Chung-Ang University Hospital', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['산부인과 전문의', '중앙대학교 의과대학 졸업', '중앙대학교 의과대학 박사'], en: ['OB/GYN Specialist', 'Graduated from Chung-Ang University, College of Medicine', 'Ph.D., Chung-Ang University College of Medicine'] },
    활동: { ko: ['University of Chicago 부인 종양학', '순천향대학교 부천병원 산부인과 조교수', '순천향대학교 구미병원 산부인과 조교수'], en: ['Gynecologic Oncology, University of Chicago', 'Assistant Professor of OB/GYN, Soonchunhyang University Bucheon Hospital', 'Assistant Professor of OB/GYN, Soonchunhyang University Gumi Hospital'] },
  },
  { id: 34, branch: 'gangseo',
    name: { ko: '임지성', en: 'Lim Ji-seong' },
    position: { ko: '강서 의무원장', en: 'Gangseo CMO' },
    subspecialty: { ko: '통증재활 한방재활의학과', en: 'Pain Rehab · Korean Rehabilitation Medicine' },
    role: 'cmo',
    photo: '/doctors/68ff28295475d1.28021653.jpg',
    thumb: '/doctors/68ff2829546a03.48601548.jpg',
    keywords: { ko: ['#믿음을주는','#정성스러운','#쉬운설명','#신뢰가는'], en: ['#Trustworthy','#Devoted','#ClearExplanation','#Reliable'] },
    학력: { ko: ['한방재활의학과 전문의', '대전대학교 한의과 대학 졸업', '원광대학교 한방병원 한방재활 학과 전문의'], en: ['Korean Rehabilitation Medicine Specialist', 'Graduated from Daejeon University, College of Korean Medicine', 'Korean Rehabilitation Medicine Specialist, Wonkwang University Korean Medicine Hospital'] },
    활동: { ko: ['한방재활의학과학회 평생회원', '척추신경추나의학회 정회원', '미국 근골격계 초음파 자격(RMSK)', '파워리프팅 협회 WPC 팀닥터'], en: ['Korean Rehabilitation Medicine Society Lifetime Member', 'Spinal Nerve Chuna Medicine Society Regular Member', 'RMSK (Registered Musculoskeletal Sonographer, USA)', 'WPC Powerlifting Association Team Doctor'] },
    논문: { ko: ['疎經活血湯加味方의 관절염에 미치는효과 (2021)', '지질다당류로 유발한 염증성 뇌손상동물모델에 대한 황금작약탕의 억제효과연구 (2021)', '슬관절전치환술후 한방병원에 입원한환자 20명에대한 후향적분석 (2022)'], en: ['Effect of modified Sogyeonghwalhyeol-tang on arthritis (2021)', 'Inhibitory effect of Hwanggeumjakyak-tang on LPS-induced inflammatory brain injury model (2021)', 'Retrospective analysis of 20 patients admitted to Korean Medicine hospital after total knee arthroplasty (2022)'] },
  },
  { id: 6, branch: 'gangseo',
    name: { ko: '김지영', en: 'Kim Ji-young' },
    position: { ko: '강서 진료원장', en: 'Gangseo Attending Physician' },
    subspecialty: { ko: '통합면역 한방내과', en: 'Korean Internal Medicine' },
    photo: '/doctors/68a42f470e29d3.79526645.jpg',
    thumb: '/doctors/68a42f470df8e0.51544383.jpg',
    keywords: { ko: ['#꼼꼼한','#친절한','#예리한','#이성적인','#정확한'], en: ['#Thorough','#Friendly','#Sharp','#Rational','#Precise'] },
    경력: { ko: ['(前) 인애가(대전,송파)한방병원 진료원장', '(前) 소람한방병원 진료원장', '(現) 면력한방병원 원장'], en: ['(Former) Attending Director, Inaega Korean Medicine Hospital (Daejeon/Songpa)', '(Former) Attending Director, Soram Korean Medicine Hospital', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['한방내과 전문의', '대전대학교 한의과 대학 졸업', '대전대학교 한방병원 한방내과 전문의'], en: ['Korean Internal Medicine Specialist', 'Graduated from Daejeon University, College of Korean Medicine', 'Korean Internal Medicine Specialist, Daejeon University Korean Medicine Hospital'] },
    활동: { ko: ['대한 중풍순환신경학회 정회원', '대한 한방비만학회 정회원', '대한한방내과의원 정회원'], en: ['Korean Stroke & Circulatory Neurology Society Regular Member', 'Korean Medicine Obesity Society Regular Member', 'Korean Internal Medicine Clinics Regular Member'] },
  },
  { id: 7, branch: 'gangseo',
    name: { ko: '김은지', en: 'Kim Eun-ji' },
    position: { ko: '강서 진료원장', en: 'Gangseo Attending Physician' },
    subspecialty: { ko: '통합면역 한방내과', en: 'Korean Internal Medicine' },
    photo: '/doctors/68a42d656c4665.58894230.jpg',
    thumb: '/doctors/68a42d656c1818.66316770.jpg',
    keywords: { ko: ['#편안한분위기','#쉬운설명','#따뜻한','#신뢰가는','#섬세한','#공감있는'], en: ['#Comfortable','#ClearExplanation','#Warm','#Reliable','#Attentive','#Empathetic'] },
    경력: { ko: ['(前) 면력한방병원 면역내과 진료원장', '(前) 튼튼한방병원 항암면역센터 진료원장', '(現) 면력한방병원 원장'], en: ['(Former) Attending Director, Immune Hospital Immuno-Internal Medicine', '(Former) Attending Director, Teunteun Korean Medicine Hospital Immuno-Oncology Center', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['한방내과 전문의', '동신대학교 한의과대학 졸업', '동신대학교 대학원 한의학과 석사', '목동동신한방병원 일반/전문수련의 수료'], en: ['Korean Internal Medicine Specialist', 'Graduated from Dongshin University, College of Korean Medicine', 'M.S., Dongshin University Graduate School of Korean Medicine', 'Completed residency at Mokdong Dongshin Korean Medicine Hospital'] },
    활동: { ko: ['대한한방내과학회 정회원', '대한통합암학회 정회원', '통합암치료 인정의', '한방비만학회 전문가과정 이수', '2018 평창동계올림픽 미디어촌 한의진료센터 진료', '한의약 홍보체험관(메디컬코리아 지원센터) 외국인 한방검진 및 상담'], en: ['Korean Internal Medicine Society Regular Member', 'Korean Society of Integrative Oncology Regular Member', 'Integrative Oncology Certified Specialist', 'Korean Medicine Obesity Academy Expert Course', '2018 PyeongChang Winter Olympics Media Village Korean Medicine Clinic', 'Medical Korea Support Center — foreign patient Korean Medicine consultation'] },
    논문: { ko: ['조등산과 GB34 전침치료를 활용한 약인성 파킨슨증후군 환자의 증례 (2017)', '항암치료 후 식욕부진·오심에 대한 독활지황탕 가미방 투여 삶의 질 개선 증례보고 (2018)', '厚朴이 ob/ob 마우스의 대사성 염증과 인슐린저항성에 미치는 영향 연구 (2018)'], en: ['Case of drug-induced parkinsonism treated with Jodeungsan & GB34 electroacupuncture (2017)', 'QoL improvement with modified Dokhwaljihwang-tang for post-chemo anorexia/nausea (2018)', 'Effect of Magnolia bark on metabolic inflammation & insulin resistance in ob/ob mice (2018)'] },
  },
  { id: 11, branch: 'gangseo',
    name: { ko: '배상근', en: 'Bae Sang-geun' },
    position: { ko: '강서 양방원장', en: 'Gangseo Western Medicine Director' },
    subspecialty: { ko: '통합면역 가정의학', en: 'Family Medicine' },
    role: 'wm',
    photo: '/doctors/68a428b7697d23.50383418.jpg',
    thumb: '/doctors/68a428b7697d23.50383418.jpg',
    keywords: { ko: ['#부담없는','#차분한','#편안한','#빠른대응','#부드러운','#침착한'], en: ['#Approachable','#Calm','#Comfortable','#Responsive','#Gentle','#Composed'] },
    경력: { ko: ['(前) 새빛요양병원 진료원장', '(前) 서울대학교 상산수리과학관 의학통계연구소장', '(前) 인천석병원 내과 진료원장', '(前) 국립춘천병원 내과 진료원장'], en: ['(Former) Attending Director, Saebit Long-term Care Hospital', '(Former) Director, Medical Statistics Lab, Seoul National University', '(Former) Attending Director, Internal Medicine, Incheon Seok Hospital', '(Former) Attending Director, Internal Medicine, National Chuncheon Hospital'] },
    학력: { ko: ['서울중앙보훈병원 가정의학과 전문의'], en: ['Family Medicine Specialist, Veterans Health Service Medical Center'] },
    활동: { ko: ['대한임상갱년기학회 정회원', '한국임상고혈압학회 정회원', '대한임상노인학회 정회원', '대한통증학회 정회원'], en: ['Korean Menopause Society Regular Member', 'Korean Clinical Hypertension Society Regular Member', 'Korean Clinical Geriatrics Society Regular Member', 'Korean Pain Society Regular Member'] },
  },
  { id: 39, branch: 'gangseo',
    name: { ko: '김정현', en: 'Kim Jeong-hyeon' },
    position: { ko: '강서 진료원장', en: 'Gangseo Attending Physician' },
    subspecialty: { ko: '통증재활', en: 'Pain Rehabilitation' },
    photo: '/doctors/69cddc4eccde42.45651812.jpg',
    thumb: '/doctors/69cddc4eccde42.45651812.jpg',
    keywords: { ko: ['#세심한','#꼼꼼한','#따스한','#사려깊은','#믿음을주는','#편안한분위기'], en: ['#Attentive','#Thorough','#Warm','#Thoughtful','#Trustworthy','#Comfortable'] },
    경력: { ko: ['(前) 종로 통인한의원 진료원장', '(前) 터한의원 여의도점 진료원장', '(現) 면력한방병원 진료원장'], en: ['(Former) Attending Director, Jongno Tongin Korean Medicine Clinic', '(Former) Attending Director, Teo Korean Medicine Clinic Yeouido', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['동국대학교 한의과대학 한의학과 졸업'], en: ['Graduated from Dongguk University, College of Korean Medicine'] },
    활동: { ko: ['대한한의학회 회원', '대한통합레이저의학회 정회원', '임상약침학회 정회원', '한국한의약진흥원 [동남아 외국인 환자 유치 활성화 지원] 기획재정이사', '2025, 2026 서울특별시 학교 주치의', '2023 한의혜민대상 수상(잼버리 한의진료센터)', '2024 종로구 한의사회 표창장', '2025 하베스트 [신규 한의사 임상역량 강화프로그램] 교육위원'], en: ['Korean Medicine Society Member', 'Korean Integrative Laser Medicine Society Regular Member', 'Clinical Pharmacopuncture Society Regular Member', 'NIKOM — Planning & Finance Director for SE Asian patient attraction', 'Seoul Metropolitan School Doctor 2025–2026', '2023 Korean Medicine Hyemin Award (Jamboree Korean Medicine Clinic)', '2024 Jongno Korean Medicine Association Commendation', '2025 Harvest New Korean Medicine Practitioner Clinical Training Committee'] },
    논문: { ko: ['Research on Ways to Attract Foreign Patients to a Korean Medicine Clinic (Frontiers in Medicine, 2025)'], en: ['Research on Ways to Attract Foreign Patients to a Korean Medicine Clinic (Frontiers in Medicine, 2025)'] },
  },

  // ── 신촌점 (6명) ──
  { id: 25, branch: 'sinchon',
    name: { ko: '유형진', en: 'Yu Hyung-jin' },
    position: { ko: '신촌 대표원장', en: 'Sinchon Chief Director' },
    subspecialty: { ko: '통합면역 대표원장', en: 'Integrative Immuno-Oncology' },
    role: 'ceo',
    photo: '/doctors/68ac46bd43c9d4.37241186.jpg',
    thumb: '/doctors/68ac46bd439598.83386960.png',
    keywords: { ko: ['#믿음을주는','#차분한','#쉬운설명','#공감있는','#부드러운','#따뜻한시선'], en: ['#Trustworthy','#Calm','#ClearExplanation','#Empathetic','#Gentle','#WarmGaze'] },
    경력: { ko: ['원광대학교 산본한방병원 일반수련의', '자생한방병원 한방재활의학과 전문수련의', '(前) 청주나비솔한방병원 진료원장', '(前) 강서면력한방병원 진료원장', '(現) 신촌면력한방병원 대표원장'], en: ['Resident, Wonkwang University Sanbon Korean Medicine Hospital', 'Korean Rehabilitation Medicine Fellow, Jaseng Hospital of Korean Medicine', '(Former) Attending Director, Cheongju Navisol Korean Medicine Hospital', '(Former) Attending Director, Gangseo Immune Hospital', '(Current) Chief Director, Sinchon Immune Hospital'] },
    학력: { ko: ['원광대학교 한의과대학 졸업', '원광대학교 한의과대학 석사 및 박사 학위'], en: ['Graduated from Wonkwang University, College of Korean Medicine', 'M.S. & Ph.D., Wonkwang University College of Korean Medicine'] },
    활동: { ko: ['한방재활의학과 학회 평생회원', '척추신경추나의학회 정회원', '대한 스포츠학회 정회원', '한방비만학회 정회원', '대한 통합암학회 인정의', '대한 암한의학회 정회원'], en: ['Korean Rehabilitation Medicine Society Lifetime Member', 'Spinal Nerve Chuna Medicine Society Regular Member', 'Korean Sports Medicine Society Regular Member', 'Korean Medicine Obesity Society Regular Member', 'Korean Society of Integrative Oncology Certified Specialist', 'Korean Medicine Cancer Society Regular Member'] },
    논문: { ko: ['제 4~5번 요추 추간판 탈출 정도와 요통의 한의학적 치료 효과의 상관성 연구', '반월상 연골판 손상을 동반한 전방 십자인대 부분파열 환자의 한의학적 치료 효과 증례보고'], en: ['Correlation between L4-5 lumbar disc herniation severity and Korean Medicine treatment outcomes for low back pain', 'Case report: Korean Medicine treatment of partial ACL tear with meniscal injury'] },
  },
  { id: 37, branch: 'sinchon',
    name: { ko: '조현실', en: 'Cho Hyeon-sil' },
    position: { ko: '신촌 양방대표원장', en: 'Sinchon Western Medicine Chief' },
    subspecialty: { ko: '통합면역 부인과', en: 'OB/GYN · Integrative Medicine' },
    role: 'wm',
    photo: '/doctors/69cddae60209c3.18962833.jpg',
    // PO 지정(2026-07-06, 반복 지시): 얼굴 사진 없는 원장은 로고가 아니라 "팔짱 낀 가운" 이미지로 — 로고 파일(69cddae601fbd8) 사용 금지
    thumb: '/doctors/69cddae60209c3.18962833.jpg',
    keywords: { ko: ['#친절한','#세심한','#따뜻한','#신뢰가는','#사려깊은','#상담충분'], en: ['#Friendly','#Attentive','#Warm','#Reliable','#Thoughtful','#ThoroughConsult'] },
    학력: { ko: ['산부인과 전문의', '이화여대 의과대학 의학과 졸업', '이화여대부속병원 수련', '경희대학교 의과대학 석사', '흑룡강 중의약대학교 졸업(Traditional Chinese Medicine)'], en: ['OB/GYN Specialist', 'Graduated from Ewha Womans University, College of Medicine', 'Residency at Ewha Womans University Medical Center', 'M.S., Kyung Hee University College of Medicine', 'Graduated from Heilongjiang University of Chinese Medicine (TCM)'] },
    활동: { ko: ['대한 IMS학회 정회원', '대한 폐경학회 회원', '대한 노인병학회 회원'], en: ['Korean IMS Society Regular Member', 'Korean Menopause Society Member', 'Korean Geriatrics Society Member'] },
  },
  { id: 23, branch: 'sinchon',
    name: { ko: '조수호', en: 'Cho Su-ho' },
    position: { ko: '신촌 진료원장', en: 'Sinchon Attending Physician' },
    subspecialty: { ko: '한방내과 전문의', en: 'Korean Internal Medicine Specialist' },
    photo: '/doctors/68be43e0120336.44853403.jpg',
    thumb: '/doctors/68ac45d97c31b7.54028297.jpg',
    keywords: { ko: ['#친절한','#부담없는','#배려깊은','#공감있는','#편안한','#친근한'], en: ['#Friendly','#Approachable','#Considerate','#Empathetic','#Comfortable','#Personable'] },
    경력: { ko: ['(前) 강동경희대학교 한방병원 한방내과 전문의', '(現) 신촌면력한방병원 진료원장'], en: ['(Former) Korean Internal Medicine Specialist, Gangdong Kyung Hee University Korean Medicine Hospital', '(Current) Attending Director, Sinchon Immune Hospital'] },
    학력: { ko: ['경희대학교 한의과대학 졸업', '경희대학교 임상한의학과(소화기내과학) 석사', '강동경희대학교 한방병원 전문수련의 수료'], en: ['Graduated from Kyung Hee University, College of Korean Medicine', 'M.S. in Clinical Korean Medicine (Gastroenterology), Kyung Hee University', 'Completed fellowship at Gangdong Kyung Hee University Korean Medicine Hospital'] },
    활동: { ko: ['대한한방내과학회 정회원', '기능성소화불량 한의표준임상진료지침 개발 참여 연구원(실행위원)'], en: ['Korean Internal Medicine Society Regular Member', 'Researcher, Korean Medicine Standard Clinical Practice Guideline for Functional Dyspepsia (Executive Committee)'] },
    논문: { ko: ['초음파 위배출 측정과 한의설문 간의 상관성 분석 (2018)', '약침치료로 호전된 급성 충수염 환자 1례 (2019)', 'Herbal medicine Banha-sasim-tang for functional dyspepsia: systematic review protocol (Medicine, 2019)'], en: ['Correlation analysis of ultrasound gastric emptying and Korean Medicine questionnaire (2018)', 'A case of acute appendicitis improved by pharmacopuncture (2019)', 'Herbal medicine Banha-sasim-tang for functional dyspepsia: systematic review protocol (Medicine, 2019)'] },
  },
  { id: 52, branch: 'sinchon',
    name: { ko: '김서진', en: 'Kim Seo-jin' },
    position: { ko: '신촌 진료원장', en: 'Sinchon Attending Physician' },
    subspecialty: { ko: '통합면역 한방', en: 'Integrative Korean Medicine' },
    photo: '/doctors/6a2273fbb73718.18716001.jpg',
    thumb: '/doctors/6a2273fbb72a01.35454693.jpg',
    keywords: { ko: ['#친절한','#세심한','#배려깊은','#신뢰가는','#공감있는','#부드러운'], en: ['#Friendly','#Attentive','#Considerate','#Reliable','#Empathetic','#Gentle'] },
    경력: { ko: ['성신한방병원 일반수련의 수료', '(前) 경희365한의원 진료원장', '(現) 신촌면력한방병원 진료원장'], en: ['Completed general residency, Seongsin Korean Medicine Hospital', '(Former) Attending Director, Kyung Hee 365 Korean Medicine Clinic', '(Current) Attending Director, Sinchon Immune Hospital'] },
    학력: { ko: ['경희대학교 한의과대학 졸업'], en: ['Graduated from Kyung Hee University, College of Korean Medicine'] },
    활동: { ko: ['대한융합한의학회 정회원', '비만치료 전문가 과정 수료', '소아 내분비 질환 전문가 과정 수료'], en: ['Korean Convergence Medicine Society Regular Member', 'Obesity Treatment Expert Course Completed', 'Pediatric Endocrine Disorders Expert Course Completed'] },
  },
  { id: 53, branch: 'sinchon',
    name: { ko: '진수현', en: 'Jin Su-hyeon' },
    position: { ko: '신촌 진료원장', en: 'Sinchon Attending Physician' },
    subspecialty: { ko: '한방내과 전문의', en: 'Korean Internal Medicine Specialist' },
    photo: '/doctors/6a22744178c2a4.67205246.jpg',
    thumb: '/doctors/6a22744178b2d6.53187540.jpg',
    keywords: { ko: ['#믿음을주는','#편안한분위기','#상냥한','#따스한','#믿음직한'], en: ['#Trustworthy','#Comfortable','#Kind','#Warm','#Dependable'] },
    경력: { ko: ['(前) 경희의료원 한방병원 한방내과 전문의', '(現) 신촌면력한방병원 진료원장'], en: ['(Former) Korean Internal Medicine Specialist, Kyung Hee University Korean Medicine Hospital', '(Current) Attending Director, Sinchon Immune Hospital'] },
    학력: { ko: ['경희대학교 한의학과 학사', '경희대학교 임상한의학과(호흡기·면역알레르기내과학) 석사'], en: ['B.A. in Korean Medicine, Kyung Hee University', 'M.S. in Clinical Korean Medicine (Respiratory, Immuno-Allergy Internal Medicine), Kyung Hee University'] },
    활동: { ko: ['한방내과 전문의', '척추신경추나의학회 정회원', '대한한의학회 정회원', '대한한방내과학회 정회원'], en: ['Korean Internal Medicine Specialist', 'Spinal Nerve Chuna Medicine Society Regular Member', 'Korean Medicine Society Regular Member', 'Korean Internal Medicine Society Regular Member'] },
    논문: { ko: ['천식-만성폐쇄성폐질환 중복(ACO) 환자의 한의치료 증례 (대한한방내과학회지 2024)', '비소세포폐암 고령 환자의 한의치료: 증례보고 (대한한방내과학회지 2025)', '입원 폐암 환자에 대한 통합 한의치료의 임상적 유효성: 후향적 차트 리뷰 (제38차 ICMART 세계의학침술학술대회 포스터)'], en: ['A Case on Korean Medicine Treatment for a Patient with Asthma-COPD Overlap (J Internal Korean Medicine, 2024)', 'Korean Medicine Treatment for Elderly Patients with Non-Small-Cell Lung Cancer: Case Reports (J Internal Korean Medicine, 2025)', 'Clinical Efficacy of Integrative Korean Medicine Treatment for Hospitalized Lung Cancer Patients: A Retrospective Chart Review (38th ICMART World Congress on Medical Acupuncture, Poster)'] },
  },
  { id: 54, branch: 'sinchon',
    name: { ko: '홍정화', en: 'Hong Jung-hwa' },
    position: { ko: '신촌 진료원장', en: 'Sinchon Attending Physician' },
    subspecialty: { ko: '한방내과 전문의', en: 'Korean Internal Medicine Specialist' },
    photo: '/doctors/6a227480d699e8.21737385.jpg',
    thumb: '/doctors/6a227480d68df7.71465118.jpg',
    keywords: { ko: ['#꼼꼼한','#부담없는','#편안한설명','#쉬운설명','#소통이좋은'], en: ['#Thorough','#Approachable','#ComfortExplanation','#ClearExplanation','#Communicative'] },
    경력: { ko: ['동국대학교 일산한방병원 한방내과 전문의', '(前) 지제도솔한방병원 진료원장', '(現) 신촌면력한방병원 진료원장'], en: ['Korean Internal Medicine Specialist, Dongguk University Ilsan Korean Medicine Hospital', '(Former) Attending Director, Jije Dosol Korean Medicine Hospital', '(Current) Attending Director, Sinchon Immune Hospital'] },
    학력: { ko: ['동국대학교 일반대학원 한의학 박사', '동국대학교 한의과대학 학사'], en: ['Ph.D. in Korean Medicine, Dongguk University Graduate School', 'B.A., Dongguk University, College of Korean Medicine'] },
    활동: { ko: ['(前) 서울시 한의사회 당직한의사 역량강화교육 강사', '(前) 수도권역 공보의 응급상황 대처교육 강사', '대한한의학회 회원', '대한한방내과학회 회원', '척추신경추나의학회 회원'], en: ['(Former) Instructor, Seoul Korean Medicine Association On-Call Physician Training', '(Former) Instructor, Emergency Response Training for Public Health Doctors (Metro Region)', 'Korean Medicine Society Member', 'Korean Internal Medicine Society Member', 'Spinal Nerve Chuna Medicine Society Member'] },
  },

  // ── 광명점 (7명) ──
  { id: 15, branch: 'gwangmyeong',
    name: { ko: '배길준', en: 'Bae Gil-jun' },
    position: { ko: '광명 대표원장', en: 'Gwangmyeong Chief Director' },
    subspecialty: { ko: '통합면역 한방재활의학과', en: 'Korean Rehabilitation Medicine · Immuno-Oncology' },
    role: 'ceo',
    photo: '/doctors/68ac21df896ae3.71046416.jpg',
    thumb: '/doctors/6a2227080520e0.78738177.png', // 병원 사이트 최신 리스팅 사진(옛 697fed…png 404였음)
    keywords: { ko: ['#친절한','#꼼꼼한','#신뢰가는','#정성스러운','#자세한설명'], en: ['#Friendly','#Thorough','#Reliable','#Devoted','#DetailedExplanation'] },
    경력: { ko: ['(前) 동신대학교 부속 광주한방병원 한방재활의학과 진료교수', '(前) 365다시재한방병원 진료부장', '(現) 면력한방병원 진료원장'], en: ['(Former) Clinical Professor, Korean Rehabilitation Medicine, Dongshin University Gwangju Korean Medicine Hospital', '(Former) Medical Director, 365 Dasijae Korean Medicine Hospital', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['한방재활의학과 전문의, 한의학박사', '동신대학교 한의과대학 졸업', '동신대학교 한의과대학원 석/박사', '동신대학교 부속 목포한방병원 일반/전문수련의 수료'], en: ['Korean Rehabilitation Medicine Specialist, Ph.D. in Korean Medicine', 'Graduated from Dongshin University, College of Korean Medicine', 'M.S. & Ph.D., Dongshin University Graduate School of Korean Medicine', 'Completed residency at Dongshin University Mokpo Korean Medicine Hospital'] },
    활동: { ko: ['대한한의사전문의협회 부회장', '한방재활의학과학회', '대한오스테오파시학회', '척추신경추나의학회', '대한통합암학회', '네이버 지식인 상담한의사 (한방재활의학과)', '한의약선도기술개발사업 참여연구원', '노인장기요양보험 등급판정위원'], en: ['Vice President, Korean Medicine Specialist Association', 'Korean Rehabilitation Medicine Society', 'Korean Osteopathy Society', 'Spinal Nerve Chuna Medicine Society', 'Korean Society of Integrative Oncology', 'Naver Knowledge-in Korean Medicine Consultant (Rehabilitation)', 'Researcher, Korean Medicine Leading Technology Development Project', 'Long-term Care Insurance Rating Committee Member'] },
    논문: { ko: ['Antiosteoarthritic Effects of ChondroT (Evidence-based CAM)', 'Inpatient treatment effect and MMPI of MVC injuries (Chinese J of Integrative Med)', 'Anti-osteoarthritic effects of ChondroT collagenase model (BMC CAM)', '외 10편'], en: ['Antiosteoarthritic Effects of ChondroT (Evidence-based CAM)', 'Inpatient treatment effect and MMPI of MVC injuries (Chinese J of Integrative Med)', 'Anti-osteoarthritic effects of ChondroT collagenase model (BMC CAM)', '+ 10 more'] },
  },
  { id: 38, branch: 'gwangmyeong',
    name: { ko: '이정훈', en: 'Lee Jeong-hun' },
    position: { ko: '광명 양방대표원장', en: 'Gwangmyeong Western Medicine Chief' },
    subspecialty: { ko: '통합면역 마취통증의학과', en: 'Anesthesiology & Pain Medicine' },
    role: 'wm',
    photo: '/doctors/69cddb97abdb81.98166856.jpg',
    thumb: '/doctors/69cddb97abcd76.76518423.png',
    keywords: { ko: ['#친절한','#따뜻한','#꼼꼼한','#사려깊은','#믿음을주는','#따뜻한시선'], en: ['#Friendly','#Warm','#Thorough','#Thoughtful','#Trustworthy','#WarmGaze'] },
    경력: { ko: ['한양대학교병원 마취통증의학과 전공의/전문의', '한양대학교병원 통증의학과 임상교수', '(前) 닥터투유의원 원장', '(前) 오정본병원 통증의학과 원장', '(前) 날아라정형외과 원장', '(前) 부평그린마취통증의학과의원 진료원장', '(現) 면력한방병원 양방원장'], en: ['Anesthesiology & Pain Medicine Resident/Specialist, Hanyang University Hospital', 'Clinical Professor, Pain Medicine, Hanyang University Hospital', '(Former) Director, Doctor To You Clinic', '(Former) Director, Pain Medicine, Ojeongbon Hospital', '(Former) Director, Narara Orthopedics', '(Former) Attending Director, Bupyeong Green Anesthesiology & Pain Clinic', '(Current) Western Medicine Director, Immune Hospital'] },
    학력: { ko: ['한양대학교 의과대학 의학과 졸업', '한양대학교 의과대학 마취통증의학과 석사', '한양대학교병원 통증의학과 전임의'], en: ['Graduated from Hanyang University, College of Medicine', 'M.S. in Anesthesiology & Pain Medicine, Hanyang University', 'Pain Medicine Fellow, Hanyang University Hospital'] },
    활동: { ko: ['대한마취통증의학회 정회원', '대한골대사학회 정회원', '대한통증학회 정회원', '대한근골격계초음파학회 정회원', '대한척추통증학회 정회원', 'TPI 연수교육 이수', 'prolotherapy(인대증식치료) 교육 이수'], en: ['Korean Society of Anesthesiology Regular Member', 'Korean Bone Metabolism Society Regular Member', 'Korean Pain Society Regular Member', 'Korean Musculoskeletal Ultrasound Society Regular Member', 'Korean Spinal Pain Society Regular Member', 'TPI (Trigger Point Injection) Training Completed', 'Prolotherapy Training Completed'] },
  },
  { id: 16, branch: 'gwangmyeong',
    name: { ko: '하정빈', en: 'Ha Jeong-bin' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통합면역 한방내과', en: 'Korean Internal Medicine · Immuno-Oncology' },
    photo: '/doctors/68ac238878a855.69829943.jpg',
    thumb: '/doctors/68ac2388788076.62890527.jpg',
    keywords: { ko: ['#친절한','#꼼꼼한','#빠른대응','#상담충분','#믿음을주는'], en: ['#Friendly','#Thorough','#Responsive','#ThoroughConsult','#Trustworthy'] },
    경력: { ko: ['한방내과 전문의', '대한통합암학회 인증 통합암치료 인정의', '대한한방비만학회 비만치료 인증 한의사', '(前) 사랑한방병원 진료원장', '(前) 참바른한방병원 수석원장', '(現) 면력한방병원 원장'], en: ['Korean Internal Medicine Specialist', 'Integrative Oncology Certified Specialist, Korean Society of Integrative Oncology', 'Certified Obesity Treatment Korean Medicine Doctor, Korean Medicine Obesity Society', '(Former) Attending Director, Sarang Korean Medicine Hospital', '(Former) Senior Director, Chambareun Korean Medicine Hospital', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['대구한의대학교 한의학과 차석 졸업', '경희대학교 동서의학대학원 한의학 석사', '경희대학교 한방병원 일반/전문 수련의 수료'], en: ['Graduated 2nd in class from Daegu Haany University, Korean Medicine', 'M.S. in Korean Medicine, Kyung Hee University East-West Medicine Graduate School', 'Completed residency at Kyung Hee University Korean Medicine Hospital'] },
    활동: { ko: ['대한한방내과학회 평생회원', '대한통합암학회 정회원', '대한한방비만학회 정회원', '경희대 CMS Winter Workshop on Data-Driven Medicine 수료', '경희대 동서의학대학원 우수 학위논문상 수상'], en: ['Korean Internal Medicine Society Lifetime Member', 'Korean Society of Integrative Oncology Regular Member', 'Korean Medicine Obesity Society Regular Member', 'Kyung Hee CMS Winter Workshop on Data-Driven Medicine', 'Outstanding Thesis Award, Kyung Hee East-West Medicine Graduate School'] },
    논문: { ko: ['경관 영양으로 유발된 소음인 설사에 관한 한방 처치 1례', '뇌졸중 환자의 실어증에 대한 전침 치료 : 체계적 문헌 고찰'], en: ['A case of Soeumin diarrhea induced by tube feeding treated with herbal medicine', 'Electroacupuncture for post-stroke aphasia: a systematic review'] },
  },
  { id: 17, branch: 'gwangmyeong',
    name: { ko: '오재우', en: 'Oh Jae-woo' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통증재활 한방신경정신과', en: 'Korean Neuropsychiatry · Pain Rehab' },
    photo: '/doctors/68ac24c0008ac3.71274446.jpg',
    thumb: '/doctors/68ac24c0006643.02621332.jpg',
    keywords: { ko: ['#정확한','#쉬운설명','#섬세한','#소통이좋은','#신뢰가는','#공감있는'], en: ['#Precise','#ClearExplanation','#Attentive','#Communicative','#Reliable','#Empathetic'] },
    경력: { ko: ['강남자생한방병원 한방신경정신과 전문의', '(前) 자생한방병원 진료원장', '(現) 면력한방병원 원장'], en: ['Korean Neuropsychiatry Specialist, Gangnam Jaseng Hospital of Korean Medicine', '(Former) Attending Director, Jaseng Hospital of Korean Medicine', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['한방신경정신과 전문의', '경원대학교 한의과대학', '가천대학교 한의학대학원 석사'], en: ['Korean Neuropsychiatry Specialist', 'Kyungwon University, College of Korean Medicine', 'M.S., Gachon University Graduate School of Korean Medicine'] },
    활동: { ko: ['대한한방신경정신과학회 평생회원', '대한한방신경정신과학회 전문의이사', '척추신경추나의학회 정회원'], en: ['Korean Neuropsychiatry Society Lifetime Member', 'Board Director, Korean Neuropsychiatry Society', 'Spinal Nerve Chuna Medicine Society Regular Member'] },
    논문: { ko: ['Long term follow-up of cervical disc herniation with integrated CAM (BMC CAM, 2016)', 'Snake Venom synergized Cytotoxic Effect of NK Cells on Lung Cancer (2016)', '외 4편'], en: ['Long term follow-up of cervical disc herniation with integrated CAM (BMC CAM, 2016)', 'Snake Venom synergized Cytotoxic Effect of NK Cells on Lung Cancer (2016)', '+ 4 more'] },
  },
  { id: 18, branch: 'gwangmyeong',
    name: { ko: '김상현', en: 'Kim Sang-hyeon' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통합면역', en: 'Integrative Immunology' },
    photo: '/doctors/68ac25e7cc1487.42823820.jpg',
    thumb: '/doctors/68ac25e7cbec30.65434200.jpg',
    keywords: { ko: ['#자세한설명','#상담충분','#질문환영','#진심있는','#침착한'], en: ['#DetailedExplanation','#ThoroughConsult','#QuestionsWelcome','#Sincere','#Composed'] },
    경력: { ko: ['(前) 힘찬큐한방병원 수석원장', '(現) 면력한방병원 진료원장'], en: ['(Former) Senior Director, Himchan Q Korean Medicine Hospital', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['경원대 한의학과 졸업'], en: ['Graduated from Kyungwon University, Korean Medicine'] },
    활동: { ko: ['스위스 정부 장학생', '제네바의대 면역학 연구실 연구원', '(사)대한통합암학회 인증 통합암치료 인정의'], en: ['Swiss Government Scholarship Recipient', 'Researcher, Immunology Lab, University of Geneva Medical School', 'Integrative Oncology Certified Specialist, Korean Society of Integrative Oncology'] },
  },
  { id: 19, branch: 'gwangmyeong',
    name: { ko: '김주완', en: 'Kim Ju-wan' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통증재활', en: 'Pain Rehabilitation' },
    photo: '/doctors/68ac266eec3443.90360671.jpg',
    thumb: '/doctors/68ac266eec0d10.41842964.jpg',
    keywords: { ko: ['#친절한','#꼼꼼한','#정확한','#배려깊은','#소통이좋은','#신뢰가는'], en: ['#Friendly','#Thorough','#Precise','#Considerate','#Communicative','#Reliable'] },
    경력: { ko: ['(前) 구산한의원 원장', '(前) 김정기한의원 원장', '(現) 면력한방병원 원장'], en: ['(Former) Director, Gusan Korean Medicine Clinic', '(Former) Director, Kim Jeonggi Korean Medicine Clinic', '(Current) Director, Immune Hospital'] },
    학력: { ko: ['대구한의대학교 한의학과대학 졸업', '대구한의대 부속한방병원 수련의', '울진군 보건의료원 한방진료과장', '성주군 보건소 한방진료과장'], en: ['Graduated from Daegu Haany University, College of Korean Medicine', 'Resident, Daegu Haany University Korean Medicine Hospital', 'Korean Medicine Department Chief, Uljin Public Health Center', 'Korean Medicine Department Chief, Seongju Public Health Center'] },
    활동: { ko: ['척추 신경 추나 의학회 정회원', '[MBC] \'이상한 나라의 며느리\' 방송'], en: ['Spinal Nerve Chuna Medicine Society Regular Member', '[MBC] TV appearance on "Wonderful Daughter-in-Law"'] },
  },
  { id: 20, branch: 'gwangmyeong',
    name: { ko: '조성원', en: 'Cho Seong-won' },
    position: { ko: '광명 진료원장', en: 'Gwangmyeong Attending Physician' },
    subspecialty: { ko: '통증재활', en: 'Pain Rehabilitation' },
    photo: '/doctors/68ac27045a5df4.11570705.jpg',
    thumb: '/doctors/68ac27045a39e4.56645724.jpg',
    keywords: { ko: ['#꼼꼼한','#정확한','#빠른대응','#정성스러운','#진심있는','#친화적인'], en: ['#Thorough','#Precise','#Responsive','#Devoted','#Sincere','#Personable'] },
    경력: { ko: ['(前) 숭실한의원 진료원장', '(前) 자양으뜸한의원 대표원장', '(前) 맘편한요양병원 한의과장', '(現) 면력한방병원 진료원장'], en: ['(Former) Attending Director, Soongsil Korean Medicine Clinic', '(Former) Chief Director, Jayang Eutteum Korean Medicine Clinic', '(Former) Korean Medicine Department Chief, Mampyeonhan Long-term Care Hospital', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['경희대학교 한의과대학 졸업', '진천군 보건소 공중보건의사'], en: ['Graduated from Kyung Hee University, College of Korean Medicine', 'Public Health Doctor, Jincheon Public Health Center'] },
    활동: { ko: ['한방비만학회 회원', '산돌한의원 통증치료사관학교 과정 이수', '대한스포츠한의학회 팀닥터과정 수료'], en: ['Korean Medicine Obesity Society Member', 'Sandol Korean Medicine Clinic Pain Treatment Academy Completed', 'Korean Medicine Sports Society Team Doctor Course Completed'] },
  },

  // ── 성동점 (8명) ──
  { id: 41, branch: 'seongdong',
    name: { ko: '강주안', en: 'Kang Ju-an' },
    position: { ko: '성동 대표원장', en: 'Seongdong Chief Director' },
    subspecialty: { ko: '통합면역 대표원장', en: 'Integrative Immuno-Oncology' },
    role: 'ceo',
    photo: '/doctors/6a2226f9978089.36292472.png', // 병원 사이트에서 신규 확보(옛 69e71e…png 404였음)
    thumb: '/doctors/6a2226f9978089.36292472.png',
    keywords: { ko: ['#꼼꼼한','#친절한','#예리한','#이성적인','#정확한'], en: ['#Thorough','#Friendly','#Sharp','#Rational','#Precise'] },
    경력: { ko: ['(前) 자생한방병원 수련의', '(現) 면력한방병원 대표원장'], en: ['(Former) Resident, Jaseng Hospital of Korean Medicine', '(Current) Chief Director, Immune Hospital'] },
    학력: { ko: ['경희대학교 동서의학과 박사', '경희대학교 생리학교실', '동신대학교 한의학과 학사'], en: ['Ph.D., Kyung Hee University, East-West Medicine', 'Department of Physiology, Kyung Hee University', 'B.A., Dongshin University, Korean Medicine'] },
    활동: { ko: ['임상통합의학암학회(CSIO) 이사', 'Swiss Arlesheim Klinik (스위스 알레하임클리닉)', 'Germany BioMed-klinik (독일 비오메드클리닉)', '한국암재활병원 협회 회원', '대한한의학회 회원', '기능영양 한의학회'], en: ['Director, CSIO (Clinical Society of Integrative Oncology)', 'Swiss Arlesheim Klinik', 'Germany BioMed-klinik', 'Korean Cancer Rehabilitation Hospital Association Member', 'Korean Medicine Society Member', 'Functional Nutrition Korean Medicine Society'] },
    논문: { ko: ['Bee Venom Acupuncture Attenuates Oxaliplatin-Induced Neuropathic Pain by Modulating Action Potential Threshold in Dorsal Root Ganglia Neurons (Toxins, 2020;12(12))', 'Engagement of Spinal Serotonergic System in the Pain-Alleviating Effect of [6]-Shogaol in Chemotherapy-Induced Neuropathic Pain', '[6]-Shogaol Attenuates Oxaliplatin-Induced Allodynia through Serotonergic Receptors and GABA in the Spinal Cord in Mice'], en: ['Bee Venom Acupuncture Attenuates Oxaliplatin-Induced Neuropathic Pain by Modulating Action Potential Threshold in Dorsal Root Ganglia Neurons (Toxins, 2020;12(12))', 'Engagement of Spinal Serotonergic System in the Pain-Alleviating Effect of [6]-Shogaol in Chemotherapy-Induced Neuropathic Pain', '[6]-Shogaol Attenuates Oxaliplatin-Induced Allodynia through Serotonergic Receptors and GABA in the Spinal Cord in Mice'] },
  },
  { id: 42, branch: 'seongdong',
    name: { ko: '승현석', en: 'Seung Hyun-seok' },
    position: { ko: '성동 의무원장', en: 'Seongdong CMO' },
    subspecialty: { ko: '통합면역센터 한방내과', en: 'Korean Internal Medicine · Integrative Immuno-Oncology' },
    role: 'cmo',
    photo: '/doctors/6a040390c37997.97100336.jpg',
    thumb: '/doctors/6a040390c37997.97100336.jpg',
    keywords: { ko: ['#세심한','#믿음을주는','#차분한','#자세한설명','#편안한','#공감있는'], en: ['#Attentive','#Trustworthy','#Calm','#DetailedExplanation','#Comfortable','#Empathetic'] },
    경력: { ko: ['(現) 면력한방병원 의무원장', '(前) 장덕한방병원 면역암센터 뇌건강센터장 어깨센터', '(前) 도반한방병원 면역암센터 무릎줄기센터', '(前) 자향한방병원(창동점) 진료부장(면역암센터장)', '(前) 오쿨리한방병원 면역암센터 진료원장', '(前) 경희부부한의원장', '(前) 국군체육부대 의무대 한방과장'], en: ['(Current) CMO, Immune Hospital', '(Former) Brain Health Center & Shoulder Center, Immuno-Oncology, Jangdeok Korean Medicine Hospital', '(Former) Knee Stem Cell Center, Immuno-Oncology, Doban Korean Medicine Hospital', '(Former) Clinical Director (Immuno-Oncology Chief), Jahyang Korean Medicine Hospital Changdong', '(Former) Attending Director, Immuno-Oncology, Okuli Korean Medicine Hospital', '(Former) Director, Kyung Hee Bubu Korean Medicine Clinic', '(Former) Korean Medicine Department Chief, Korean Armed Forces Athletic Corps Medical Unit'] },
    학력: { ko: ['한방내과 전문의', '경희대학교 대학원 한의학 박사(한방내과)', '경희대학교 한의과대학 졸업', '경희의료원 한방병원 일반/전문수련의 수료(한방내과)'], en: ['Korean Internal Medicine Specialist', 'Ph.D. in Korean Medicine (Korean Internal Medicine), Kyung Hee University Graduate School', 'Graduated from Kyung Hee University, College of Korean Medicine', 'Completed residency (Korean Internal Medicine), Kyung Hee University Korean Medicine Hospital'] },
    활동: { ko: ['대한한방내과학회 정회원', '통합암학회 인정의 및 정회원', '(前) 대구한의대 한의과 외래교수', '(前) 동국대 한의학과 외래강사'], en: ['Korean Internal Medicine Society Regular Member', 'Integrative Oncology Society Certified Specialist & Regular Member', '(Former) Adjunct Professor, Daegu Haany University Korean Medicine College', '(Former) Adjunct Lecturer, Dongguk University Korean Medicine Department'] },
    논문: { ko: ['인진청간탕이 간보호 및 섬유화 억제에 미치는 영향', 'YBR의 간섬유화 억제에 미치는 영향', '가감생간탕 투여후 호전된 급성 간염 2예', '피로를 호소하는 외래환자에 대한 임상적 관찰'], en: ['Hepatoprotective and anti-fibrotic effects of Injincheonggan-tang', 'Anti-fibrotic effect of YBR on liver fibrosis', 'Two cases of acute hepatitis improved by modified Saenggan-tang', 'Clinical observation of outpatients with fatigue complaints'] },
  },
  { id: 43, branch: 'seongdong',
    name: { ko: '임경수', en: 'Lim Kyung-soo' },
    position: { ko: '성동 양방대표원장', en: 'Seongdong Western Medicine Chief' },
    subspecialty: { ko: '통합면역센터 정형외과', en: 'Orthopedics · Integrative Immuno-Oncology' },
    role: 'wm',
    photo: '/doctors/6a040420ccbe86.88350198.jpg',
    thumb: '/doctors/6a040420ccbe86.88350198.jpg',
    keywords: { ko: ['#친절한','#정확한','#쉬운설명','#따뜻한','#배려하는','#믿을수있는'], en: ['#Friendly','#Precise','#ClearExplanation','#Warm','#Considerate','#Reliable'] },
    경력: { ko: ['(前) 세브란스병원 정형외과 전공의 수료', '(前) 미국 버지니아주 주립대학병원 MCV Hospital 정형외과 연수', '(前) 연세성모정형외과의원 대표 원장', '(前) 장덕한방병원 정형외과 과장', '(現) 면력한방병원 양방대표원장'], en: ['(Former) Orthopedic Surgery Residency, Severance Hospital', '(Former) Orthopedic Fellow, MCV Hospital, Virginia Commonwealth University, USA', '(Former) Director, Yonsei Sungmo Orthopedic Clinic', '(Former) Orthopedic Department Chief, Jangdeok Korean Medicine Hospital', '(Current) Western Medicine Chief Director, Immune Hospital'] },
    학력: { ko: ['연세대학교 의과대학 졸업'], en: ['Graduated from Yonsei University, College of Medicine'] },
    활동: { ko: ['대한 정형외과 학회 정회원', '세브란스병원 정형외과 동문회(세정회) 정회원', '대한 골다공증학회 정회원(평생회원)'], en: ['Korean Orthopedic Association Regular Member', 'Severance Orthopedic Alumni Society Regular Member', 'Korean Society for Osteoporosis Lifetime Member'] },
  },
  { id: 44, branch: 'seongdong',
    name: { ko: '이문성', en: 'Lee Moon-sung' },
    position: { ko: '성동 진료원장', en: 'Seongdong Attending Physician' },
    subspecialty: { ko: '통증재활센터', en: 'Pain Rehabilitation Center' },
    photo: '/doctors/6a04046e2e7a86.09116902.jpg',
    thumb: '/doctors/6a04046e2e7a86.09116902.jpg',
    keywords: { ko: ['#친절한','#정성스러운','#쉬운설명','#공감있는','#친근한','#친화적인'], en: ['#Friendly','#Devoted','#ClearExplanation','#Empathetic','#Approachable','#Personable'] },
    경력: { ko: ['(前) 다나음한의원 진료원장', '(前) 괜추나한의원 진료원장', '(現) 면력한방병원 진료원장'], en: ['(Former) Attending Director, Danaeum Korean Medicine Clinic', '(Former) Attending Director, Gwaen Chuna Korean Medicine Clinic', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['부산대학교 한의학전문대학원 석사'], en: ['M.S., Pusan National University, School of Korean Medicine'] },
    활동: { ko: ['척추신경추나의학회 정회원', '대한통증진단학회 정회원', '대한침도의학회 정회원', '미국 근골격계 초음파 자격(RMSK)'], en: ['Spinal Nerve Chuna Medicine Society Regular Member', 'Korean Pain Diagnosis Society Regular Member', 'Korean Acupotomy Society Regular Member', 'RMSK (Registered Musculoskeletal Sonographer, USA)'] },
    논문: { ko: ['Tetramethylpyrazine, a natural alkaloid, attenuates pro-inflammatory mediators induced by amyloid β and interferon-γ in rat brain microglia (European Journal of Pharmacology, 2014)', 'Effects of ginsenoside Rb1 on the stress-induced changes of BDNF and HSP70 expression in rat hippocampus (Environmental Toxicology and Pharmacology, 2014)', '뇌성마비에 대한 국내의 질적 연구 분석 (2019 대한통합의학회지)'], en: ['Tetramethylpyrazine attenuates pro-inflammatory mediators induced by amyloid β and interferon-γ in rat brain microglia (Eur J Pharmacol, 2014)', 'Effects of ginsenoside Rb1 on stress-induced BDNF and HSP70 expression in rat hippocampus (Environ Toxicol Pharmacol, 2014)', 'Qualitative research analysis on cerebral palsy in Korea (Korean J Integrative Medicine, 2019)'] },
  },
  { id: 45, branch: 'seongdong',
    name: { ko: '고은상', en: 'Ko Eun-sang' },
    position: { ko: '성동 진료원장', en: 'Seongdong Attending Physician' },
    subspecialty: { ko: '통증재활센터 한방내과', en: 'Korean Internal Medicine · Pain Rehab' },
    photo: '/doctors/6a0404b0869a76.89735854.jpg',
    thumb: '/doctors/6a0404b0869a76.89735854.jpg',
    keywords: { ko: ['#친절한','#꼼꼼한','#성실한','#편안한','#친근한'], en: ['#Friendly','#Thorough','#Diligent','#Comfortable','#Approachable'] },
    경력: { ko: ['(前) 광동한방병원 통증센터/어지럼증센터 진료원장', '(前) 빙빙한의원 진료원장', '(現) 면력한방병원 진료원장'], en: ['(Former) Attending Director, Pain/Dizziness Center, Kwangdong Hospital', '(Former) Attending Director, Bingbing Korean Medicine Clinic', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['경희대학교 한의학과 졸업', '경희대학교 대학원 동서의학과 석사', '경희대학교 대학원 동서의학과 박사 수료', '동수원 한방병원 일반/전문의(내과) 수료'], en: ['Graduated from Kyung Hee University, College of Korean Medicine', 'M.S., East-West Medicine, Kyung Hee University', 'Ph.D. coursework completed, East-West Medicine, Kyung Hee University', 'Completed residency (Internal Medicine), Dongsuwon Korean Medicine Hospital'] },
    활동: { ko: ['국제응용근신경학회 전문의, 공식 강사', '대한응용근신경학회 총무이사, 교육위원'], en: ['Certified Specialist & Official Instructor, International College of Applied Kinesiology', 'Secretary General & Education Committee, Korean Applied Kinesiology Society'] },
    논문: { ko: ['안면신경마비를 동반한 One-and-a-half Syndrome 1례 (척추신경추나의학회지 2004)', '고유수용성 척수 반사(proprioceptive spinal reflex)를 응용한 근골격계 치료 기법 (척추신경추나의학회지 2006)', '주파 전침 진통 효과의 반응군과 비반응군 쥐 사이의 시상하부 CCK 수용체 mRNA 발현 차이 (Peptides, 2006)', '응용근신경학 플로우차트 매뉴얼 (신흥메디컬싸이언스, 2014)', '교정 운동학 (신흥메디컬싸이언스, 2014)', '어깨와 고관절의 기능 부전에 대한 교정 운동 솔루션 (대성의학사, 2015)'], en: ['One-and-a-half Syndrome with facial nerve palsy: a case report (J Spinal Chuna 2004)', 'Musculoskeletal treatment technique applying proprioceptive spinal reflex (J Spinal Chuna 2006)', 'Differential hypothalamic CCK receptor mRNA expression in responders vs non-responders to electroacupuncture analgesia (Peptides, 2006)', 'Applied Kinesiology Flowchart Manual (Shinheung Medical Science, 2014)', 'Corrective Exercise (Shinheung Medical Science, 2014)', 'Corrective Exercise Solutions to Common Shoulder and Hip Dysfunction (Daesung Medical, 2015)'] },
  },
  { id: 47, branch: 'seongdong',
    name: { ko: '박정향', en: 'Park Jung-hyang' },
    position: { ko: '성동 진료원장', en: 'Seongdong Attending Physician' },
    subspecialty: { ko: '통합면역센터 한방내과', en: 'Korean Internal Medicine · Integrative Immuno-Oncology' },
    photo: '/doctors/6a0405363d4b90.26971351.jpg',
    thumb: '/doctors/6a0405363d4b90.26971351.jpg',
    keywords: { ko: ['#친절한','#정성스러운','#정확한','#자세한설명','#신뢰가는','#공감있는'], en: ['#Friendly','#Devoted','#Precise','#DetailedExplanation','#Reliable','#Empathetic'] },
    경력: { ko: ['(現) 면력한방병원 진료원장'], en: ['(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['한방내과 전문의', '상지대학교 한의과대학 졸업', '대전대학교 대학원 한의학과 석사', '대전대학교 동서암센터 종양과 전문수련의 수료'], en: ['Korean Internal Medicine Specialist', 'Graduated from Sangji University, College of Korean Medicine', 'M.S., Daejeon University Graduate School of Korean Medicine', 'Oncology Fellow, Daejeon University East-West Cancer Center'] },
    활동: { ko: ['대한암한의학회 정회원', '대한한방내과학회 정회원'], en: ['Korean Medicine Cancer Society Regular Member', 'Korean Internal Medicine Society Regular Member'] },
    논문: { ko: ['Genome-wide Analysis Identified SEMA4D, Novel Candidate Gene for Temperature Sensitivity in Patients With Non-Small Cell Lung Cancer (Integrative Cancer Therapies, 2024)', 'Cachexia를 동반한 확장기 소세포폐암 환자의 한의기반 통합암치료 증례보고 (대한한방내과학회지 2025)', '아로마타제 억제제 관련 근골격 증후군에서 부착형 경피신경전기자극 기기의 예비 RCT 프로토콜 (대한암한의학회지 2025)', '소시호탕 투여를 통해 호전된 항문직장암 환자의 수술부위 감염 이후 신경병성 통증 1례 (대한암한의학회지 2023)', '유방암 및 부인암 환자들의 의·한 협진 유효성 및 안전성 분석: 차트 리뷰 (대한암한의학회지 2024)', '췌장암 환자의 IL-6 수치와 암 진행의 상관 관계 3례 (대한한방내과학회지 2024)', 'Short-Term Pain Relief from Electroacupuncture and Electroceutical Stimulation at ST36 and SP9 in Cancer Patients (대한한방내과학회지 2025)'], en: ['Genome-wide Analysis Identified SEMA4D as Candidate Gene for Temperature Sensitivity in NSCLC (Integrative Cancer Therapies, 2024)', 'Korean Medicine-based integrative cancer care for extensive-stage SCLC with cachexia: case report (J Internal Korean Medicine, 2025)', 'Preliminary RCT protocol of wearable TENS for aromatase inhibitor-associated musculoskeletal syndrome (J Cancer Korean Medicine, 2025)', 'Neuropathic pain after surgical site infection in anorectal cancer improved by Sosiho-tang: case report (J Cancer Korean Medicine, 2023)', 'Efficacy & safety of medical-Korean Medicine collaboration in breast and gynecologic cancer: chart review (J Cancer Korean Medicine, 2024)', 'Correlation between IL-6 levels and cancer progression in pancreatic cancer: 3 cases (J Internal Korean Medicine, 2024)', 'Short-Term Pain Relief from Electroacupuncture and Electroceutical Stimulation at ST36 and SP9 in Cancer Patients (J Internal Korean Medicine, 2025)'] },
  },
  { id: 48, branch: 'seongdong',
    name: { ko: '노현민', en: 'Noh Hyun-min' },
    position: { ko: '성동 진료원장', en: 'Seongdong Attending Physician' },
    subspecialty: { ko: '항노화센터 한방피부과', en: 'Korean Dermatology · Anti-Aging Center' },
    photo: '/doctors/6a057a886c1dc8.77991002.jpg',
    thumb: '/doctors/6a057a886c1dc8.77991002.jpg',
    keywords: { ko: ['#친절한','#섬세한','#정확한','#편안한','#신뢰가는'], en: ['#Friendly','#Attentive','#Precise','#Comfortable','#Reliable'] },
    경력: { ko: ['한방안이비인후피부과 전문의', '(前) 강남/서울위담한방병원 진료과장', '(前) 서초장덕한방병원 진료원장', '(現) 면력한방병원 진료원장'], en: ['Korean Ophthalmology, Otolaryngology & Dermatology Specialist', '(Former) Department Chief, Gangnam/Seoul Widam Korean Medicine Hospital', '(Former) Attending Director, Seocho Jangdeok Korean Medicine Hospital', '(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['연세대학교 생활과학대학', '동국대학교 한의과대학', '청연한방병원 일반수련의 수료', '원광대학교 한방병원 전문수련의 수료'], en: ['Yonsei University, College of Human Ecology', 'Dongguk University, College of Korean Medicine', 'Completed general residency, Cheongyeon Korean Medicine Hospital', 'Completed specialty fellowship, Wonkwang University Korean Medicine Hospital'] },
    활동: { ko: ['동국대학교 한의과대학 총동창회 이사', '대한한의약해외의료봉사단(KOMSTA) 이사', '대한안이비인후피부과학회 정회원', '동의방약학회 정회원', '대한통합레이저의학회 정회원', '더마v라인(실리프팅)마스터 과정 수료'], en: ['Director, Dongguk University Korean Medicine Alumni Association', 'Director, KOMSTA (Korean Medicine Overseas Medical Service)', 'Korean Society of Korean Ophthalmology, Otolaryngology & Dermatology Regular Member', 'Dong-Eui Herbal Medicine Society Regular Member', 'Korean Integrative Laser Medicine Society Regular Member', 'Derma V-line (Thread Lifting) Master Course Completed'] },
    논문: { ko: ['미래창조과학부 소아/청소년 아토피 피부염 임상관리 프로토콜 개발 및 임상시험 참여 연구원', '한국보건산업진흥원 알레르기 비염 한의표준임상진료지침 및 보장성 강화 의료기술 개발연구 참여 연구원', 'SCI(E)급 논문 3편 외 다수논문'], en: ['Researcher: Clinical protocol development for pediatric/adolescent atopic dermatitis (MSIT)', 'Researcher: Korean Medicine Standard Clinical Practice Guideline for Allergic Rhinitis (KHIDI)', 'SCI(E) papers (3) and additional publications'] },
  },
  { id: 51, branch: 'seongdong',
    name: { ko: '이진영', en: 'Lee Jin-young' },
    position: { ko: '성동 진료원장', en: 'Seongdong Attending Physician' },
    subspecialty: { ko: '항노화센터', en: 'Anti-Aging Center' },
    photo: '/doctors/6a057b078fe633.40987548.jpg',
    thumb: '/doctors/6a057b078fe633.40987548.jpg',
    keywords: { ko: ['#꼼꼼한','#세심한','#편안한설명','#편안한'], en: ['#Thorough','#Attentive','#ComfortableExplanation','#Comfortable'] },
    경력: { ko: ['(現) 면력한방병원 진료원장'], en: ['(Current) Attending Director, Immune Hospital'] },
    학력: { ko: ['북경중의약대학 졸업', '동신대학교 한의과대학 졸업'], en: ['Graduated from Beijing University of Chinese Medicine', 'Graduated from Dongshin University, College of Korean Medicine'] },
    활동: { ko: ['대한한방안이비인후피부과학회 정회원', '대한통합레이저학회 정회원'], en: ['Korean Society of Korean Ophthalmology, Otolaryngology & Dermatology Regular Member', 'Korean Integrative Laser Society Regular Member'] },
  },
];

/* ───────────────── Branch Config ─────────────────
   지점명·주소 문구는 hospitalsPage.branch.<id>.name/.addr 키로 이전. id/status/tel은 로직·비표시 값이라 유지. */
const BRANCH_CONFIG = [
  { id: 'gangseo', status: 'registered', tel: '02-2039-8510' },
  { id: 'sinchon', status: 'registered', tel: '02-393-8510' },
  { id: 'gwangmyeong', status: 'registered', tel: '02-898-8510' },
  { id: 'seongdong', status: 'registered', tel: '02-2295-8510' },
];

// 암종 가이드: 표시 문구는 hospitalsPage.cancerGuide.<organ>.type/.approach 키로 이전. organ은 아이콘 식별자라 유지.
const CANCER_ORGANS = ['stomach', 'breast', 'liver', 'lung', 'thyroid', 'colon'];

/* ───────────────── Sub-components ───────────────── */

function StatusBadge({ status, lang }) {
  const cfg = {
    registered: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle2 size={14} /> },
    preparing:  { bg: 'bg-amber-100',   text: 'text-amber-800',   icon: <Clock size={14} /> },
    upcoming:   { bg: 'bg-gray-100',     text: 'text-gray-600',    icon: <Clock size={14} /> },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${c.bg} ${c.text} text-sm font-bold rounded-full`}>
      {c.icon} {t(`hospitalsPage.status.${status}`, lang)}
    </span>
  );
}

/* 세부 이력 문구 1개를 해당 언어로. DOCTORS 는 ko/en 만 들고 있고
   ru·kz·zh·ja 는 문구 사전(doctorPhrases)에서 찾는다. 사전에 없으면 영어 그대로. */
const tp = (s, lang) => (typeof s === 'string' && DOCTOR_PHRASES[s]?.[lang]) || s;

/* Helper: get localized array data (supports both plain arrays and {ko,en,...} objects) */
const la = (obj, lang) => {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (obj[lang]) return obj[lang];
  return (obj.en || obj.ko || []).map((s) => tp(s, lang));
};

/* ── Doctor Profile Modal (Large) ── */
function DoctorModal({ doc, l, lang, onClose }) {
  if (!doc) return null;
  const sections = [
    { key: '경력', icon: <Briefcase size={16} />, label: t('hospitalsPage.section.career', lang), data: la(doc.경력, lang) },
    { key: '학력', icon: <GraduationCap size={16} />, label: t('hospitalsPage.section.education', lang), data: la(doc.학력, lang) },
    { key: '활동', icon: <Activity size={16} />, label: t('hospitalsPage.section.activities', lang), data: la(doc.활동, lang) },
    { key: '논문', icon: <BookOpen size={16} />, label: t('hospitalsPage.section.publications', lang), data: la(doc.논문, lang) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative bg-emerald-700 rounded-t-2xl p-8 text-white">
          <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition focus:outline-none focus:ring-2 focus:ring-teal-400">
            <X size={20} />
          </button>
          <div className="flex items-center gap-6">
            <img src={doc.photo} alt={l(doc.name)} onError={onImgError} className="w-32 h-32 rounded-2xl object-cover border-4 border-white/30 shadow-lg bg-white/10" />
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
                  <span className="text-emerald-700">{sec.icon}</span>{sec.label}
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
  const roleBadge = doc.role === 'ceo' ? { label: 'CEO', color: 'bg-emerald-700 text-white' }
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
      role="button"
      tabIndex={0}
      onClick={() => onSelect(doc)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(doc); } }}
      className={`bg-white rounded-2xl border cursor-pointer hover:shadow-md transition-all duration-200 group overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-400 ${
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
            onError={onImgError}
            loading="lazy"
            className="w-full h-48 sm:h-full object-cover object-top bg-gray-100 group-hover:scale-[1.02] transition"
          />
        </div>

        {/* Info */}
        {/* min-w-0 필수: 자식 truncate(nowrap) 줄이 flex 아이템의 최소폭을 밀어올려 카드 밖으로 넘침 → overflow-hidden에 잘림 (반성문 #89) */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-extrabold text-lg">{l(doc.name)}</h4>
            {roleBadge && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${roleBadge.color}`}>{roleBadge.label}</span>
            )}
            {/* 전문의 검증 칩 — 실제 '전문의' 자격이 데이터에 있을 때만(전부 도배 금지·과장 금지) */}
            {doc.subspecialty?.ko?.includes("전문의") && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                <CheckCircle2 size={11} /> {t('hospitalsPage.specialist', lang)}
              </span>
            )}
          </div>
          <p className="text-emerald-700 font-semibold text-sm">{l(doc.position)}</p>
          {doc.subspecialty && (
            <p className="text-gray-500 text-xs mt-0.5">{l(doc.subspecialty)}</p>
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
                <p key={i} className="text-xs text-gray-500 truncate">{line}</p>
              ))}
            </div>
          )}

          {/* Footer stats */}
          <div className="flex items-center gap-4 mt-auto pt-3 text-xs text-gray-300">
            {la(doc.논문, lang).length > 0 && (
              <span className="flex items-center gap-1 text-gray-500"><BookOpen size={11} /> {la(doc.논문, lang).length}</span>
            )}
            {career.length > 0 && (
              <span className="flex items-center gap-1 text-gray-500"><Briefcase size={11} /> {career.length}</span>
            )}
            {la(doc.활동, lang).length > 0 && (
              <span className="flex items-center gap-1 text-gray-500"><Activity size={11} /> {la(doc.활동, lang).length}</span>
            )}
            <span className="ml-auto text-emerald-700 font-semibold group-hover:text-emerald-700 transition text-xs">
              {t('hospitalsPage.viewProfile', lang)} →
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
  const lang = useLang(); // 서버가 URL 언어로 렌더(SEO). 쿠키 직독 대신 LangContext.
  const [partnerHospitals, setPartnerHospitals] = useState([]);
  const [expandedBranch, setExpandedBranch] = useState('gangseo');
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // 이름(name)·직위(position)는 사전에 없어 영어 그대로 나가고(영어 통일 — PO 결정 2026-07-27),
  // 세부전공(subspecialty)처럼 사전에 있는 문구만 해당 언어로 바뀐다.
  const l = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || tp(obj['en'], lang) || '';
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

  const branchRefs = useRef({});
  const toggleBranch = (id) => {
    const willOpen = expandedBranch !== id;
    setExpandedBranch(willOpen ? id : null);
    if (!willOpen) return;
    // 밀림 방지: 클릭한 지점 헤더를 고정헤더 바로 아래(상단)에 붙이고, 위 지점이 접히는 애니(200ms)
    // 동안 매 프레임 위치를 다시 잡는다. 예전엔 스크롤을 애니 '전' 한 번만 해서, 위 지점이 뒤늦게
    // 접히며 화면이 튀어 방금 연 지점이 화면 밖으로 사라졌다(rAF 1회 → 프레임별 pin 으로 교체).
    const GAP = 80; // 고정헤더(h-14/16=56~64px) 아래 여백 (scroll-mt-20 과 동일)
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
    const start = now();
    const pin = () => {
      const el = branchRefs.current[id];
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top - GAP) > 1) window.scrollBy(0, top - GAP);
      if (!reduce && now() - start < 280) requestAnimationFrame(pin);
    };
    requestAnimationFrame(pin);
  };
  const branchDoctors = (branchId) => DOCTORS.filter(d => d.branch === branchId);

  return (
    <div className="min-h-screen bg-white">
      {selectedDoctor && <DoctorModal doc={selectedDoctor} l={l} lang={lang} onClose={() => setSelectedDoctor(null)} />}

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-emerald-800 to-teal-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <Award size={16} /> {t('hospitalsPage.consortium.badge', lang)}
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">{t('hospitalsPage.consortium.name', lang)}</h1>
          <p className="text-emerald-200 text-xl font-medium mb-4">{t('hospitalsPage.consortium.role', lang)}</p>
          <p className="text-white/80 text-base md:text-lg max-w-3xl leading-relaxed mb-10">{t('hospitalsPage.consortium.desc', lang)}</p>

          <div className="flex flex-wrap gap-3 mb-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base">
              <span className="text-white font-bold text-xl tabular-nums">4</span>
              <span className="text-emerald-200 ml-2">{t('hospitalsPage.heroBranches', lang)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base">
              <span className="text-white font-bold text-xl tabular-nums">28</span>
              <span className="text-emerald-200 ml-2">{t('hospitalsPage.heroDoctors', lang)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-base inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-300" />
              <span className="text-emerald-200">{t('hospitalsPage.heroRegistered', lang)}</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/intake')}
            className="bg-white text-emerald-800 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2 text-lg"
          >
            {t('hospitalsPage.cta', lang)} <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Branch Network + Doctors ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('hospitalsPage.branches', lang)}</h2>
        <p className="text-gray-500 text-base mb-6">{t('hospitalsPage.branchesDesc', lang)}</p>
        {/* 면력 대표 페이지 입구. 이게 없어서 /hospitals/immune 이 목록에서 도달 불가한
            고아였다(2026-07-22 실측: 목록·홈에서 링크 0). 목록 → 대표 페이지 동선을 만든다. */}
        <Link
          href="/hospitals/immune"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 mb-8"
        >
          {t('hospitalsPage.immuneOverview', lang)} <ArrowRight size={15} />
        </Link>

        <div className="space-y-5">
          {BRANCH_CONFIG.map(branch => {
            const docs = branchDoctors(branch.id);
            const isOpen = expandedBranch === branch.id;
            const isUpcoming = branch.status === 'upcoming';

            return (
              <div key={branch.id} data-testid="hospital-card" ref={el => { branchRefs.current[branch.id] = el; }} className={`scroll-mt-20 border-2 rounded-2xl overflow-hidden transition-all duration-200 ${
                branch.status === 'registered' ? 'border-emerald-200' :
                branch.status === 'preparing' ? 'border-amber-200' : 'border-gray-200'
              } ${isOpen ? 'shadow-xl' : 'hover:shadow-md'}`}>
                {/* Branch header */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  className={`p-6 md:p-8 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-teal-400 ${isOpen ? 'bg-gray-50/50' : 'hover:bg-gray-50/30'}`}
                  onClick={() => !isUpcoming && docs.length > 0 && toggleBranch(branch.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!isUpcoming && docs.length > 0) toggleBranch(branch.id); } }}
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
                        <h3 className="font-bold text-xl md:text-2xl">{t(`hospitalsPage.branch.${branch.id}.name`, lang)}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin size={14} /> {t(`hospitalsPage.branch.${branch.id}.addr`, lang)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {docs.length > 0 && (
                        <span className="text-sm text-gray-500 flex items-center gap-1 hidden sm:flex">
                          <Users size={16} /> {docs.length}{t('hospitalsPage.doctorsLabel', lang)}
                        </span>
                      )}
                      {branch.tel && (
                        <span className="text-sm text-gray-500 hidden md:flex items-center gap-1">
                          <Phone size={14} /> {branch.tel}
                        </span>
                      )}
                      {docs.length > 0 && (
                        <ChevronDown size={24} className={`text-gray-400 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <StatusBadge status={branch.status} lang={lang} />
                  </div>
                </div>

                {/* Expanded: Doctor grid — grid-rows 0fr→1fr 로 높이를 부드럽게 펼침(즉시 나타나 아래를 밀어내던 '툭' 끊김 제거). 네이티브 CSS, 라이브러리 없음. */}
                {docs.length > 0 && (
                  <div inert={!isOpen ? true : undefined} className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <div className={`border-t-2 border-gray-100 bg-gray-50/30 px-4 sm:px-6 md:px-8 py-6 md:py-8 transition-all duration-200 motion-reduce:transition-none ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                          {docs.map(doc => (
                            <DoctorCard key={doc.id} doc={doc} l={l} lang={lang} onSelect={setSelectedDoctor} />
                          ))}
                        </div>
                      </div>
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
          <h2 className="text-2xl md:text-3xl font-bold mb-8">{t('hospitalsPage.strengths.title', lang)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STRENGTH_ICONS.map((iconName, i) => {
              const Icon = ICON_MAP[iconName];
              return (
                <div key={i} className="bg-white rounded-2xl p-8 border border-emerald-100">
                  <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-5">
                    <Icon size={28} className="text-emerald-700" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{t(`hospitalsPage.strengths.item${i + 1}Title`, lang)}</h3>
                  <p className="text-base text-gray-500 leading-relaxed">{t(`hospitalsPage.strengths.item${i + 1}Desc`, lang)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Partner Hospitals ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('hospitalsPage.partnerHospitals.title', lang)}</h2>
        <p className="text-gray-500 text-base mb-8">{t('hospitalsPage.partnerHospitals.desc', lang)}</p>
        {partnerHospitals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {partnerHospitals.map(h => (
              <Link key={h.id} href={localeHref(`/hospitals/${h.slug || h.id}`, lang)} data-testid="hospital-card" className="block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-teal-300 transition cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-400">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                    <Stethoscope size={24} className="text-teal-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base group-hover:text-teal-700 transition line-clamp-1">{h.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={12} /><span className="truncate">{h.location}</span></p>
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
                <div className="flex items-center gap-1 text-sm text-teal-700 font-medium">
                  {t('hospitalsPage.viewDetails', lang)} <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('hospitalsPage.comingSoon', lang)}</p>
          </div>
        )}
      </section>

      {/* ── Cancer Type Guide ── */}
      <section className="bg-gray-50 py-14">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('hospitalsPage.cancerCare.title', lang)}</h2>
          <p className="text-gray-500 text-base mb-8">{t('hospitalsPage.cancerCare.desc', lang)}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CANCER_ORGANS.map((organ, i) => (
              <div key={i} role="button" tabIndex={0} onClick={() => router.push('/inquiry')} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push('/inquiry'); } }} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-teal-200 transition cursor-pointer group focus:outline-none focus:ring-2 focus:ring-teal-400">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-teal-600"><OrganIcon name={organ} className="w-9 h-9" /></span>
                  <h3 className="font-bold text-lg group-hover:text-teal-700 transition">{t(`hospitalsPage.cancerGuide.${organ}.type`, lang)}</h3>
                </div>
                <p className="text-base text-gray-500 leading-relaxed">{t(`hospitalsPage.cancerGuide.${organ}.approach`, lang)}</p>
                <div className="flex items-center gap-1 mt-4 text-sm text-teal-700 font-medium">
                  {t('hospitalsPage.cta', lang)} <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-10 md:p-16 text-center text-white">
          <div className="flex justify-center gap-3 mb-5">
            <Stethoscope size={28} className="text-teal-200" />
            <span className="text-teal-200 text-xl">+</span>
            <Leaf size={28} className="text-emerald-200" />
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">
            {t('hospitalsPage.ewTitle', lang)}
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8 text-lg">
            {t('hospitalsPage.ewDesc', lang)}
          </p>
          <button onClick={() => router.push('/intake')} className="bg-white text-teal-700 font-bold px-10 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2 text-lg">
            {t('hospitalsPage.cta', lang)} <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}
