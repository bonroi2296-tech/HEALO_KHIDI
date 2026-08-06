import type { TablesUpdate } from "@/types/database.types";

/**
 * 실DB `hospitals` 의 「쓸 수 있는 칸」에서 파생한다 — 손으로 베껴 적지 않는다.
 *
 * 왜: 예전엔 이 목록을 손으로 적어놨는데, 실제 표에 없는 칸이 섞여 들어가면
 * 저장이 통째로 실패했다(#103 부류). 실제로 `enrichment_log` 는 여기엔 있는데
 * DB 엔 없어서 병원 정보 자동수집이 계속 실패하고 있었다. 파생시키면 그 자체가 불가능해진다.
 *
 * 칸 「이름」은 실제 표에서 받고, jsonb 칸의 안쪽 「모양」만 여기서 좁힌다
 * (DB 타입은 jsonb = 아무거나라 뭘 담는지 못 알려준다).
 */
type JsonbShapes = {
  enrichment_log?: Record<string, EnrichmentLogEntry> | null;
  operating_hours?: Record<string, string> | null;
  doctor_profile?: Record<string, any> | null;
  external_ratings?: Record<string, any> | null;
  i18n?: Record<string, any> | null;
  faq?: Array<{ question: string; answer: string }> | null;
};

export type HospitalRow = Omit<TablesUpdate<"hospitals">, keyof JsonbShapes> &
  JsonbShapes & {
    id: string;
    name: string;
  };

// interface 가 아니라 type — interface 는 jsonb(Json) 자리에 못 들어간다(색인 서명 불일치).
export type EnrichmentLogEntry = {
  last_run: string;
  status: "success" | "failed" | "running";
  items: string[];
  error?: string;
};

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
