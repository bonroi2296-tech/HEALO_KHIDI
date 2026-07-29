"use client";

/**
 * 판의 「블록」 — 속 페이지를 데이터로 조립하기 위한 부품.
 *
 * 왜 블록인가: 속 페이지를 페이지마다 손으로 짜면 병원이 바뀔 때마다 다시 짜야 한다 = 판이 아니다.
 * 병원별 데이터가 `{ type: "cards", ... }` 목록을 주면 판이 그대로 그린다.
 *
 * 새 블록을 추가할 때: ①여기 컴포넌트 ②`BLOCKS` 등록 ③`siteSchema.js` 에 형태 기록.
 * 모르는 type 이 오면 **조용히 건너뛴다** — 오타 하나로 페이지가 죽으면 안 된다(홈에서 겪음).
 */

import Image from "next/image";
import { Reveal } from "./motion";

const pick = (v, lang) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v[lang] || v.en || Object.values(v)[0] || "";
};
const has = (a) => Array.isArray(a) && a.length > 0;

const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" };

/* 속 페이지 제목도 홈과 같은 «큰 글자» 규격으로 간다.
   왜: 홈만 시원하고 탭으로 들어가면 글자가 작아지면 «홈은 공들이고 속은 대충»으로 읽힌다.
   판은 어느 페이지로 들어와도 같은 급이어야 한다(검색으로 속 페이지에 바로 들어오는 사람이 많다). */
function BlockHeading({ eyebrow, title, accent, tone = "dark" }) {
  const color = tone === "light" ? "text-white" : "text-[#16211C]";
  return (
    <Reveal className="max-w-2xl mb-10 md:mb-14">
      {eyebrow && (
        <p
          className="text-[11px] md:text-xs font-semibold uppercase mb-3"
          style={{ letterSpacing: "0.18em", color: tone === "light" ? "#9BB8D5" : accent }}
        >
          {eyebrow}
        </p>
      )}
      {title && (
        <h2
          className={`text-3xl md:text-5xl font-semibold leading-[1.08] ${color}`}
          style={{ ...SERIF, letterSpacing: "-0.025em" }}
        >
          {title}
        </h2>
      )}
    </Reveal>
  );
}

/** 글 + 사진 — 병원 소개처럼 «읽히는» 내용. 사진이 없으면 글만 넓게. */
function IntroBlock({ block, t, accent }) {
  const body = t(block.body);
  return (
    <div className={block.image ? "grid lg:grid-cols-2 gap-10 lg:gap-16 items-center" : ""}>
      <div>
        <BlockHeading eyebrow={t(block.eyebrow)} title={t(block.title)} accent={accent} />
        {body && (
          <div className="text-[15px] md:text-base text-black/60 leading-[1.85] whitespace-pre-line max-w-2xl">
            {body}
          </div>
        )}
      </div>
      {block.image && (
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#EDE6DA]">
          <Image src={block.image} alt={t(block.title)} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
        </div>
      )}
    </div>
  );
}

