export interface HospitalRow {
  id: string;
  name: string;
  slug?: string;
  location_kr?: string;
  location_en?: string;
  address_detail?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  tags?: string[];
  images?: string[];
  thumbnail_image?: string;
  gallery_images?: string[];
  specialties?: string[];
  amenities?: string[];
  medical_equipment?: string[];
  supported_languages?: string[];
  operating_hours?: Record<string, string>;
  doctor_profile?: Record<string, any>;
  doctor_count?: number;
  certifications?: string[];
  insurance_accepted?: boolean;
  insurance_details?: string;
  annual_surgery_count?: number;
  establishment_date?: string;
  external_ratings?: Record<string, any>;
  faq?: Array<{ question: string; answer: string }>;
  i18n?: Record<string, any>;
  is_partner?: boolean;
  enrichment_log?: Record<string, EnrichmentLogEntry>;
}

export interface EnrichmentLogEntry {
  last_run: string;
  status: "success" | "failed" | "running";
  items: string[];
  error?: string;
}

export interface EnrichmentResult {
  sourceId: string;
  success: boolean;
  data: Partial<HospitalRow>;
  metadata: {
    itemsCollected: string[];
    duration: number;
  };
  error?: string;
}

export interface EnrichmentSource {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredEnvKeys: string[];
  isAvailable(): boolean;
  enrich(hospital: HospitalRow): Promise<EnrichmentResult>;
}
