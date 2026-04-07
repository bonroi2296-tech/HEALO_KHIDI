'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MapPin, Users, Star, Shield, Leaf,
  ArrowRight, Phone, Globe, Award, Heart,
  ChevronRight, Stethoscope, Microscope,
} from 'lucide-react';
import { getLangCodeFromCookie } from '../../src/lib/i18n';
import { supabaseClient } from '../../src/lib/data/supabaseClient';
import { mapHospitalRow } from '../../src/lib/mapper';

const L = {
  consortium: {
    badge: { ko: '핵심 컨소시엄 파트너', en: 'Core Consortium Partner', ru: 'Основной партнёр консорциума', kz: 'Негізгі консорциум серіктес', zh: '核心联盟合作伙伴', ja: 'コアコンソーシアムパートナー' },
    name: { ko: '면력한방병원', en: 'Immunehospital Korean Medicine', ru: 'Клиника корейской медицины Мёнрёк', kz: 'Мёнрёк корей медицинасы клиникасы', zh: '免力韩方医院', ja: '免力韓方病院' },
    role: { ko: 'HEALO 플랫폼의 한방 면역치료 및 사후관리 총괄', en: 'Korean Medicine immune therapy & post-care management for HEALO', ru: 'Иммунная терапия корейской медициной и послеоперационный уход', kz: 'Корей медицинасымен иммундық терапия және емнен кейінгі күтім', zh: '韩方免疫治疗及术后管理', ja: '韓方免疫治療・術後管理' },
    desc: { ko: '면력한방병원은 서울 마곡에 본원을 두고 신촌·광명에 분원을 운영하는 한방 면역치료 전문 의료기관입니다. 암 환자의 면역력 강화, 항암 부작용 완화, 체력 회복을 위한 통합 한방 프로그램을 제공합니다.', en: 'Immunehospital is a Korean Medicine institution headquartered in Magok, Seoul, with branches in Sinchon and Gwangmyeong. We provide integrated Korean Medicine programs for cancer patients including immune enhancement, chemotherapy side-effect relief, and physical recovery.', ru: 'Иммуногоспиталь — это учреждение корейской медицины с главным офисом в Магоке, Сеул, и филиалами в Синчоне и Кванмёне. Мы предоставляем комплексные программы корейской медицины для онкопациентов.', kz: 'Иммуногоспиталь — Сеул Магоктағы бас кеңсесі мен Синчон, Кванмён филиалдары бар корей медицинасы мекемесі.', zh: '免力韩方医院总部位于首尔麻谷，在新村和光明设有分院。为癌症患者提供综合韩方免疫增强、化疗副作用缓解和体力恢复项目。', ja: '免力韓方病院はソウル麻谷に本院を置き、新村・光明に分院を展開する免疫治療専門の韓方医療機関です。' },
  },
  branches: { ko: '분원 네트워크', en: 'Branch Network', ru: 'Сеть филиалов', kz: 'Филиал желісі', zh: '分院网络', ja: '分院ネットワーク' },
  strengths: {
    title: { ko: '면력한방병원의 강점', en: 'Our Strengths', ru: 'Наши преимущества', kz: 'Біздің артықшылықтарымыз', zh: '我们的优势', ja: '強み' },
    items: [
      {
        icon: 'Shield',
        title: { ko: '면역 강화 전문', en: 'Immune Enhancement Specialist', ru: 'Специалист по иммунитету', kz: 'Иммунитет маманы', zh: '免疫增强专家', ja: '免疫強化専門' },
        desc: { ko: '사상체질 진단 기반 맞춤형 면역 프로그램', en: 'Customized immune programs based on Sasang constitutional diagnosis', ru: 'Индивидуальные программы на основе диагностики Сасан', kz: 'Сасан диагностикасына негізделген бағдарламалар', zh: '基于四象体质诊断的定制免疫方案', ja: '四象体質診断に基づくカスタマイズ免疫プログラム' },
      },
      {
        icon: 'Heart',
        title: { ko: '항암 부작용 관리', en: 'Chemo Side-effect Care', ru: 'Уход при побочных эффектах', kz: 'Химиотерапия жанама әсерлерін басқару', zh: '化疗副作用管理', ja: '抗がん副作用ケア' },
        desc: { ko: '구토, 피로, 식욕부진 등 항암 부작용 한방 치료', en: 'Korean Medicine treatment for nausea, fatigue, appetite loss from chemotherapy', ru: 'Лечение тошноты, усталости, потери аппетита от химиотерапии', kz: 'Химиотерапиядан болатын жүрек айну, шаршау, тәбет жоғалуын емдеу', zh: '针对呕吐、疲劳、食欲不振等化疗副作用的韩方治疗', ja: '吐き気・疲労・食欲不振など抗がん副作用の韓方治療' },
      },
      {
        icon: 'Leaf',
        title: { ko: '사후 회복 프로그램', en: 'Post-treatment Recovery', ru: 'Восстановление после лечения', kz: 'Емнен кейінгі қалпына келтіру', zh: '术后恢复项目', ja: '治療後回復プログラム' },
        desc: { ko: '수술 후 체력 회복, 한약·침·약침 통합 치료', en: 'Integrated herbal medicine, acupuncture & pharmacopuncture for post-surgical recovery', ru: 'Комплексная фитотерапия, акупунктура и фармакопунктура', kz: 'Кешенді фитотерапия, акупунктура және фармакопунктура', zh: '术后体力恢复，韩药·针灸·药针综合治疗', ja: '術後体力回復、韓薬・鍼・薬鍼統合治療' },
      },
    ],
  },
  partnerHospitals: {
    title: { ko: '협진 암 전문 병원', en: 'Partner Oncology Hospitals', ru: 'Партнёрские онкологические больницы', kz: 'Серіктес онкологиялық аурухналар', zh: '协诊肿瘤专科医院', ja: '協診がん専門病院' },
    desc: { ko: 'HEALO가 연계하는 한국 주요 암 전문 의료기관입니다. 수술, 항암, 방사선 치료를 담당합니다.', en: 'Leading Korean oncology hospitals partnered with HEALO for surgery, chemotherapy, and radiation therapy.', ru: 'Ведущие корейские онкологические больницы — партнёры HEALO по хирургии, химиотерапии и лучевой терапии.', kz: 'HEALO серіктес жетекші корей онкологиялық аурухналары.', zh: 'HEALO合作的韩国主要肿瘤专科医院，负责手术、化疗和放射治疗。', ja: 'HEALOが提携する韓国主要がん専門病院。手術・抗がん・放射線治療を担当。' },
  },
  cancerCare: {
    title: { ko: '암종별 치료 안내', en: 'Treatment Guide by Cancer Type', ru: 'Руководство по лечению по типу рака', kz: 'Рак түрі бойынша емдеу нұсқаулығы', zh: '按癌症类型治疗指南', ja: 'がん種別治療ガイド' },
    desc: { ko: '각 암종에 대한 한국의 치료 접근법과 HEALO의 통합 케어 프로세스를 확인하세요.', en: 'Learn about Korean treatment approaches for each cancer type and HEALO\'s integrated care process.', ru: 'Узнайте о корейских методах лечения каждого типа рака.', kz: 'Әр рак түрі бойынша корей емдеу тәсілдерін біліңіз.', zh: '了解韩国针对各癌症类型的治疗方法和HEALO的综合护理流程。', ja: '各がん種に対する韓国の治療アプローチとHEALOの統合ケアプロセス。' },
  },
  cta: { ko: '사전상담 신청하기', en: 'Request Pre-consultation', ru: 'Запросить консультацию', kz: 'Алдын ала кеңес сұрау', zh: '申请预咨询', ja: '事前相談を申請' },
  viewDetail: { ko: '상세 보기', en: 'View Details', ru: 'Подробнее', kz: 'Толығырақ', zh: '查看详情', ja: '詳細を見る' },
  doctors: { ko: '명 전문의', en: ' doctors', ru: ' врачей', kz: ' дәрігер', zh: '名医生', ja: '名の医師' },
};

