/**
 * `sporkx test [path]` — detect and run Jest/Vitest/pytest, capture failures,
 * and optionally suggest AI-powered fixes with --fix.
 */
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey } from "./config";

type TestRunner = "jest" | "vitest" | "pytest" | "npm" | "unknown";

interface DetectedRunner {
  runner: TestRunner;
  command: string[];
  label: string;
}

function detectRunner(targetPath: string): DetectedRunner {
  const cwd = process.cwd();

  // Check package.json scripts and dependencies
  const pkgPath = path.join(cwd, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
        scripts?: Record<string, string>;
        devDependencies?: Record<string, string>;
        dependencies?: Record<string, string>;
      };
      const scripts = pkg.scripts ?? {};
      const allDeps = {
        ...(pkg.devDependencies ?? {}),
        ...(pkg.dependencies ?? {}),
      };

      if (scripts.test?.includes("vitest") || allDeps["vitest"]) {
        const args = targetPath !== cwd ? [targetPath] : [];
        return {
          runner: "vitest",
          command: ["npx", "vitest", "run", ...args],
          label: "Vitest",
        };
      }

      if (
        scripts.test?.includes("jest") ||
        allDeps["jest"] ||
        allDeps["@jest/core"]
      ) {
        const args = targetPath !== cwd ? [targetPath] : [];
        return {
          runner: "jest",
          command: ["npx", "jest", "--no-coverage", ...args],
          label: "Jest",
        };
      }

      // Generic npm test fallback
      if (scripts.test) {
        return {
          runner: "npm",
          command: ["npm", "test"],
          label: "npm test",
        };
      }
    } catch {}
  }

  // Check for Python / pytest
  const pytestMarkers = [
    "pytest.ini",
    "setup.cfg",
    "pyproject.toml",
    "conftest.py",
  ];
  const hasPytestConfig = pytestMarkers.some((f) =>
    fs.existsSync(path.join(cwd, f))
  );
  const hasPythonTests =
    hasPytestConfig ||
    (fs.existsSync(targetPath) &&
      fs.statSync(targetPath).isDirectory() &&
      findTestFiles(targetPath, [".py"]).length > 0);

  if (hasPythonTests) {
    const args = targetPath !== cwd ? [targetPath] : [];
    return {
      runner: "pytest",
      command: ["python", "-m", "pytest", "-v", ...args],
      label: "pytest",
    };
  }

  return { runner: "unknown", command: [], label: "unknown" };
}

function findTestFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findTestFiles(full, extensions));
      } else if (
        extensions.includes(path.extname(entry.name)) &&
        (entry.name.includes("test") || entry.name.includes("spec"))
      ) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

function gatherSourceContext(cwd: string, targetPath: string): string {
  const ignoreDirs = new Set([
    "node_modules", ".git", "dist", "build", "__pycache__",
  ]);
  const codeExt = new Set([".ts", ".tsx", ".js", ".jsx", ".py"]);
  const files: string[] = [];

  function walk(dir: string) {
    if (files.length >= 15) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignoreDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && codeExt.has(path.extname(entry.name))) {
        files.push(full);
      }
    }
  }

  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    walk(targetPath);
  } else if (fs.existsSync(targetPath)) {
    files.push(targetPath);
    // Also pull in adjacent test files for context
    const dir = path.dirname(targetPath);
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (
          entry.isFile() &&
          codeExt.has(path.extname(entry.name)) &&
          (entry.name.includes("test") || entry.name.includes("spec"))
        ) {
          const full = path.join(dir, entry.name);
          if (full !== targetPath && !files.includes(full)) files.push(full);
        }
      }
    } catch {}
  }

  return files
    .slice(0, 10)
    .map((f) => {
      try {
        const content = fs.readFileSync(f, "utf8");
        if (content.length > 6000) return null;
        return `### ${path.relative(cwd, f)}\n\`\`\`${path.extname(f).slice(1)}\n${content}\n\`\`\``;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

export interface TestOptions {
  targetPath?: string;
  model?: string;
  fix?: boolean;
}

export async function runTests(opts: TestOptions): Promise<void> {
  const cfg = loadConfig();
  const model = opts.model ?? cfg.model ?? "anthropic/claude-sonnet-4-6";
  const cwd = process.cwd();
  const targetPath = opts.targetPath ? path.resolve(opts.targetPath) : cwd;

  console.log("\n✦ SporkX Test — detecting test runner...\n");

  const detected = detectRunner(targetPath);

  if (detected.runner === "unknown" && detected.command.length === 0) {
    console.error(
      "No test runner detected. Supported: Jest, Vitest, pytest.\n" +
        "Ensure your package.json lists jest/vitest or your Python project has pytest installed."
    );
    process.exit(1);
  }

  console.log(`  Runner : ${detected.label}`);
  console.log(`  Command: ${detected.command.join(" ")}`);
  console.log();
  console.log("─".repeat(60));

  const result = spawnSync(detected.command[0], detected.command.slice(1), {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env },
  });

  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  const combined = [stdout, stderr].filter(Boolean).join("\n");

  if (combined) process.stdout.write(combined + "\n");

  const passed = result.status === 0;
  console.log("\n" + "─".repeat(60));

  if (passed) {
    console.log("\n✦ All tests passed.\n");
    return;
  }

  console.log("\n✦ Tests failed.\n");

  if (!opts.fix) {
    console.log(
      'Tip: run with --fix to get AI-suggested fixes for the failures.'
    );
    return;
  }

  // --fix: send failure output to the AI for analysis
  const apiKey = requireApiKey(cfg);
  const codeContext = gatherSourceContext(cwd, targetPath);

  console.log("\n✦ Analyzing failures and generating fix suggestions...\n");
  console.log("─".repeat(60));

  await streamCompletion({
    model,
    messages: [
      {
        role: "system",
        content: `You are an expert developer helping fix failing tests.
Analyze the test output and source code, then:
1. Identify each failing test and the root cause
2. Provide the exact code fix — use <file path="..."> blocks for complete file replacements
3. Explain briefly why each failure occurred

Be surgical — only fix what is actually broken. Do not change tests unless the test itself is clearly wrong.`,
      },
      {
        role: "user",
        content: `Test runner: ${detected.label}

Test output (failures):
\`\`\`
${combined.slice(0, 12000)}
\`\`\`

${codeContext ? `Source context:\n\n${codeContext}` : ""}

Please identify root causes and provide fixes.`,
      },
    ],
    apiKey,
    onChunk: (text) => process.stdout.write(text),
  });

  console.log("\n" + "─".repeat(60));
  console.log(
    "\nApply fixes manually, or use `sporkx fix <file> \"<error>\"` for targeted single-file fixes."
  );
}
