"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  Info,
} from "lucide-react";
import { useLang } from "@/lib/i18n/LangContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const supabase = createSupabaseBrowserClient();

// 언어별 로케일 (날짜·시간 표시용)
function localeOf(lang) {
  return lang === "ko"
    ? "ko-KR"
    : lang === "ru"
    ? "ru-RU"
    : lang === "kz"
    ? "kk-KZ"
    : lang === "zh"
    ? "zh-CN"
    : lang === "ja"
    ? "ja-JP"
    : "en-US";
}

// 문의 상태 라벨 — 6개 언어 + 공통 색상 클래스(cls)
const STATUS_LABELS = {
  received: {
    cls: "bg-yellow-100 text-yellow-700",
    label: { en: "Received", ko: "접수됨", ru: "Получено", kz: "Қабылданды", zh: "已接收", ja: "受付済み" },
  },
  reviewing: {
    cls: "bg-blue-100 text-blue-700",
    label: { en: "Under review", ko: "검토 중", ru: "На рассмотрении", kz: "Қаралуда", zh: "审核中", ja: "確認中" },
  },
  matched: {
    cls: "bg-teal-100 text-teal-700",
    label: { en: "Matched", ko: "매칭 완료", ru: "Подобрано", kz: "Сәйкестендірілді", zh: "匹配完成", ja: "マッチング完了" },
  },
  completed: {
    cls: "bg-gray-100 text-gray-600",
    label: { en: "Completed", ko: "완료", ru: "Завершено", kz: "Аяқталды", zh: "已完成", ja: "完了" },
  },
};

// 암종 라벨 — 6개 언어
const CANCER_LABELS = {
  stomach: { en: "Stomach cancer", ko: "위암", ru: "Рак желудка", kz: "Асқазан обыры", zh: "胃癌", ja: "胃がん" },
  liver: { en: "Liver cancer", ko: "간암", ru: "Рак печени", kz: "Бауыр обыры", zh: "肝癌", ja: "肝がん" },
  lung: { en: "Lung cancer", ko: "폐암", ru: "Рак лёгкого", kz: "Өкпе обыры", zh: "肺癌", ja: "肺がん" },
  breast: { en: "Breast cancer", ko: "유방암", ru: "Рак груди", kz: "Сүт безі обыры", zh: "乳腺癌", ja: "乳がん" },
  thyroid: { en: "Thyroid cancer", ko: "갑상선암", ru: "Рак щитовидной железы", kz: "Қалқанша без обыры", zh: "甲状腺癌", ja: "甲状腺がん" },
  colorectal: { en: "Colorectal cancer", ko: "대장암", ru: "Колоректальный рак", kz: "Тоқ ішек обыры", zh: "结直肠癌", ja: "大腸がん" },
  pancreatic: { en: "Pancreatic cancer", ko: "췌장암", ru: "Рак поджелудочной железы", kz: "Ұйқы безі обыры", zh: "胰腺癌", ja: "膵がん" },
  other: { en: "Other", ko: "기타", ru: "Другое", kz: "Басқа", zh: "其他", ja: "その他" },
};

