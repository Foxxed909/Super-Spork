/**
 * `sporkx estimate "<task>"` — dry-run cost estimate.
 * Shows the planned steps and token/cost estimate before committing any work.
 */
import * as fs from "fs";
import * as path from "path";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey, estimateTokens, estimateCost, MODEL_COSTS } from "./config";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__", "coverage",
]);
const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java",
  ".c", ".cpp", ".cs", ".rb", ".php", ".sql", ".sh", ".md",
]);

function collectProjectFiles(rootDir: string, maxFiles = 30): string[] {
  const results: string[] = [];
  function walk(dir: string) {
    if (results.length >= maxFiles) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
        results.push(full);
      }
    }
  }
  walk(rootDir);
  return results;
}

export interface EstimateOptions {
  task: string;
  model?: string;
}

export async function estimate(opts: EstimateOptions): Promise<void> {
  const cfg = loadConfig();
  const model = opts.model ?? cfg.model ?? "anthropic/claude-sonnet-4-6";
  const apiKey = requireApiKey(cfg);

  const cwd = process.cwd();
  const files = collectProjectFiles(cwd);

  const fileTree = files.map((f) => path.relative(cwd, f)).join("\n");

  // Read a sample of key source files for context
  const sampleFiles = files
    .filter((f) => [".ts", ".tsx", ".py", ".go", ".rs"].includes(path.extname(f)))
    .slice(0, 8);

  const fileContents = sampleFiles
    .map((f) => {
      try {
        const content = fs.readFileSync(f, "utf8");
        if (content.length > 5000) return null;
        return `### ${path.relative(cwd, f)}\n\`\`\`\n${content}\n\`\`\``;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You are a senior software architect helping estimate the effort for a coding task.

Given a task description and codebase context, produce a structured plan:

1. **Task breakdown** — list the specific steps / sub-tasks required
2. **Files affected** — which files will need to be created or modified
3. **Complexity** — LOW / MEDIUM / HIGH with a one-sentence rationale
4. **Estimated token usage** — rough estimate for input + output tokens if this task were executed by an AI
5. **Risks & assumptions** — any unknowns or blockers

Do NOT execute the task — only plan and estimate.`;

  const userPrompt = `## Project: ${path.basename(cwd)}

## File tree:
${fileTree}

## Key file contents:
${fileContents}

## Task to estimate:
${opts.task}

Produce a plan and cost estimate only. Do not implement anything.`;

  const inputTokens = estimateTokens(systemPrompt + userPrompt);
  // Estimate output for the plan itself (~800 tokens is typical)
  const planOutputTokens = 800;
  // Estimate tokens if the task were actually executed (rough heuristic)
  const taskInputTokens = inputTokens;
  const taskOutputTokens = Math.max(2000, Math.ceil(opts.task.length / 2));

  const planCost = estimateCost(model, inputTokens, planOutputTokens);
  const taskCost = estimateCost(model, taskInputTokens, taskOutputTokens);

  console.log(`\n✦ SporkX Estimate\n`);
  console.log(`  Task   : ${opts.task}`);
  console.log(`  Model  : ${model}`);
  console.log(`  Project: ${files.length} files indexed`);
  console.log();

  const costs = MODEL_COSTS[model] ?? { input: 0.005, output: 0.015 };
  if (costs.input === 0 && costs.output === 0) {
    console.log(`  Cost estimate: $0.00 (free model)`);
  } else {
    console.log(`  Cost to estimate  : ~$${planCost.toFixed(4)}`);
    console.log(`  Cost to execute   : ~$${taskCost.toFixed(4)} (rough estimate)`);
    console.log(`  Input tokens      : ~${inputTokens.toLocaleString()}`);
    console.log(`  Projected output  : ~${taskOutputTokens.toLocaleString()} tokens`);
  }
  console.log();
  console.log("─".repeat(60));
  console.log("Generating plan...\n");

  await streamCompletion({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    apiKey,
    onChunk: (text) => process.stdout.write(text),
  });

  console.log("\n" + "─".repeat(60));
  console.log(
    `\nTo execute this task: sporkx run "${opts.task}"`
  );
}
