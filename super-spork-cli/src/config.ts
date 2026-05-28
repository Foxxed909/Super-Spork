/**
 * Merged config for SporkX CLI.
 * Primary path: ~/.spork/super-config.json
 * Also reads legacy ~/.spork/config.json for apiKey migration.
 * Env var OPENROUTER_API_KEY always takes precedence for the key.
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const SPORK_DIR = path.join(os.homedir(), ".spork");
export const CONFIG_PATH = path.join(SPORK_DIR, "super-config.json");
const LEGACY_CONFIG_PATH = path.join(SPORK_DIR, "config.json");

export interface SporkXConfig {
  /** OpenRouter API key */
  openrouterKey?: string;
  /** Bearer token for Spork web API */
  sporkToken?: string;
  /** Spork web app base URL */
  appUrl?: string;
  /** Default model to use for completions */
  model?: string;
  /** Agent persona ID */
  agentId?: string;
}

interface LegacyConfig {
  apiKey?: string;
  model?: string;
  agent?: string;
}

export function loadConfig(): SporkXConfig {
  let cfg: SporkXConfig = {};

  // 1. Load primary config
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as SporkXConfig;
    }
  } catch {}

  // 2. Fall back to legacy config for apiKey if not present
  if (!cfg.openrouterKey) {
    try {
      if (fs.existsSync(LEGACY_CONFIG_PATH)) {
        const legacy = JSON.parse(
          fs.readFileSync(LEGACY_CONFIG_PATH, "utf8")
        ) as LegacyConfig;
        if (legacy.apiKey) cfg.openrouterKey = legacy.apiKey;
        if (!cfg.model && legacy.model) cfg.model = legacy.model;
        if (!cfg.agentId && legacy.agent) cfg.agentId = legacy.agent;
      }
    } catch {}
  }

  // 3. Env var override
  if (process.env.OPENROUTER_API_KEY) {
    cfg.openrouterKey = process.env.OPENROUTER_API_KEY;
  }

  // 4. Apply defaults
  if (!cfg.appUrl) cfg.appUrl = "https://spork.ai";

  return cfg;
}

export function saveConfig(patch: Partial<SporkXConfig>): void {
  if (!fs.existsSync(SPORK_DIR)) fs.mkdirSync(SPORK_DIR, { recursive: true });
  const existing = loadConfig();
  // Strip env-var-injected key before persisting to avoid double-storing
  const toWrite: SporkXConfig = { ...existing, ...patch };
  if (process.env.OPENROUTER_API_KEY && toWrite.openrouterKey === process.env.OPENROUTER_API_KEY) {
    delete toWrite.openrouterKey;
    // Re-apply from patch if the caller explicitly set it
    if (patch.openrouterKey) toWrite.openrouterKey = patch.openrouterKey;
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(toWrite, null, 2));
}

/** Returns the resolved API key or exits with an error. */
export function requireApiKey(cfg: SporkXConfig): string {
  const key = cfg.openrouterKey ?? "";
  if (!key) {
    console.error(
      "No OpenRouter API key found.\n" +
        "  Run: sporkx login <your-openrouter-key>\n" +
        "  Or set env var: OPENROUTER_API_KEY"
    );
    process.exit(1);
  }
  return key;
}

// Rough token estimation: ~4 chars per token
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Cost per 1k tokens (rough estimates for common models)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "anthropic/claude-opus-4:thinking": { input: 0.015, output: 0.075 },
  "anthropic/claude-sonnet-4-6": { input: 0.003, output: 0.015 },
  "anthropic/claude-haiku-3-5": { input: 0.0008, output: 0.004 },
  "openai/gpt-4o": { input: 0.005, output: 0.015 },
  "openai/gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "openai/gpt-oss-120b:free": { input: 0, output: 0 },
};

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model] ?? { input: 0.005, output: 0.015 };
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
}

export { MODEL_COSTS };
