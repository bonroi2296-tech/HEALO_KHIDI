import { getTreatmentList } from "../src/lib/data/treatments";
import { getHospitalList } from "../src/lib/data/hospitals";

const DEFAULT_LIMIT = 1000;

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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

  // Static pages
  const staticPages = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/treatments`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/hospitals`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/telemedicine`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/search`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/specialties/dental`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/specialties/dermatology`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/specialties/plastic-surgery`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/specialties/korean-medicine`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/hospitals/immune`, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/stories`, changeFrequency: 'weekly', priority: 0.75 },
    { url: `${baseUrl}/education`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/patient/education`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/patient/visa`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/visa`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/inquiry`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/consult/start`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/cookies`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/medical-disclaimer`, changeFrequency: 'yearly', priority: 0.2 },
  ].map(p => ({ ...p, lastModified: now }));

  const urls = [...staticPages];

  for (const t of treatments || []) {
    const slugOrId = t?.slug || t?.id;
    if (!slugOrId) continue;
    urls.push({
      url: `${baseUrl}/treatments/${slugOrId}`,
      lastModified: t?.updated_at || t?.created_at || now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  for (const h of hospitals || []) {
    const slugOrId = h?.slug || h?.id;
    if (!slugOrId) continue;
    urls.push({
      url: `${baseUrl}/hospitals/${slugOrId}`,
      lastModified: h?.updated_at || h?.created_at || now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  return urls;
}
