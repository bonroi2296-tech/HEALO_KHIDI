import { getTreatmentList } from "@/lib/data/treatments";
import { getHospitalList } from "@/lib/data/hospitals";
import {
  getAllPartnerSlugs,
  REDIRECTED_PARTNER_SLUGS,
  REDIRECTED_TREATMENT_SLUGS,
} from "@/lib/data/partnerHospitals";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/config";

const DEFAULT_LIMIT = 1000;

// ⚠️ 사이트맵은 요청 시마다 실DB로 생성한다(빌드 시점 고정 금지 — POSTMORTEMS #88).
// 왜: Vercel이 빌드 시점에 구운 사이트맵을 배포를 거듭해도 눌러앉혀, 비공개 처리된
//     치료 6종이 몇 달째 구글에 "있다"고 광고됐다(열면 404 = 색인 신뢰 훼손).
//     같은 코드+같은 DB 로컬 빌드는 깨끗했음 = 코드 무죄, 배포 캐시가 범인.
// 비용: 크롤러가 하루 몇 번 요청하는 수준 + 아래 10초 타임아웃 가드 있음 = 무시 가능.
// 이득: 치료/병원 공개·비공개가 재배포 없이 사이트맵에 즉시 반영.
export const dynamic = "force-dynamic";

// 정적 페이지 lastmod는 "요청시각(now)"이 아니라 고정된 콘텐츠 검토일을 쓴다.
// now 를 쓰면 매 크롤마다 lastmod 가 바뀌어 구글이 lastmod 신호를 불신함(내용은 그대로인데).
// ⚠️ 정적 페이지 콘텐츠를 의미있게 바꾸면 이 날짜를 올려라.
const STATIC_LASTMOD = new Date("2026-08-20"); // 2026-08-20: 전 페이지 내부 링크를 언어별 주소로 교체(#1428)

// kz(내부코드) → kk(BCP47). hreflang 표기용.
const HREF_LANG = { en: "en", ko: "ko", ru: "ru", kz: "kk", zh: "zh", ja: "ja" };

// ⚠️ NEXT_PUBLIC_SITE_URL 를 Vercel(Production·Preview)에 반드시 설정할 것.
// 미설정 시에도 localhost 가 검색엔진에 노출되지 않도록 실도메인으로 폴백.
// 도메인 변경(healwith.co.kr) 시 이 env 값만 바꾸면 sitemap/robots/canonical 전부 반영.
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://healwith.co.kr";

