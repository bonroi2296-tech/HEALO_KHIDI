const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://healwith.co.kr";

export default function robots() {
  const baseUrl = getBaseUrl();
  const commonDisallow = [
    "/admin",
    "/login",
    "/signup",
    "/inquiry",
    "/consultation",
    "/partner",
    "/coordinator",
    "/doctor",
    "/patient/rebooking",
    "/patient/documents",
    "/patient/consultations",
    "/patient/cost-estimates",
    "/patient/messages",
    "/patient/calendar",
    "/patient/symptoms",
    "/patient/chat",
    "/patient/visa/applications",
    "/api",
    "/auth",
    "/dev",
    "/design-preview",
  ];

  return {
    rules: [
      // ── 기본 크롤러 ───────────────────────────────────────────
      {
        userAgent: "*",
        allow: [
          "/",
          "/treatments",
          "/hospitals",
          "/specialties",
          "/patient/education",
          "/patient/visa",
          "/about",
          "/contact",
          "/search",
          "/ru/for-russian-patients",
          "/kk/for-kazakh-patients",
        ],
        disallow: commonDisallow,
      },
      // ── Yandex 검색 크롤러 — 명시적 허용 (crawl-delay 없음 권장) ──
      {
        userAgent: "Yandex",
        allow: ["/"],
        disallow: commonDisallow,
        // crawlDelay: 1  ← Yandex 는 낮을수록 좋음; 필요 시 주석 해제
      },
      // ── Yandex 이미지 검색 — 이미지 유입 확보 ─────────────────
      {
        userAgent: "YandexImages",
        allow: ["/"],
        disallow: ["/api", "/auth", "/dev", "/design-preview"],
      },
      // ── Yandex 비디오 검색 ─────────────────────────────────────
      {
        userAgent: "YandexVideo",
        allow: ["/"],
        disallow: ["/api", "/auth", "/dev"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
