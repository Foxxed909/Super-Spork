#!/usr/bin/env node
/**
 * SporkX CLI — unified AI terminal. Combines @spork/cli + @spork/super into one binary.
 *
 * Usage:
 *   sporkx [prompt]               — quick chat
 *   sporkx code <prompt>          — code generation with syntax highlighting
 *   sporkx fif [path]             — bug audit (single file or directory)
 *   sporkx run <task>             — agentic task runner
 *   sporkx review                 — git diff code review
 *   sporkx scan [path]            — SAST security scan
 *   sporkx test [path]            — run test suite + optional --fix
 *   sporkx docs [path]            — generate JSDoc/docstring documentation
 *   sporkx fix <file> "<error>"   — targeted single-file fix
 *   sporkx estimate "<task>"      — cost estimate before executing
 *   sporkx explain <file>         — explain what a file does
 *   sporkx memory show|add|clear  — project memory management
 *   sporkx feedback <subject>     — submit feedback to Spork inbox
 *   sporkx link                   — link CLI to Spork web account
 *   sporkx with <tool> <task>     — delegate to Claude Code, Gemini, Codex, Qwen
 *   sporkx login <key>            — save OpenRouter API key
 *   sporkx config                 — show current config
 */
import { program } from "commander";
import * as fs from "fs";
import { chat, highlightCodeFences, DEFAULT_CHAT_MODEL } from "./chat";
import { fif } from "./fif";
import { run } from "./run";
import { review } from "./review";
import { scan } from "./scan";
import { memory } from "./memory";
import { explain } from "./explain";
import { runTests } from "./test";
import { docs } from "./docs";
import { fix } from "./fix";
import { estimate } from "./estimate";
import { feedback } from "./feedback";
import { link } from "./link";
import { withTool } from "./with";
import { loadConfig, saveConfig, requireApiKey } from "./config";

program
  .name("sporkx")
  .description("SporkX — unified AI in your terminal")
  .version("0.1.0");

// Default action: quick chat
program
  .argument("[prompt]", "Message to send to Spork AI")
  .option("-m, --model <id>", "Model to use")
  .option("-a, --agent <id>", "Agent persona (hacker, dev, nerd, cockroach, oracle, rubber-duck, berry)")
  .option("--no-stream", "Disable streaming output")
  .action(async (prompt: string | undefined, opts: { model?: string; agent?: string; stream: boolean }) => {
    const cfg = loadConfig();

    let finalPrompt = prompt;
    if (!finalPrompt) {
      if (process.stdin.isTTY) {
        console.error("Usage: sporkx <prompt>  or  cat file.txt | sporkx <prompt>");
        process.exit(1);
      }
      finalPrompt = fs.readFileSync("/dev/stdin", "utf8").trim();
      if (!finalPrompt) {
        console.error("No input provided.");
        process.exit(1);
      }
    }

    await chat({
      prompt: finalPrompt,
      model: opts.model ?? cfg.model ?? DEFAULT_CHAT_MODEL,
      agentId: opts.agent ?? cfg.agentId,
      apiKey: requireApiKey(cfg),
      stream: opts.stream,
    });
  });

// code: generation with syntax highlighting
program
  .command("code <prompt>")
  .description("Generate code with syntax highlighting")
  .option("-m, --model <id>", "Model to use")
  .action(async (prompt: string, opts: { model?: string }) => {
    const cfg = loadConfig();
    const apiKey = requireApiKey(cfg);
    const model = opts.model ?? cfg.model ?? DEFAULT_CHAT_MODEL;

    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    try {
      process.stdout.write = (s: string | Uint8Array): boolean => {
        chunks.push(typeof s === "string" ? s : Buffer.from(s).toString());
        return true;
      };
      await chat({
        prompt: `You are an expert coding assistant. Respond with clean, working code and a brief explanation.\n\n${prompt}`,
        model,
        apiKey,
        stream: true,
      });
    } finally {
      process.stdout.write = origWrite;
    }

    const full = chunks.join("");
    process.stdout.write(highlightCodeFences(full));
  });

// fif: bug audit
program
  .command("fif [path]")
  .description("Find, Identify + Fix — audit a file or directory for bugs")
  .option("-m, --model <id>", "Model to use")
  .option("--apply", "Automatically apply suggested fixes")
  .action(async (filePath: string | undefined, opts: { model?: string; apply: boolean }) => {
    await fif({ filePath: filePath ?? ".", model: opts.model, apply: opts.apply });
  });

// run: agentic task
program
  .command("run <task>")
  .description("Execute an agentic coding task across your project files")
  .option("-b, --budget <dollars>", "Max spend in USD", "5")
  .option("-m, --model <id>", "Model to use", "anthropic/claude-sonnet-4-6")
  .option("--dry-run", "Preview the plan without making changes")
  .action(async (task: string, opts: { budget: string; model: string; dryRun: boolean }) => {
    await run({ task, budgetUsd: parseFloat(opts.budget), model: opts.model, dryRun: opts.dryRun });
  });

