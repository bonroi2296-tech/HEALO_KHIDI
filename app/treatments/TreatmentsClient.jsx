'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ChevronDown, Stethoscope, Leaf, Shield,
  Activity, Clock, FileText, CheckCircle,
} from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';

export const TREATMENTS_L = {
  title: { ko: '암종별 치료 안내', en: 'Cancer Treatment Guide', ru: 'Руководство по лечению рака', kz: 'Рак емдеу нұсқаулығы', zh: '癌症治疗指南', ja: 'がん治療ガイド' },
  subtitle: { ko: '한국의 첨단 암 치료와 한방 면역치료를 결합한 healwith 통합 케어 프로세스', en: 'healwith integrated care combining Korea\'s advanced cancer treatment with Korean Medicine immune therapy', ru: 'Интегрированная помощь healwith: передовое лечение рака в Корее + корейская иммунная терапия', kz: 'healwith кешенді көмек: Кореяның озық онкологиялық емі + корей иммундық терапиясы', zh: 'healwith综合护理：韩国先进肿瘤治疗+韩方免疫治疗', ja: 'healwith統合ケア：韓国の先端がん治療と韓方免疫治療の融合' },
  processTitle: { ko: 'healwith 통합 케어 프로세스', en: 'healwith Integrated Care Process', ru: 'Процесс интегрированной помощи healwith', kz: 'healwith кешенді көмек процесі', zh: 'healwith综合护理流程', ja: 'healwith統合ケアプロセス' },
  westernTitle: { ko: '양방 치료 (협진 병원)', en: 'Western Treatment (Partner Hospital)', ru: 'Западное лечение (партнёрская больница)', kz: 'Батыс емі (серіктес аурухана)', zh: '西医治疗（协诊医院）', ja: '西洋医学治療（協診病院）' },
  easternTitle: { ko: '한방 통합 케어 (면력한방병원)', en: 'Korean Medicine Care (Immune Hospital)', ru: 'Корейская медицина (Иммунная Клиника)', kz: 'Корей медицинасы (Иммунная Клиника)', zh: '韩方综合护理（免疫医院）', ja: '韓方統合ケア（免疫病院）' },
  cta: { ko: '사전상담 시작하기', en: 'Start Pre-consultation', ru: 'Начать консультацию', kz: 'Кеңес бастау', zh: '开始预咨询', ja: '事前相談を始める' },
  expandDetail: { ko: '상세 보기', en: 'View Details', ru: 'Подробнее', kz: 'Толығырақ', zh: '查看详情', ja: '詳細を見る' },
  bottomTitle: { ko: '어떤 암종이든, healwith가 함께합니다', en: 'Whatever the cancer type, healwith is with you', ru: 'Какой бы ни был тип рака — healwith поможет', kz: 'Қандай рак түрі болса да, healwith жанында', zh: '无论哪种癌症，healwith与您同在', ja: 'どのがん種でも、healwithがそばにいます' },
  bottomDesc: { ko: '인테이크 양식을 작성하면 24시간 이내에 최적의 치료 계획을 안내해드립니다.', en: 'Submit your intake form and we\'ll guide you to the optimal treatment plan within 24 hours.', ru: 'Заполните анкету, и мы предложим оптимальный план лечения в течение 24 часов.', kz: 'Сауалнаманы толтырыңыз, 24 сағат ішінде ең тиімді емдеу жоспарын ұсынамыз.', zh: '提交问诊表，我们将在24小时内为您提供最佳治疗方案。', ja: '問診票をご提出いただければ、24時間以内に最適な治療計画をご案内します。' },
};

