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
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useLang } from "@/lib/i18n/LangContext";

const supabase = createSupabaseBrowserClient();

// 페이지-로컬 6개어 카피(_roomCopy.js 패턴 — 중앙 사전 미수정). 핵심시장 ru·kz 포함 필수.
const COPY = {
  ko: {
    title: "원격협진 이력", subtitle: "한국 전문의와의 영상 상담 예약과 기록을 확인하세요.",
    bookQ: "새 상담을 예약하고 싶으신가요?",
    bookBefore: "원격협진은 코디네이터가 예약을 잡아드립니다. ", bookLink: "상담 신청",
    bookAfter: " 을 통해 증례 공유 후 의료진 매칭을 받으세요.",
    myInquiries: "내 문의", defaultInquiry: "상담 신청",
    step2Done: "추가 정보 제출 완료", step1Done: "기본 정보 접수",
    loading: "로딩 중...", emptyTitle: "아직 예약된 원격협진이 없습니다",
    emptyDesc: "상담 신청 → healwith 코디네이터 매칭 → 원격 영상 상담 순으로 진행됩니다.",
    emptyCta: "원격협진 안내 보기", upcoming: "다가오는 상담", past: "지난 상담",
    soon: "곧 시작", defaultSession: "상담 세션", enter: "입장",
    status: { received: "접수됨", reviewing: "검토 중", matched: "매칭 완료", completed: "완료" },
    cancer: { stomach: "위암", liver: "간암", lung: "폐암", breast: "유방암", thyroid: "갑상선암", colorectal: "대장암", pancreatic: "췌장암", other: "기타" },
  },
  en: {
    title: "Telemedicine history", subtitle: "View your video consultation bookings and records with Korean specialists.",
    bookQ: "Want to book a new consultation?",
    bookBefore: "A coordinator arranges telemedicine bookings for you. Use ", bookLink: "Inquiry",
    bookAfter: " to share your case and get matched with medical staff.",
    myInquiries: "My inquiries", defaultInquiry: "Consultation request",
    step2Done: "Additional info submitted", step1Done: "Basic info received",
    loading: "Loading...", emptyTitle: "No telemedicine sessions booked yet",
    emptyDesc: "It proceeds in order: inquiry → matching by a healwith coordinator → remote video consultation.",
    emptyCta: "View telemedicine guide", upcoming: "Upcoming", past: "Past",
    soon: "Starting soon", defaultSession: "Consultation", enter: "Join",
    status: { received: "Received", reviewing: "Reviewing", matched: "Matched", completed: "Completed" },
    cancer: { stomach: "Stomach cancer", liver: "Liver cancer", lung: "Lung cancer", breast: "Breast cancer", thyroid: "Thyroid cancer", colorectal: "Colorectal cancer", pancreatic: "Pancreatic cancer", other: "Other" },
  },
  ru: {
    title: "История телемедицины", subtitle: "Просматривайте записи и историю видеоконсультаций с корейскими специалистами.",
    bookQ: "Хотите записаться на новую консультацию?",
    bookBefore: "Координатор организует запись на телемедицину. Через ", bookLink: "Оставить заявку",
    bookAfter: " поделитесь случаем и получите подбор врача.",
    myInquiries: "Мои заявки", defaultInquiry: "Заявка на консультацию",
    step2Done: "Доп. информация отправлена", step1Done: "Основная информация принята",
    loading: "Загрузка...", emptyTitle: "Пока нет запланированных сеансов телемедицины",
    emptyDesc: "Порядок: заявка → подбор координатором healwith → видеоконсультация.",
    emptyCta: "О телемедицине", upcoming: "Предстоящие", past: "Прошедшие",
    soon: "Скоро", defaultSession: "Консультация", enter: "Войти",
    status: { received: "Принято", reviewing: "На рассмотрении", matched: "Подобрано", completed: "Завершено" },
    cancer: { stomach: "Рак желудка", liver: "Рак печени", lung: "Рак лёгкого", breast: "Рак груди", thyroid: "Рак щитовидной железы", colorectal: "Колоректальный рак", pancreatic: "Рак поджелудочной железы", other: "Другое" },
  },
  kz: {
    title: "Телемедицина тарихы", subtitle: "Корей мамандарымен бейне кеңестердің жазбалары мен тарихын қараңыз.",
    bookQ: "Жаңа кеңеске жазылғыңыз келе ме?",
    bookBefore: "Телемедицинаны үйлестіруші тағайындайды. ", bookLink: "Кеңеске өтініш",
    bookAfter: " арқылы жағдайыңызды бөлісіп, дәрігер таңдауын алыңыз.",
    myInquiries: "Менің өтініштерім", defaultInquiry: "Кеңеске өтініш",
    step2Done: "Қосымша ақпарат жіберілді", step1Done: "Негізгі ақпарат қабылданды",
    loading: "Жүктелуде...", emptyTitle: "Әзірге жоспарланған телемедицина сеанстары жоқ",
    emptyDesc: "Реті: өтініш → healwith үйлестірушісінің таңдауы → қашықтан бейне кеңес.",
    emptyCta: "Телемедицина туралы", upcoming: "Алдағы кеңестер", past: "Өткен кеңестер",
    soon: "Жақында", defaultSession: "Кеңес", enter: "Кіру",
    status: { received: "Қабылданды", reviewing: "Қаралуда", matched: "Сәйкестендірілді", completed: "Аяқталды" },
    cancer: { stomach: "Асқазан қатерлі ісігі", liver: "Бауыр қатерлі ісігі", lung: "Өкпе қатерлі ісігі", breast: "Сүт безі қатерлі ісігі", thyroid: "Қалқанша без қатерлі ісігі", colorectal: "Тоқ ішек қатерлі ісігі", pancreatic: "Ұйқы безі қатерлі ісігі", other: "Басқа" },
  },
  zh: {
    title: "远程会诊记录", subtitle: "查看您与韩国专家的视频会诊预约和记录。",
    bookQ: "想预约新的会诊吗？",
    bookBefore: "远程会诊由协调员为您安排预约。请通过", bookLink: "咨询申请",
    bookAfter: "，分享病例后获得医疗团队匹配。",
    myInquiries: "我的咨询", defaultInquiry: "咨询申请",
    step2Done: "已提交补充信息", step1Done: "已接收基本信息",
    loading: "加载中...", emptyTitle: "暂无已预约的远程会诊",
    emptyDesc: "流程：咨询申请 → healwith 协调员匹配 → 远程视频会诊。",
    emptyCta: "查看远程会诊指南", upcoming: "即将开始", past: "过往会诊",
    soon: "即将开始", defaultSession: "会诊", enter: "进入",
    status: { received: "已接收", reviewing: "审核中", matched: "已匹配", completed: "已完成" },
    cancer: { stomach: "胃癌", liver: "肝癌", lung: "肺癌", breast: "乳腺癌", thyroid: "甲状腺癌", colorectal: "结直肠癌", pancreatic: "胰腺癌", other: "其他" },
  },
  ja: {
    title: "遠隔診療の履歴", subtitle: "韓国の専門医とのビデオ相談の予約と記録を確認できます。",
    bookQ: "新しい相談を予約しますか？",
    bookBefore: "遠隔診療はコーディネーターが予約します。", bookLink: "相談を申し込む",
    bookAfter: " からケースを共有し、医療スタッフのマッチングを受けてください。",
    myInquiries: "私の問い合わせ", defaultInquiry: "相談申込",
    step2Done: "追加情報を提出済み", step1Done: "基本情報を受付",
    loading: "読み込み中...", emptyTitle: "まだ予約された遠隔診療はありません",
    emptyDesc: "流れ：相談申込 → healwith コーディネーターのマッチング → 遠隔ビデオ相談。",
    emptyCta: "遠隔診療の案内を見る", upcoming: "今後の相談", past: "過去の相談",
    soon: "まもなく開始", defaultSession: "相談セッション", enter: "入室",
    status: { received: "受付済み", reviewing: "確認中", matched: "マッチング完了", completed: "完了" },
    cancer: { stomach: "胃がん", liver: "肝臓がん", lung: "肺がん", breast: "乳がん", thyroid: "甲状腺がん", colorectal: "大腸がん", pancreatic: "膵臓がん", other: "その他" },
  },
};

