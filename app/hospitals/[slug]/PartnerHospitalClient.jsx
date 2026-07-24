"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/LangContext";
import { t } from "@/lib/i18n";
import { getPartnerHospital } from "@/lib/data/partnerHospitals";
import {
  ArrowLeft, MapPin, Phone, Globe, Stethoscope,
  ChevronRight, ExternalLink, CheckCircle, Users, BedDouble,
} from "lucide-react";

export default function PartnerHospitalClient({ slug }) {
  const router = useRouter();
  const lang = useLang();
  const l = (obj) => obj?.[lang] || obj?.["en"] || obj?.["ko"] || "";
  const lArr = (obj) => {
    if (!obj) return [];
    const arr = obj[lang] || obj["en"] || obj["ko"];
    return Array.isArray(arr) ? arr : [];
  };

  const hospital = getPartnerHospital(slug);
  if (!hospital) return null;

  const isPartner = hospital.badge === "partner";
  const badgeClass = isPartner ? "bg-teal-700/80" : "bg-blue-500/80";
  const badgeText = l(hospital.type);

  // 화면 문구는 중앙 사전(src/lib/i18n)의 "partnerHospital.*" 키로 이전됨 — t(key, lang)로 조회.

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
            <ArrowLeft size={16} /> {t("partnerHospital.back", lang)}
          </button>
          <div className={`inline-block ${badgeClass} backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full mb-3`}>
            {badgeText}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white">{l(hospital.name)}</h1>
          {/* Quick stats */}
          <div className="flex items-center gap-4 mt-3">
            {hospital.doctorCount && (
              <span className="flex items-center gap-1.5 text-white/80 text-sm">
                <Users size={14} /> {hospital.doctorCount}{t("partnerHospital.doctors", lang)}
              </span>
            )}
            {hospital.bedCount && (
              <span className="flex items-center gap-1.5 text-white/80 text-sm">
                <BedDouble size={14} /> {hospital.bedCount}{t("partnerHospital.beds", lang)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Description */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t("partnerHospital.about", lang)}</h2>
          <p className="text-gray-600 leading-relaxed text-[15px]">{l(hospital.description)}</p>
        </div>

        {/* Highlights */}
        {hospital.highlights && lArr(hospital.highlights).length > 0 && (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle size={18} className={isPartner ? "text-teal-700" : "text-blue-600"} />
              {t("partnerHospital.highlights", lang)}
            </h2>
            <ul className="space-y-2.5">
              {lArr(hospital.highlights).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${isPartner ? "bg-teal-700" : "bg-blue-500"}`} />
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
              <Stethoscope size={18} className={isPartner ? "text-teal-700" : "text-blue-600"} />
              {t("partnerHospital.specialties", lang)}
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
              {t("partnerHospital.location", lang)}
            </h2>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-gray-700 text-sm">{l(hospital.address)}</p>
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t("partnerHospital.contact", lang)}</h2>
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
          <h3 className="text-xl font-bold mb-2">{t("partnerHospital.ctaTitle", lang)}</h3>
          <p className="text-white/80 text-sm mb-5">{t("partnerHospital.ctaDesc", lang)}</p>
          <button
            onClick={() => router.push("/inquiry")}
            className="bg-white text-gray-800 font-bold px-8 py-3 rounded-xl hover:bg-gray-50 transition inline-flex items-center gap-2"
          >
            {t("partnerHospital.ctaBtn", lang)}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
