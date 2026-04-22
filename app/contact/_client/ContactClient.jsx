"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLangCodeFromCookie } from "../../../src/lib/i18n";

/* ─── 연락 채널 ─── */
const CHANNELS = [
  {
    id: "phone-main",
    icon: "📞",
    label: { ko: "대표 전화", en: "Main Phone", ru: "Основной телефон", kz: "Негізгі телефон" },
    value: "070-7500-7795",
    href: "tel:07075007795",
    note: { ko: "국내 전화", en: "Korea domestic", ru: "Внутренний номер", kz: "Ел ішіндегі" },
  },
  {
    id: "phone-intl",
    icon: "🌏",
    label: { ko: "국제 전화", en: "International", ru: "Международный", kz: "Халықаралық" },
    value: "+82 10 4772 1075",
    href: "tel:+821047721075",
    note: { ko: "카자흐스탄·러시아·CIS 가능", en: "Reachable from KZ / RU / CIS", ru: "Доступно из КЗ / РФ / СНГ", kz: "ҚЗ / РФ / ТМД қолжетімді" },
  },
  {
    id: "email",
    icon: "✉️",
    label: { ko: "이메일", en: "Email", ru: "Эл. почта", kz: "Электрондық пошта" },
    value: "healo.consult@gmail.com",
    href: "mailto:healo.consult@gmail.com",
    note: { ko: "영업일 1일 이내 답변", en: "Reply within 1 business day", ru: "Ответ в течение 1 рабочего дня", kz: "1 жұмыс күні ішінде жауап" },
  },
  {
    id: "kakao",
    icon: "💬",
    label: { ko: "카카오톡", en: "KakaoTalk", ru: "KakaoTalk", kz: "KakaoTalk" },
    value: "@healo",
    href: "https://pf.kakao.com/_healo",
    note: { ko: "채널 추가 후 메시지", en: "Add channel & message", ru: "Добавьте канал", kz: "Арнаны қосып хабарлама жіберіңіз" },
  },
];

/* ─── 문의 유형 가이드 ─── */
const INQUIRY_TYPES = [
  {
    icon: "🩺",
    title: { ko: "환자 문의", en: "Patient Inquiry", ru: "Запрос пациента", kz: "Пациент сұрауы" },
    desc: { ko: "진단서·CT 파일 지참 후 인테이크 폼 이용을 권장합니다. 코디네이터가 치료 옵션을 안내드립니다.", en: "We recommend using the intake form with your medical records. A coordinator will guide treatment options.", ru: "Рекомендуем использовать форму с медицинскими документами. Координатор проконсультирует.", kz: "Медициналық құжаттармен формаға жүгінуді ұсынамыз. Үйлестіруші бағдарлайды." },
    link: { href: "/intake", label: { ko: "인테이크 폼 →", en: "Intake form →", ru: "Форма →", kz: "Форма →" } },
  },
  {
    icon: "🤝",
    title: { ko: "파트너십 / 병원 제휴", en: "Partnership / Hospital", ru: "Партнёрство / Больница", kz: "Серіктестік / Аурухана" },
    desc: { ko: "파트너 병원 등록, 의뢰 협약, 코디네이터 네트워크 제안 등 이메일로 문의 주세요.", en: "For hospital registration, referral agreements, or coordinator network proposals, please email us.", ru: "Для регистрации больниц, соглашений о направлении — напишите на почту.", kz: "Аурухананы тіркеу, жолдама келісімдері — электрондық пошта арқылы хабарласыңыз." },
    link: { href: "mailto:healo.consult@gmail.com", label: { ko: "이메일 보내기 →", en: "Send email →", ru: "Написать →", kz: "Хат жіберу →" } },
  },
  {
    icon: "📰",
    title: { ko: "언론 / 보도 문의", en: "Press Inquiry", ru: "Пресса", kz: "Баспасөз" },
    desc: { ko: "HEALO 관련 취재·인터뷰·협업은 이메일(healo.consult@gmail.com) 으로 보내주세요.", en: "For press coverage or interviews, reach us at healo.consult@gmail.com.", ru: "Для прессы и интервью пишите на healo.consult@gmail.com.", kz: "Баспасөз сұраулары: healo.consult@gmail.com." },
    link: null,
  },
  {
    icon: "💡",
    title: { ko: "일반 문의", en: "General Inquiry", ru: "Общий запрос", kz: "Жалпы сұрақ" },
    desc: { ko: "서비스·비용·절차에 관한 궁금증은 온라인 문의 폼을 이용해 주세요.", en: "Questions about services, costs, or process — use our online inquiry form.", ru: "Вопросы об услугах, стоимости, процессе — используйте форму.", kz: "Қызметтер, шығындар, процесс туралы — онлайн форманы пайдаланыңыз." },
    link: { href: "/inquiry", label: { ko: "온라인 문의 →", en: "Online inquiry →", ru: "Онлайн запрос →", kz: "Онлайн сұрақ →" } },
  },
];

