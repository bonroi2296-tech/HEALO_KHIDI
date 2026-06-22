import { getTreatmentList } from "@/lib/data/treatments";
import { getHospitalList } from "@/lib/data/hospitals";
import { getAllPartnerSlugs } from "@/lib/data/partnerHospitals";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/config";

const DEFAULT_LIMIT = 1000;

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
      // 에러 발생 시 빈 배열 반환 (빌드 실패 방지)
      console.warn("[sitemap] Failed to fetch data:", error?.message);
      treatments = [];
      hospitals = [];
    }
  }

  // 언어화 공개경로 → 6개 언어 URL + hreflang. canonical/대표 URL = 기본언어(en).
  // languages 맵의 키는 BCP47(kz→kk), 값의 경로는 우리 locale 코드(/kz/).
  const localized = (path, { priority, changeFrequency }) => {
    const clean = path === "/" ? "" : path;
    const languages = {};
    for (const l of LOCALES) languages[HREF_LANG[l]] = `${baseUrl}/${l}${clean}`;
    languages["x-default"] = `${baseUrl}/${DEFAULT_LOCALE}${clean}`;
    return {
      url: `${baseUrl}/${DEFAULT_LOCALE}${clean}`,
      changeFrequency,
      priority,
      alternates: { languages },
    };
  };

  // Static pages (언어화 대상)
  const staticPages = [
    localized('/', { changeFrequency: 'weekly', priority: 1.0 }),
    localized('/treatments', { changeFrequency: 'weekly', priority: 0.9 }),
    localized('/hospitals', { changeFrequency: 'weekly', priority: 0.9 }),
    localized('/telemedicine', { changeFrequency: 'weekly', priority: 0.9 }),
    localized('/search', { changeFrequency: 'weekly', priority: 0.8 }),
    localized('/specialties/korean-medicine', { changeFrequency: 'monthly', priority: 0.8 }),
    localized('/hospitals/immune', { changeFrequency: 'monthly', priority: 0.85 }),
    localized('/care-journey', { changeFrequency: 'monthly', priority: 0.8 }),
    // ── 암종별 치료 상세 (면력한방병원 6개 암종)
    localized('/treatments/female', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/digest', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/liver', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/lung', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/thyroid', { changeFrequency: 'monthly', priority: 0.88 }),
    localized('/treatments/etc', { changeFrequency: 'monthly', priority: 0.85 }),
    localized('/faq', { changeFrequency: 'monthly', priority: 0.75 }),
    localized('/education', { changeFrequency: 'monthly', priority: 0.7 }),
    localized('/visa', { changeFrequency: 'monthly', priority: 0.7 }),
    // /inquiry 는 robots.js 에서 Disallow(전환 퍼널·PII 폼) → sitemap 에서 제외
    localized('/about', { changeFrequency: 'monthly', priority: 0.5 }),
    localized('/contact', { changeFrequency: 'monthly', priority: 0.5 }),
    localized('/terms', { changeFrequency: 'yearly', priority: 0.3 }),
    localized('/privacy', { changeFrequency: 'yearly', priority: 0.3 }),
    localized('/cookies', { changeFrequency: 'yearly', priority: 0.2 }),
    localized('/medical-disclaimer', { changeFrequency: 'yearly', priority: 0.2 }),
    // ── Yandex 대응 러시아어·카자흐어 전용 랜딩(언어 prefix와 별개 자산 — 그대로 유지)
    { url: `${baseUrl}/ru/for-russian-patients`, changeFrequency: 'weekly', priority: 0.9,
      alternates: { languages: { 'ru': `${baseUrl}/ru/for-russian-patients`, 'x-default': `${baseUrl}/${DEFAULT_LOCALE}` } } },
    { url: `${baseUrl}/kk/for-kazakh-patients`, changeFrequency: 'weekly', priority: 0.9,
      alternates: { languages: { 'kk': `${baseUrl}/kk/for-kazakh-patients`, 'x-default': `${baseUrl}/${DEFAULT_LOCALE}` } } },
  ].map(p => ({ ...p, lastModified: now }));

  const urls = [...staticPages];

  for (const t of treatments || []) {
    const slugOrId = t?.slug || t?.id;
    if (!slugOrId) continue;
    urls.push({
      ...localized(`/treatments/${slugOrId}`, { changeFrequency: 'weekly', priority: 0.8 }),
      lastModified: t?.updated_at || t?.created_at || now,
    });
  }

  const seenHospitalSlugs = new Set();
  for (const h of hospitals || []) {
    const slugOrId = h?.slug || h?.id;
    if (!slugOrId) continue;
    seenHospitalSlugs.add(String(slugOrId));
    urls.push({
      ...localized(`/hospitals/${slugOrId}`, { changeFrequency: 'weekly', priority: 0.8 }),
      lastModified: h?.updated_at || h?.created_at || now,
    });
  }

  // 정적 제휴 병원(DB 미등록 — 예: 성동점)도 누락 없이 포함
  for (const slug of getAllPartnerSlugs()) {
    if (seenHospitalSlugs.has(slug)) continue;
    urls.push({
      ...localized(`/hospitals/${slug}`, { changeFrequency: 'weekly', priority: 0.8 }),
      lastModified: now,
    });
  }

  return urls;
}
