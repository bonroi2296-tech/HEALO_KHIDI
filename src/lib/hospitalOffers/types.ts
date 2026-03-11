/**
 * HOSPITAL_OFFER_IMPORT_V1: 미리보기/Apply 페이로드 타입
 * - 출처 없는 값은 null. "verified" 문구 금지.
 */

export interface OfferSource {
  url: string;
  type: "html" | "pdf" | "image";
  title?: string;
}

export interface TreatmentOffer {
  name: string;
  slug?: string | null;
  description?: string | null;
  full_description?: string | null;
  duration?: number | null; // 분
  anesthesia_type?: string | null;
  recovery_time_min?: number | null;
  recovery_time_max?: number | null;
  side_effects?: string[];
  precautions?: string[];
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  /** 가격 미정 시 "문의" 등 */
  price_note?: string | null;
  price_includes?: string[];
  tags?: string[];
  images?: string[];
}

export interface FieldEvidence {
  source_url: string;
  snippet_or_ocr_text: string;
}

export interface OfferEvidence {
  [field: string]: FieldEvidence | undefined;
}

export interface OfferItem {
  treatment: TreatmentOffer;
  evidence: OfferEvidence;
  confidence: number; // 0~1
}

export interface EnrichJobInfo {
  id: string;
  status: "queued" | "running" | "done" | "error";
}

export interface OffersPreviewPayload {
  hospital_id: string;
  captured_at: string; // ISO
  sources: OfferSource[];
  offers: OfferItem[]; // 최대 3
  enrich_job?: EnrichJobInfo;
}

/** A) 로깅/진단용: DEV에서만 preview 응답에 포함 */
export interface DebugFetchedPage {
  url: string;
  status: "ok" | "fail";
  text_len: number;
  has_price_like: boolean;
  has_treatment_like: boolean;
  discovered_links_count: number;
}

export interface DebugCrawlInfo {
  fetched_pages: DebugFetchedPage[];
  discovered_links_top: string[];
  /** has_price_like 페이지 5개 이상이면 "price", 아니면 "program" */
  hospital_type?: "price" | "program";
  extraction_attempt?: {
    mode: "llm" | "regex";
    candidates_count: number;
    selected_count: number;
    fail_reason?: string;
  };
  assets_found: { pdf_count: number; image_count: number; ocr_used: boolean; pdf_used: boolean };
  /** 페이지 랭킹 후 상위 10개 (DEV) */
  candidate_rank_top10?: Array<{ url: string; score: number; signals: Record<string, number>; text_len: number }>;
  /** 랭킹에서 제외된 페이지 상위 10개 (DEV) */
  rejected_pages_top10?: Array<{ url: string; reason: string; score: number }>;
  /** LLM 입력 구성 통계 (DEV) */
  llm_input_stats?: { pages_used: number; chars_used: number; cutoff_chars: number };
  /** URL 품질 분류 개수 (DEV) */
  url_quality_breakdown?: { good: number; neutral: number; bad: number };
  /** DOM 구조 추출 통계 (Playwright, DEV) */
  dom_extract_stats?: {
    tables_rows: number;
    price_blocks: number;
    headings: number;
    chars_total: number;
    filtered_price_blocks_count?: number;
    removed_by_layout_count?: number;
    removed_by_noise_keyword_count?: number;
    removed_by_short_length_count?: number;
  };
  /** DOM 추출 텍스트 상위 5개 샘플, 각 300자 (DEV) */
  dom_extract_samples?: string[];
  /** program 전략: 제목 후보 페이지 수 (DEV) */
  program_candidates_count?: number;
  /** program 전략: 채택된 오퍼 수 (DEV) */
  program_selected_count?: number;
  /** LLM 0건 시 program fallback 발동 여부 (DEV) */
  fallback_used?: string;
  /** program fallback 제목 추출 디버그: url, raw_title, chosen_title, reason_if_skipped (DEV) */
  program_title_sources?: Array<{
    url: string;
    raw_title: string | null;
    chosen_title: string | null;
    reason_if_skipped?: string;
  }>;
  /** normalizeOfferDraft에서 reject된 초안 샘플 최대 5개 (DEV) */
  rejected_drafts?: Array<{ raw_name: string | null; reason: string }>;
  /** 대표 시술: 프로그램 랭킹 상위 10 (DEV) */
  program_rank_top10?: Array<{ url: string; score: number; signals: Record<string, number> }>;
  /** 대표 시술: 프로그램 랭킹 제외 10 (DEV) */
  program_rejected_top10?: Array<{ url: string; score: number; reason: string }>;
  /** 대표 시술: 후보 수 / 최종 선택 수 (DEV) */
  representative_candidates_count?: number;
  representative_selected_count?: number;
  /** 가격 인덱스 크기 (DEV) */
  price_index_size?: number;
  /** 가격 매칭: exact/fuzzy/none 건수 (DEV) */
  price_match_stats?: { exact_count: number; fuzzy_count: number; none_count: number };
  /** 대표 시술 샘플 5개: 이름/설명/가격 (DEV) */
  representative_sample_offers?: Array<{ name: string; description: string; price: string }>;
  /** LLM 시술 분류기에서 거절된 후보 (최대 5개, DEV) */
  medical_classifier_rejected?: string[];
  /** 시술 분류 파이프라인 (규칙 1차 → 배치 LLM, DEV) */
  medical_classifier?: {
    total_in: number;
    after_rule: number;
    sent_to_llm: number;
    kept: number;
    rejected_samples: Array<{ name: string; reason: string }>;
  };
  /** name 정규화에서 reject된 샘플 최대 5개 (raw_name, reason, source_url, DEV) */
  name_reject_samples?: Array<{ raw_name: string | null; reason: string; source_url?: string }>;
  /** URL 콘텐츠 페이지로 제외된 샘플 최대 5개 (DEV) */
  url_excluded_samples?: Array<{ url: string; reason: string }>;
  /** Evidence 기반 LLM: 후보별 선택된 evidence URL (DEV) */
  evidence_selected_samples?: Array<{ candidateName: string; url: string }>;
  /** Evidence batch LLM 전송 건수 / 타임아웃 여부 (DEV) */
  llm_batch_sent_count?: number;
  llm_batch_timeout?: boolean;
}

/** DOM에서 추출한 시술/가격 관련 블록 (Playwright page.evaluate 결과) */
export interface DomExtractPerPage {
  tables_text: string;
  price_blocks_text: string;
  headings_context: string;
  tables_rows: number;
  price_blocks_count: number;
  headings_count: number;
  /** 필터 후 최종 가격 블록 수 */
  filtered_price_blocks_count?: number;
  removed_by_layout_count?: number;
  removed_by_noise_keyword_count?: number;
  removed_by_short_length_count?: number;
  /** document.title (페이지 제목) */
  page_title?: string;
  /** og:title 메타 값 */
  og_title?: string;
  /** 첫 번째 h1 텍스트 (program 제목 우선 후보) */
  h1_text?: string;
}

/** 크롤 시 수집된 페이지 단위 데이터 (랭킹 입력) */
export interface FetchedPageForRanking {
  url: string;
  text: string;
  text_len: number;
  /** Playwright에서만 존재: 테이블/가격블록/제목+단락 추출 */
  dom_extract?: DomExtractPerPage;
}
