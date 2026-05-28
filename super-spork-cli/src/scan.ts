/**
 * `sporkx scan [path]` — SAST security scan.
 */
import * as fs from "fs";
import * as path from "path";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey } from "./config";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
]);
const SECURITY_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs",
  ".java", ".php", ".rb", ".cs", ".sh",
]);

function collectFiles(target: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    if (results.length >= 20) return;
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
      else if (
        entry.isFile() &&
        SECURITY_EXTENSIONS.has(path.extname(entry.name))
      ) {
        results.push(full);
      }
    }
  }

  const stat = fs.statSync(target);
  if (stat.isFile()) {
    results.push(target);
  } else {
    walk(target);
  }
  return results;
}

export interface ScanOptions {
  filePath: string;
  model?: string;
}

export async function scan(opts: ScanOptions): Promise<void> {
  const cfg = loadConfig();
  const model = opts.model ?? cfg.model ?? "anthropic/claude-sonnet-4-6";
  const apiKey = requireApiKey(cfg);

  const absPath = path.resolve(opts.filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`Path not found: ${absPath}`);
    process.exit(1);
  }

  const files = collectFiles(absPath);
  if (files.length === 0) {
    console.error("No supported source files found.");
    process.exit(1);
  }

  console.log(
    `\n✦ SporkX Scan — SAST security analysis on ${files.length} file(s)...\n`
  );

  const codeBlocks = files
    .map((f) => {
      try {
        const content = fs.readFileSync(f, "utf8");
        if (content.length > 30_000) return null;
        return `### ${path.relative(process.cwd(), f)}\n\`\`\`\n${content}\n\`\`\``;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join("\n\n");

  console.log("─".repeat(60));

  await streamCompletion({
    model,
    messages: [
      {
        role: "system",
        content: `You are a security engineer performing SAST (Static Application Security Testing).
Scan for OWASP Top 10 and common vulnerabilities:
- SQL Injection, XSS, CSRF
- Authentication/Authorization flaws
- Hardcoded secrets or credentials
- Insecure deserialization
- Broken access control
- Command injection
- Path traversal
- Insecure dependencies usage patterns
- Missing input validation at system boundaries
- Prototype pollution, ReDoS (for JS/TS)

For each finding: severity (CRITICAL/HIGH/MEDIUM/LOW), location (file + approx line), description, and remediation.
End with a security score: PASS / FAIL / NEEDS REVIEW.`,
      },
      {
        role: "user",
        content: `Security scan:\n\n${codeBlocks}`,
      },
    ],
    apiKey,
    onChunk: (text) => process.stdout.write(text),
  });

  console.log("\n" + "─".repeat(60));
}
