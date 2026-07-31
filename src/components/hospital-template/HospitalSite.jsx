"use client";

/**
 * 병원 사이트 「판」 v1 — B2B 로 병원에 찍어낼 템플릿.
 *
 * ⚠️ **healwith 사이트가 아니다.** 재사용이 아니라 별도 제품이다.
 *   · healwith = 중개자 → "왜 한국인가"(국가를 팔고 병원을 연결) · DESIGN.md teal 톤
 *   · 이 판     = 병원 본인 → "왜 우리인가"(경력·실적·의료진·인증) · 아래 자체 톤
 *   PO 지시(2026-07-28): "힐위드 포맷으로 하지 말고 외국인이 좋아하는 요즘 스타일로."
 *
 * 구조는 해외 환자용 병원 사이트의 사실상 표준을 따랐다(dekabi.com 실측 + 업계 통례):
 *   히어로 → 신뢰 숫자 → 진료 분야 → 왜 우리인가 → 의료진 → 프로그램
 *   → 후기 → 인증 → FAQ → 마무리 CTA, 그리고 **상담 버튼이 계속 따라다닌다.**
 *
 * 톤 (healwith 와 의도적으로 다르게):
 *   · 바탕 = 따뜻한 화이트(모래빛)  ← healwith 는 순백 + teal
 *   · 강조 = 딥 포레스트 그린        ← healwith 는 teal-600
 *   · 제목 = 세리프                  ← healwith 는 전부 산세리프
 *   · 섹션 라벨 = 작은 대문자 + 넓은 자간 (해외 의료 사이트의 관용구)
 *
 * 데이터: `src/lib/tenant/siteSchema.js` 형태. 빈 칸이면 그 블록을 통째로 안 그린다
 *        (자리표시자를 넣으면 그 글자가 화면에 뜬다 — 2026-07-28 에 실제로 겪음).
 */

import { useState } from "react";
import Image from "next/image";
import { HospitalHeader, HospitalFooter } from "./HospitalChrome";
import QuickRail, { AnnouncementBar, MobileBar } from "./QuickRail";
import TreatmentMenu from "./TreatmentMenu";
import InquiryForm from "./InquiryForm";
import { Reveal, SnapRow } from "./motion";

// 판 기본 강조색. 병원마다 `brand.accent` 로 덮어쓴다 — 색은 판이 정하는 게 아니라
// **그 병원 로고에서 뽑는다**(면력은 로고 SVG 에서 #003D66 이 66회 나왔다).
const FALLBACK_ACCENT = "#0F3D2E";

/* 다국어 값 꺼내기: 문자열이면 그대로, 언어맵이면 그 언어 → en → 첫 값. */
const pick = (v, lang) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.en || Object.values(v)[0] || "";
};

const has = (arr) => Array.isArray(arr) && arr.length > 0;

/* 섹션 라벨 — 작은 대문자 + 넓은 자간. 해외 의료 사이트의 관용 표현. */
function Eyebrow({ children, accent }) {
  if (!children) return null;
  return (
    <p
      className="text-[11px] md:text-xs font-semibold uppercase mb-3"
      style={{ letterSpacing: "0.18em", color: accent }}
    >
      {children}
    </p>
  );
}

/* 세로 여백을 섹션마다 다르게 줄 수 있게 한다.
   왜: 모든 섹션이 같은 py 값이면 스크롤 속도가 일정해져 «표 안에 든 화면»으로 읽힌다.
   상위 사이트는 숨 쉬는 자리(loose)와 몰아치는 자리(tight)를 섞는다 — 그게 리듬이다. */
const PAD = {
  tight: "py-12 md:py-16",
  normal: "py-16 md:py-24",
  loose: "py-24 md:py-36",
};

function Section({ id, children, tone = "light", className = "", darkTone, pad = "normal" }) {
    const bg = tone === "sand" ? "bg-[#F4EFE7]" : tone === "ink" ? "" : "bg-[#FBF8F3]";
  const style = tone === "ink" ? { backgroundColor: darkTone || "#0C2233" } : undefined;
  return (
    <section id={id} className={`${bg} ${PAD[pad] || PAD.normal} ${className}`} style={style}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">{children}</div>
    </section>
  );
}

function Heading({ children, tone = "dark", size = "lg" }) {
  const color = tone === "light" ? "text-white" : "text-[#16211C]";
  const cls = size === "xl" ? "text-4xl md:text-6xl" : "text-3xl md:text-5xl";
  return (
    <h2 className={`${cls} ${color} font-semibold leading-[1.08]`} style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "-0.025em" }}>
      {children}
    </h2>
  );
}

