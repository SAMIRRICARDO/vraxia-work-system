import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RUNTIME_CONFIG_FILE = resolve(ROOT, "config", "runtime-config.json");

export interface RuntimeConfig {
  cheapMode: boolean;
  preferredModel: string;
  maxLeadsPerBatch: number;
  maxDailyRuns: number;
  runTime: string;
  weekendBlocked: boolean;
  maxOutputTokens: number;
  avoidReasoning: boolean;
  jsonOnly: boolean;
  alwaysEnrichLeads: boolean;
  requireEnrichmentBeforeOutbound: boolean;
  humanThrottle: boolean;
  maxOutboundHour: number;
  poolRotationDays: number;
}

const defaults: RuntimeConfig = {
  cheapMode: true,
  preferredModel: "claude-haiku-4-5-20251001",
  maxLeadsPerBatch: 25,
  maxDailyRuns: 1,
  runTime: "07:30",
  weekendBlocked: true,
  maxOutputTokens: 300,
  avoidReasoning: true,
  jsonOnly: true,
  alwaysEnrichLeads: true,
  requireEnrichmentBeforeOutbound: true,
  humanThrottle: true,
  maxOutboundHour: 16,
  poolRotationDays: 90,
};

function readRuntimeConfig(): RuntimeConfig {
  if (!existsSync(RUNTIME_CONFIG_FILE)) return defaults;

  try {
    const parsed = JSON.parse(readFileSync(RUNTIME_CONFIG_FILE, "utf8")) as Partial<RuntimeConfig>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export const runtimeConfig = readRuntimeConfig();