// review: git diff code review
program
  .command("review")
  .description("Full code review of staged/unstaged changes vs main branch")
  .option("-m, --model <id>", "Model to use")
  .action(async (opts: { model?: string }) => {
    await review({ model: opts.model });
  });

// scan: SAST security scan
program
  .command("scan [path]")
  .description("Security scan (SAST) — check for OWASP Top 10 vulnerabilities")
  .option("-m, --model <id>", "Model to use")
  .action(async (filePath: string | undefined, opts: { model?: string }) => {
    await scan({ filePath: filePath ?? ".", model: opts.model });
  });

// test: run test suite + optional AI fix
program
  .command("test [path]")
  .description("Detect and run test suite (Jest/Vitest/pytest), optionally fix failures with AI")
  .option("-m, --model <id>", "Model for AI fixes")
  .option("--fix", "Ask AI for fix suggestions on failure")
  .action(async (filePath: string | undefined, opts: { model?: string; fix: boolean }) => {
    await runTests({ targetPath: filePath, model: opts.model, fix: opts.fix });
  });

// docs: generate documentation
program
  .command("docs [path]")
  .description("Generate JSDoc/docstring documentation for source files")
  .option("-m, --model <id>", "Model to use")
  .option("--apply", "Write docs directly into the source files")
  .action(async (filePath: string | undefined, opts: { model?: string; apply: boolean }) => {
    await docs({ targetPath: filePath, model: opts.model, apply: opts.apply });
  });

// fix: targeted single-file fix
program
  .command("fix <file> <error>")
  .description("Fix a specific file given an error message")
  .option("-m, --model <id>", "Model to use")
  .option("--apply", "Write the fix directly to the file")
  .action(async (file: string, errorMessage: string, opts: { model?: string; apply: boolean }) => {
    await fix({ file, errorMessage, model: opts.model, apply: opts.apply });
  });

// estimate: dry-run cost estimate
program
  .command("estimate <task>")
  .description("Estimate cost and generate execution plan for a task before running it")
  .option("-m, --model <id>", "Model to use for the estimate")
  .action(async (task: string, opts: { model?: string }) => {
    await estimate({ task, model: opts.model });
  });

// explain: explain a file
program
  .command("explain <file>")
  .description("Explain what a file does")
  .option("-m, --model <id>", "Model to use")
  .action(async (file: string, opts: { model?: string }) => {
    await explain({ file, model: opts.model });
  });

// memory: project memory management
program
  .command("memory")
  .description("Manage project memory (facts remembered across runs)")
  .addCommand(
    program
      .createCommand("show")
      .description("Show all saved project memories")
      .action(() => memory.show())
  )
  .addCommand(
    program
      .createCommand("add")
      .argument("<fact>", "Fact to remember about this project")
      .description("Add a fact to project memory")
      .action((fact: string) => memory.add(fact))
  )
  .addCommand(
    program
      .createCommand("clear")
      .description("Clear all project memories")
      .action(() => memory.clear())
  );

// feedback: submit feedback to Spork inbox
program
  .command("feedback <subject>")
  .description("Submit feedback, bug reports, or feature requests to the Spork team")
  .option("-t, --type <type>", "Feedback type: bug, feature, complaint, general")
  .option("-b, --body <text>", "Feedback body (skips interactive prompt)")
  .action(async (subject: string, opts: { type?: string; body?: string }) => {
    await feedback({
      subject,
      type: opts.type as "bug" | "feature" | "complaint" | "general" | undefined,
      body: opts.body,
    });
  });

// link: link CLI to Spork web account
program
  .command("link")
  .description("Link SporkX CLI to your Spork web account using an API token")
  .action(async () => {
    await link();
  });

// with: delegate to external AI tool
program
  .command("with <tool> <task>")
  .description("Delegate a task to another AI tool (claude, codex, gemini, qwen)")
  .action(async (tool: string, task: string) => {
    await withTool({ tool, task });
  });

// login: save OpenRouter API key
program
  .command("login <api-key>")
  .description("Save your OpenRouter API key")
  .action((apiKey: string) => {
    saveConfig({ openrouterKey: apiKey });
    console.log("✓ OpenRouter API key saved to ~/.spork/super-config.json");
  });

// token: save Spork web API token
program
  .command("token <api-token>")
  .description("Save your Spork web API token (or use `sporkx link` for guided setup)")
  .action((token: string) => {
    saveConfig({ sporkToken: token });
    console.log("✓ Spork API token saved. Run `sporkx config` to verify.");
  });

// config: show current config
program
  .command("config")
  .description("Show current SporkX configuration")
  .action(() => {
    const cfg = loadConfig();
    const safe = {
      ...cfg,
      openrouterKey: cfg.openrouterKey ? `${cfg.openrouterKey.slice(0, 8)}...` : undefined,
      sporkToken: cfg.sporkToken ? `${cfg.sporkToken.slice(0, 8)}...` : undefined,
    };
    console.log(JSON.stringify(safe, null, 2));
  });

program.parse();
