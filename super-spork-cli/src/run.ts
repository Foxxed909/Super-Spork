/**
 * `sporkx run <task>` — agentic task runner.
 * Reads project context, plans changes, streams execution, applies file edits.
 */
import * as fs from "fs";
import * as path from "path";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey, estimateTokens, estimateCost } from "./config";
import { loadMemory } from "./memory";

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

export interface RunOptions {
  task: string;
  budgetUsd: number;
  model: string;
  dryRun: boolean;
}

export async function run(opts: RunOptions): Promise<void> {
  const { task, budgetUsd, model, dryRun } = opts;
  const cfg = loadConfig();
  const apiKey = requireApiKey(cfg);

  const cwd = process.cwd();
  const memories = loadMemory(cwd);
  const files = collectProjectFiles(cwd);

  console.log(`\n✦ SporkX — Agentic Task Runner`);
  console.log(`  Task   : ${task}`);
  console.log(`  Budget : $${budgetUsd}`);
  console.log(`  Model  : ${model}`);
  console.log(`  Files  : ${files.length} source files indexed`);
  if (dryRun) console.log(`  Mode   : DRY RUN (no changes will be applied)`);
  console.log();

  const fileTree = files.map((f) => path.relative(cwd, f)).join("\n");
  const memoryBlock =
    memories.length > 0
      ? `\n## Project Memory (facts you know about this codebase):\n${memories
          .map((m) => `- ${m}`)
          .join("\n")}`
      : "";

  const priorityFiles = files
    .filter((f) => [".ts", ".tsx", ".py", ".go", ".rs"].includes(path.extname(f)))
    .slice(0, 10);

  const fileContents = priorityFiles
    .map((f) => {
      try {
        const content = fs.readFileSync(f, "utf8");
        if (content.length > 8000) return null;
        return `### ${path.relative(cwd, f)}\n\`\`\`\n${content}\n\`\`\``;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You are SporkX, an elite agentic coding assistant. You operate on real project files.

Your job:
1. PLAN: Analyze the task and list exactly which files to create/modify and what changes to make
2. EXECUTE: Output the complete content of each file that needs to be changed

CRITICAL OUTPUT FORMAT for file changes:
<file path="src/example.ts">
// complete file content here
</file>

Rules:
- Always output COMPLETE file contents, never partial diffs
- Only output files that actually need changes
- Be surgical and precise — don't change what doesn't need changing
- If dry-run is requested, only output the PLAN section, not the file contents${memoryBlock}`;

  const userPrompt = `## Project: ${path.basename(cwd)}

## File tree:
${fileTree}

## Key files content:
${fileContents}

## Task:
${task}

${
  dryRun
    ? "## MODE: DRY RUN — Only produce the PLAN. Do NOT output file changes."
    : "## MODE: EXECUTE — Produce the plan AND output complete file changes in <file> tags."
}`;

  const inputTokens = estimateTokens(systemPrompt + userPrompt);
  const estimatedCost = estimateCost(model, inputTokens, 4000);
  console.log(`  Estimated cost: ~$${estimatedCost.toFixed(4)}`);
  console.log();

  if (estimatedCost > budgetUsd) {
    console.error(
      `Budget too low. Estimated $${estimatedCost.toFixed(4)} but budget is $${budgetUsd}.`
    );
    console.error(`Use --budget ${Math.ceil(estimatedCost * 2)} to proceed.`);
    process.exit(1);
  }

  console.log("Planning and executing...\n");
  console.log("─".repeat(60));

  let fullResponse = "";
  await streamCompletion({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    apiKey,
    budgetUsd,
    inputTokensEstimate: inputTokens,
    onChunk: (text) => {
      process.stdout.write(text);
      fullResponse += text;
    },
  });

  console.log("\n" + "─".repeat(60));

  if (!dryRun) {
    const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    let match: RegExpExecArray | null;
    let filesChanged = 0;

    while ((match = fileRegex.exec(fullResponse)) !== null) {
      const [, filePath, content] = match;
      const absolutePath = path.resolve(cwd, filePath);
      const cwdSafe = cwd.endsWith(path.sep) ? cwd : cwd + path.sep;
      if (!absolutePath.startsWith(cwdSafe)) {
        console.error(`\nBlocked: ${filePath} is outside project root`);
        continue;
      }
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(absolutePath, content.trim() + "\n");
      console.log(`\n✓ Applied: ${filePath}`);
      filesChanged++;
    }

    if (filesChanged > 0) {
      console.log(`\n✦ Done. ${filesChanged} file(s) updated.`);
    } else {
      console.log("\n✦ No file changes detected in response.");
    }
  } else {
    console.log("\n✦ Dry run complete. Run without --dry-run to apply changes.");
  }
}
