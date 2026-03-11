import type { HospitalRow, EnrichmentResult, EnrichmentLogEntry } from "./types";
import { getSource, getAvailableSources } from "./registry";

export interface PipelineResult {
  hospitalId: string;
  results: EnrichmentResult[];
  mergedUpdate: Partial<HospitalRow>;
  enrichmentLog: Record<string, EnrichmentLogEntry>;
}

function deduplicateArray(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])];
}

function mergeResults(results: EnrichmentResult[]): Partial<HospitalRow> {
  const merged: Record<string, any> = {};

  for (const r of results) {
    if (!r.success || !r.data) continue;

    for (const [key, value] of Object.entries(r.data)) {
      if (value === null || value === undefined) continue;

      const existing = merged[key];

      if (Array.isArray(value) && Array.isArray(existing)) {
        merged[key] = deduplicateArray(existing, value);
      } else if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof existing === "object" &&
        !Array.isArray(existing)
      ) {
        merged[key] = { ...existing, ...value };
      } else if (existing === undefined || existing === null || existing === "") {
        merged[key] = value;
      }
    }
  }

  return merged;
}

function buildEnrichmentLog(
  existing: Record<string, EnrichmentLogEntry>,
  results: EnrichmentResult[],
): Record<string, EnrichmentLogEntry> {
  const log = { ...existing };

  for (const r of results) {
    log[r.sourceId] = {
      last_run: new Date().toISOString(),
      status: r.success ? "success" : "failed",
      items: r.metadata.itemsCollected,
      ...(r.error ? { error: r.error } : {}),
    };
  }

  return log;
}

export async function runPipeline(
  hospital: HospitalRow,
  sourceIds: string[],
  onProgress?: (sourceId: string, status: "start" | "done" | "error") => void,
): Promise<PipelineResult> {
  const available = getAvailableSources();
  const availableIds = new Set(available.map((s) => s.id));

  const toRun = sourceIds.filter((id) => availableIds.has(id));
  const results: EnrichmentResult[] = [];

  for (const sourceId of toRun) {
    const source = getSource(sourceId);
    if (!source) continue;

    onProgress?.(sourceId, "start");

    try {
      const result = await source.enrich(hospital);
      results.push(result);
      if (!result.success) {
        console.error(`[enrichment] Source "${sourceId}" failed:`, result.error);
      }
      onProgress?.(sourceId, result.success ? "done" : "error");
    } catch (err: any) {
      console.error(`[enrichment] Source "${sourceId}" threw:`, err.message);
      results.push({
        sourceId,
        success: false,
        data: {},
        metadata: { itemsCollected: [], duration: 0 },
        error: err.message,
      });
      onProgress?.(sourceId, "error");
    }
  }

  return {
    hospitalId: hospital.id,
    results,
    mergedUpdate: mergeResults(results),
    enrichmentLog: buildEnrichmentLog(hospital.enrichment_log || {}, results),
  };
}
