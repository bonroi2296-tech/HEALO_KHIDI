'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ChevronDown, Stethoscope, Leaf, Shield,
  Activity, Clock, FileText, CheckCircle,
} from 'lucide-react';
import { getLangCodeFromCookie } from '@/lib/i18n';

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
      { ko: '내시경 점막하 절제술 (ESD)', en: 'Endoscopic Submucosal Dissection (ESD)', ru: 'Эндоскопическая подслизистая диссекция (ЭПД)' },
      { ko: '복강경/로봇 위절제술', en: 'Laparoscopic/Robotic Gastrectomy', ru: 'Лапароскопическая/Роботизированная гастрэктомия' },
      { ko: '항암화학요법', en: 'Chemotherapy', ru: 'Химиотерапия' },
    ],
    eastern: [
      { ko: '소화기능 회복 한약 처방', en: 'Herbal medicine for digestive recovery', ru: 'Травяные препараты для восстановления пищеварения' },
      { ko: '항암 구역·구토 완화 침치료', en: 'Acupuncture for chemo-induced nausea relief', ru: 'Акупунктура против тошноты от химиотерапии' },
      { ko: '체중/영양 회복 면역 프로그램', en: 'Immune program for weight/nutrition recovery', ru: 'Иммунная программа для восстановления веса/питания' },
    ],
  },
  {
    emoji: '🩷', type: { ko: '유방암', en: 'Breast Cancer', ru: 'Рак молочной железы', kz: 'Сүт безі обыры', zh: '乳腺癌', ja: '乳がん' },
    koreaStrength: { ko: '유방보존술 비율 세계 최고 수준, 최소 절개 수술', en: 'World-leading breast conservation rates with minimal incision surgery', ru: 'Мировой лидер по органосберегающим операциям' },
    western: [
      { ko: '유방보존술 / 유방절제술', en: 'Breast-conserving / Mastectomy', ru: 'Органосберегающая / Мастэктомия' },
      { ko: '항암·방사선·호르몬 치료', en: 'Chemo · Radiation · Hormone therapy', ru: 'Химио · Радиотерапия · Гормональная' },
      { ko: '유방 재건 성형', en: 'Breast reconstruction', ru: 'Реконструкция молочной железы' },
    ],
    eastern: [
      { ko: '호르몬 불균형 한방 조절', en: 'KM hormonal balance management', ru: 'Регулирование гормонального баланса' },
      { ko: '림프부종 침·약침 치료', en: 'Acupuncture for lymphedema management', ru: 'Акупунктура при лимфедеме' },
      { ko: '면역력 강화 한약 처방', en: 'Immune-boosting herbal prescriptions', ru: 'Иммуностимулирующие травяные рецепты' },
    ],
  },
  {
    emoji: '🫀', type: { ko: '간암', en: 'Liver Cancer', ru: 'Рак печени', kz: 'Бауыр обыры', zh: '肝癌', ja: '肝がん' },
    koreaStrength: { ko: '간이식 성공률 세계 최고 수준, B형 간염 기반 간암 전문', en: 'World-leading liver transplant success rates, expertise in HBV-related liver cancer', ru: 'Мировой лидер по успешности трансплантации печени' },
    western: [
      { ko: '간절제술 (복강경/개복)', en: 'Hepatectomy (Laparoscopic/Open)', ru: 'Гепатэктомия (лапароскопическая/открытая)' },
      { ko: '경동맥 화학색전술 (TACE)', en: 'Transarterial Chemoembolization (TACE)', ru: 'Трансартериальная химиоэмболизация (ТАХЭ)' },
      { ko: '표적·면역 항암', en: 'Targeted · Immunotherapy', ru: 'Таргетная · Иммунотерапия' },
    ],
    eastern: [
      { ko: '간기능 보호 한약 (인진호탕 등)', en: 'Liver-protecting herbal medicine', ru: 'Травы для защиты печени' },
      { ko: '간경변 진행 억제 침치료', en: 'Acupuncture to slow cirrhosis progression', ru: 'Акупунктура для замедления цирроза' },
      { ko: '피로·황달 완화 통합 프로그램', en: 'Integrated program for fatigue/jaundice relief', ru: 'Комплексная программа от усталости/желтухи' },
    ],
  },
  {
    emoji: '🌬️', type: { ko: '폐암', en: 'Lung Cancer', ru: 'Рак лёгких', kz: 'Өкпе обыры', zh: '肺癌', ja: '肺がん' },
    koreaStrength: { ko: '흉강경(VATS) 수술 세계적 수준, 면역항암 선도 적용', en: 'World-class VATS surgery, leading immunotherapy adoption', ru: 'Мирового класса ВАТС-хирургия, ведущее применение иммунотерапии' },
    western: [
      { ko: '흉강경(VATS) / 로봇 폐절제', en: 'VATS / Robotic Lung Resection', ru: 'ВАТС / Роботизированная резекция лёгкого' },
      { ko: '면역관문억제제 치료', en: 'Immune checkpoint inhibitor therapy', ru: 'Терапия ингибиторами контрольных точек' },
      { ko: '정밀방사선 치료 (SBRT)', en: 'Stereotactic Body Radiation (SBRT)', ru: 'Стереотаксическая лучевая терапия (SBRT)' },
    ],
    eastern: [
      { ko: '호흡기능 회복 한약·침치료', en: 'Herbal medicine & acupuncture for respiratory recovery', ru: 'Травы и акупунктура для восстановления дыхания' },
      { ko: '폐 면역력 강화 약침', en: 'Pharmacopuncture for lung immune support', ru: 'Фармакопунктура для лёгочного иммунитета' },
      { ko: '항암 피로 관리 프로그램', en: 'Chemo-fatigue management program', ru: 'Программа борьбы с утомлением от химиотерапии' },
    ],
  },
  {
    emoji: '🦋', type: { ko: '갑상선암', en: 'Thyroid Cancer', ru: 'Рак щитовидной железы', kz: 'Қалқанша без обыры', zh: '甲状腺癌', ja: '甲状腺がん' },
    koreaStrength: { ko: '갑상선암 치료 경험 세계 최다, 5년 생존율 100% 근접', en: 'World\'s most thyroid cancer treatment experience, near 100% 5-year survival', ru: 'Мировой лидер по опыту лечения рака щитовидной железы' },
    western: [
      { ko: '갑상선 절제술 (로봇/내시경)', en: 'Thyroidectomy (Robotic/Endoscopic)', ru: 'Тиреоидэктомия (роботизированная/эндоскопическая)' },
      { ko: '방사성요오드 치료', en: 'Radioactive Iodine Therapy', ru: 'Терапия радиоактивным йодом' },
      { ko: 'TSH 억제 요법', en: 'TSH Suppression Therapy', ru: 'Терапия подавления ТТГ' },
    ],
    eastern: [
      { ko: '갑상선 호르몬 균형 한방 조절', en: 'KM thyroid hormone balance management', ru: 'Корейская регуляция гормонов щитовидной железы' },
      { ko: '수술 후 성대·목 회복 침치료', en: 'Acupuncture for post-surgery voice/neck recovery', ru: 'Акупунктура для восстановления голоса после операции' },
      { ko: '면역력 유지 한약 처방', en: 'Immune-maintenance herbal prescriptions', ru: 'Иммуноподдерживающие травяные рецепты' },
    ],
  },
  {
    emoji: '🎗️', type: { ko: '대장암', en: 'Colorectal Cancer', ru: 'Рак толстой кишки', kz: 'Тоқ ішек обыры', zh: '大肠癌', ja: '大腸がん' },
    koreaStrength: { ko: '복강경 대장암 수술 세계 최다 경험, 높은 항문보존률', en: 'World\'s most laparoscopic colorectal surgeries, high anal preservation rate', ru: 'Мировой лидер по лапароскопическим операциям, высокий процент сохранения сфинктера' },
    western: [
      { ko: '복강경/로봇 대장절제', en: 'Laparoscopic/Robotic Colectomy', ru: 'Лапароскопическая/Роботизированная колэктомия' },
      { ko: '항암화학요법 (FOLFOX 등)', en: 'Chemotherapy (FOLFOX, etc.)', ru: 'Химиотерапия (FOLFOX и др.)' },
      { ko: '표적항암 (세툭시맙 등)', en: 'Targeted therapy (Cetuximab, etc.)', ru: 'Таргетная терапия (Цетуксимаб и др.)' },
    ],
    eastern: [
      { ko: '장기능 회복 한약 처방', en: 'Herbal medicine for bowel function recovery', ru: 'Травы для восстановления функции кишечника' },
      { ko: '항암 설사·복통 완화 침치료', en: 'Acupuncture for chemo diarrhea/pain relief', ru: 'Акупунктура от диареи/болей при химиотерапии' },
      { ko: '체력·면역 강화 통합 프로그램', en: 'Integrated strength & immune enhancement', ru: 'Комплексная программа укрепления сил и иммунитета' },
    ],
  },
];

