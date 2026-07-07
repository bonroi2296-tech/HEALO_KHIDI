"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LangContext";

const COPY = {
  title: { ko: "비자 (Medical Visa)", en: "Medical Visa", ru: "Медицинская виза", kz: "Медициналық виза", zh: "医疗签证", ja: "医療ビザ" },
  subtitle: {
    ko: "healwith 코디네이터가 초청장 발급부터 대사관 제출까지 동행합니다.",
    en: "A healwith coordinator supports you from the invitation letter to embassy submission.",
    ru: "Координатор healwith сопровождает вас от приглашения до подачи в посольство.",
    kz: "healwith үйлестірушісі шақыру хатынан елшілікке тапсыруға дейін қасыңызда болады.",
    zh: "healwith协调员将全程陪同您，从邀请函到大使馆递交。",
    ja: "healwithコーディネーターが招待状の発行から大使館提出まで同行します。",
  },
  myAppsKicker: { ko: "My Applications", en: "My Applications", ru: "Мои заявки", kz: "Менің өтінімдерім", zh: "我的申请", ja: "申請一覧" },
  myAppsTitle: { ko: "내 비자 신청", en: "My visa applications", ru: "Мои заявки на визу", kz: "Виза өтінімдерім", zh: "我的签证申请", ja: "ビザ申請" },
  myAppsDesc: {
    ko: "진행 상태 확인, 서류 업로드, 초청장 다운로드",
    en: "Track status, upload documents, download invitation letters",
    ru: "Отслеживание статуса, загрузка документов, скачивание приглашения",
    kz: "Мәртебені бақылау, құжат жүктеу, шақыру хатын жүктеп алу",
    zh: "查看进度、上传文件、下载邀请函",
    ja: "進捗確認・書類アップロード・招待状ダウンロード",
  },
  myAppsCta: { ko: "신청 관리 →", en: "Manage applications →", ru: "Управление заявками →", kz: "Өтінімдерді басқару →", zh: "管理申请 →", ja: "申請を管理 →" },
  guideKicker: { ko: "Guide", en: "Guide", ru: "Справка", kz: "Нұсқаулық", zh: "指南", ja: "ガイド" },
  guideTitle: { ko: "비자 종류 안내", en: "Visa types guide", ru: "Виды виз", kz: "Виза түрлері", zh: "签证类型指南", ja: "ビザの種類" },
  guideDesc: {
    ko: "C-3-3, G-1-10 비자 정보와 필요 서류 체크리스트",
    en: "C-3-3, G-1-10 visa info and the required-document checklist",
    ru: "Информация о визах C-3-3, G-1-10 и чек-лист документов",
    kz: "C-3-3, G-1-10 виза туралы ақпарат және қажетті құжаттар тізімі",
    zh: "C-3-3、G-1-10签证信息及所需文件清单",
    ja: "C-3-3・G-1-10ビザ情報と必要書類チェックリスト",
  },
  guideCta: { ko: "가이드 보기 →", en: "View guide →", ru: "Смотреть гид →", kz: "Нұсқаулықты қарау →", zh: "查看指南 →", ja: "ガイドを見る →" },
};

export default function VisaHubClient() {
  const lang = useLang();
  const t = (o) => o?.[lang] || o?.en || "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t(COPY.title)}</h1>
      <p className="text-gray-500 mt-2 text-sm">{t(COPY.subtitle)}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
        <Link
          href="/patient/visa/applications"
          className="block border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">{t(COPY.myAppsKicker)}</div>
          <h2 className="text-xl font-medium mt-2">{t(COPY.myAppsTitle)}</h2>
          <p className="text-sm text-gray-600 mt-2">{t(COPY.myAppsDesc)}</p>
          <span className="text-sm text-black mt-4 inline-block">{t(COPY.myAppsCta)}</span>
        </Link>

        <Link
          href="/visa"
          className="block border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">{t(COPY.guideKicker)}</div>
          <h2 className="text-xl font-medium mt-2">{t(COPY.guideTitle)}</h2>
          <p className="text-sm text-gray-600 mt-2">{t(COPY.guideDesc)}</p>
          <span className="text-sm text-black mt-4 inline-block">{t(COPY.guideCta)}</span>
        </Link>
      </div>
    </div>
  );
}