/* 섹션 머리(라벨 + 제목).
   ⚠️ 이걸 컴포넌트로 뽑은 이유는 «중복 제거»가 아니라 **정렬을 섹션마다 바꾸기 위해서**다.
   모든 섹션이 왼쪽 좁은 칸에서 시작하면 눈이 한 줄만 따라가게 되고, 그게 PO 가 말한
   「틀에 박힌 톤」의 정체였다. 가운데 정렬을 섞으면 같은 내용도 다른 화면으로 읽힌다. */
function SectionHead({ eyebrow, title, lead, accent, align = "left", tone = "dark" }) {
  const center = align === "center";
  return (
    <Reveal className={`mb-12 md:mb-16 ${center ? "max-w-2xl mx-auto text-center" : "max-w-2xl"}`}>
      <Eyebrow accent={accent}>{eyebrow}</Eyebrow>
      <Heading tone={tone}>{title}</Heading>
      {lead && (
        <p className={`mt-5 text-[15px] md:text-base leading-relaxed ${tone === "light" ? "text-white/60" : "text-black/50"}`}>
          {lead}
        </p>
      )}
    </Reveal>
  );
}

export default function HospitalSite({ site, lang = "en", onInquiry, basePath = "" }) {
  const [openFaq, setOpenFaq] = useState(null);
  if (!site) return null;

  const t = (v) => pick(v, lang);
  const accent = site.brand?.accent || FALLBACK_ACCENT;
  // 어두운 면(신뢰 숫자 바·후기·마무리·푸터)은 강조색을 깊게 눌러 만든다.
  // 고정 색을 쓰면 어느 병원이든 같은 검정이 되어 «판 티»가 난다.
  const darkTone = site.brand?.darkTone || "#0C2233";

  return (
    <div className="bg-[#FBF8F3] text-[#16211C] antialiased pb-[52px] sm:pb-0">
      {/* 맨 위 공지 띠 — 「지금 무슨 일이 있나」. 유앤아이의원이 확장 오픈을 여기에 건다.
          해외 환자용으로는 «이번 달 통역·항공 안내» 같은 게 이 자리다. 값 없으면 안 뜬다. */}
      <AnnouncementBar text={t(site.announcement?.text)} href={site.announcement?.href} darkTone={darkTone} />

      {/* 헤더는 속 페이지와 공용(HospitalChrome) — 홈만 다른 헤더면 «다른 사이트»로 읽힌다. */}
      <HospitalHeader site={site} lang={lang} accent={accent} onInquiry={onInquiry} basePath={basePath} />

      {/* ══ 섹션 순서 — 위쪽은 「보는 것」, 아래쪽은 「읽는 것」 (2026-07-31 2차 조정) ══

          1차(07-30): 영상 15개가 9,889px(66% 아래)에 묻혀 있어 PO 가 «영상 쓴다고 했잖아»라고 물었다.
                      → 영상·사진을 위로 올렸다.
          2차(07-31): 그 과정에서 **「주요 치료 프로그램」이 8,484px 까지 밀렸다.** PO 가 «수액실이
                      어느 페이지에 있냐»고 물었는데, 못 찾은 게 아니라 **너무 아래에 있었다.**
                      병원 사이트에서 「여기서 뭘 받나」는 핵심 질문이라 뒤에 두면 안 된다.

          지금 순서: 히어로 → 숫자 → 영상 → 진료 분야(3센터) → **치료 프로그램** → 갤러리 → 큰 사진 띠
                    → 치료 메뉴(가격 자세히) → 하루 → 의료진 → 왜 우리인가 → 지점 → 후기 → 인증 → FAQ → 상담

          왜 이 짜임인가:
            · 「무엇을 다루나(3센터)」 바로 다음에 「무엇을 받나(치료 프로그램)」가 온다 — 한 질문의 두 조각이다.
            · 그 뒤에 사진(갤러리·큰 사진 띠)으로 한 번 쉬고, 그다음이 «자세히·가격»(치료 메뉴)이다.
              가격표를 앞에 두면 «파는 사이트»가 되고, 너무 뒤에 두면 못 찾는다.
            · 아래쪽 절반은 읽는 것(왜 우리인가·연혁·FAQ).

          주의 1: 글자 덩어리를 위로 올리지 마라. 해외 환자는 한국어를 못 읽는다 —
                 영상·사진은 언어가 필요 없고 글자는 필요하다.
          주의 2: 이 순서는 `hospitalSiteOrder.test.ts` 가 지킨다.
          주의 3: JSX 안의 주석은 반드시 중괄호로 감싼다(안 감싸서 화면에 글자로 뜬 적 있다, 07-30). ══ */}

      {/* ══ 히어로 — 좌우 분할 ══
          ⚠️ 처음엔 «사진 전면 + 어두운 오버레이 + 흰 글자»로 만들었는데 PO 지적: "너무 AI 톤".
             맞는 지적이었다. 그 조합은 스톡 사진을 아무거나 깔아도 그럴듯해 보이는 형태라
             **어느 병원이든 똑같아 보인다** = 템플릿 냄새의 정체.
             실제 병원 사진(로비·시설)은 밝고 따뜻해서 어둡게 덮으면 그 병원다움이 통째로 죽는다.
             → 사진을 덮지 않고 **옆에 그대로 세운다.** 글자는 병원 인테리어 톤의 배경 위에 앉는다. */}
      <section className="grid lg:grid-cols-[1.05fr_1fr] items-stretch">
        <div className="flex items-center px-5 md:px-10 lg:pl-[max(2rem,calc((100vw-72rem)/2+2rem))] lg:pr-14 py-16 md:py-24 lg:py-28">
          <div className="max-w-xl">
            {t(site.hero?.eyebrow) && (
              <Reveal
                as="p"
                y={12}
                className="text-[11px] md:text-xs font-semibold uppercase mb-5"
                style={{ letterSpacing: "0.2em", color: accent }}
              >
                {t(site.hero.eyebrow)}
              </Reveal>
            )}
            {/* 글자 크기를 «압도하는» 급으로 올렸다 — 유니성형외과 실측 최대 100px, 내 판은 48px 이었다.
                큰 글자에는 음수 자간(-0.03em)이 붙어야 덩어리로 읽힌다(요즘 타이포의 기본 문법). */}
            <Reveal
              as="h1"
              delay={80}
              className="text-[2.6rem] leading-[1.08] sm:text-6xl md:text-[4.5rem] md:leading-[1.02] font-semibold whitespace-pre-line text-[#16211C]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "-0.03em" }}
            >
              {t(site.hero?.title)}
            </Reveal>
            {t(site.hero?.subtitle) && (
              <Reveal as="p" delay={180} className="mt-6 text-black/60 text-base md:text-lg leading-relaxed whitespace-pre-line">
                {t(site.hero.subtitle)}
              </Reveal>
            )}
            <Reveal delay={280} className="mt-9 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onInquiry}
                className="px-8 py-4 rounded-full text-white text-base font-medium transition-transform hover:scale-[1.02] shadow-lg"
                style={{ backgroundColor: accent }}
              >
                {t(site.hero?.primaryCta) || "Consult Now"}
              </button>
              {t(site.hero?.secondaryCta) && (
                <a
                  href={site.contact?.channels?.whatsapp || "#contact"}
                  className="px-8 py-4 rounded-full border text-base font-medium text-center transition-colors hover:bg-black/[0.03]"
                  style={{ borderColor: `${accent}33`, color: accent }}
                >
                  {t(site.hero.secondaryCta)}
                </a>
              )}
            </Reveal>
          </div>
        </div>
        {site.hero?.image && (
          <div className="relative min-h-[42vh] lg:min-h-[86vh]">
            <Image
              src={site.hero.image}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        )}
      </section>

      {/* ══ 신뢰 숫자 — 히어로 바로 아래(의료관광 사이트의 사실상 표준) ══ */}
      {has(site.proof) && (
        <div style={{ backgroundColor: darkTone }}>
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14 grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
            {site.proof.map((p, i) => (
              <Reveal key={i} delay={i * 90} y={16} className="text-center md:border-r md:last:border-r-0 border-white/12 px-2">
                <div
                  className="text-2xl md:text-4xl font-semibold text-white tracking-tight"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {t(p.value)}
                </div>
                <div className="mt-2 text-[11px] md:text-sm text-white/60 leading-snug whitespace-pre-line">
                  {t(p.label)}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* ══ 병원에서의 시간 — 영상 ══
          왜 이 섹션이 생겼나: 면력 유튜브를 열어보니 홍보 영상이 아니라 **환자 생활 콘텐츠**였다
          (셰프특식·면역밥상·원데이클래스). «치료 중에도 일상을 지킨다»는 말의 실제 증거라
          글로 설명하는 것보다 강하다. 병원이 이미 콘텐츠를 갖고 있으면 판이 바로 실어준다.
          ⚠️ 썸네일은 유튜브 도메인이라 next/image 가 아니라 <img> 를 쓴다(외부 도메인 설정을
             실서비스에 추가하지 않으려고 — 판 때문에 본 사이트 설정을 건드리면 안 된다). */}
      {has(site.videos) && (
        <Section>
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.videos) || "Life at the Hospital"}
            title={t(site.videosTitle)}
            lead={t(site.videosNote)}
          />
          {/* 세로 영상(쇼츠)과 가로 영상을 **한 줄에 섞지 않는다.**
              섞으면 카드 높이가 2배 차이 나(230px 폭 세로 = 409px, 360px 폭 가로 = 202px)
              줄 아래가 톱니처럼 들쭉날쭉해진다(2026-07-29 화면으로 확인).
              → 세로만 있는 줄 / 가로만 있는 줄로 나눠 그린다. 한 종류만 쓰는 병원은 줄이 하나만 뜬다. */}
          {[true, false].map((세로줄) => {
            const 목록 = site.videos.filter((v) => Boolean(v.portrait) === 세로줄);
            if (!목록.length) return null;
            return (
          <SnapRow key={세로줄 ? "portrait" : "landscape"} className={세로줄 ? "mb-8" : ""}>
            {목록.map((v, i) => (
              <a
                key={i}
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                /* 세로 영상은 칸도 좁게 — 가로 영상과 같은 폭이면 화면을 통째로 잡아먹는다. */
                className={`group block shrink-0 snap-start ${v.portrait ? "w-[52vw] sm:w-[230px]" : "w-[78vw] sm:w-[360px]"}`}
              >
                {/* ⚠️ 유튜브 «쇼츠»(세로 영상)의 썸네일은 1280x720 인데 **가운데 405px 만 진짜 내용**이고
                    양옆 3분의 2는 «같은 그림을 흐리게 확대한 배경»이다. 16:9 상자에 그대로 넣으면
                    카드의 3분의 2가 흐릿한 얼룩이 된다(2026-07-29 실측: 의료 영상 5개가 전부 이랬다).
                    → 썸네일은 미리 세로로 잘라 두고, 여기서는 `portrait` 이면 9:16 상자로 그린다.
                    쇼츠를 안 쓰는 병원은 이 값이 없어서 예전과 똑같이 동작한다. */}
                <div className={`relative ${v.portrait ? "aspect-[9/16]" : "aspect-video"} rounded-2xl overflow-hidden bg-[#EDE6DA] mb-3.5`}>
                  {/* 썸네일은 **우리가 저장한 파일**을 쓴다(`v.thumb`). 유튜브에서 직접 불러오면
                      ①외부 도메인이라 CSP·이미지 최적화 설정을 건드려야 하고 ②유튜브가 주소를
                      바꾸면 조용히 깨지며 ③실제로 로컬에서 안 떴다(2026-07-28 실측).
                      thumb 이 없으면 유튜브 주소로 폴백한다. */}
                  <Image
                    src={v.thumb || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                    alt=""
                    fill
                    /* ⚠️ 격자를 가로줄로 바꾸면서 칸 너비가 «화면 비율»이 아니라 «고정 360px»이 됐다.
                       sizes 를 옛 격자 값(33vw)으로 두면 next/image 가 **3840px 짜리를 받아온다**
                       (2026-07-29 실측으로 잡음). 칸 너비가 바뀌면 sizes 도 같이 바꿔야 한다. */
                    sizes={v.portrait ? "(max-width: 640px) 52vw, 230px" : "(max-width: 640px) 78vw, 360px"}
                    unoptimized={!v.thumb}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  <span className="absolute inset-0 bg-black/15 group-hover:bg-black/5 transition-colors" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5" style={{ fill: accent }} aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                  {t(v.tag) && (
                    <span
                      className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {t(v.tag)}
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-medium leading-snug group-hover:opacity-70 transition-opacity">
                  {t(v.title)}
                </h3>
              </a>
            ))}
          </SnapRow>
            );
          })}
        </Section>
      )}

      {/* ══ 진료 분야 ══ */}
      {has(site.specialties) && (
        <Section id="specialties">
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.specialties) || "Specialties"}
            title={t(site.specialtiesTitle) || t(site.labels?.specialtiesHeading)}
          />
          {/* 카드에 사진이 있으면 위에 얹는다 — 글자 카드만 늘어놓으면 아래로 갈수록 밋밋해진다.
              사진이 없는 병원은 색 막대만 뜨고 레이아웃은 그대로(빈 자리가 안 생긴다). */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {site.specialties.map((s, i) => (
              <Reveal
                key={i}
                delay={i * 110}
                className="group bg-white rounded-2xl overflow-hidden border border-black/[0.06] hover:border-black/[0.14] hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition-all duration-300"
              >
                {s.image && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#EDE6DA]">
                    <Image
                      src={s.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                )}
                <div className="p-7">
                  {!s.image && (
                    <div
                      className="w-10 h-[3px] rounded-full mb-5 transition-all duration-300 group-hover:w-16"
                      style={{ backgroundColor: accent }}
                    />
                  )}
                  <h3 className="text-lg md:text-xl font-semibold mb-3 tracking-tight">{t(s.title)}</h3>
                  <p className="text-[15px] text-black/55 leading-relaxed">{t(s.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 치료 프로그램 ══ */}
      {has(site.programs) && (
        <Section tone="sand">
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.programs) || "Programs"}
            title={t(site.programsTitle)}
          />
          <div className="grid md:grid-cols-3 gap-5">
            {site.programs.map((p, i) => (
              <Reveal key={i} delay={i * 110} className="bg-white rounded-2xl overflow-hidden border border-black/[0.06]">
                {p.image && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#EDE6DA]">
                    <Image src={p.image} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                  </div>
                )}
                <div className="p-7">
                <h3 className="text-lg font-semibold mb-2.5 tracking-tight">{t(p.title)}</h3>
                <p className="text-[15px] text-black/55 leading-relaxed mb-5">{t(p.desc)}</p>
                {has(p.items) && (
                  <ul className="space-y-2.5 pt-5 border-t border-black/[0.07]">
                    {p.items.map((it, j) => (
                      <li key={j} className="text-[14px] text-black/65 flex gap-2.5">
                        <span className="mt-[7px] w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                        {t(it)}
                      </li>
                    ))}
                  </ul>
                )}
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 시설 갤러리 ══
          해외 환자는 «가 본 적 없는 나라의 병원»을 사진으로만 판단한다. 공간을 보여주는 것이
          문장 열 줄보다 낫다 — dekabi 도 시설·의료진 사진 비중이 크다.
          사진이 없는 병원은 이 섹션이 통째로 안 뜬다. */}
      {has(site.gallery) && (
        <Section pad="tight">
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.gallery) || "Our Space"}
            title={t(site.galleryTitle)}
          />
          {/* 격자 대신 **가로로 흐르는 줄**. 상위 사이트가 Swiper 를 쓰는 자리를 CSS scroll-snap 으로
              대신한다(라이브러리 0). 섹션마다 같은 격자가 반복되면 아래로 갈수록 지루해지는데,
              한 줄만 흐르게 해도 화면에 리듬이 생긴다. */}
          <SnapRow>
            {site.gallery.map((g, i) => (
              <figure
                key={i}
                className={`relative shrink-0 snap-start overflow-hidden rounded-2xl bg-[#EDE6DA] group ${
                  i === 0 ? "w-[85vw] sm:w-[520px] aspect-[4/3]" : "w-[62vw] sm:w-[300px] aspect-square"
                }`}
              >
                <Image
                  src={g.src}
                  alt={t(g.caption)}
                  fill
                  sizes="(max-width: 640px) 85vw, 520px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
                {t(g.caption) && (
                  <figcaption className="absolute inset-x-0 bottom-0 p-4 text-[13px] text-white bg-gradient-to-t from-black/60 to-transparent pt-10">
                    {t(g.caption)}
                  </figcaption>
                )}
              </figure>
            ))}
          </SnapRow>
        </Section>
      )}

      {/* ══ 큰 사진 띠 — 화면 폭을 꽉 채우는 한 장 ══
          왜: 카드·글자만 이어지면 «읽는 사이트»가 된다. 해외 환자는 가 본 적 없는 병원을
          사진으로 판단하므로, 중간에 **공간을 크게 한 번 보여주는 자리**가 필요하다
          (Braun 등 상위 의료관광 사이트는 시각 비중이 60~70%다 — 2026-07-28 실측). */}
      {site.showcase?.image && (
        <section className="relative min-h-[52vh] md:min-h-[62vh] flex items-end">
          <Image src={site.showcase.image} alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="relative w-full max-w-6xl mx-auto px-5 md:px-8 pb-12 md:pb-16">
            <Reveal className="max-w-xl">
              {t(site.showcase.eyebrow) && (
                <p className="text-[11px] md:text-xs font-semibold uppercase mb-3 text-white/80" style={{ letterSpacing: "0.2em" }}>
                  {t(site.showcase.eyebrow)}
                </p>
              )}
              <h2
                className="text-white text-3xl md:text-5xl font-semibold leading-[1.1] whitespace-pre-line"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", letterSpacing: "-0.025em" }}
              >
                {t(site.showcase.title)}
              </h2>
              {t(site.showcase.desc) && (
                <p className="mt-4 text-white/75 text-[15px] md:text-base leading-relaxed">{t(site.showcase.desc)}</p>
              )}
            </Reveal>
          </div>
        </section>
      )}

      {/* ══ 치료 메뉴 — 「내 경우엔 뭘 받나」를 골라 본다 ══
          유앤아이의원(uni114.co.kr) 화면 한가운데가 **필터 칩 + 카드 격자**였다. 방문자가
          «리프팅»을 누르면 그것만 남는다 = 묻지 않고 고르게 하는 구조.
          우리는 성형이 아니라 암이라 **할인가 대신 기간·포함내역·입원 여부**를 박는다. */}
      {site.menu?.items?.length > 0 && (
        <Section id="menu" tone="sand">
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.menu) || "Treatments"}
            title={t(site.menu.title)}
            lead={t(site.menu.lead)}
          />
          <TreatmentMenu
            menu={site.menu}
            lang={lang}
            accent={accent}
            onInquiry={onInquiry}
            labels={site.menu.labels || {}}
          />
        </Section>
      )}

      {/* ══ 병원 안에서 보내는 하루 — 사진으로 보여주는 자리 ══
          가로로 흐르는 줄이라 칸이 늘어도 화면이 길어지지 않는다.
          ※ 2026-07-30: 여기 「영상은 한국어라 읽어야 아는 자리」라고 적혀 있었는데,
            영상을 위로 올린 뒤로는 틀린 말이 됐다(영상 썸네일 자체가 언어 없이 읽힌다) → 지웠다. */}
      {has(site.life) && (
        <Section pad="normal">
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.life) || "Life Inside"}
            title={t(site.lifeTitle)}
            lead={t(site.lifeLead)}
          />
          <SnapRow>
            {site.life.map((x, i) => (
              <figure key={i} className="group shrink-0 snap-start w-[78vw] sm:w-[340px]">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#EDE6DA] mb-4">
                  <Image
                    src={x.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 78vw, 340px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                </div>
                <figcaption>
                  <h3 className="text-[17px] font-semibold tracking-tight mb-1.5">{t(x.title)}</h3>
                  <p className="text-[14px] text-black/55 leading-relaxed">{t(x.desc)}</p>
                </figcaption>
              </figure>
            ))}
          </SnapRow>
        </Section>
      )}

      {/* ══ 의료진 — 얼굴이 신뢰의 핵심 ══ */}
      {has(site.doctors) && (
        <Section>
          {/* 가운데 정렬 — 앞뒤 섹션이 전부 왼쪽에서 시작하니 여기서 한 번 끊어준다. */}
          <SectionHead
            accent={accent}
            align="center"
            eyebrow={t(site.labels?.doctors) || "Medical Team"}
            title={t(site.doctorsTitle)}
          />
          {/* 단체 사진이 있으면 격자 위에 한 번 크게 — 「팀으로 본다」가 이 병원의 강점이라
              얼굴 낱장보다 같이 서 있는 그림이 먼저 와야 한다. 없으면 이 자리가 안 뜬다. */}
          {site.teamPhoto && (
            <Reveal className="relative w-full max-w-3xl mx-auto aspect-[16/10] mb-10 md:mb-14">
              <Image src={site.teamPhoto} alt="" fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain" />
            </Reveal>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
            {site.doctors.map((d, i) => (
              <Reveal key={i} delay={i * 100} className="group">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#EDE6DA] mb-4">
                  {d.photo && (
                    <Image
                      src={d.photo}
                      alt={t(d.name)}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  )}
                </div>
                <h3 className="font-semibold text-[15px] md:text-base tracking-tight">{t(d.name)}</h3>
                <p className="text-[13px] mt-1" style={{ color: accent }}>{t(d.title)}</p>
                {t(d.credentials) && (
                  <p className="text-[13px] text-black/45 mt-1.5 leading-snug">{t(d.credentials)}</p>
                )}
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 왜 우리인가 — 국가 자랑이 아니라 이 병원의 이유 ══ */}
      {has(site.whyUs) && (
        <Section tone="sand" pad="loose">
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.whyUs) || "Why Choose Us"}
            title={t(site.whyUsTitle)}
          />
          {/* ⚠️ 여기가 「틀에 박힌 톤」의 진원지였다. 3칸 격자 카드 = 앞뒤 섹션과 똑같은 리듬.
              → **좌우 번갈아 눕는 큰 줄**로 바꿨다. 사진이 커지고 줄마다 방향이 바뀌니
                 스크롤하면서 «읽는» 게 아니라 «보는» 흐름이 된다(잡지 편집 방식).
              사진 없는 병원은 큰 번호만 남고 글이 넓게 눕는다 — 빈 자리가 안 생긴다. */}
          <div className="space-y-14 md:space-y-24">
            {site.whyUs.map((w, i) => (
              <Reveal
                key={i}
                className={`grid items-center gap-8 md:gap-14 ${w.image ? "md:grid-cols-2" : ""}`}
              >
                {w.image && (
                  <div
                    className={`relative aspect-[4/3] rounded-[1.75rem] overflow-hidden bg-[#EDE6DA] ${
                      i % 2 === 1 ? "md:order-2" : ""
                    }`}
                  >
                    <Image src={w.image} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  </div>
                )}
                <div className={w.image ? "" : "max-w-3xl"}>
                  <div
                    className="text-5xl md:text-7xl font-light mb-5 leading-none opacity-20"
                    style={{ fontFamily: "Georgia, serif", color: accent, letterSpacing: "-0.03em" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-semibold mb-4 tracking-tight leading-snug">{t(w.title)}</h3>
                  <p className="text-[15px] md:text-base text-black/55 leading-relaxed">{t(w.desc)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 지점 안내 ══
          해외 환자에게 이건 «자랑»이 아니라 **「어디로 가면 되나」라는 실제 질문**이다.
          지점이 하나인 병원은 이 섹션이 통째로 안 뜬다. */}
      {has(site.branches) && (
        <Section pad="normal">
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.branches) || "Locations"}
            title={t(site.branchesTitle)}
            lead={t(site.branchesLead)}
          />
          <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
            {site.branches.map((b, i) => (
              <Reveal
                key={i}
                delay={i * 100}
                className="group bg-white rounded-2xl overflow-hidden border border-black/[0.06] hover:border-black/[0.14] hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition-all duration-300"
              >
                {b.image && (
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#EDE6DA]">
                    <Image
                      src={b.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                )}
                <div className="p-6 md:p-7">
                  <h3 className="text-lg md:text-xl font-semibold tracking-tight mb-2">{t(b.name)}</h3>
                  {t(b.note) && (
                    <p className="text-[13px] mb-3" style={{ color: accent }}>{t(b.note)}</p>
                  )}
                  <p className="text-[14px] text-black/55 leading-relaxed">{t(b.address)}</p>
                  {b.phone && (
                    <a
                      href={`tel:${String(b.phone).replace(/[^0-9+]/g, "")}`}
                      className="inline-block mt-3 text-[14px] tabular-nums font-medium"
                      style={{ color: accent }}
                    >
                      {b.phone}
                    </a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 환자 후기 — 없으면 통째로 안 그린다 ══ */}
      {has(site.testimonials) && (
        <Section tone="ink" darkTone={darkTone}>
          <SectionHead
            accent="#9BB8A5"
            tone="light"
            eyebrow={t(site.labels?.testimonials) || "Patient Stories"}
            title={t(site.testimonialsTitle)}
          />
          <div className="grid md:grid-cols-3 gap-6">
            {site.testimonials.map((r, i) => (
              <Reveal key={i} delay={i * 110} as="figure" className="bg-white/[0.05] rounded-2xl p-7 border border-white/10">
                <blockquote
                  className="text-white/85 text-[15px] leading-relaxed"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  “{t(r.quote)}”
                </blockquote>
                <figcaption className="mt-6 text-[13px] text-white/45">
                  {t(r.author)}
                  {t(r.country) ? ` · ${t(r.country)}` : ""}
                </figcaption>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 인증·실적 — 의료는 「누가 보증하나」가 신뢰의 절반 ══ */}
      {has(site.credentials) && (
        <Section pad="tight">
          <SectionHead
            accent={accent}
            eyebrow={t(site.labels?.credentials) || "Credentials"}
            title={t(site.credentialsTitle)}
          />
          <div className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
            {site.credentials.map((c, i) => (
              <Reveal key={i} y={14} delay={i * 60} className="py-5 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-8">
                {c.year && (
                  <span className="text-[13px] tabular-nums shrink-0 w-16" style={{ color: accent }}>
                    {c.year}
                  </span>
                )}
                <div>
                  <h3 className="font-medium text-[15px] md:text-base">{t(c.title)}</h3>
                  {t(c.desc) && <p className="text-[14px] text-black/50 mt-1 leading-relaxed">{t(c.desc)}</p>}
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ══ FAQ ══ */}
      {has(site.faq) && (
        <Section tone="sand">
          <SectionHead
            accent={accent}
            align="center"
            eyebrow={t(site.labels?.faq) || "FAQ"}
            title={t(site.faqTitle)}
          />
          <div className="max-w-3xl mx-auto">
            {site.faq.map((f, i) => (
              <div key={i} className="border-b border-black/[0.09]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left py-5 flex items-start justify-between gap-6 group"
                  aria-expanded={openFaq === i}
                >
                  <span className="font-medium text-[15px] md:text-base group-hover:opacity-70 transition-opacity">
                    {t(f.q)}
                  </span>
                  <span
                    className="text-xl leading-none shrink-0 transition-transform duration-200"
                    style={{ color: accent, transform: openFaq === i ? "rotate(45deg)" : "none" }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                {/* 접힌 내용을 «지우지» 않고 감춘다 — 조건부 렌더로 지우면 크롤러에겐 빈 페이지가 된다
                    (2026-07-28 반성문 #143 에서 고친 부류. 판에도 같은 실수를 심지 않는다). */}
                <div className={openFaq === i ? "pb-6 pr-10" : "hidden"}>
                  <p className="text-[15px] text-black/60 leading-relaxed whitespace-pre-line">{t(f.a)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ══ 마무리 — 「말만 걸어두는 자리」가 아니라 실제로 신청하는 자리 ══
          ⚠️ 여기가 판의 제일 큰 구멍이었다. 전에는 버튼 두 개뿐이라 **다른 데로 보내기만** 했다.
             유앤아이의원은 홈 맨 아래에 이름·연락처·내용 폼이 **그 자리에** 있고 옆에 지도가 있다.
             한 번 더 누르게 할수록 사람이 샌다. */}
      <Section tone="ink" darkTone={darkTone} id="contact" pad="loose">
        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-16 items-start">
          <Reveal>
            <Heading tone="light" size="xl">{t(site.closing?.title)}</Heading>
            {t(site.closing?.subtitle) && (
              <p className="mt-5 text-white/65 text-base md:text-lg leading-relaxed whitespace-pre-line">
                {t(site.closing.subtitle)}
              </p>
            )}
            {/* 주소·전화·시간은 «찾아오는 사람»의 정보다. 빈 값은 그 줄이 안 뜬다. */}
            <dl className="mt-9 space-y-4 text-[15px]">
              {[
                [site.labels?.address, t(site.contact?.address)],
                [site.labels?.phone, site.contact?.phone],
                [site.labels?.hours, t(site.contact?.hours)],
              ].map(([k, v], i) =>
                v ? (
                  <div key={i} className="flex gap-5">
                    <dt className="w-24 shrink-0 text-white/35 text-[13px] pt-0.5">{t(k)}</dt>
                    <dd className="text-white/80 leading-relaxed">{v}</dd>
                  </div>
                ) : null,
              )}
            </dl>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {site.contact?.phone && (
                <a
                  href={`tel:${String(site.contact.phone).replace(/[^0-9+]/g, "")}`}
                  className="px-8 py-3.5 rounded-full border border-white/25 text-white text-[15px] font-medium text-center hover:bg-white/10 transition-colors"
                >
                  {site.contact.phone}
                </a>
              )}
              {site.contact?.mapUrl && (
                <a
                  href={site.contact.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3.5 rounded-full border border-white/25 text-white text-[15px] font-medium text-center hover:bg-white/10 transition-colors"
                >
                  {t(site.labels?.directions) || "Directions"}
                </a>
              )}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <InquiryForm
              form={site.inquiryForm}
              contact={site.contact}
              lang={lang}
              accent={accent}
              labels={site.inquiryForm?.labels || {}}
            />
          </Reveal>
        </div>
      </Section>

      {/* 폼이 없는 병원(아직 자료를 못 받은 경우)엔 예전처럼 버튼만 그린다. */}
      {!site.inquiryForm && (
        <Section tone="ink" darkTone={darkTone} pad="normal">
        <Reveal className="text-center max-w-2xl mx-auto">
          <Heading tone="light" size="xl">{t(site.closing?.title)}</Heading>
          {t(site.closing?.subtitle) && (
            <p className="mt-5 text-white/65 text-base md:text-lg leading-relaxed whitespace-pre-line">
              {t(site.closing.subtitle)}
            </p>
          )}
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onInquiry}
              className="px-9 py-4 rounded-full text-white text-base font-medium shadow-xl transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: accent }}
            >
              {t(site.hero?.primaryCta) || "Consult Now"}
            </button>
            {site.contact?.phone && (
              <a
                href={`tel:${String(site.contact.phone).replace(/[^0-9+]/g, "")}`}
                className="px-9 py-4 rounded-full border border-white/25 text-white text-base font-medium hover:bg-white/10 transition-colors"
              >
                {site.contact.phone}
              </a>
            )}
          </div>
          {t(site.contact?.hours) && (
            <p className="mt-6 text-[13px] text-white/40">{t(site.contact.hours)}</p>
          )}
        </Reveal>
        </Section>
      )}

      <HospitalFooter site={site} lang={lang} darkTone={darkTone} />

      {/* 오른쪽 고정 묶음(상담예약 + 메신저 + 전화) — 해외 환자는 전화보다 메신저를 쓴다
          (국제전화 요금·시차·언어). 폰에서는 아래 가로 바로 대신한다. */}
      <QuickRail
        channels={site.contact?.channels}
        accent={accent}
        label={t(site.labels?.chat)}
        onInquiry={onInquiry}
        phone={site.contact?.phone}
        ctaLabel={t(site.labels?.quickCta)}
      />
      <MobileBar
        channels={site.contact?.channels}
        accent={accent}
        onInquiry={onInquiry}
        phone={site.contact?.phone}
        ctaLabel={t(site.hero?.primaryCta)}
      />
    </div>
  );
}