const COPY = {
  en: {
    title: "Video consultation history",
    subtitle: "Check your scheduled and past video consultations with Korean specialists.",
    infoTitle: "Want to book a new consultation?",
    infoBodyPre: "A coordinator arranges your video consultation. Submit an ",
    infoLink: "inquiry",
    infoBodyPost: " to share your case and get matched with a medical team.",
    myInquiries: "My inquiries",
    upcoming: "Upcoming consultations",
    past: "Past consultations",
    loading: "Loading…",
    emptyTitle: "No video consultations scheduled yet",
    emptyBody: "It goes: inquiry → matched with a healwith coordinator → remote video consultation.",
    seeTelemedicine: "See video consultation guide",
    inquiryFallback: "Inquiry",
    sessionFallback: "Consultation session",
    step2Done: "Additional details submitted",
    step1Done: "Basic details received",
    startingSoon: "Starting soon",
    join: "Join",
  },
  ko: {
    title: "원격협진 이력",
    subtitle: "한국 전문의와의 영상 상담 예약과 기록을 확인하세요.",
    infoTitle: "새 상담을 예약하고 싶으신가요?",
    infoBodyPre: "원격협진은 코디네이터가 예약을 잡아드립니다. ",
    infoLink: "상담 신청",
    infoBodyPost: " 을 통해 증례 공유 후 의료진 매칭을 받으세요.",
    myInquiries: "내 문의",
    upcoming: "다가오는 상담",
    past: "지난 상담",
    loading: "로딩 중...",
    emptyTitle: "아직 예약된 원격협진이 없습니다",
    emptyBody: "상담 신청 → healwith 코디네이터 매칭 → 원격 영상 상담 순으로 진행됩니다.",
    seeTelemedicine: "원격협진 안내 보기",
    inquiryFallback: "상담 신청",
    sessionFallback: "상담 세션",
    step2Done: "추가 정보 제출 완료",
    step1Done: "기본 정보 접수",
    startingSoon: "곧 시작",
    join: "입장",
  },
  ru: {
    title: "История видеоконсультаций",
    subtitle: "Просматривайте записи и записанные видеоконсультации с корейскими специалистами.",
    infoTitle: "Хотите записаться на новую консультацию?",
    infoBodyPre: "Видеоконсультацию назначает координатор. Отправьте ",
    infoLink: "запрос на консультацию",
    infoBodyPost: ", чтобы поделиться вашим случаем и получить подбор медицинской команды.",
    myInquiries: "Мои запросы",
    upcoming: "Предстоящие консультации",
    past: "Прошедшие консультации",
    loading: "Загрузка…",
    emptyTitle: "Пока нет запланированных видеоконсультаций",
    emptyBody: "Порядок такой: запрос → подбор координатора healwith → удалённая видеоконсультация.",
    seeTelemedicine: "Узнать о видеоконсультациях",
    inquiryFallback: "Запрос на консультацию",
    sessionFallback: "Сеанс консультации",
    step2Done: "Дополнительные сведения отправлены",
    step1Done: "Основные сведения получены",
    startingSoon: "Скоро начнётся",
    join: "Войти",
  },
  kz: {
    title: "Бейнеконсультация тарихы",
    subtitle: "Корей мамандарымен өткен және жоспарланған бейнеконсультацияларды қараңыз.",
    infoTitle: "Жаңа кеңеске жазылғыңыз келе ме?",
    infoBodyPre: "Бейнеконсультацияны координатор тағайындайды. ",
    infoLink: "Кеңеске өтініш",
    infoBodyPost: " жіберіп, жағдайыңызды бөлісіңіз де, медициналық топпен сәйкестендіруді алыңыз.",
    myInquiries: "Менің өтініштерім",
    upcoming: "Алдағы кеңестер",
    past: "Өткен кеңестер",
    loading: "Жүктелуде…",
    emptyTitle: "Әзірге жоспарланған бейнеконсультация жоқ",
    emptyBody: "Реті: өтініш → healwith координаторымен сәйкестендіру → қашықтан бейнеконсультация.",
    seeTelemedicine: "Бейнеконсультация туралы білу",
    inquiryFallback: "Кеңеске өтініш",
    sessionFallback: "Кеңес сеансы",
    step2Done: "Қосымша мәліметтер жіберілді",
    step1Done: "Негізгі мәліметтер қабылданды",
    startingSoon: "Жақында басталады",
    join: "Кіру",
  },
  zh: {
    title: "远程会诊记录",
    subtitle: "查看您与韩国专科医生的视频咨询预约和记录。",
    infoTitle: "想预约新的咨询吗？",
    infoBodyPre: "远程会诊由协调员为您安排预约。请通过",
    infoLink: "咨询申请",
    infoBodyPost: "分享病例，获得医疗团队匹配。",
    myInquiries: "我的咨询",
    upcoming: "即将进行的咨询",
    past: "过往咨询",
    loading: "加载中…",
    emptyTitle: "暂无预约的远程会诊",
    emptyBody: "流程为：咨询申请 → healwith 协调员匹配 → 远程视频咨询。",
    seeTelemedicine: "查看远程会诊说明",
    inquiryFallback: "咨询申请",
    sessionFallback: "咨询会话",
    step2Done: "补充信息已提交",
    step1Done: "基本信息已接收",
    startingSoon: "即将开始",
    join: "进入",
  },
  ja: {
    title: "遠隔協診の履歴",
    subtitle: "韓国の専門医とのビデオ相談の予約と記録をご確認ください。",
    infoTitle: "新しい相談を予約しますか？",
    infoBodyPre: "遠隔協診はコーディネーターが予約を手配します。",
    infoLink: "相談申し込み",
    infoBodyPost: "から症例を共有し、医療チームのマッチングを受けてください。",
    myInquiries: "マイお問い合わせ",
    upcoming: "今後の相談",
    past: "過去の相談",
    loading: "読み込み中…",
    emptyTitle: "予約された遠隔協診はまだありません",
    emptyBody: "相談申し込み → healwith コーディネーターのマッチング → 遠隔ビデオ相談の順で進みます。",
    seeTelemedicine: "遠隔協診の案内を見る",
    inquiryFallback: "相談申し込み",
    sessionFallback: "相談セッション",
    step2Done: "追加情報の提出完了",
    step1Done: "基本情報を受付",
    startingSoon: "まもなく開始",
    join: "入室",
  },
};