const ICON_MAP = { Shield, Heart, Leaf };

const BRANCHES = [
  { name: { ko: '마곡 본원 (HQ)', en: 'Magok HQ', ru: 'Магок (гл.)', kz: 'Магок (бас)', zh: '麻谷总院', ja: '麻谷本院' }, addr: { ko: '서울 강서구 마곡중앙6로 20', en: 'Gangseo-gu, Seoul', ru: 'Кансо-гу, Сеул', kz: 'Кансо-гу, Сеул', zh: '首尔江西区', ja: 'ソウル江西区' }, doctors: 6, slug: 'immunehospital-magok' },
  { name: { ko: '신촌점', en: 'Sinchon Branch', ru: 'Синчон', kz: 'Синчон', zh: '新村分院', ja: '新村分院' }, addr: { ko: '서울 서대문구 신촌역로 17', en: 'Seodaemun-gu, Seoul', ru: 'Содэмун-гу, Сеул', kz: 'Содэмун-гу, Сеул', zh: '首尔西大门区', ja: 'ソウル西大門区' }, doctors: 4, slug: 'immunehospital-sinchon' },
  { name: { ko: '광명점', en: 'Gwangmyeong Branch', ru: 'Кванмён', kz: 'Кванмён', zh: '光明分院', ja: '光明分院' }, addr: { ko: '경기 광명시 오리로 876', en: 'Gwangmyeong, Gyeonggi', ru: 'Кванмён, Кёнги', kz: 'Кванмён, Кёнги', zh: '京畿道光明市', ja: '京畿道光明市' }, doctors: 3, slug: 'immunehospital-gwangmyeong' },
];

