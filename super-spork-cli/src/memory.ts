/**
 * Project-scoped memory — persisted per-directory via a hash-keyed JSON file.
 * Storage: ~/.spork/memory/<md5-of-cwd>.json
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

const MEMORY_DIR = path.join(os.homedir(), ".spork", "memory");

function getMemoryPath(projectRoot: string): string {
  const hash = crypto
    .createHash("md5")
    .update(projectRoot)
    .digest("hex")
    .slice(0, 8);
  if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });
  return path.join(MEMORY_DIR, `${hash}.json`);
}

export function loadMemory(projectRoot: string): string[] {
  try {
    const p = getMemoryPath(projectRoot);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, "utf8")) as string[];
  } catch {
    return [];
  }
}

function saveMemory(projectRoot: string, memories: string[]): void {
  fs.writeFileSync(getMemoryPath(projectRoot), JSON.stringify(memories, null, 2));
}

export const memory = {
  show(): void {
    const cwd = process.cwd();
    const memories = loadMemory(cwd);
    if (memories.length === 0) {
      console.log(
        "No memories for this project. Use `sporkx memory add <fact>` to teach SporkX."
      );
      return;
    }
    console.log(`\nProject memory (${memories.length} facts):\n`);
    memories.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));
    console.log();
  },

  add(fact: string): void {
    const cwd = process.cwd();
    const memories = loadMemory(cwd);
    const trimmed = fact.trim();
    if (!trimmed) {
      console.error("Fact cannot be empty.");
      process.exit(1);
    }
    memories.push(trimmed);
    saveMemory(cwd, memories);
    console.log(`✓ Remembered: "${trimmed}"`);
  },

  clear(): void {
    const cwd = process.cwd();
    saveMemory(cwd, []);
    console.log("✓ All project memories cleared.");
  },
};
