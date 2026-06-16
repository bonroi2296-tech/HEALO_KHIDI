"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLangCodeFromCookie } from "@/lib/i18n";
import { getPartnerHospital } from "@/lib/data/partnerHospitals";
import {
  ArrowLeft, MapPin, Phone, Globe, Stethoscope,
  ChevronRight, ExternalLink, CheckCircle, Users, BedDouble,
} from "lucide-react";

export default function PartnerHospitalClient({ slug }) {
  const router = useRouter();
  const [lang, setLang] = useState("en");
  useEffect(() => { setLang(getLangCodeFromCookie()); }, []);
  const l = (obj) => obj?.[lang] || obj?.["en"] || obj?.["ko"] || "";
  const lArr = (obj) => {
    if (!obj) return [];
    const arr = obj[lang] || obj["en"] || obj["ko"];
    return Array.isArray(arr) ? arr : [];
  };

  const hospital = getPartnerHospital(slug);
  if (!hospital) return null;

  const isPartner = hospital.badge === "partner";
  const badgeClass = isPartner ? "bg-teal-500/80" : "bg-blue-500/80";
  const badgeText = l(hospital.type);

  const T = {
    about: { ko: "소개", en: "About", ru: "О больнице", zh: "介绍", ja: "紹介", kz: "Туралы" },
    specialties: { ko: "진료과목", en: "Specialties", ru: "Специализации", zh: "诊疗科目", ja: "診療科目", kz: "Мамандықтар" },
    highlights: { ko: "특장점", en: "Highlights", ru: "Преимущества", zh: "特色优势", ja: "特長", kz: "Артықшылықтар" },
    location: { ko: "위치 안내", en: "Location", ru: "Расположение", zh: "位置信息", ja: "所在地", kz: "Орналасқан жері" },
    contact: { ko: "연락처", en: "Contact", ru: "Контакты", zh: "联系方式", ja: "連絡先", kz: "Байланыс" },
    cta_title: { ko: "이 병원에 대해 상담받고 싶으신가요?", en: "Want to learn more about this hospital?", ru: "Хотите узнать больше?", zh: "想了解更多？", ja: "この病院について相談しますか？", kz: "Көбірек білгіңіз келе ме?" },
    cta_desc: { ko: "healwith를 통해 무료 사전상담을 받아보세요", en: "Get a free pre-consultation through healwith", ru: "Получите бесплатную консультацию через healwith", zh: "通过healwith获取免费预咨询", ja: "healwithで無料事前相談を受けましょう", kz: "healwith арқылы тегін кеңес алыңыз" },
    cta_btn: { ko: "상담 신청하기", en: "Request Consultation", ru: "Записаться", zh: "申请咨询", ja: "相談を申し込む", kz: "Кеңес сұрау" },
    back: { ko: "뒤로", en: "Back", ru: "Назад", zh: "返回", ja: "戻る", kz: "Артқа" },
    doctors: { ko: "명 전문의", en: " Specialists", ru: " специалистов", zh: "名专家", ja: "名の専門医", kz: " маман" },
    beds: { ko: "병상", en: " Beds", ru: " коек", zh: "张床位", ja: "床", kz: " төсек" },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative h-72 md:h-80 overflow-hidden">
        <img src={hospital.image} alt={l(hospital.name)} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition"
          >
            <ArrowLeft size={16} /> {l(T.back)}
          </button>
          <div className={`inline-block ${badgeClass} backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full mb-3`}>
            {badgeText}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white">{l(hospital.name)}</h1>
          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-3">
            {hospital.doctorCount && (
              <span className="flex items-center gap-1.5 text-white/80 text-sm">
                <Users size={14} /> {hospital.doctorCount}{l(T.doctors)}
              </span>
            )}
            {hospital.bedCount && (
              <span className="flex items-center gap-1.5 text-white/80 text-sm">
                <BedDouble size={14} /> {hospital.bedCount}{l(T.beds)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Description */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{l(T.about)}</h2>
          <p className="text-gray-600 leading-relaxed text-[15px]">{l(hospital.description)}</p>
        </div>

        {/* Highlights */}
        {hospital.highlights && lArr(hospital.highlights).length > 0 && (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle size={18} className={isPartner ? "text-teal-600" : "text-blue-600"} />
              {l(T.highlights)}
            </h2>
            <ul className="space-y-2.5">
              {lArr(hospital.highlights).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${isPartner ? "bg-teal-500" : "bg-blue-500"}`} />
                  <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specialties */}
        {hospital.specialties && lArr(hospital.specialties).length > 0 && (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope size={18} className={isPartner ? "text-teal-600" : "text-blue-600"} />
              {l(T.specialties)}
            </h2>
            <div className="flex flex-wrap gap-2">
              {lArr(hospital.specialties).map((s, i) => (
                <span key={i} className={`text-sm font-medium px-3 py-1.5 rounded-full ${
                  isPartner ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"
                }`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {hospital.address && (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-gray-500" />
              {l(T.location)}
            </h2>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-700 text-sm">{l(hospital.address)}</p>
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{l(T.contact)}</h2>
          <div className="space-y-3">
            {hospital.phone && (
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-gray-400" />
                <a href={`tel:${hospital.phone}`} className="text-teal-700 hover:underline font-medium">
                  {hospital.phone}
                </a>
              </div>
            )}
            {hospital.website && (
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-gray-400" />
                <a href={hospital.website} target="_blank" rel="noopener noreferrer"
                  className="text-teal-700 hover:underline font-medium flex items-center gap-1">
                  {hospital.website.replace(/^https?:\/\//, "")}
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className={`rounded-2xl p-6 md:p-8 text-center text-white ${
          isPartner ? "bg-gradient-to-r from-teal-600 to-teal-700" : "bg-gradient-to-r from-blue-600 to-blue-700"
        }`}>
          <h3 className="text-xl font-bold mb-2">{l(T.cta_title)}</h3>
          <p className="text-white/80 text-sm mb-5">{l(T.cta_desc)}</p>
          <button
            onClick={() => router.push("/inquiry")}
            className="bg-white text-gray-800 font-bold px-8 py-3 rounded-xl hover:bg-gray-50 transition inline-flex items-center gap-2"
          >
            {l(T.cta_btn)}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