export default async function sitemap() {
  const baseUrl = getBaseUrl();
  const now = new Date();

  // 빌드 시점에 환경 변수가 없을 수 있으므로 먼저 체크
  const hasEnvVars = 
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY);

  let treatments = [];
  let hospitals = [];
  
  // 환경 변수가 있을 때만 데이터 가져오기
  if (hasEnvVars) {
    try {
      // 타임아웃 보호: 10초 내에 완료되지 않으면 빈 배열 반환
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sitemap data fetch timeout')), 10000)
      );
      
      // NOTE: For large datasets, increase limit or paginate in chunks.
      const dataPromise = Promise.all([
        getTreatmentList({ limit: DEFAULT_LIMIT }),
        getHospitalList({ limit: DEFAULT_LIMIT }),
      ]);
      
      [treatments, hospitals] = await Promise.race([dataPromise, timeoutPromise]);
    } catch (error) {
      // DB 순간 장애·타임아웃이면 500으로 실패시킨다 — 크롤러는 5xx면 기존 사이트맵을
      // 유지하고 재시도하지만, "빈 사이트맵 200"은 의도적 축소로 읽어 상세 URL들이
      // 크롤 우선순위에서 밀린다(#88 독립 리뷰 지적). force-dynamic 전환으로 이 함수는
      // 더 이상 빌드에서 안 돌므로 옛 "빌드 실패 방지" 빈 배열 폴백은 폐기.
      console.warn("[sitemap] data fetch failed — 5xx로 응답(크롤러 재시도 유도):", error?.message);
      throw error;
    }
  }

  // 언어화 공개경로 → **언어별로 각각 <loc> 을 가진 항목**을 반환(6개 언어 = 6개 항목).
  // languages 맵의 키는 BCP47(kz→kk), 값의 경로는 우리 locale 코드(/kz/).
  //
  // ⚠️ 왜 언어마다 따로 내보내나(2026-07-20 수정, 이전엔 /en 하나만 냈음):
  // 구글 hreflang 사이트맵 사양은 "각 언어판이 자기 <loc> 을 가진 별도 <url> 블록으로
  // 제출되고, 각 블록이 전체 alternate 목록을 반복"하는 형태다. 예전처럼 /en 만 <loc> 으로
  // 내보내면 ru·kz·ko·zh·ja 는 **부록(alternate)으로만 언급될 뿐 "색인해달라고 제출된 적이
  // 없는" 상태**가 된다 → 크롤 우선순위에서 밀린다. 러·카가 우리 1순위 시장인데 정작
  // 그 페이지들을 제출 안 하고 있었음(서치콘솔 실측: 러시아어 검색어 노출 0건).
  // 6개 언어 전부 200 서빙 확인 후 적용.
  const localized = (path, { priority, changeFrequency }) => {
    const clean = path === "/" ? "" : path;
    const languages = {};
    for (const l of LOCALES) languages[HREF_LANG[l]] = `${baseUrl}/${l}${clean}`;
    languages["x-default"] = `${baseUrl}/${DEFAULT_LOCALE}${clean}`;
    return LOCALES.map((l) => ({
      url: `${baseUrl}/${l}${clean}`,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  };

  // Static pages (언어화 대상)
  const staticPages = [
    localized('/', { changeFrequency: 'weekly', priority: 1.0 }),
    localized('/treatments', { changeFrequency: 'weekly', priority: 0.9 }),
    localized('/hospitals', { changeFrequency: 'weekly', priority: 0.9 }),
    localized('/telemedicine', { changeFrequency: 'weekly', priority: 0.9 }),
    // /search 는 2026-07-14 비활성화(옛 프로젝트 잔재, /hospitals 리다이렉트) → 색인 제외
    localized('/specialties/korean-medicine', { changeFrequency: 'monthly', priority: 0.8 }),
    localized('/hospitals/immune', { changeFrequency: 'monthly', priority: 0.85 }),
    localized('/care-journey', { changeFrequency: 'monthly', priority: 0.8 }),
    localized('/cost-calculator', { changeFrequency: 'weekly', priority: 0.92 }),
    // ── 암종별 치료 상세 (면력한방병원 6개 암종)
    localized('/treatments/female', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/digest', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/liver', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/lung', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/thyroid', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/etc', { changeFrequency: 'monthly', priority: 0.85 }),
    localized('/faq', { changeFrequency: 'monthly', priority: 0.75 }),
    // /education 은 공개 탭 비활성화(2026-07 보험 가이드로 교체) — 환자앱 링크용 라우트는 유지, 색인만 제외
    localized('/insurance', { changeFrequency: 'weekly', priority: 0.85 }),
    localized('/partners', { changeFrequency: 'monthly', priority: 0.6 }),
    localized('/visa', { changeFrequency: 'monthly', priority: 0.7 }),
    // /inquiry 는 robots.js 에서 Disallow(전환 퍼널·PII 폼) → sitemap 에서 제외
    localized('/about', { changeFrequency: 'monthly', priority: 0.5 }),
    localized('/contact', { changeFrequency: 'monthly', priority: 0.5 }),
    localized('/terms', { changeFrequency: 'yearly', priority: 0.3 }),
    localized('/privacy', { changeFrequency: 'yearly', priority: 0.3 }),
    localized('/cookies', { changeFrequency: 'yearly', priority: 0.2 }),
    localized('/medical-disclaimer', { changeFrequency: 'yearly', priority: 0.2 }),
    // ── Yandex 대응 러시아어·카자흐어 전용 랜딩(언어 prefix와 별개 자산 — 그대로 유지)
    // hreflang 을 일부러 안 단다: 이 둘은 **번역판이 없는 단독 페이지**다.
    // 예전엔 { 'ru': 자기자신, 'x-default': 홈페이지 } 를 달았는데, hreflang 은 상호참조가
    // 성립해야 유효한데(A가 B를 가리키면 B도 A를 가리켜야 함) 홈페이지 쪽은 이 랜딩들을
    // 가리키지 않아 **비상호 = 구글이 그 표기를 통째로 무시**했다. 게다가 x-default 가
    // 홈페이지를 가리켜 "이 러시아어 랜딩의 기본판은 영어 홈"이라는 잘못된 신호까지 줬다.
    // 번역판이 없으면 hreflang 을 안 다는 게 맞다(달아서 얻을 게 없고 잘못된 신호만 남음).
    // 2026-08-31: 페이지 metadata 쪽은 이 결정을 반만 따르고 있었다 — x-default:"/" 가 남아 있어
    // 여기 주석과 어긋났다. 그쪽에서 x-default 를 빼서 이제 «ru↔kk 상호 짝만» 남는다
    // (그 짝은 서로를 가리키므로 유효). 사이트맵은 그대로 hreflang 없이 <loc> 만 낸다.
    { url: `${baseUrl}/ru/for-russian-patients`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/kk/for-kazakh-patients`, changeFrequency: 'weekly', priority: 0.9 },
    // localized() 는 언어 수만큼의 배열을 반환하므로 flat() 로 펼친다.
    // (아래 러/카 전용 랜딩 2건은 단일 객체 — flat() 는 그대로 통과시킨다.)
  ].flat().map(p => ({ ...p, lastModified: STATIC_LASTMOD }));

  const urls = [...staticPages];

  for (const t of treatments || []) {
    const slugOrId = t?.slug || t?.id;
    if (!slugOrId) continue;
    // 영구이동된 옛 프로그램은 행이 되살아나도 사이트맵에 싣지 않는다(위 병원과 같은 이유).
    if (REDIRECTED_TREATMENT_SLUGS.includes(slugOrId)) continue;
    const lastModified = t?.updated_at || t?.created_at || now;
    urls.push(
      ...localized(`/treatments/${slugOrId}`, { changeFrequency: 'weekly', priority: 0.8 })
        .map((e) => ({ ...e, lastModified }))
    );
  }

  const seenHospitalSlugs = new Set();
  for (const h of hospitals || []) {
    const slugOrId = h?.slug || h?.id;
    if (!slugOrId) continue;
    // 면력 지점 4개는 DB에 행이 남아 있지만(/hospitals/immune 이 지점별 리뷰를 조인해 쓴다)
    // URL 은 next.config.js 가 /hospitals/immune 으로 영구이동시킨다 → 사이트맵에 넣으면
    // 「리디렉션되는 URL 광고」가 된다(2026-07 GSC 적발). 행은 살리고 URL 만 뺀다.
    if (REDIRECTED_PARTNER_SLUGS.includes(slugOrId)) continue;
    seenHospitalSlugs.add(String(slugOrId));
    const lastModified = h?.updated_at || h?.created_at || now;
    urls.push(
      ...localized(`/hospitals/${slugOrId}`, { changeFrequency: 'weekly', priority: 0.8 })
        .map((e) => ({ ...e, lastModified }))
    );
  }

  // 정적 제휴 병원(DB 미등록 — 예: 성동점)도 누락 없이 포함
  for (const slug of getAllPartnerSlugs()) {
    if (seenHospitalSlugs.has(slug)) continue;
    urls.push(
      ...localized(`/hospitals/${slug}`, { changeFrequency: 'weekly', priority: 0.8 })
        .map((e) => ({ ...e, lastModified: now }))
    );
  }

  return urls;
}
