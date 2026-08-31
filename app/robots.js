const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://healwith.co.kr";

export default function robots() {
  const baseUrl = getBaseUrl();
  const commonDisallow = [
    "/admin",
    "/login",
    "/signup",
    // 전환 퍼널·개인정보 입력 폼. 두 줄인 이유(2026-08-31 감사에서 잡힘):
    // 공개 경로는 전부 /{언어}/… 로 서빙된다(proxy.ts 가 맨 주소를 308 로 보낸다).
    // robots 규칙은 «접두어 일치»라 "/inquiry" 한 줄은 맨 주소만 막고 **/en/inquiry ·
    // /ru/inquiry 는 하나도 안 막았다** — 사이트맵 주석엔 "robots 에서 차단"이라고 적혀 있어
    // 문서와 현실이 몇 달간 어긋나 있었다. "/*/inquiry" 가 언어판 전부를 덮는다
    // (하위 /inquiry/referral 도 같은 접두어라 함께 막힌다 — 역시 개인정보 폼이라 의도대로다).
    "/inquiry",
    "/*/inquiry",
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

  // 공개 콘텐츠 허용 목록 — **세 그룹(일반·Yandex·AI)이 같은 것을 봐야 한다.**
  // 왜 상수로 뺐나 (2026-08-31 감사): 예전엔 이 목록이 `*` 그룹에만 있고 Yandex·AI 그룹은
  // allow:["/"] 뿐이었다. robots 판정은 «가장 긴 일치 규칙이 이긴다» → 그 두 그룹에선
  // Disallow "/hospital"(9자)이 Allow "/"(1자)를 이겨 **/hospitals 가 통째로 차단**됐다.
  // (`*` 그룹만 Allow "/hospitals"(10자)를 갖고 있어 무사했다.)
  // 한 곳만 고쳐지는 사고를 없애려고 목록을 하나로 합친다 — 새 공개 경로는 여기 한 줄.
  const commonAllow = [
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
  ];

  return {
    rules: [
      // ── 기본 크롤러 ───────────────────────────────────────────
      {
        userAgent: "*",
        allow: commonAllow,
        disallow: commonDisallow,
      },
      // ── Yandex 검색 크롤러 — 명시적 허용 (crawl-delay 없음 권장) ──
      {
        userAgent: "Yandex",
        allow: commonAllow,
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
        allow: commonAllow,
        disallow: commonDisallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
