import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CONFIG_PATH = path.join(os.homedir(), ".spork", "config.json");
const SUPER_CONFIG_PATH = path.join(os.homedir(), ".spork", "super-config.json");

interface SporkConfig {
  apiKey?: string;      // OpenRouter API key
  sporkToken?: string;  // Spork web app API token
  sporkApiUrl?: string; // Spork web app URL
  model?: string;
  agent?: string;
}

export function loadConfig(): SporkConfig {
  const config: SporkConfig = {};

  for (const filePath of [CONFIG_PATH, SUPER_CONFIG_PATH]) {
    try {
      if (fs.existsSync(filePath)) {
        Object.assign(config, JSON.parse(fs.readFileSync(filePath, "utf8")));
      }
    } catch {}
  }

  // Also check environment variables
  if (process.env.OPENROUTER_API_KEY) config.apiKey = process.env.OPENROUTER_API_KEY;
  if (process.env.SPORK_TOKEN) config.sporkToken = process.env.SPORK_TOKEN;
  if (process.env.SPORK_API_URL) config.sporkApiUrl = process.env.SPORK_API_URL;

  return config;
}

export const DEFAULT_MODEL = "openai/gpt-oss-120b:free";
export const DEFAULT_SPORK_URL = "https://your-spork-app.com";
