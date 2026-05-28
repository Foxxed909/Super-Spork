/**
 * Enhanced FIF — Find, Identify + Fix
 * Works on single files (like spork CLI) and entire directories (like super-cli).
 * Optionally auto-applies fixes via <file> tags when --apply is passed.
 */
import * as fs from "fs";
import * as path from "path";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey } from "./config";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  ".cache", "coverage", ".turbo", "out",
]);

const SUPPORTED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java",
  ".c", ".cpp", ".h", ".cs", ".rb", ".php", ".swift", ".kt",
  ".scala", ".sql", ".sh",
]);

function collectFiles(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const results: string[] = [];
  function walk(dir: string) {
    if (results.length >= 25) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        SUPPORTED_EXTENSIONS.has(path.extname(entry.name))
      ) {
        results.push(full);
      }
    }
  }
  walk(target);
  return results;
}

export interface FifOptions {
  filePath: string;
  model?: string;
  apply?: boolean;
}

export async function fif(opts: FifOptions): Promise<void> {
  const { filePath, apply = false } = opts;
  const cfg = loadConfig();
  const model = opts.model ?? cfg.model ?? "anthropic/claude-sonnet-4-6";
  const apiKey = requireApiKey(cfg);

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`Path not found: ${absPath}`);
    process.exit(1);
  }

  const files = collectFiles(absPath);
  if (files.length === 0) {
    console.error("No supported source files found.");
    process.exit(1);
  }

  const isSingleFile = files.length === 1 && fs.statSync(absPath).isFile();
  console.log(
    `\n✦ SporkX FIF — ${isSingleFile ? "auditing file" : `scanning ${files.length} file(s)`}...\n`
  );

  const codeBlocks = files
    .map((f) => {
      try {
        const content = fs.readFileSync(f, "utf8");
        if (content.length > 80_000) return null;
        const rel = path.relative(process.cwd(), f);
        return `### ${rel}\n\`\`\`${path.extname(f).slice(1)}\n${content}\n\`\`\``;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You are an elite senior engineer performing a bug audit. Find real bugs only — not style issues, not preferences — BUGS.

Severities: CRITICAL (data loss / security / crash) | HIGH (wrong behavior) | MEDIUM (edge case) | LOW (minor)

For each bug:
- File and approximate line number
- Severity
- What the bug is
- The fix (show corrected code snippet)

${apply ? `For every fix, also output the COMPLETE corrected file in a <file path="..."> XML block so it can be auto-applied.` : ""}

If no bugs are found, say so clearly.`;

  const userPrompt = `Find, Identify, and Fix all bugs in this code:\n\n${codeBlocks}`;

  console.log("─".repeat(60));
  let fullResponse = "";
  await streamCompletion({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    apiKey,
    onChunk: (text) => {
      process.stdout.write(text);
      fullResponse += text;
    },
  });
  console.log("\n" + "─".repeat(60));

  if (apply) {
    const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    let match: RegExpExecArray | null;
    let count = 0;
    const cwd = process.cwd();
    const cwdSafe = cwd.endsWith(path.sep) ? cwd : cwd + path.sep;

    while ((match = fileRegex.exec(fullResponse)) !== null) {
      const [, relPath, content] = match;
      const abs = path.resolve(cwd, relPath);
      if (!abs.startsWith(cwdSafe)) {
        console.error(`\nBlocked: ${relPath} is outside project root`);
        continue;
      }
      const dir = path.dirname(abs);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(abs, content.trim() + "\n");
      console.log(`\n✓ Fixed: ${relPath}`);
      count++;
    }
    if (count > 0) {
      console.log(`\n✦ Applied ${count} fix(es).`);
    } else {
      console.log("\n✦ No file fixes detected in response.");
    }
  }
}