export const CANCERS = [
  {
    emoji: '🫁', type: { ko: '위암', en: 'Stomach Cancer', ru: 'Рак желудка', kz: 'Асқазан обыры', zh: '胃癌', ja: '胃がん' },
    koreaStrength: { ko: '한국 위암 5년 생존율 세계 1위 (77.0%)', en: 'Korea has the world\'s highest 5-year stomach cancer survival rate (77.0%)', ru: 'Корея — мировой лидер по выживаемости при раке желудка (77.0%)', kz: 'Корея — асқазан обыры бойынша өмір сүру рекорды (77.0%)', zh: '韩国胃癌5年生存率世界第一（77.0%）', ja: '韓国の胃がん5年生存率は世界一（77.0%）' },
    western: [
      { ko: '내시경 점막하 절제술 (ESD)', en: 'Endoscopic Submucosal Dissection (ESD)', ru: 'Эндоскопическая подслизистая диссекция (ЭПД)', kz: 'Эндоскопиялық шырышасты диссекция (ESD)', zh: '内镜黏膜下剥离术（ESD）', ja: '内視鏡的粘膜下層剥離術（ESD）' },
      { ko: '복강경/로봇 위절제술', en: 'Laparoscopic/Robotic Gastrectomy', ru: 'Лапароскопическая/Роботизированная гастрэктомия', kz: 'Лапароскопиялық/роботты гастрэктомия', zh: '腹腔镜/机器人胃切除术', ja: '腹腔鏡・ロボット胃切除術' },
      { ko: '항암화학요법', en: 'Chemotherapy', ru: 'Химиотерапия', kz: 'Химиотерапия', zh: '抗癌化疗', ja: '抗がん化学療法' },
    ],
    eastern: [
      { ko: '소화기능 회복 한약 처방', en: 'Herbal medicine for digestive recovery', ru: 'Травяные препараты для восстановления пищеварения', kz: 'Ас қорытуды қалпына келтіретін дәрілік шөп рецептері', zh: '恢复消化功能的韩药处方', ja: '消化機能回復の韓方薬処方' },
      { ko: '항암 구역·구토 완화 침치료', en: 'Acupuncture for chemo-induced nausea relief', ru: 'Акупунктура против тошноты от химиотерапии', kz: 'Химиотерапиядан кейінгі жүрек айнуын жеңілдететін ине терапиясы', zh: '缓解化疗恶心呕吐的针灸治疗', ja: '抗がん剤による吐き気を和らげる鍼治療' },
      { ko: '체중/영양 회복 면역 프로그램', en: 'Immune program for weight/nutrition recovery', ru: 'Иммунная программа для восстановления веса/питания', kz: 'Салмақ/қоректенуді қалпына келтіру иммундық бағдарламасы', zh: '体重/营养恢复免疫项目', ja: '体重・栄養回復の免疫プログラム' },
    ],
  },
  {
    emoji: '🩷', type: { ko: '유방암', en: 'Breast Cancer', ru: 'Рак молочной железы', kz: 'Сүт безі обыры', zh: '乳腺癌', ja: '乳がん' },
    koreaStrength: { ko: '유방보존술 비율 세계 최고 수준, 최소 절개 수술', en: 'World-leading breast conservation rates with minimal incision surgery', ru: 'Мировой лидер по органосберегающим операциям', kz: 'Сүт безін сақтап қалу операциялары бойынша әлемдік көшбасшы, минималды тілік', zh: '保乳手术比例世界领先，微创手术', ja: '乳房温存手術の割合は世界最高水準、最小切開手術' },
    western: [
      { ko: '유방보존술 / 유방절제술', en: 'Breast-conserving / Mastectomy', ru: 'Органосберегающая / Мастэктомия', kz: 'Сүт безін сақтау операциясы / мастэктомия', zh: '保乳手术/乳房切除术', ja: '乳房温存術／乳房切除術' },
      { ko: '항암·방사선·호르몬 치료', en: 'Chemo · Radiation · Hormone therapy', ru: 'Химио · Радиотерапия · Гормональная', kz: 'Химия·сәулелік·гормондық терапия', zh: '化疗·放疗·激素治疗', ja: '化学療法・放射線・ホルモン療法' },
      { ko: '유방 재건 성형', en: 'Breast reconstruction', ru: 'Реконструкция молочной железы', kz: 'Сүт безін қалпына келтіру (реконструкция)', zh: '乳房重建整形', ja: '乳房再建手術' },
    ],
    eastern: [
      { ko: '호르몬 불균형 한방 조절', en: 'KM hormonal balance management', ru: 'Регулирование гормонального баланса', kz: 'Гормондық теңгерімді корей медицинасымен реттеу', zh: '韩方调节激素平衡', ja: '韓方によるホルモンバランス調整' },
      { ko: '림프부종 침·약침 치료', en: 'Acupuncture for lymphedema management', ru: 'Акупунктура при лимфедеме', kz: 'Лимфа ісінуіне ине·дәрілік ине терапиясы', zh: '淋巴水肿的针灸·药针治疗', ja: 'リンパ浮腫の鍼・薬鍼治療' },
      { ko: '면역력 강화 한약 처방', en: 'Immune-boosting herbal prescriptions', ru: 'Иммуностимулирующие травяные рецепты', kz: 'Иммунитетті күшейтетін дәрілік шөп рецептері', zh: '增强免疫力的韩药处方', ja: '免疫力を高める韓方薬処方' },
    ],
  },
  {
    emoji: '🫀', type: { ko: '간암', en: 'Liver Cancer', ru: 'Рак печени', kz: 'Бауыр обыры', zh: '肝癌', ja: '肝がん' },
    koreaStrength: { ko: '간이식 성공률 세계 최고 수준, B형 간염 기반 간암 전문', en: 'World-leading liver transplant success rates, expertise in HBV-related liver cancer', ru: 'Мировой лидер по успешности трансплантации печени', kz: 'Бауыр трансплантациясының сәттілігі бойынша әлемдік деңгей, В гепатитіне байланысты бауыр обырына маманданған', zh: '肝移植成功率世界领先，擅长乙肝相关肝癌', ja: '肝移植成功率は世界最高水準、B型肝炎由来の肝がんに精通' },
    western: [
      { ko: '간절제술 (복강경/개복)', en: 'Hepatectomy (Laparoscopic/Open)', ru: 'Гепатэктомия (лапароскопическая/открытая)', kz: 'Бауыр резекциясы (лапароскопиялық/ашық)', zh: '肝切除术（腹腔镜/开腹）', ja: '肝切除術（腹腔鏡・開腹）' },
      { ko: '경동맥 화학색전술 (TACE)', en: 'Transarterial Chemoembolization (TACE)', ru: 'Трансартериальная химиоэмболизация (ТАХЭ)', kz: 'Трансартериялық химиоэмболизация (TACE)', zh: '经动脉化疗栓塞术（TACE）', ja: '肝動脈化学塞栓療法（TACE）' },
      { ko: '표적·면역 항암', en: 'Targeted · Immunotherapy', ru: 'Таргетная · Иммунотерапия', kz: 'Таргетті·иммундық терапия', zh: '靶向·免疫治疗', ja: '分子標的・免疫療法' },
    ],
    eastern: [
      { ko: '간기능 보호 한약 (인진호탕 등)', en: 'Liver-protecting herbal medicine', ru: 'Травы для защиты печени', kz: 'Бауырды қорғайтын дәрілік шөп рецептері', zh: '保肝韩药（茵陈蒿汤等）', ja: '肝機能を守る韓方薬（茵蔯蒿湯など）' },
      { ko: '간경변 진행 억제 침치료', en: 'Acupuncture to slow cirrhosis progression', ru: 'Акупунктура для замедления цирроза', kz: 'Цирроздың үдеуін баяулататын ине терапиясы', zh: '延缓肝硬化进展的针灸治疗', ja: '肝硬変の進行を抑える鍼治療' },
      { ko: '피로·황달 완화 통합 프로그램', en: 'Integrated program for fatigue/jaundice relief', ru: 'Комплексная программа от усталости/желтухи', kz: 'Шаршау·сарғаюды жеңілдететін кешенді бағдарлама', zh: '缓解疲劳·黄疸的综合项目', ja: '疲労・黄疸を和らげる統合プログラム' },
    ],
  },
  {
    emoji: '🌬️', type: { ko: '폐암', en: 'Lung Cancer', ru: 'Рак лёгких', kz: 'Өкпе обыры', zh: '肺癌', ja: '肺がん' },
    koreaStrength: { ko: '흉강경(VATS) 수술 세계적 수준, 면역항암 선도 적용', en: 'World-class VATS surgery, leading immunotherapy adoption', ru: 'Мирового класса ВАТС-хирургия, ведущее применение иммунотерапии', kz: 'Әлемдік деңгейдегі VATS хирургиясы, иммундық терапияны алдыңғы қатарда қолдану', zh: '胸腔镜（VATS）手术世界一流，率先应用免疫治疗', ja: '世界水準の胸腔鏡（VATS）手術、免疫療法を先進的に導入' },
    western: [
      { ko: '흉강경(VATS) / 로봇 폐절제', en: 'VATS / Robotic Lung Resection', ru: 'ВАТС / Роботизированная резекция лёгкого', kz: 'VATS / роботты өкпе резекциясы', zh: '胸腔镜（VATS）/机器人肺切除', ja: 'VATS／ロボット肺切除' },
      { ko: '면역관문억제제 치료', en: 'Immune checkpoint inhibitor therapy', ru: 'Терапия ингибиторами контрольных точек', kz: 'Иммундық бақылау нүктесі ингибиторларымен ем', zh: '免疫检查点抑制剂治疗', ja: '免疫チェックポイント阻害薬治療' },
      { ko: '정밀방사선 치료 (SBRT)', en: 'Stereotactic Body Radiation (SBRT)', ru: 'Стереотаксическая лучевая терапия (SBRT)', kz: 'Дәл сәулелік терапия (SBRT)', zh: '精准放疗（SBRT）', ja: '高精度放射線治療（SBRT）' },
    ],
    eastern: [
      { ko: '호흡기능 회복 한약·침치료', en: 'Herbal medicine & acupuncture for respiratory recovery', ru: 'Травы и акупунктура для восстановления дыхания', kz: 'Тыныс алуды қалпына келтіретін шөп·ине емі', zh: '恢复呼吸功能的韩药·针灸', ja: '呼吸機能回復の韓方薬・鍼治療' },
      { ko: '폐 면역력 강화 약침', en: 'Pharmacopuncture for lung immune support', ru: 'Фармакопунктура для лёгочного иммунитета', kz: 'Өкпе иммунитетіне дәрілік ине терапиясы', zh: '增强肺部免疫的药针', ja: '肺の免疫を支える薬鍼' },
      { ko: '항암 피로 관리 프로그램', en: 'Chemo-fatigue management program', ru: 'Программа борьбы с утомлением от химиотерапии', kz: 'Химиотерапия шаршауын басқару бағдарламасы', zh: '化疗疲劳管理项目', ja: '抗がん剤疲労管理プログラム' },
    ],
  },
  {
    emoji: '🦋', type: { ko: '갑상선암', en: 'Thyroid Cancer', ru: 'Рак щитовидной железы', kz: 'Қалқанша без обыры', zh: '甲状腺癌', ja: '甲状腺がん' },
    koreaStrength: { ko: '갑상선암 치료 경험 세계 최다, 5년 생존율 100% 근접', en: 'World\'s most thyroid cancer treatment experience, near 100% 5-year survival', ru: 'Мировой лидер по опыту лечения рака щитовидной железы', kz: 'Қалқанша безі обырын емдеу тәжірибесі бойынша әлемде бірінші, 5 жылдық өмір сүру 100%-ға жуық', zh: '甲状腺癌治疗经验世界最多，5年生存率接近100%', ja: '甲状腺がん治療実績は世界最多、5年生存率はほぼ100%' },
    western: [
      { ko: '갑상선 절제술 (로봇/내시경)', en: 'Thyroidectomy (Robotic/Endoscopic)', ru: 'Тиреоидэктомия (роботизированная/эндоскопическая)', kz: 'Қалқанша безін алып тастау (роботты/эндоскопиялық)', zh: '甲状腺切除术（机器人/内镜）', ja: '甲状腺切除術（ロボット・内視鏡）' },
      { ko: '방사성요오드 치료', en: 'Radioactive Iodine Therapy', ru: 'Терапия радиоактивным йодом', kz: 'Радиоактивті йодпен ем', zh: '放射性碘治疗', ja: '放射性ヨウ素治療' },
      { ko: 'TSH 억제 요법', en: 'TSH Suppression Therapy', ru: 'Терапия подавления ТТГ', kz: 'TSH басу терапиясы', zh: 'TSH抑制疗法', ja: 'TSH抑制療法' },
    ],
    eastern: [
      { ko: '갑상선 호르몬 균형 한방 조절', en: 'KM thyroid hormone balance management', ru: 'Корейская регуляция гормонов щитовидной железы', kz: 'Қалқанша без гормондарын корей медицинасымен реттеу', zh: '韩方调节甲状腺激素平衡', ja: '韓方による甲状腺ホルモン調整' },
      { ko: '수술 후 성대·목 회복 침치료', en: 'Acupuncture for post-surgery voice/neck recovery', ru: 'Акупунктура для восстановления голоса после операции', kz: 'Отадан кейін дауыс·мойынды қалпына келтіретін ине емі', zh: '术后嗓音·颈部恢复针灸', ja: '術後の声帯・首の回復鍼治療' },
      { ko: '면역력 유지 한약 처방', en: 'Immune-maintenance herbal prescriptions', ru: 'Иммуноподдерживающие травяные рецепты', kz: 'Иммунитетті сақтайтын дәрілік шөп рецептері', zh: '维持免疫力的韩药处方', ja: '免疫維持の韓方薬処方' },
    ],
  },
  {
    emoji: '🎗️', type: { ko: '대장암', en: 'Colorectal Cancer', ru: 'Рак толстой кишки', kz: 'Тоқ ішек обыры', zh: '大肠癌', ja: '大腸がん' },
    koreaStrength: { ko: '복강경 대장암 수술 세계 최다 경험, 높은 항문보존률', en: 'World\'s most laparoscopic colorectal surgeries, high anal preservation rate', ru: 'Мировой лидер по лапароскопическим операциям, высокий процент сохранения сфинктера', kz: 'Лапароскопиялық тоқ ішек операциялары бойынша әлемдегі ең мол тәжірибе, сфинктерді сақтау деңгейі жоғары', zh: '腹腔镜大肠癌手术经验世界最多，肛门保留率高', ja: '腹腔鏡大腸がん手術は世界最多の実績、高い肛門温存率' },
    western: [
      { ko: '복강경/로봇 대장절제', en: 'Laparoscopic/Robotic Colectomy', ru: 'Лапароскопическая/Роботизированная колэктомия', kz: 'Лапароскопиялық/роботты колэктомия', zh: '腹腔镜/机器人大肠切除', ja: '腹腔鏡・ロボット大腸切除' },
      { ko: '항암화학요법 (FOLFOX 등)', en: 'Chemotherapy (FOLFOX, etc.)', ru: 'Химиотерапия (FOLFOX и др.)', kz: 'Химиотерапия (FOLFOX және т.б.)', zh: '化疗（FOLFOX等）', ja: '化学療法（FOLFOXなど）' },
      { ko: '표적항암 (세툭시맙 등)', en: 'Targeted therapy (Cetuximab, etc.)', ru: 'Таргетная терапия (Цетуксимаб и др.)', kz: 'Таргетті терапия (Цетуксимаб және т.б.)', zh: '靶向治疗（西妥昔单抗等）', ja: '分子標的治療（セツキシマブなど）' },
    ],
    eastern: [
      { ko: '장기능 회복 한약 처방', en: 'Herbal medicine for bowel function recovery', ru: 'Травы для восстановления функции кишечника', kz: 'Ішек қызметін қалпына келтіретін дәрілік шөп рецептері', zh: '恢复肠道功能的韩药处方', ja: '腸機能回復の韓方薬処方' },
      { ko: '항암 설사·복통 완화 침치료', en: 'Acupuncture for chemo diarrhea/pain relief', ru: 'Акупунктура от диареи/болей при химиотерапии', kz: 'Химиотерапиядағы диарея·іш ауыруын жеңілдететін ине емі', zh: '缓解化疗腹泻·腹痛的针灸', ja: '抗がん剤による下痢・腹痛を和らげる鍼治療' },
      { ko: '체력·면역 강화 통합 프로그램', en: 'Integrated strength & immune enhancement', ru: 'Комплексная программа укрепления сил и иммунитета', kz: 'Күш-қуат·иммунитетті нығайтатын кешенді бағдарлама', zh: '增强体力·免疫的综合项目', ja: '体力・免疫強化の統合プログラム' },
    ],
  },
];

