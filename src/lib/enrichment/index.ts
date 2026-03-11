export type {
  HospitalRow,
  EnrichmentSource,
  EnrichmentResult,
  EnrichmentLogEntry,
} from "./types";
export {
  registerSource,
  getSource,
  getAllSources,
  getAvailableSources,
  getSourceManifest,
} from "./registry";
export { runPipeline } from "./pipeline";
export type { PipelineResult } from "./pipeline";

import { registerSource } from "./registry";
import { googlePlacesSource } from "./sources/google-places";
import { kakaoMapSource } from "./sources/kakao-map";
import { aiGeneratorSource } from "./sources/ai-generator";

let initialized = false;

export function initSources() {
  if (initialized) return;
  registerSource(googlePlacesSource);
  registerSource(kakaoMapSource);
  registerSource(aiGeneratorSource);
  initialized = true;
}
