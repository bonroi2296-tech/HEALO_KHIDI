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

  const urls = [];

  for (const t of treatments || []) {
    const slugOrId = t?.slug || t?.id;
    if (!slugOrId) continue;
    urls.push({
      url: `${baseUrl}/treatments/${slugOrId}`,
      lastModified: t?.updated_at || t?.created_at || now,
    });
  }

  for (const h of hospitals || []) {
    const slugOrId = h?.slug || h?.id;
    if (!slugOrId) continue;
    urls.push({
      url: `${baseUrl}/hospitals/${slugOrId}`,
      lastModified: h?.updated_at || h?.created_at || now,
    });
  }

  return urls;
}
