/**
 * Export Spork conversations -> JSONL chat dataset for fine-tuning.
 *
 * Pulls conversations from the app's Postgres (via Prisma) and writes them in
 * the standard chat/SFT format used by TRL's SFTTrainer:
 *
 *   {"messages": [{"role": "system", ...}, {"role": "user", ...}, {"role": "assistant", ...}]}
 *
 * One JSON object per line. Produces a train/val split.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' finetune/export_dataset.ts
 *
 * Flags:
 *   --only-liked     Only conversations that have at least one like (higher quality signal)
 *   --min-turns=N    Require at least N assistant turns (default 1)
 *   --val=0.1        Validation split fraction (default 0.1)
 *   --system="..."   Prepend a system prompt to every example (defaults to the Berry persona)
 *   --limit=N        Cap number of conversations exported
 */
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const DEFAULT_SYSTEM =
  "You are Berry, Spork's signature assistant: warm, sharp, and layered. " +
  "Give direct, well-reasoned answers with just enough depth — never padded, never curt.";

function arg(name: string, fallback?: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split("=").slice(1).join("=");
  if (process.argv.includes(`--${name}`)) return "true";
  return fallback;
}

interface ChatExample {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

async function main() {
  const onlyLiked = arg("only-liked") === "true";
  const minTurns = Number(arg("min-turns", "1"));
  const valFrac = Number(arg("val", "0.1"));
  const limit = arg("limit") ? Number(arg("limit")) : undefined;
  const system = arg("system", DEFAULT_SYSTEM)!;

  console.log("Exporting dataset with:", { onlyLiked, minTurns, valFrac, limit });

  const conversations = await prisma.conversation.findMany({
    where: onlyLiked ? { likes: { gt: 0 } } : undefined,
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const examples: ChatExample[] = [];
  let skipped = 0;

  for (const conv of conversations) {
    const turns = conv.messages.filter(
      (m) => m.role === "user" || m.role === "assistant",
    );
    const assistantTurns = turns.filter((m) => m.role === "assistant").length;
    // Need a real exchange: starts with user, has enough assistant replies.
    if (assistantTurns < minTurns || turns.length < 2 || turns[0].role !== "user") {
      skipped++;
      continue;
    }

    const messages: ChatExample["messages"] = [{ role: "system", content: system }];
    for (const m of turns) {
      const content = (m.content ?? "").trim();
      if (!content) continue;
      messages.push({ role: m.role as "user" | "assistant", content });
    }
    // Must end on an assistant turn (the thing we want the model to learn).
    while (messages.length && messages[messages.length - 1].role !== "assistant") {
      messages.pop();
    }
    if (messages.filter((m) => m.role === "assistant").length < minTurns) {
      skipped++;
      continue;
    }
    examples.push({ messages });
  }

  // Deterministic shuffle (seeded) so train/val split is reproducible.
  let seed = 1937;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = examples.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [examples[i], examples[j]] = [examples[j], examples[i]];
  }

  const valCount = Math.max(0, Math.floor(examples.length * valFrac));
  const val = examples.slice(0, valCount);
  const train = examples.slice(valCount);

  const outDir = join(__dirname, "data");
  mkdirSync(outDir, { recursive: true });
  const toJsonl = (rows: ChatExample[]) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  writeFileSync(join(outDir, "train.jsonl"), toJsonl(train));
  writeFileSync(join(outDir, "val.jsonl"), toJsonl(val));

  console.log(
    `\nDone. ${examples.length} examples (${train.length} train / ${val.length} val), ${skipped} skipped.`,
  );
  console.log(`Wrote ${outDir}/train.jsonl and ${outDir}/val.jsonl`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