const PROCESS_STEPS = [
  { icon: FileText, label: { ko: '인테이크 접수', en: 'Intake Submission', ru: 'Подача заявки', kz: 'Өтінім қабылдау', zh: '提交问诊表', ja: '問診受付' }, desc: { ko: '암종·병기·치료이력 입력', en: 'Cancer type, stage & history', ru: 'Тип рака, стадия, история', kz: 'Обыр түрі·сатысы·ем тарихы', zh: '填写癌种·分期·治疗史', ja: 'がん種・病期・治療歴を入力' } },
  { icon: Stethoscope, label: { ko: '양방 전문의 매칭', en: 'Oncologist Matching', ru: 'Подбор онколога', kz: 'Онколог таңдау', zh: '匹配肿瘤专科医生', ja: '腫瘍専門医マッチング' }, desc: { ko: 'AI 기반 최적 전문의 추천', en: 'AI-powered specialist recommendation', ru: 'ИИ-подбор специалиста', kz: 'AI негізінде маман ұсыну', zh: 'AI推荐最合适的专科医生', ja: 'AIによる最適な専門医推薦' } },
  { icon: Activity, label: { ko: '화상 사전상담', en: 'Video Pre-consultation', ru: 'Видеоконсультация', kz: 'Бейне алдын ала кеңес', zh: '视频预咨询', ja: 'ビデオ事前相談' }, desc: { ko: '실시간 통역 화상 상담', en: 'Video consultation with live interpretation', ru: 'Видео с синхронным переводом', kz: 'Ілеспе аудармамен бейне кеңес', zh: '实时口译视频咨询', ja: 'リアルタイム通訳付きビデオ相談' } },
  { icon: Leaf, label: { ko: '한방 통합 케어', en: 'KM Integrated Care', ru: 'Интегрированный уход', kz: 'Корей медицинасы кешенді күтімі', zh: '韩方综合护理', ja: '韓方統合ケア' }, desc: { ko: '면역강화·부작용 관리', en: 'Immune boost & side-effect care', ru: 'Укрепление иммунитета', kz: 'Иммунитет күшейту·жанама әсерді басқару', zh: '增强免疫·管理副作用', ja: '免疫強化・副作用管理' } },
  { icon: Shield, label: { ko: '사후관리', en: 'Post-care', ru: 'Послеоперационный уход', kz: 'Кейінгі бақылау', zh: '后续管理', ja: 'アフターケア' }, desc: { ko: '증상 추적·재진 예약', en: 'Symptom tracking & follow-up', ru: 'Отслеживание симптомов', kz: 'Симптом бақылау·қайта қаралу', zh: '症状跟踪·复诊预约', ja: '症状追跡・再診予約' } },
];

