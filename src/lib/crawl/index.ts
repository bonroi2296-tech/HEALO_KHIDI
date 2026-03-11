import type { CrawlSource } from "./types";
import { hiraCrawlSource } from "./sources/hira";
import { googlePlacesSearchSource } from "./sources/google-places-search";
import { kakaoLocalSource } from "./sources/kakao-local";
import { naverLocalSource } from "./sources/naver-local";
import { SPECIALTY_GROUPS } from "./specialty-groups";

export type { CrawlSource, CrawlSearchParams, CrawlResult, CrawlHospitalRow } from "./types";
export { SPECIALTY_GROUPS } from "./specialty-groups";

const sources = new Map<string, CrawlSource>();

let initialized = false;

export function initCrawlSources() {
  if (initialized) return;
  sources.set(hiraCrawlSource.id, hiraCrawlSource);
  sources.set(googlePlacesSearchSource.id, googlePlacesSearchSource);
  sources.set(kakaoLocalSource.id, kakaoLocalSource);
  sources.set(naverLocalSource.id, naverLocalSource);
  initialized = true;
}

export function getCrawlSource(id: string): CrawlSource | undefined {
  return sources.get(id);
}

export function getAllCrawlSources(): CrawlSource[] {
  return Array.from(sources.values());
}

export function getCrawlSourceManifest() {
  return getAllCrawlSources().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    available: s.isAvailable(),
    requiredEnvKeys: s.requiredEnvKeys,
    regions: s.regions,
    specialties: s.specialties.map((sp: any) => {
      const group = SPECIALTY_GROUPS.find((g) => g.key === sp.key);
      return {
        ...sp,
        labelEn: group?.labelEn || "",
        subSpecialties: group?.subSpecialties || [],
      };
    }),
    fields: s.fields,
  }));
}