const STATUS_CLS = {
  received: "bg-yellow-100 text-yellow-700",
  reviewing: "bg-blue-100 text-blue-700",
  matched: "bg-teal-100 text-teal-700",
  completed: "bg-gray-100 text-gray-600",
};

const LOCALE = { ko: "ko-KR", en: "en-US", ru: "ru-RU", kz: "kk-KZ", zh: "zh-CN", ja: "ja-JP" };

export default function PatientConsultationsClient() {
  const langCode = useLang();
  const c = COPY[langCode] || COPY.en;
  const locale = LOCALE[langCode] || "en-US";
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
        <h1 className="text-3xl font-bold text-gray-900">{c.title}</h1>
        <p className="text-gray-500 mt-2">{c.subtitle}</p>
      </div>

      {/* Info card */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-3">
        <Info size={20} className="text-teal-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-teal-900">
          <p className="font-semibold mb-1">{c.bookQ}</p>
          <p className="text-teal-800 leading-relaxed">
            {c.bookBefore}
            <Link href="/inquiry" className="underline font-medium">
              {c.bookLink}
            </Link>
            {c.bookAfter}
          </p>
        </div>
      </div>

      {/* 내 문의 — 접수한 상담 신청 내역 */}
      {!loading && inquiries.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {c.myInquiries} ({inquiries.length})
          </h2>
          <div className="space-y-3">
            {inquiries.map((q) => {
              const stKey = c.status[q.status] ? q.status : "received";
              return (
                <div
                  key={q.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">
                        {c.cancer[q.cancer_type] || q.cancer_type || c.defaultInquiry}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_CLS[stKey]}`}>
                        {c.status[stKey]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {q.created_at
                          ? new Date(q.created_at).toLocaleDateString(locale)
                          : "—"}
                      </span>
                      {q.step2_completed_at ? (
                        <span className="text-teal-700">{c.step2Done}</span>
                      ) : (
                        <span className="text-gray-400">{c.step1Done}</span>
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
        <div className="text-center py-16 text-gray-500">{c.loading}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Video size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            {c.emptyTitle}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {c.emptyDesc}
          </p>
          <Link
            href="/telemedicine"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800"
          >
            {c.emptyCta} <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {c.upcoming} ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <ConsultationCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                {c.past} ({past.length})
              </h2>
              <div className="space-y-3">
                {past.map((s) => (
                  <ConsultationCard key={s.id} session={s} past />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ConsultationCard({ session, past }) {
  const langCode = useLang();
  const c = COPY[langCode] || COPY.en;
  const locale = LOCALE[langCode] || "en-US";
  const scheduled = new Date(session.scheduled_at);
  const isToday = scheduled.toDateString() === new Date().toDateString();
  const isSoon = isToday && scheduled.getTime() - Date.now() < 30 * 60 * 1000;

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
              {session.hospitals?.name || c.defaultSession}
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
                {c.soon}
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
            {c.enter}
          </Link>
        )}
      </div>
    </div>
  );
}