const CANCER_GUIDES = [
  { emoji: '🫁', type: { ko: '위암', en: 'Stomach Cancer', ru: 'Рак желудка', kz: 'Асқазан обыры', zh: '胃癌', ja: '胃がん' }, approach: { ko: '내시경 절제 · 위절제술 · 항암 → 한방 소화기능 회복', en: 'Endoscopic resection · Gastrectomy · Chemo → KM digestive recovery', ru: 'Эндоскопия · Гастрэктомия · Химиотерапия → Восстановление ЖКТ', kz: 'Эндоскопия · Гастрэктомия · Химиотерапия → АЖ қалпына келтіру', zh: '内镜切除·胃切除术·化疗→韩方消化功能恢复', ja: '内視鏡切除・胃切除術・抗がん→韓方消化機能回復' } },
  { emoji: '🩷', type: { ko: '유방암', en: 'Breast Cancer', ru: 'Рак молочной железы', kz: 'Сүт безі обыры', zh: '乳腺癌', ja: '乳がん' }, approach: { ko: '유방보존술 · 항암/호르몬 → 한방 면역·체력 회복', en: 'Breast-conserving surgery · Chemo/Hormone → KM immune & strength recovery', ru: 'Органосберегающая · Химио/Гормон → Иммунное восстановление', kz: 'Сүт безін сақтау · Химио/Гормон → Иммундық қалпына келтіру', zh: '保乳手术·化疗/激素→韩方免疫体力恢复', ja: '乳房温存術・抗がん/ホルモン→韓方免疫・体力回復' } },
  { emoji: '🫀', type: { ko: '간암', en: 'Liver Cancer', ru: 'Рак печени', kz: 'Бауыр обыры', zh: '肝癌', ja: '肝がん' }, approach: { ko: '간절제 · 색전술 · 표적항암 → 한방 간기능 보호', en: 'Hepatectomy · Embolization · Targeted therapy → KM liver protection', ru: 'Гепатэктомия · Эмболизация · Таргетная → Защита печени', kz: 'Гепатэктомия · Эмболизация · Мақсатты → Бауырды қорғау', zh: '肝切除·栓塞术·靶向治疗→韩方肝功能保护', ja: '肝切除・塞栓術・分子標的→韓方肝機能保護' } },
  { emoji: '🌬️', type: { ko: '폐암', en: 'Lung Cancer', ru: 'Рак лёгких', kz: 'Өкпе обыры', zh: '肺癌', ja: '肺がん' }, approach: { ko: '흉강경 수술 · 면역항암 → 한방 호흡기·체력 관리', en: 'VATS surgery · Immunotherapy → KM respiratory & vitality care', ru: 'ВАТС · Иммунотерапия → Респираторная поддержка', kz: 'ВАТС · Иммунотерапия → Тыныс алу қолдауы', zh: '胸腔镜手术·免疫治疗→韩方呼吸·体力管理', ja: 'VATS手術・免疫療法→韓方呼吸器・体力管理' } },
  { emoji: '🦋', type: { ko: '갑상선암', en: 'Thyroid Cancer', ru: 'Рак щитовидной железы', kz: 'Қалқанша без обыры', zh: '甲状腺癌', ja: '甲状腺がん' }, approach: { ko: '갑상선 절제 · 방사성요오드 → 한방 호르몬 균형', en: 'Thyroidectomy · Radioiodine → KM hormonal balance support', ru: 'Тиреоидэктомия · Радиойод → Гормональный баланс', kz: 'Тиреоидэктомия · Радиойод → Гормондық тепе-теңдік', zh: '甲状腺切除·放射性碘→韩方激素平衡', ja: '甲状腺切除・放射性ヨウ素→韓方ホルモンバランス' } },
  { emoji: '🎗️', type: { ko: '대장암', en: 'Colorectal Cancer', ru: 'Рак толстой кишки', kz: 'Тоқ ішек обыры', zh: '大肠癌', ja: '大腸がん' }, approach: { ko: '복강경 절제 · 항암 → 한방 장기능 회복·면역 강화', en: 'Laparoscopic resection · Chemo → KM bowel recovery & immune boost', ru: 'Лапароскопия · Химиотерапия → Восстановление кишечника', kz: 'Лапароскопия · Химиотерапия → Ішек қалпына келтіру', zh: '腹腔镜切除·化疗→韩方肠功能恢复·免疫增强', ja: '腹腔鏡切除・抗がん→韓方腸機能回復・免疫強化' } },
];

