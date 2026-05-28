/**
 * `sporkx review` — full code review of git diff vs HEAD / main.
 */
import { execSync } from "child_process";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey } from "./config";

export interface ReviewOptions {
  model?: string;
}

export async function review(opts: ReviewOptions): Promise<void> {
  const cfg = loadConfig();
  const model = opts.model ?? cfg.model ?? "anthropic/claude-sonnet-4-6";
  const apiKey = requireApiKey(cfg);

  let diff: string;
  try {
    diff = execSync("git diff HEAD", { encoding: "utf8" });
    if (!diff.trim()) {
      diff = execSync("git diff main...HEAD", { encoding: "utf8" });
    }
    if (!diff.trim()) {
      // Try origin/main as fallback
      diff = execSync("git diff origin/main...HEAD", { encoding: "utf8" });
    }
  } catch {
    console.error("Not a git repository or no diff available.");
    process.exit(1);
  }

  if (!diff.trim()) {
    console.log("No changes to review.");
    return;
  }

  console.log("\n✦ SporkX Review — analyzing diff...\n");
  console.log("─".repeat(60));

  await streamCompletion({
    model,
    messages: [
      {
        role: "system",
        content: `You are an expert code reviewer. Review the git diff for:
1. Bugs and correctness issues
2. Security vulnerabilities
3. Performance problems
4. Missing edge cases or error handling
5. API/breaking changes
6. Test coverage gaps

Be specific. Reference exact line numbers where possible. Rate each issue: CRITICAL / HIGH / MEDIUM / LOW.
End with an overall verdict: APPROVE / REQUEST CHANGES.`,
      },
      {
        role: "user",
        content: `Review this diff:\n\`\`\`diff\n${diff}\n\`\`\``,
      },
    ],
    apiKey,
    onChunk: (text) => process.stdout.write(text),
  });

  console.log("\n" + "─".repeat(60));
}
