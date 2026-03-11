import type { EnrichmentSource } from "./types";

const sources = new Map<string, EnrichmentSource>();

export function registerSource(source: EnrichmentSource) {
  sources.set(source.id, source);
}

export function getSource(id: string): EnrichmentSource | undefined {
  return sources.get(id);
}

export function getAllSources(): EnrichmentSource[] {
  return Array.from(sources.values());
}

export function getAvailableSources(): EnrichmentSource[] {
  return getAllSources().filter((s) => s.isAvailable());
}

export function getSourceManifest() {
  return getAllSources().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    available: s.isAvailable(),
    requiredEnvKeys: s.requiredEnvKeys,
  }));
}