export default function HospitalsClient() {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const [partnerHospitals, setPartnerHospitals] = useState([]);

  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.['en'] || '';

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

  return (
    <div className="min-h-screen bg-white">
      {/* ── 면력한방병원 Hero ── */}
      <section className="relative bg-gradient-to-br from-emerald-800 via-teal-700 to-emerald-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-14 md:py-20">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <Award size={16} />
            {l(L.consortium.badge)}
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-3">
            {l(L.consortium.name)}
          </h1>
          <p className="text-emerald-200 text-lg font-medium mb-4">
            {l(L.consortium.role)}
          </p>
          <p className="text-white/80 text-base md:text-lg max-w-3xl leading-relaxed mb-8">
            {l(L.consortium.desc)}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/intake')}
              className="bg-white text-emerald-800 font-bold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all inline-flex items-center gap-2"
            >
              {l(L.cta)} <ArrowRight size={18} />
            </button>
            <button
              onClick={() => router.push('/hospitals/immunehospital-magok')}
              className="border-2 border-white/30 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/10 transition inline-flex items-center gap-2"
            >
              {l(L.viewDetail)} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── 분원 네트워크 ── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl md:text-2xl font-bold mb-6">{l(L.branches)}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BRANCHES.map((branch, i) => (
            <div
              key={i}
              onClick={() => router.push(`/hospitals/${branch.slug}`)}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-emerald-300 transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm group-hover:text-emerald-600 transition">{l(branch.name)}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <MapPin size={10} /> {l(branch.addr)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Users size={12} />
                <span>{branch.doctors}{l(L.doctors)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 강점 ── */}
      <section className="bg-emerald-50 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-8">{l(L.strengths.title)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {L.strengths.items.map((item, i) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <div key={i} className="bg-white rounded-2xl p-6 border border-emerald-100">
                  <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={22} className="text-emerald-700" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{l(item.title)}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{l(item.desc)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 협진 암 전문 병원 ── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl md:text-2xl font-bold mb-2">{l(L.partnerHospitals.title)}</h2>
        <p className="text-gray-500 text-sm mb-8">{l(L.partnerHospitals.desc)}</p>

        {partnerHospitals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partnerHospitals.map(h => (
              <div
                key={h.id}
                onClick={() => router.push(`/hospitals/${h.slug || h.id}`)}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-teal-300 transition cursor-pointer group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                    <Stethoscope size={20} className="text-teal-700" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm group-hover:text-teal-600 transition line-clamp-1">{h.name}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="shrink-0" />
                      <span className="truncate">{h.location}</span>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{h.description}</p>
                {h.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {h.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">협진 병원 정보를 준비 중입니다</p>
          </div>
        )}
      </section>

      {/* ── 암종별 치료 안내 (B 연결) ── */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl md:text-2xl font-bold mb-2">{l(L.cancerCare.title)}</h2>
          <p className="text-gray-500 text-sm mb-8">{l(L.cancerCare.desc)}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CANCER_GUIDES.map((guide, i) => (
              <div
                key={i}
                onClick={() => router.push('/intake')}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-teal-200 transition cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{guide.emoji}</span>
                  <h3 className="font-bold text-base group-hover:text-teal-600 transition">{l(guide.type)}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{l(guide.approach)}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-teal-600 font-medium">
                  {l(L.cta)} <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 통합 케어 CTA ── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="rounded-3xl bg-gradient-to-r from-teal-600 to-emerald-600 p-8 md:p-12 text-center text-white">
          <div className="flex justify-center gap-2 mb-4">
            <Stethoscope size={24} className="text-teal-200" />
            <span className="text-teal-200 text-lg">+</span>
            <Leaf size={24} className="text-emerald-200" />
          </div>
          <h2 className="text-xl md:text-3xl font-extrabold mb-3">
            {lang === 'ko' ? '양·한방 통합 암 케어' :
             lang === 'ru' ? 'Интегрированная онкологическая помощь' :
             lang === 'zh' ? '中西医结合肿瘤护理' :
             lang === 'ja' ? '洋・韓方統合がんケア' :
             lang === 'kz' ? 'Кешенді онкологиялық көмек' :
             'Integrated East-West Cancer Care'}
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-6">
            {lang === 'ko' ? '전문 암 병원의 수술·항암 치료와 면력한방병원의 면역 강화·사후관리를 하나의 플랫폼에서.' :
             lang === 'ru' ? 'Хирургия и химиотерапия + корейская иммунная терапия и послеоперационный уход на одной платформе.' :
             'Oncology surgery & chemotherapy from partner hospitals + Korean Medicine immune therapy & post-care from Immunehospital — all on one platform.'}
          </p>
          <button
            onClick={() => router.push('/intake')}
            className="bg-white text-teal-700 font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            {l(L.cta)} <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
