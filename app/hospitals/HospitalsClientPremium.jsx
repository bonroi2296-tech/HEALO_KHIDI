"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseClient } from "../../src/lib/data/supabaseClient";
import { mapHospitalRow } from "../../src/lib/mapper";
import { getLangCodeFromCookie } from "../../src/lib/i18n";
import { useLang } from "../../src/lib/i18n/LangContext";
import {
  Eyebrow,
  Rule,
  LinkArrow,
  FilmGrain,
} from "../../components/healo/Primitives";
import Nav from "../../components/healo/Nav";
import Footer from "../../components/healo/Footer";
import { PHOTO_FILTER } from "../../components/healo/Photos";
import { SkeletonCard } from "../../components/healo/Skeleton";

const COPY = {
  en: {
    eyebrow: "Partner hospitals",
    titleA: "Selected for outcomes,",
    titleB: "not for show.",
    lede:
      "Every partner is vetted for oncology specialization, international patient experience, and language support. No sponsored placements, no paid rankings.",
    filters: { all: "All", oncology: "Oncology", km: "Korean Medicine" },
    noResults: "No hospitals match the selected filter.",
    viewDetails: "View details",
    googleRating: "Google rating",
    reviews: "reviews",
    hours: "Opening hours",
    noPartner: "Currently arranging new partnerships. Check back soon.",
    trustLine: "Concierge curated · No sponsored placements",
  },
  ko: {
    eyebrow: "제휴 병원",
    titleA: "과시를 위한 것이 아닌,",
    titleB: "성과로 선정했습니다.",
    lede:
      "모든 제휴 병원은 종양학 전문성, 외국인 환자 진료 경험, 언어 지원을 기준으로 선별됩니다. 스폰서 제휴 없음, 유료 랭킹 없음.",
    filters: { all: "전체", oncology: "종양학", km: "한방 의학" },
    noResults: "선택한 필터에 해당하는 병원이 없습니다.",
    viewDetails: "자세히 보기",
    googleRating: "Google 평점",
    reviews: "리뷰",
    hours: "운영 시간",
    noPartner: "현재 새로운 제휴를 정리 중입니다. 잠시 후 다시 확인해 주세요.",
    trustLine: "컨시어지 엄선 · 스폰서 제휴 없음",
  },
};

function classifyHospital(h) {
  const name = (h.name_ko || h.name_en || "").toLowerCase();
  const tagsStr = (h.tags || []).join(" ").toLowerCase();
  if (name.includes("한방") || name.includes("면력") || tagsStr.includes("한방") || tagsStr.includes("km"))
    return "km";
  return "oncology";
}

export default function HospitalsClientPremium() {
  const lang = useLang();
  const copy = COPY[lang] || COPY.en;
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseClient
          .from("hospitals")
          .select("*")
          .eq("is_published", true)
          .order("display_order", { ascending: true, nullsFirst: false });
        if (data) {
          const langCode = getLangCodeFromCookie();
          const mapped = data.map((r) => mapHospitalRow(r, langCode)).filter(Boolean);
          // Add classification + raw row for rating access
          const enriched = data.map((raw, idx) => ({
            ...mapped[idx],
            _raw: raw,
            _category: classifyHospital(raw),
            _googleRating: raw.external_ratings?.google?.rating,
            _googleCount: raw.external_ratings?.google?.count,
          }));
          setHospitals(enriched);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = hospitals.filter((h) =>
    filter === "all" ? true : h._category === filter
  );

  return (
    <div style={{ background: "var(--cream-0)", minHeight: "100vh" }}>
      <Nav current="hospitals" />

      {/* HERO */}
      <section style={{ background: "var(--paper)", padding: "96px 24px 72px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(44px, 6vw, 88px)",
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              margin: "24px 0 32px",
              color: "var(--fg-on-light-1)",
              maxWidth: 1000,
            }}
          >
            {copy.titleA}
            <br />
            <span style={{ fontStyle: "italic", color: "var(--gold-2)" }}>{copy.titleB}</span>
          </h1>
          <Rule width={64} />
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 300,
              fontSize: 17,
              lineHeight: 1.75,
              color: "var(--fg-on-light-2)",
              marginTop: 24,
              maxWidth: 680,
            }}
          >
            {copy.lede}
          </p>
        </div>
      </section>

      {/* FILTER BAR */}
      <section
        style={{
          borderTop: "1px solid var(--gold-tint)",
          borderBottom: "1px solid var(--cream-2)",
          padding: "20px 24px",
          background: "var(--cream-0)",
          position: "sticky",
          top: 65,
          zIndex: 10,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            gap: 32,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--fg-on-light-4)",
              letterSpacing: "0.2em",
            }}
          >
            {String(filtered.length).padStart(2, "0")} / {String(hospitals.length).padStart(2, "0")}
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            {["all", "oncology", "km"].map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  padding: "6px 0",
                  fontFamily: "var(--font-sans)",
                  fontSize: 11,
                  fontWeight: filter === key ? 600 : 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: filter === key ? "var(--ink-0)" : "var(--fg-on-light-3)",
                  borderBottom: `1px solid ${filter === key ? "var(--gold-0)" : "transparent"}`,
                }}
              >
                {copy.filters[key]}
              </button>
            ))}
          </div>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: 12,
              color: "var(--fg-on-light-3)",
            }}
          >
            {copy.trustLine}
          </span>
        </div>
      </section>

      {/* GRID */}
      <section style={{ padding: "72px 24px 96px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: 48,
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 20,
                color: "var(--fg-on-light-3)",
                textAlign: "center",
                padding: "96px 0",
              }}
            >
              {copy.noResults}
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: 48,
              }}
            >
              {filtered.map((h, idx) => (
                <HospitalCard
                  key={h.slug || idx}
                  hospital={h}
                  copy={copy}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function HospitalCard({ hospital, copy, lang }) {
  const name = hospital.name || hospital.name_ko || hospital.name_en;
  const address = hospital.address || "";
  const thumb = hospital.thumbnail_image || hospital._raw?.thumbnail_image;
  const tagLabel = hospital._category === "km" ? "Korean Medicine" : "Oncology";
  const rating = hospital._googleRating;
  const count = hospital._googleCount;

  return (
    <article>
      <Link
        href={hospital.slug?.startsWith("immunehospital") ? "/hospitals/immune" : `/hospitals/${hospital.slug}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 5",
            overflow: "hidden",
            marginBottom: 16,
            background: "var(--ink-1)",
            position: "relative",
          }}
        >
          {thumb ? (
            <img
              src={thumb}
              alt={name}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: PHOTO_FILTER,
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--fg-on-dark-4)",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
              }}
            >
              No image
            </div>
          )}
          {rating && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(10,10,10,0.8)",
                color: "var(--gold-0)",
                padding: "4px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.05em",
                backdropFilter: "blur(8px)",
              }}
            >
              ★ {rating} · {count}
            </div>
          )}
        </div>

        <Eyebrow tone="muted">{tagLabel}</Eyebrow>
        <h3
          translate="no"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: "-0.005em",
            color: "var(--fg-on-light-1)",
            margin: "8px 0 6px",
          }}
        >
          {name}
        </h3>
        {address && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--fg-on-light-3)",
              letterSpacing: "0.04em",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {address}
          </p>
        )}
      </Link>
    </article>
  );
}