export default function PatientConsultationsClient() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;

  const [sessions, setSessions] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;
        const [consultRes, inqRes] = await Promise.all([
          fetch("/api/khidi/consultation?limit=50", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/portal/my-inquiries", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const result = await consultRes.json();
        if (result.ok) setSessions(result.data || []);
        const inqResult = await inqRes.json();
        if (inqResult.ok) setInquiries(inqResult.items || []);
      } catch (err) {
        console.error("[patient/consultations]", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) =>
    ["completed", "cancelled", "no_show"].includes(s.status)
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{copy.title}</h1>
        <p className="text-gray-500 mt-2">{copy.subtitle}</p>
      </div>

      {/* Info card */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-3">
        <Info size={20} className="text-teal-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-teal-900">
          <p className="font-semibold mb-1">{copy.infoTitle}</p>
          <p className="text-teal-800 leading-relaxed">
            {copy.infoBodyPre}
            <Link href="/inquiry" className="underline font-medium">
              {copy.infoLink}
            </Link>
            {copy.infoBodyPost}
          </p>
        </div>
      </div>

      {/* 내 문의 — 접수한 상담 신청 내역 */}
      {!loading && inquiries.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {copy.myInquiries} ({inquiries.length})
          </h2>
          <div className="space-y-3">
            {inquiries.map((q) => {
              const st = STATUS_LABELS[q.status] || STATUS_LABELS.received;
              const cancerLabel = CANCER_LABELS[q.cancer_type];
              return (
                <div
                  key={q.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">
                        {(cancerLabel && (cancerLabel[lang] || cancerLabel.en)) ||
                          q.cancer_type ||
                          copy.inquiryFallback}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${st.cls}`}>
                        {st.label[lang] || st.label.en}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {q.created_at
                          ? new Date(q.created_at).toLocaleDateString(localeOf(lang))
                          : "—"}
                      </span>
                      {q.step2_completed_at ? (
                        <span className="text-teal-700">{copy.step2Done}</span>
                      ) : (
                        <span className="text-gray-400">{copy.step1Done}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">{copy.loading}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Video size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            {copy.emptyTitle}
          </h2>
          <p className="text-gray-500 text-sm mb-6">{copy.emptyBody}</p>
          <Link
            href="/telemedicine"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800"
          >
            {copy.seeTelemedicine} <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {copy.upcoming} ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <ConsultationCard key={s.id} session={s} copy={copy} lang={lang} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {copy.past} ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((s) => (
                  <ConsultationCard key={s.id} session={s} past copy={copy} lang={lang} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ConsultationCard({ session, past, copy, lang }) {
  const scheduled = new Date(session.scheduled_at);
  const isToday = scheduled.toDateString() === new Date().toDateString();
  const isSoon = isToday && scheduled.getTime() - Date.now() < 30 * 60 * 1000;
  const locale = localeOf(lang);

  return (
    <div
      className={`bg-white border rounded-2xl p-5 transition ${
        past
          ? "border-gray-200 opacity-75"
          : isSoon
          ? "border-teal-500 shadow-md"
          : "border-gray-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            past
              ? "bg-gray-100 text-gray-500"
              : isSoon
              ? "bg-teal-100 text-teal-700"
              : "bg-blue-100 text-blue-600"
          }`}
        >
          <Video size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">
              {session.hospitals?.name || copy.sessionFallback}
            </h3>
            {session.partner_doctors?.name_ko && (
              <span className="text-sm text-gray-600">
                Dr. {session.partner_doctors.name_ko}
                {session.partner_doctors.subspecialty && (
                  <span className="text-gray-400">
                    {" "}
                    · {session.partner_doctors.subspecialty}
                  </span>
                )}
              </span>
            )}
            {isSoon && (
              <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
                {copy.startingSoon}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {scheduled.toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
                weekday: "short",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {scheduled.toLocaleTimeString(locale, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {session.hospitals?.address && (
              <span className="flex items-center gap-1 text-xs truncate max-w-xs">
                <MapPin size={12} />
                {session.hospitals.address}
              </span>
            )}
          </div>
          {session.notes && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {session.notes}
            </p>
          )}
        </div>
        {!past && (
          <Link
            href={`/consultation/${session.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition flex-shrink-0"
          >
            <Phone size={16} />
            {copy.join}
          </Link>
        )}
      </div>
    </div>
  );
}
