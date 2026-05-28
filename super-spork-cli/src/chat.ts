/**
 * Streaming chat via OpenRouter — the core completion primitive for SporkX.
 * Supports streaming and non-streaming modes, agent personas, and budget control.
 */
import * as https from "https";
import { SporkXConfig, estimateTokens, MODEL_COSTS } from "./config";

const AGENTS: Record<string, string> = {
  hacker:
    "You are a hacker-type AI. Blunt, technical, no fluff. Think terminal, not boardroom.",
  dev: "You are a developer assistant. Practical, code-focused, no unnecessary talk.",
  cockroach:
    "You are the Cockroach — indestructible, scrappy, always finding a way. Speak with attitude.",
  nerd: "You are a passionate tech nerd. Enthusiastic, deep dives, loves explaining things thoroughly.",
  oracle:
    "You are the Oracle. Wise, measured, speaks in principles and patterns.",
};

export const DEFAULT_CHAT_MODEL = "openai/gpt-oss-120b:free";
export const DEFAULT_AGENT_MODEL = "anthropic/claude-sonnet-4-6";

export interface ChatOptions {
  prompt: string;
  model: string;
  apiKey: string;
  agentId?: string;
  systemPrompt?: string;
  stream?: boolean;
  onChunk?: (text: string) => void;
  budgetUsd?: number;
  inputTokensEstimate?: number;
}

/** Stream or collect a single completion, returning the full response text. */
export async function chat(opts: ChatOptions): Promise<string> {
  const {
    prompt,
    model,
    apiKey,
    agentId,
    systemPrompt,
    stream = true,
    onChunk,
    budgetUsd,
    inputTokensEstimate = 0,
  } = opts;

  const resolvedSystem =
    systemPrompt ??
    (agentId && AGENTS[agentId]
      ? AGENTS[agentId]
      : "You are SporkX, a fast and helpful AI assistant. Be concise and accurate.");

  const messages = [
    { role: "system", content: resolvedSystem },
    { role: "user", content: prompt },
  ];

  const costs = MODEL_COSTS[model] ?? { input: 0.005, output: 0.015 };
  const inputCost = (inputTokensEstimate / 1000) * costs.input;
  if (budgetUsd !== undefined && inputCost > budgetUsd) {
    throw new Error(
      `Budget exhausted. Estimated input alone costs $${inputCost.toFixed(4)} but budget is $${budgetUsd}`
    );
  }

  const body = JSON.stringify({ model, messages, stream });

  return new Promise((resolve, reject) => {
    let fullText = "";

    const req = https.request(
      {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://spork.ai",
          "X-Title": "SporkX CLI",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let errBody = "";
          res.on("data", (c: Buffer) => { errBody += c.toString(); });
          res.on("end", () => {
            console.error(
              `OpenRouter error ${res.statusCode}: ${errBody.trim() || "Request failed"}`
            );
            process.exit(1);
          });
          return;
        }

        if (stream) {
          let buffer = "";
          res.on("data", (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullText += delta;
                    if (onChunk) {
                      onChunk(delta);
                    } else {
                      process.stdout.write(delta);
                    }
                    // Budget guard on output
                    if (budgetUsd !== undefined) {
                      const outputCost =
                        (estimateTokens(fullText) / 1000) * costs.output;
                      if (inputCost + outputCost > budgetUsd) {
                        process.stdout.write(
                          `\n\n[Budget limit of $${budgetUsd} reached. Response truncated.]\n`
                        );
                        req.destroy();
                        resolve(fullText);
                        return;
                      }
                    }
                  }
                } catch {}
              }
            }
          });
          res.on("end", () => {
            if (!onChunk) process.stdout.write("\n");
            resolve(fullText);
          });
          res.on("error", reject);
        } else {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.message?.content ?? "";
              fullText = content;
              if (!onChunk) console.log(content);
              else onChunk(content);
            } catch {
              console.error("Failed to parse response:", data);
            }
            resolve(fullText);
          });
          res.on("error", reject);
        }
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/** Convenience wrapper: stream completion with messages array (used by agent-style commands). */
export async function streamCompletion(opts: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  apiKey: string;
  onChunk?: (text: string) => void;
  budgetUsd?: number;
  inputTokensEstimate?: number;
}): Promise<string> {
  const { model, messages, apiKey, onChunk, budgetUsd, inputTokensEstimate = 0 } = opts;
  const costs = MODEL_COSTS[model] ?? { input: 0.005, output: 0.015 };
  const inputCost = (inputTokensEstimate / 1000) * costs.input;

  if (budgetUsd !== undefined && inputCost > budgetUsd) {
    throw new Error(
      `Budget exhausted. Estimated input alone costs $${inputCost.toFixed(4)} but budget is $${budgetUsd}`
    );
  }

  const body = JSON.stringify({ model, messages, stream: true });

  return new Promise((resolve, reject) => {
    let fullText = "";

    const req = https.request(
      {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://spork.ai",
          "X-Title": "SporkX CLI",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let errBody = "";
          res.on("data", (c: Buffer) => { errBody += c.toString(); });
          res.on("end", () => {
            console.error(
              `OpenRouter error ${res.statusCode}: ${errBody.trim() || "Request failed"}`
            );
            process.exit(1);
          });
          return;
        }

        let buffer = "";
        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  onChunk?.(delta);
                  if (budgetUsd !== undefined) {
                    const outputCost =
                      (estimateTokens(fullText) / 1000) * costs.output;
                    if (inputCost + outputCost > budgetUsd) {
                      process.stdout.write(
                        `\n\n[Budget limit of $${budgetUsd} reached. Response truncated.]\n`
                      );
                      req.destroy();
                      resolve(fullText);
                      return;
                    }
                  }
                }
              } catch {}
            }
          }
        });
        res.on("end", () => resolve(fullText));
        res.on("error", reject);
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/** Apply ANSI syntax highlighting to markdown code fences in a string. */
export function highlightCodeFences(text: string): string {
  const RESET = "\x1b[0m";
  const GREEN = "\x1b[32m";
  const CYAN = "\x1b[36m";
  const YELLOW = "\x1b[33m";
  const BLUE = "\x1b[34m";

  return text.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_: string, lang: string, code: string) => {
      const highlighted = code
        .replace(
          /\b(const|let|var|function|class|return|if|else|for|while|import|export|from|async|await|new|typeof|instanceof|def|print|self|None|True|False)\b/g,
          `${BLUE}$1${RESET}`
        )
        .replace(
          /\b(true|false|null|undefined|void|nil)\b/g,
          `${YELLOW}$1${RESET}`
        )
        .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, `${GREEN}$&${RESET}`)
        .replace(/(\/\/[^\n]*)|(#[^\n]*)/g, `${CYAN}$1$2${RESET}`);
      return `\`\`\`${lang}\n${highlighted}\`\`\``;
    }
  );
}