export default function TreatmentsClient() {
  const router = useRouter();
  const lang = useLang();
  const [expandedIdx, setExpandedIdx] = useState(-1);

  const l = (obj) => obj?.[lang] || obj?.['en'] || obj?.['ko'] || '';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-700 to-emerald-700 text-white py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{l(TREATMENTS_L.title)}</h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto">{l(TREATMENTS_L.subtitle)}</p>
        </div>
      </section>

      {/* Process */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{l(TREATMENTS_L.processTitle)}</h2>
        <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-0">
          {PROCESS_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex-1 flex items-center">
                <div className="flex-1 text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Icon size={20} className="text-teal-700" />
                  </div>
                  <div className="font-bold text-sm mb-1">{l(step.label)}</div>
                  <div className="text-xs text-gray-500">{l(step.desc)}</div>
                </div>
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden md:block text-gray-300 px-1">
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Cancer Cards */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4 space-y-4">
          {CANCERS.map((cancer, i) => {
            const isExpanded = expandedIdx === i;
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Summary */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedIdx(isExpanded ? -1 : i)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{cancer.emoji}</span>
                      <div>
                        <h3 className="font-bold text-lg">{l(cancer.type)}</h3>
                        <p className="text-xs text-teal-700 font-medium mt-0.5">{l(cancer.koreaStrength)}</p>
                      </div>
                    </div>
                    <ChevronDown size={20} className={`text-gray-400 transition ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* 양방 */}
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Stethoscope size={16} className="text-blue-600" />
                          <h4 className="font-bold text-sm text-blue-900">{l(TREATMENTS_L.westernTitle)}</h4>
                        </div>
                        <ul className="space-y-2">
                          {cancer.western.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-blue-800">
                              <CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />
                              {l(item)}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 한방 */}
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Leaf size={16} className="text-emerald-700" />
                          <h4 className="font-bold text-sm text-emerald-900">{l(TREATMENTS_L.easternTitle)}</h4>
                        </div>
                        <ul className="space-y-2">
                          {cancer.eastern.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-emerald-800">
                              <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                              {l(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="text-center mt-5">
                      <button
                        onClick={() => router.push('/intake')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-xl hover:bg-teal-800 transition text-sm font-semibold"
                      >
                        {l(TREATMENTS_L.cta)} <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          {l(TREATMENTS_L.bottomTitle)}
        </h2>
        <p className="text-gray-500 text-sm mb-6 max-w-lg mx-auto">
          {l(TREATMENTS_L.bottomDesc)}
        </p>
        <button
          onClick={() => router.push('/intake')}
          className="bg-teal-700 text-white font-bold px-8 py-4 rounded-2xl shadow-md hover:bg-teal-800 hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
        >
          {l(TREATMENTS_L.cta)} <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
