/**
 * `sporkx explain <file>` — explain what a file does in plain language.
 */
import * as fs from "fs";
import * as path from "path";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey } from "./config";

export interface ExplainOptions {
  file: string;
  model?: string;
}

export async function explain(opts: ExplainOptions): Promise<void> {
  const cfg = loadConfig();
  const model = opts.model ?? cfg.model ?? "anthropic/claude-sonnet-4-6";
  const apiKey = requireApiKey(cfg);

  const absPath = path.resolve(opts.file);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  let content: string;
  try {
    content = fs.readFileSync(absPath, "utf8");
  } catch (e) {
    console.error(`Cannot read file: ${e}`);
    process.exit(1);
  }

  if (content.length > 100_000) {
    console.error("File is too large to explain (> 100KB). Consider explaining a specific section.");
    process.exit(1);
  }

  console.log(`\n✦ SporkX Explain: ${opts.file}\n`);
  console.log("─".repeat(60));

  await streamCompletion({
    model,
    messages: [
      {
        role: "system",
        content: `You are an expert at explaining code clearly to developers.
Your explanation should cover:
1. What this file/module does (1-2 sentences)
2. Key functions/classes/exports and what they do
3. Important patterns or architectural decisions
4. Data flow: inputs, outputs, side effects
5. Any non-obvious behaviors, gotchas, or tricky parts

Keep it practical and concise — this is for a developer who needs to work with this code.`,
      },
      {
        role: "user",
        content: `Explain this file (${path.basename(absPath)}):\n\n\`\`\`${path.extname(absPath).slice(1)}\n${content}\n\`\`\``,
      },
    ],
    apiKey,
    onChunk: (text) => process.stdout.write(text),
  });

  console.log("\n" + "─".repeat(60));
}