const l = (map, lang) => map[lang] || map["en"] || map["ko"] || "";

export default function ContactClient() {
  const [lang, setLang] = useState("en");
  useEffect(() => {
    setLang(getLangCodeFromCookie() || "en");
  }, []);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* ── HERO ── */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", color: "#fff", padding: "64px 24px 56px" }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>
            HEALO · Contact
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, lineHeight: 1.15, margin: "0 0 16px" }}>
            {l({ ko: "코디네이터와 연결하세요", en: "Connect with a coordinator.", ru: "Свяжитесь с координатором.", kz: "Үйлестірушімен байланысыңыз." }, lang)}
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "rgba(255,255,255,0.8)", maxWidth: "38rem" }}>
            {l({ ko: "선호 언어로 영업일 기준 하루 안에 답변드립니다. 전화, 이메일, 카카오톡 중 편한 방법으로 연락하세요.", en: "We reply within 1 business day in your preferred language — phone, email, or KakaoTalk.", ru: "Отвечаем в течение 1 рабочего дня на вашем языке.", kz: "Сіздің тіліңізде 1 жұмыс күні ішінде жауап береміз." }, lang)}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0 24px 80px" }}>

        {/* ── 채널 카드 ── */}
        <div style={{ marginTop: "-28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {CHANNELS.map((ch) => (
            <a
              key={ch.id}
              href={ch.href}
              target={ch.href.startsWith("http") ? "_blank" : undefined}
              rel={ch.href.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "24px 20px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                textDecoration: "none",
                color: "#1e293b",
                display: "block",
                border: "1px solid #e2e8f0",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(13,148,136,0.18)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = ""; }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>{ch.icon}</div>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0d9488", marginBottom: 6 }}>
                {l(ch.label, lang)}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a", marginBottom: 6, wordBreak: "break-all" }}>
                {ch.value}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.5 }}>
                {l(ch.note, lang)}
              </div>
            </a>
          ))}
        </div>

        {/* ── 영업시간 + 주소 ── */}
        <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 20px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0d9488", marginBottom: 10 }}>
              {l({ ko: "영업시간", en: "Business Hours", ru: "Часы работы", kz: "Жұмыс уақыты" }, lang)}
            </div>
            <p style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
              {l({ ko: "월–금 09:00–18:00 KST", en: "Mon–Fri 09:00–18:00 KST", ru: "Пн–Пт 09:00–18:00 KST", kz: "Дс–Жм 09:00–18:00 KST" }, lang)}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              {l({ ko: "한국 공휴일 제외", en: "Excluding Korean public holidays", ru: "Исключая корейские праздники", kz: "Корей мерекелерін қоспағанда" }, lang)}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 8 }}>
              {l({ ko: "긴급 상황은 이메일 / 카카오톡으로 24시간 접수 가능", en: "Urgent cases: email or KakaoTalk accepted 24/7", ru: "Срочные случаи: почта / KakaoTalk 24/7", kz: "Шұғыл жағдайлар: пошта / KakaoTalk 24/7" }, lang)}
            </p>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 20px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0d9488", marginBottom: 10 }}>
              {l({ ko: "사무실 주소", en: "Office Address", ru: "Адрес офиса", kz: "Кеңсе мекенжайы" }, lang)}
            </div>
            <p style={{ fontWeight: 600, color: "#1e293b", lineHeight: 1.6 }}>
              {l({ ko: "서울특별시 강서구 강서로 385, 613호", en: "Room 613, 385 Gangseo-ro, Gangseo-gu, Seoul", ru: "Сеул, Кансо-гу, 385 Кансо-ро, 613", kz: "Сеул, Кансо-гу, 385 Кансо-ро, 613" }, lang)}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#64748b" }}>
              {l({ ko: "(마곡동, 우성에스비타워)", en: "(Magok-dong, Woosung SB Tower)", ru: "(Магок-дон, Bldg Woosung SB)", kz: "(Магок-дон, Woosung SB)" }, lang)}
            </p>
          </div>
        </div>

        {/* ── 국제 전화 안내 ── */}
        <div style={{ marginTop: 24, background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontWeight: 700, color: "#0f766e", fontSize: "0.875rem", marginBottom: 6 }}>
            📡 {l({ ko: "국제 전화 안내", en: "International Calling Guide", ru: "Международный звонок", kz: "Халықаралық қоңырау нұсқаулығы" }, lang)}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#134e4a", lineHeight: 1.7 }}>
            {l({ ko: "카자흐스탄 → 한국: 007 (또는 국제코드) + 82 + 10-4772-1075. 국내 070 번호는 VoIP 전용이므로 해외에서 직접 다이얼이 안 될 수 있습니다.", en: "From Kazakhstan/Russia: dial +82 10 4772 1075. The 070 number is Korea-domestic VoIP only.", ru: "Из Казахстана/России: +82 10 4772 1075. Номер 070 — внутренний VoIP Кореи.", kz: "Қазақстаннан: +82 10 4772 1075. 070 нөмірі Корея ішіндегі VoIP." }, lang)}
          </p>
        </div>

        {/* ── 문의 유형별 가이드 ── */}
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: 20 }}>
            {l({ ko: "문의 유형별 안내", en: "Inquiry Guide by Type", ru: "Руководство по типу запроса", kz: "Сұрақ түрі бойынша нұсқаулық" }, lang)}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {INQUIRY_TYPES.map((item, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 20px" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.25rem", lineHeight: 1, marginTop: 2 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9375rem", marginBottom: 6 }}>
                      {l(item.title, lang)}
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "#475569", lineHeight: 1.65, margin: 0 }}>
                      {l(item.desc, lang)}
                    </p>
                    {item.link && (
                      <a href={item.link.href} style={{ display: "inline-block", marginTop: 10, fontSize: "0.8125rem", fontWeight: 600, color: "#0d9488", textDecoration: "none" }}>
                        {l(item.link.label, lang)}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 법인 정보 ── */}
        <div style={{ marginTop: 48, padding: "24px 20px", background: "#1e293b", borderRadius: 16, color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", lineHeight: 1.8 }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2dd4bf", marginBottom: 12 }}>
            {l({ ko: "법인 정보", en: "Legal Entity", ru: "Юридическое лицо", kz: "Заңды тұлға" }, lang)}
          </div>
          <p style={{ margin: 0 }}>
            {l({ ko: "상호: 본로이 (BONROI) · 개인사업자 | 대표자: 강주영 | 사업자등록번호: 463-35-00902", en: "Trade name: BONROI · Sole proprietorship | Representative: JUYOUNG KANG | Biz. Reg. 463-35-00902", ru: "BONROI · ИП | Представитель: JUYOUNG KANG | Рег. 463-35-00902", kz: "BONROI · ЖК | Өкіл: JUYOUNG KANG | Рег. 463-35-00902" }, lang)}
            <br />
            {l({ ko: "외국인환자 유치업자: A-2026-01-02-06761 (서울)", en: "Intl. Patient Facilitator: A-2026-01-02-06761 (Seoul)", ru: "Организатор лечения: A-2026-01-02-06761 (Сеул)", kz: "Халықаралық пациент: A-2026-01-02-06761 (Сеул)" }, lang)}
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
            <Link href="/privacy" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "0.75rem" }}>
              {l({ ko: "개인정보처리방침", en: "Privacy Policy", ru: "Конфиденциальность", kz: "Құпиялылық саясаты" }, lang)}
            </Link>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <Link href="/terms" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: "0.75rem" }}>
              {l({ ko: "이용약관", en: "Terms", ru: "Условия", kz: "Шарттар" }, lang)}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
