export interface CrawlSearchParams {
  regions?: string[];
  specialties?: string[];
  keyword?: string;
  limit?: number;
  page?: number;
  fields?: string[];
}

export interface CrawlHospitalRow {
  name: string;
  location_kr: string | null;
  location_en: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  specialties: string[];
  doctor_count: number | null;
  phone: string | null;
  website: string | null;
  _sourceId: string;
  _dedupeKey: string;
  _meta: Record<string, any>;
}

export interface CrawlResult {
  sourceId: string;
  total: number;
  items: CrawlHospitalRow[];
  hasMore: boolean;
  error?: string;
}

export interface FieldMeta {
  key: string;
  label: string;
  description: string;
  category: "basic" | "location" | "contact" | "medical" | "rating" | "extra";
  defaultOn: boolean;
}

export interface CrawlSource {
  id: string;
  name: string;
  description: string;
  icon: string;
  regions: { key: string; label: string }[];
  specialties: { key: string; label: string }[];
  fields: FieldMeta[];
  requiredEnvKeys: string[];
  isAvailable(): boolean;
  search(params: CrawlSearchParams): Promise<CrawlResult>;
}
