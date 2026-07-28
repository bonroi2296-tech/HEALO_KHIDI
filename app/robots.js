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
    "/hospital",
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
      // ── AI 답변엔진(AEO) — 명시적 허용 ─────────────────────────
      // 왜 명시하나: `*` 로도 이미 허용이지만, AI 크롤러는 "명시 규칙이 있으면 그것만" 따르는
      // 구현이 많고(그룹 매칭 규칙), 나중에 `*` 를 조이는 순간 답변엔진이 통째로 잘린다.
      // 우리 시장(러·CIS 암환자)은 구글 링크보다 "챗GPT/퍼플렉시티가 뭐라 답하나"에서
      // 승산이 크므로, 공개 콘텐츠는 열고 비공개 경로만 `*` 와 동일하게 막는다.
      // ⚠️ 여기 목록은 "이름이 알려진 것"만 — 모르는 봇은 `*` 규칙이 받는다.
      {
        userAgent: [
          "GPTBot", // OpenAI 학습 크롤러
          "OAI-SearchBot", // ChatGPT 검색 색인
          "ChatGPT-User", // 사용자가 물어볼 때 실시간 열람
          "ClaudeBot", // Anthropic 크롤러
          "Claude-User", // Claude 실시간 열람
          "Claude-SearchBot", // Claude 검색 색인
          "PerplexityBot", // Perplexity 색인
          "Perplexity-User", // Perplexity 실시간 열람
          "Google-Extended", // Gemini/AI개요 학습·근거 사용 (크롤링은 Googlebot 이 함)
          "Applebot-Extended", // Apple Intelligence
          "meta-externalagent", // Meta AI
        ],
        allow: ["/"],
        disallow: commonDisallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