/** 카드 목록 — 진료 분야·프로그램처럼 «나열되는» 내용. */
function CardsBlock({ block, t, accent }) {
  if (!has(block.items)) return null;
  const cols = block.columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <>
      <BlockHeading eyebrow={t(block.eyebrow)} title={t(block.title)} accent={accent} />
      <div className={`grid ${cols} gap-5`}>
        {block.items.map((it, i) => (
          <Reveal key={i} delay={i * 110} className="group bg-white rounded-2xl overflow-hidden border border-black/[0.06] hover:border-black/[0.14] hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] transition-all duration-300">
            {it.image && (
              <div className="relative aspect-[16/10] overflow-hidden bg-[#EDE6DA]">
                <Image src={it.image} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
            )}
            <div className="p-7">
              {!it.image && <div className="w-10 h-[3px] rounded-full mb-5" style={{ backgroundColor: accent }} />}
              <h3 className="text-lg font-semibold mb-2.5 tracking-tight">{t(it.title)}</h3>
              {t(it.desc) && <p className="text-[15px] text-black/55 leading-relaxed">{t(it.desc)}</p>}
              {has(it.items) && (
                <ul className="mt-5 pt-5 border-t border-black/[0.07] space-y-2.5">
                  {it.items.map((x, j) => (
                    <li key={j} className="text-[14px] text-black/65 flex gap-2.5">
                      <span className="mt-[7px] w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                      {t(x)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}

/** 번호 단계 — 절차(치료 흐름·방문 준비)처럼 «순서가 있는» 내용. */
function StepsBlock({ block, t, accent }) {
  if (!has(block.items)) return null;
  return (
    <>
      <BlockHeading eyebrow={t(block.eyebrow)} title={t(block.title)} accent={accent} />
      <ol className="grid md:grid-cols-2 gap-x-12 gap-y-9">
        {block.items.map((it, i) => (
          <Reveal key={i} as="li" delay={i * 90} y={18} className="flex gap-5">
            <span className="text-4xl md:text-5xl font-light opacity-20 shrink-0 leading-none" style={{ ...SERIF, color: accent, letterSpacing: "-0.03em" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-lg md:text-xl font-semibold mb-2 tracking-tight">{t(it.title)}</h3>
              {t(it.desc) && <p className="text-[15px] text-black/55 leading-relaxed">{t(it.desc)}</p>}
            </div>
          </Reveal>
        ))}
      </ol>
    </>
  );
}

/** 표 — 서류 목록·가격 범위처럼 «대조되는» 내용. */
function TableBlock({ block, t, accent }) {
  if (!has(block.rows)) return null;
  return (
    <>
      <BlockHeading eyebrow={t(block.eyebrow)} title={t(block.title)} accent={accent} />
      <div className="max-w-3xl divide-y divide-black/[0.08] border-y border-black/[0.08]">
        {block.rows.map((r, i) => (
          <Reveal key={i} y={14} delay={i * 60} className="py-5 grid sm:grid-cols-[minmax(0,14rem)_1fr] gap-1.5 sm:gap-8">
            <div className="font-medium text-[15px]">{t(r.label)}</div>
            <div className="text-[15px] text-black/55 leading-relaxed whitespace-pre-line">{t(r.value)}</div>
          </Reveal>
        ))}
      </div>
      {t(block.note) && <p className="mt-6 text-[13px] text-black/40 max-w-3xl leading-relaxed">{t(block.note)}</p>}
    </>
  );
}

/** 의료진 — 얼굴 격자. 홈과 같은 모양이라 브랜드가 이어진다. */
function DoctorsBlock({ block, t, accent }) {
  if (!has(block.items)) return null;
  return (
    <>
      <BlockHeading eyebrow={t(block.eyebrow)} title={t(block.title)} accent={accent} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7">
        {block.items.map((d, i) => (
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
            <h3 className="font-semibold text-[15px] tracking-tight">{t(d.name)}</h3>
            <p className="text-[13px] mt-1" style={{ color: accent }}>{t(d.title)}</p>
            {t(d.credentials) && <p className="text-[13px] text-black/45 mt-1.5 leading-snug">{t(d.credentials)}</p>}
          </Reveal>
        ))}
      </div>
    </>
  );
}

/** 사진 격자 — 시설. ⚠️ 5장이 격자에 딱 맞는다(큰 것 1 + 작은 것 4). */
function GalleryBlock({ block, t }) {
  if (!has(block.items)) return null;
  return (
    <>
      <BlockHeading eyebrow={t(block.eyebrow)} title={t(block.title)} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {block.items.map((g, i) => (
          <Reveal key={i} as="figure" delay={i * 80} className={`relative overflow-hidden rounded-2xl bg-[#EDE6DA] group ${i === 0 ? "col-span-2 row-span-2 aspect-[4/3] lg:aspect-auto lg:min-h-[420px]" : "aspect-square"}`}>
            <Image src={g.src} alt={t(g.caption)} fill sizes={i === 0 ? "50vw" : "25vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
            {t(g.caption) && (
              <figcaption className="absolute inset-x-0 bottom-0 p-4 text-[13px] text-white bg-gradient-to-t from-black/60 to-transparent pt-10">
                {t(g.caption)}
              </figcaption>
            )}
          </Reveal>
        ))}
      </div>
    </>
  );
}

/** 지점 — 주소·전화가 붙은 목록. 해외 환자는 «어디로 가야 하나»가 실제 질문이다. */
function BranchesBlock({ block, t, accent }) {
  if (!has(block.items)) return null;
  return (
    <>
      <BlockHeading eyebrow={t(block.eyebrow)} title={t(block.title)} accent={accent} />
      <div className="grid md:grid-cols-2 gap-5">
        {block.items.map((b, i) => (
          <Reveal key={i} delay={i * 100} className="bg-white rounded-2xl p-7 border border-black/[0.06]">
            <h3 className="text-lg font-semibold mb-3 tracking-tight">{t(b.name)}</h3>
            <p className="text-[15px] text-black/55 leading-relaxed">{t(b.address)}</p>
            {b.phone && (
              <a href={`tel:${String(b.phone).replace(/[^0-9+]/g, "")}`} className="inline-block mt-3 text-[15px] tabular-nums" style={{ color: accent }}>
                {b.phone}
              </a>
            )}
            {t(b.note) && <p className="text-[13px] text-black/40 mt-3">{t(b.note)}</p>}
          </Reveal>
        ))}
      </div>
    </>
  );
}

const BLOCKS = {
  intro: IntroBlock,
  cards: CardsBlock,
  steps: StepsBlock,
  table: TableBlock,
  doctors: DoctorsBlock,
  gallery: GalleryBlock,
  branches: BranchesBlock,
};

/** 블록 하나를 그린다. 모르는 type 이면 null — 오타로 페이지가 죽지 않게. */
export function Block({ block, lang, accent }) {
  const Comp = BLOCKS[block?.type];
  if (!Comp) return null;
  const t = (v) => pick(v, lang);
  return <Comp block={block} t={t} accent={accent} />;
}

export const BLOCK_TYPES = Object.keys(BLOCKS);
