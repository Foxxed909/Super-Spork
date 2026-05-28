#!/usr/bin/env node
/**
 * Spork MCP Server — stdio JSON-RPC 2.0 server
 *
 * Compatible with Claude Code, Gemini CLI, and any MCP-compliant assistant.
 *
 * Setup in Claude Code (~/.claude/settings.json or project .claude/settings.json):
 * {
 *   "mcpServers": {
 *     "spork": {
 *       "command": "npx",
 *       "args": ["@spork/mcp"]
 *     }
 *   }
 * }
 *
 * The server reads OPENROUTER_API_KEY and SPORK_TOKEN from env or ~/.spork/config.json
 */

import { SPORK_TOOLS } from "./tools";
import { loadConfig, DEFAULT_MODEL, DEFAULT_SPORK_URL } from "./config";
import { callOpenRouter } from "./handlers/openrouter";

const AGENTS: Record<string, string> = {
  hacker: "You are H4ck3r — cryptic, precise, thinks in exploits and edge cases. No pleasantries. Terminal speed.",
  dev: "You are Dev — pragmatic developer. Skip preamble, go straight to the fix. Prefer working code over theory.",
  "senior-dev": "You are a Senior Dev — deep expertise, pragmatic trade-off analysis, code quality focus.",
  nerd: "You are The Nerd — enthusiastic, deep dives, loves explaining with analogies and examples.",
  cockroach: "You are The Cockroach — indestructible, scrappy, always finds a way. Speak with attitude.",
  oracle: "You are The Oracle — wise, measured, speaks in principles and patterns.",
  "rubber-duck": "You are a Rubber Duck — you help the user think out loud by asking clarifying questions.",
};

function writeResponse(obj: unknown): void {
  const json = JSON.stringify(obj);
  process.stdout.write(json + "\n");
}

function makeError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleToolCall(
  name: string,
  args: Record<string, string>,
  config: ReturnType<typeof loadConfig>
): Promise<string> {
  const apiKey = config.apiKey;
  if (!apiKey && name !== "spork_list_agents") {
    throw new Error(
      "No OpenRouter API key. Add 'apiKey' to ~/.spork/config.json or set OPENROUTER_API_KEY."
    );
  }

  const model = args.model ?? config.model ?? DEFAULT_MODEL;
  const agentPrompt = args.agent ? (AGENTS[args.agent] ?? AGENTS.dev) : AGENTS.dev;

  switch (name) {
    case "spork_ask": {
      const messages = [
        { role: "system", content: agentPrompt },
        { role: "user", content: args.prompt },
      ];
      return callOpenRouter(messages, model, apiKey!);
    }

    case "spork_review_code": {
      const systemPrompt = AGENTS[args.agent ?? "hacker"]!;
      const messages = [
        {
          role: "system",
          content: `${systemPrompt}\n\nYou are doing a structured code review. Format your response as:\n\n## Summary\n<1-2 sentences>\n\n## Issues\n- [CRITICAL/WARNING/SUGGESTION] Line X: <description and fix>\n\n## Positives\n<what's done well>`,
        },
        {
          role: "user",
          content: `Review this${args.filename ? ` (${args.filename})` : ""} code:\n\n\`\`\`\n${args.code}\n\`\`\``,
        },
      ];
      return callOpenRouter(messages, model, apiKey!);
    }

    case "spork_explain": {
      const depth = args.depth === "eli5" ? "Explain like I'm 5" : args.depth === "detailed" ? "Give a thorough technical explanation" : "Give a brief, clear explanation";
      const messages = [
        { role: "system", content: "You are an expert software engineer who explains code clearly." },
        { role: "user", content: `${depth}${args.filePath ? ` (file: ${args.filePath})` : ""}:\n\n\`\`\`\n${args.code}\n\`\`\`` },
      ];
      return callOpenRouter(messages, model, apiKey!);
    }

    case "spork_fif": {
      const messages = [
        {
          role: "system",
          content: `You are H4ck3r — an expert debugger. Find all bugs, logical errors, and security issues in code. Format as:\n\n## Bugs Found\n\n### Bug 1: <title>\n- **Severity**: critical/high/medium/low\n- **Line**: X (approximate)\n- **Problem**: <description>\n- **Fix**: \`\`\`${args.language ?? ""}\n<fixed code>\n\`\`\`\n\n(continue for each bug)\n\n## Clean Bill if no bugs found.`,
        },
        {
          role: "user",
          content: `${args.context ? `Context: ${args.context}\n\n` : ""}Code to analyze${args.language ? ` (${args.language})` : ""}:\n\n\`\`\`${args.language ?? ""}\n${args.code}\n\`\`\``,
        },
      ];
      return callOpenRouter(messages, model, apiKey!);
    }

    case "spork_generate": {
      const messages = [
        {
          role: "system",
          content: `You are an expert ${args.language ?? "software"} developer${args.framework ? ` specializing in ${args.framework}` : ""}. Generate clean, working, production-ready code. Include brief inline comments only where the WHY is non-obvious.`,
        },
        { role: "user", content: args.description },
      ];
      return callOpenRouter(messages, model, apiKey!);
    }

    case "spork_save_memory": {
      const sporkUrl = config.sporkApiUrl ?? DEFAULT_SPORK_URL;
      const token = config.sporkToken;
      if (!token) {
        throw new Error(
          "No Spork API token. Add 'sporkToken' to ~/.spork/config.json or set SPORK_TOKEN. Generate a token at your Spork app → Settings → API Tokens."
        );
      }
      const res = await fetch(`${sporkUrl}/api/memory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: args.content }),
      });
      if (!res.ok) throw new Error(`Failed to save memory: ${res.status}`);
      return `Memory saved: "${args.content}"`;
    }

    case "spork_list_agents": {
      return Object.entries(AGENTS)
        .map(([id, prompt]) => `**${id}**: ${prompt.slice(0, 80)}...`)
        .join("\n");
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function main() {
  const config = loadConfig();

  let inputBuffer = "";
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", async (chunk: string) => {
    inputBuffer += chunk;
    const lines = inputBuffer.split("\n");
    inputBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let request: { jsonrpc: string; id?: unknown; method: string; params?: Record<string, unknown> };
      try {
        request = JSON.parse(trimmed);
      } catch {
        writeResponse(makeError(null, -32700, "Parse error"));
        continue;
      }

      const { id, method, params = {} } = request;

      try {
        switch (method) {
          case "initialize":
            writeResponse({
              jsonrpc: "2.0",
              id,
              result: {
                protocolVersion: "2024-11-05",
                serverInfo: { name: "@spork/mcp", version: "1.0.0" },
                capabilities: { tools: {} },
              },
            });
            break;

          case "tools/list":
            writeResponse({
              jsonrpc: "2.0",
              id,
              result: { tools: SPORK_TOOLS },
            });
            break;

          case "tools/call": {
            const toolName = (params as { name?: string }).name ?? "";
            const toolArgs = ((params as { arguments?: Record<string, string> }).arguments ?? {}) as Record<string, string>;

            const result = await handleToolCall(toolName, toolArgs, config);
            writeResponse({
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: result }],
              },
            });
            break;
          }

          case "notifications/initialized":
            // No response needed for notifications
            break;

          default:
            writeResponse(makeError(id, -32601, `Method not found: ${method}`));
        }
      } catch (err) {
        writeResponse(makeError(id, -32603, (err as Error).message));
      }
    }
  });

  process.stdin.on("end", () => process.exit(0));
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
