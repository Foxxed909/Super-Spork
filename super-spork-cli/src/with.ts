/**
 * `sporkx with <tool> <task>` — cross-tool delegation.
 * Spawns an external AI CLI tool (claude, codex, gemini, qwen) as a subprocess
 * with the given task, streams its output, then prints a summary header.
 */
import { spawn, spawnSync } from "child_process";
import * as path from "path";

const TOOL_CONFIGS: Record<
  string,
  { description: string; args: (task: string) => string[] }
> = {
  claude: {
    description: "Claude Code (Anthropic)",
    args: (task) => [task],
  },
  codex: {
    description: "OpenAI Codex CLI",
    args: (task) => [task],
  },
  gemini: {
    description: "Gemini CLI (Google)",
    args: (task) => [task],
  },
  qwen: {
    description: "Qwen CLI (Alibaba)",
    args: (task) => [task],
  },
};

function isToolAvailable(tool: string): boolean {
  // Use `which` (Unix) or `where` (Windows) to check availability
  const cmd = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(cmd, [tool], { encoding: "utf8", stdio: "pipe" });
  return result.status === 0;
}

export interface WithOptions {
  tool: string;
  task: string;
}

export async function withTool(opts: WithOptions): Promise<void> {
  const { tool, task } = opts;

  const toolLower = tool.toLowerCase();
  const knownConfig = TOOL_CONFIGS[toolLower];

  const toolLabel = knownConfig?.description ?? tool;

  console.log(`\n✦ SporkX with ${toolLabel}`);
  console.log(`  Task: ${task}`);

  if (!isToolAvailable(toolLower)) {
    console.error(
      `\nTool not found: "${toolLower}" is not installed or not in PATH.`
    );
    if (knownConfig) {
      const installHints: Record<string, string> = {
        claude: "npm install -g @anthropic-ai/claude-code",
        codex: "npm install -g @openai/codex",
        gemini: "npm install -g @google/gemini-cli",
        qwen: "pip install qwen-cli",
      };
      const hint = installHints[toolLower];
      if (hint) console.error(`Install with: ${hint}`);
    }
    process.exit(1);
  }

  const args = knownConfig ? knownConfig.args(task) : [task];

  console.log(`\n─────── ${toolLabel} output ───────\n`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(toolLower, args, {
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env },
      shell: false,
    });

    // Pipe stdout and stderr directly so output streams in real-time
    child.stdout?.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    child.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        console.error(
          `\nFailed to launch "${toolLower}": command not found.`
        );
        process.exit(1);
      }
      reject(err);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error(
          `\n${toolLabel} exited with code ${code}.`
        );
        // Don't exit — let the caller decide; just resolve so we can print summary
        resolve();
      } else {
        resolve();
      }
    });
  });

  console.log(`\n─────── end ${toolLabel} ───────\n`);
  console.log(`✦ Delegation to ${toolLabel} complete.`);
}
