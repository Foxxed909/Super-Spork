/**
 * `sporkx fix <file> "<error>"` — targeted single-file fix with error message context.
 * Reads the file, sends it + the error to AI, and optionally applies the fix in-place.
 */
import * as fs from "fs";
import * as path from "path";
import { streamCompletion } from "./chat";
import { loadConfig, requireApiKey } from "./config";

export interface FixOptions {
  file: string;
  errorMessage: string;
  model?: string;
  /** If true, auto-apply the fix back to the file without prompting. */
  apply?: boolean;
}

export async function fix(opts: FixOptions): Promise<void> {
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
    console.error(
      "File is too large to fix in one shot (> 100KB). Split into smaller files first."
    );
    process.exit(1);
  }

  const ext = path.extname(absPath).slice(1);
  const rel = path.relative(process.cwd(), absPath);

  console.log(`\n✦ SporkX Fix: ${rel}`);
  console.log(`  Error  : ${opts.errorMessage}`);
  console.log();
  console.log("─".repeat(60));

  let fullResponse = "";
  await streamCompletion({
    model,
    messages: [
      {
        role: "system",
        content: `You are an expert debugger. You will receive a source file and an error message.
Your job:
1. Identify the root cause of the error in the file
2. Provide the complete fixed file inside a <file path="${rel}"> XML block
3. Briefly explain what was wrong and what you changed

Rules:
- Output the COMPLETE corrected file — never a partial diff
- Make only the minimal changes needed to fix the stated error
- Do not introduce unrelated refactoring or style changes`,
      },
      {
        role: "user",
        content: `File: ${rel}
Error: ${opts.errorMessage}

\`\`\`${ext}
${content}
\`\`\`

Fix the error and output the complete corrected file.`,
      },
    ],
    apiKey,
    onChunk: (text) => {
      process.stdout.write(text);
      fullResponse += text;
    },
  });

  console.log("\n" + "─".repeat(60));

  // Extract fix from <file> block
  const fileMatch = /<file path="[^"]*">([\s\S]*?)<\/file>/.exec(fullResponse);
  if (fileMatch) {
    const fixedContent = fileMatch[1].trim() + "\n";
    if (opts.apply) {
      fs.writeFileSync(absPath, fixedContent);
      console.log(`\n✓ Fix applied to: ${rel}`);
    } else {
      console.log(
        `\nFix ready. Run with --apply to write it back to ${rel}, or copy the fix manually.`
      );
    }
    return;
  }

  // Fallback: code fence
  const fenceMatch = /```(?:\w*)\n([\s\S]*?)```/.exec(fullResponse);
  if (fenceMatch) {
    if (opts.apply) {
      const fixedContent = fenceMatch[1].trim() + "\n";
      fs.writeFileSync(absPath, fixedContent);
      console.log(`\n✓ Fix applied (from code block) to: ${rel}`);
    } else {
      console.log(
        "\nFix shown above. Run with --apply to write it back automatically."
      );
    }
    return;
  }

  console.log(
    "\nNo fixed file block found in response. Review the suggestions above manually."
  );
}
