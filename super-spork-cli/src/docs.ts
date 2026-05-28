/**
 * `sporkx docs [path]` — generate JSDoc comments or README sections for target files.
 * With --apply, inserts the generated docs inline into the source file.
 */
import * as fs from "fs";
import * as path from "path";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey } from "./config";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__", "coverage",
]);
const DOC_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".cs", ".rb", ".php",
]);

function collectFiles(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const results: string[] = [];
  function walk(dir: string) {
    if (results.length >= 15) return;
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
      else if (entry.isFile() && DOC_EXTENSIONS.has(path.extname(entry.name))) {
        results.push(full);
      }
    }
  }
  walk(target);
  return results;
}

/** Determine the appropriate doc style for the file extension. */
function docStyleForExt(ext: string): string {
  switch (ext) {
    case ".py":
      return "Python docstrings (Google style). For each function/class, add a docstring immediately inside the definition.";
    case ".go":
      return "Go doc comments (// Package ..., // FuncName ...) placed directly above declarations.";
    case ".rs":
      return "Rust doc comments (///) placed above public items.";
    case ".java":
    case ".cs":
      return "Javadoc-style /** ... */ comments for all public classes and methods.";
    case ".rb":
      return "YARD-style doc comments (# @param, # @return) above each method.";
    case ".php":
      return "PHPDoc-style /** ... */ blocks for all public methods and classes.";
    default:
      // JS/TS/JSX/TSX
      return "JSDoc (/** ... */) for all exported functions, classes, types, and interfaces. Use @param, @returns, @throws where relevant.";
  }
}

export interface DocsOptions {
  targetPath?: string;
  model?: string;
  apply?: boolean;
}

export async function docs(opts: DocsOptions): Promise<void> {
  const cfg = loadConfig();
  const model = opts.model ?? cfg.model ?? "anthropic/claude-sonnet-4-6";
  const apiKey = requireApiKey(cfg);
  const cwd = process.cwd();
  const targetPath = opts.targetPath ? path.resolve(opts.targetPath) : cwd;

  if (!fs.existsSync(targetPath)) {
    console.error(`Path not found: ${targetPath}`);
    process.exit(1);
  }

  const files = collectFiles(targetPath);
  if (files.length === 0) {
    console.error("No supported source files found.");
    process.exit(1);
  }

  console.log(`\n✦ SporkX Docs — generating documentation for ${files.length} file(s)...\n`);

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      console.error(`Cannot read: ${file}`);
      continue;
    }
    if (content.length > 60_000) {
      console.warn(`Skipping ${file}: file too large (> 60KB)`);
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    const rel = path.relative(cwd, file);
    const docStyle = docStyleForExt(ext);

    console.log(`\n── ${rel}`);
    console.log("─".repeat(60));

    let fullResponse = "";
    await streamCompletion({
      model,
      messages: [
        {
          role: "system",
          content: `You are a documentation specialist. Add comprehensive documentation to the provided source file.

Documentation style: ${docStyle}

Rules:
- Document ALL exported/public functions, classes, methods, and types
- Document any complex private helpers too
- Keep doc comments accurate and useful — describe what it does, params, return values, and side effects
- Do NOT change the code logic in any way
- Output the COMPLETE file with docs inserted (use a <file path="${rel}"> block)`,
        },
        {
          role: "user",
          content: `Add documentation to this file (${rel}):\n\n\`\`\`${ext.slice(1)}\n${content}\n\`\`\``,
        },
      ],
      apiKey,
      onChunk: (text) => {
        if (!opts.apply) process.stdout.write(text);
        fullResponse += text;
      },
    });

    if (!opts.apply) {
      console.log("\n" + "─".repeat(60));
      continue;
    }

    // --apply: extract <file ...> block and write back
    const fileMatch = /<file path="[^"]*">([\s\S]*?)<\/file>/.exec(fullResponse);
    if (fileMatch) {
      const documented = fileMatch[1].trim() + "\n";
      fs.writeFileSync(file, documented);
      console.log(`✓ Applied docs: ${rel}`);
    } else {
      // Fallback: look for a code fence containing the full file
      const fenceMatch = /```(?:\w*)\n([\s\S]*?)```/.exec(fullResponse);
      if (fenceMatch) {
        const documented = fenceMatch[1].trim() + "\n";
        fs.writeFileSync(file, documented);
        console.log(`✓ Applied docs (fence): ${rel}`);
      } else {
        console.warn(`Could not extract documented file for: ${rel}`);
        // Print what we got so it isn't lost
        process.stdout.write(fullResponse + "\n");
      }
    }
  }

  console.log("\n✦ Docs generation complete.");
}
