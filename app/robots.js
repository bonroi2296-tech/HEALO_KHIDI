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
    // 2026-08-25 추가: 해외 파트너 포털. /hospital·/coordinator 는 막고 이 둘만 빠져 있었다.
    "/agency",
    "/clinic",
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
        // ⚠️ 여기 목록은 «크롤을 여는» 게 아니라 «우리가 SEO 지면이라고 선언하는» 목록이다.
        //    맨 위 "/" 가 이미 전부를 열어 두므로(막는 건 아래 disallow 뿐), 각 줄은 사실상 주석이다.
        //    그래서 «없는 지면»을 적어두면 다음 사람이 그걸 지면으로 믿는다.
        // 2026-08-31 삭제: "/patient/education"·"/patient/visa".
        //    실측 — 로그인 없이 열면 둘 다 **307 → /login** 이다(proxy.ts 가 /patient/* 를 먼저 막는다).
        //    즉 크롤러는 여기 적힌 화면을 «한 번도 본 적이 없고» 매번 Disallow 인 /login 에 부딪혔다.
        //    ⚠️ 정정(2026-08-31 재측정): 처음엔 「두 화면에 noindex 까지 붙었다」고 적었는데 **틀렸다.**
        //    noindex 가 붙은 건 /patient/visa 하나뿐이고, /patient/education 은 본문 없는 리다이렉트
        //    껍데기라 애초에 metadata 가 없다. 두 줄을 뺀 이유는 「noindex 라서」가 아니라
        //    **둘 다 로그인 벽 뒤여서 크롤러가 한 번도 본 적이 없기 때문**이다.
        //    교육자료의 «진짜» 공개 지면은 /education 이고 그건 "/" 로 이미 열려 있다.
        allow: [
          "/",
          "/treatments",
          "/hospitals",
          "/specialties",
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