const PROCESS_STEPS = [
  { icon: FileText, label: { ko: '인테이크 접수', en: 'Intake Submission', ru: 'Подача заявки' }, desc: { ko: '암종·병기·치료이력 입력', en: 'Cancer type, stage & history', ru: 'Тип рака, стадия, история' } },
  { icon: Stethoscope, label: { ko: '양방 전문의 매칭', en: 'Oncologist Matching', ru: 'Подбор онколога' }, desc: { ko: 'AI 기반 최적 전문의 추천', en: 'AI-powered specialist recommendation', ru: 'ИИ-подбор специалиста' } },
  { icon: Activity, label: { ko: '화상 사전상담', en: 'Video Pre-consultation', ru: 'Видеоконсультация' }, desc: { ko: '실시간 통역 화상 상담', en: 'Video consultation with live interpretation', ru: 'Видео с синхронным переводом' } },
  { icon: Leaf, label: { ko: '한방 통합 케어', en: 'KM Integrated Care', ru: 'Интегрированный уход' }, desc: { ko: '면역강화·부작용 관리', en: 'Immune boost & side-effect care', ru: 'Укрепление иммунитета' } },
  { icon: Shield, label: { ko: '사후관리', en: 'Post-care', ru: 'Послеоперационный уход' }, desc: { ko: '증상 추적·재진 예약', en: 'Symptom tracking & follow-up', ru: 'Отслеживание симптомов' } },
];

export default function TreatmentsClient() {
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const [expandedIdx, setExpandedIdx] = useState(-1);

  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.['en'] || obj?.['ko'] || '';

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-700 text-white py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{l(TREATMENTS_L.title)}</h1>
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto">{l(TREATMENTS_L.subtitle)}</p>
        </div>
      </section>

      {/* Process */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-center mb-8">{l(TREATMENTS_L.processTitle)}</h2>
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
                  <div className="text-xs text-gray-400">{l(step.desc)}</div>
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
                        <p className="text-xs text-teal-600 font-medium mt-0.5">{l(cancer.koreaStrength)}</p>
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
                          <Leaf size={16} className="text-emerald-600" />
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition text-sm font-semibold"
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
          className="bg-teal-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:bg-teal-700 hover:shadow-xl hover:scale-105 transition-all inline-flex items-center gap-2"
        >
          {l(TREATMENTS_L.cta)} <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}
