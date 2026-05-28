import { Tier } from "@prisma/client";
import { FREE_MODELS, FREE_DAILY_LIMIT } from "./models";
import { AGENTS } from "./agents";

// Tiers in ascending order of capability
const TIER_RANK: Record<Tier, number> = {
  FREE: 0,
  SPORK_LITE: 1,
  SPORK_PRO: 2,
  SUPER_SPORK: 3,
  SPORK_ULTRA: 4,
  SPORK_INFINITY: 5,
  SPORK_GODMODE: 6,
};

function atLeast(tier: Tier, min: Tier): boolean {
  return TIER_RANK[tier] >= TIER_RANK[min];
}

// SPORK_PRO has access to some frontier models; SUPER_SPORK+ gets all
const PRO_MODEL_IDS = new Set([
  "anthropic/claude-sonnet-4-6",
  "openai/gpt-4o",
  "google/gemini-2.0-flash",
  "meta-llama/llama-3.1-405b",
  "deepseek/deepseek-r1",
]);

export function canUseModel(tier: Tier, modelId: string): boolean {
  if (atLeast(tier, Tier.SUPER_SPORK)) return true;
  if (atLeast(tier, Tier.SPORK_PRO)) {
    return (
      FREE_MODELS.some((m) => m.id === modelId) || PRO_MODEL_IDS.has(modelId)
    );
  }
  // FREE and SPORK_LITE can only use free models
  return FREE_MODELS.some((m) => m.id === modelId);
}

export function hasReachedDailyLimit(
  tier: Tier,
  dailyMessages: number,
  lastReset: Date
): boolean {
  // SPORK_LITE and above have no daily limit
  if (atLeast(tier, Tier.SPORK_LITE)) return false;
  const today = new Date().toDateString();
  const resetDay = new Date(lastReset).toDateString();
  if (today !== resetDay) return false;
  return dailyMessages >= FREE_DAILY_LIMIT;
}

export function canUploadFiles(tier: Tier): boolean {
  return atLeast(tier, Tier.SUPER_SPORK);
}

export function canAccessSporkCode(tier: Tier): boolean {
  return atLeast(tier, Tier.SUPER_SPORK);
}

export function canUseAgent(tier: Tier, agentId: string): boolean {
  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return false;
  if (agent.tier === "free") return true;
  return atLeast(tier, Tier.SUPER_SPORK);
}

export function canUseArena(tier: Tier): boolean {
  return atLeast(tier, Tier.SUPER_SPORK);
}

export function canUseWebSearch(tier: Tier): boolean {
  return atLeast(tier, Tier.SUPER_SPORK);
}

export function canUseCustomAgents(tier: Tier): boolean {
  return atLeast(tier, Tier.SUPER_SPORK);
}

export function getCustomAgentLimit(tier: Tier): number | null {
  if (atLeast(tier, Tier.SPORK_INFINITY)) return null; // unlimited
  if (atLeast(tier, Tier.SPORK_ULTRA)) return 10;
  if (atLeast(tier, Tier.SUPER_SPORK)) return 3;
  return 0;
}

export function canUseMemoryAutoExtract(tier: Tier): boolean {
  return atLeast(tier, Tier.SPORK_PRO);
}

// Convenience shorthands used by TTS/STT routes
export function atLeastPro(tier: Tier): boolean {
  return atLeast(tier, Tier.SPORK_PRO);
}

export function atLeastSuperSpork(tier: Tier): boolean {
  return atLeast(tier, Tier.SUPER_SPORK);
}

export function getMemoryLimit(tier: Tier): number | null {
  if (atLeast(tier, Tier.SPORK_INFINITY)) return null; // unlimited
  if (atLeast(tier, Tier.SPORK_ULTRA)) return 1000;
  if (atLeast(tier, Tier.SUPER_SPORK)) return 250;
  if (atLeast(tier, Tier.SPORK_PRO)) return 100;
  return 20; // FREE and SPORK_LITE
}

export function getSystemPrompt(
  tier: Tier,
  options: {
    agentId?: string | null;
    customInstructions?: string | null;
    codeContext?: string | null;
    sporkCode?: boolean;
    canvas?: boolean;
    memoryContext?: string;
  } = {}
): string {
  const { agentId, customInstructions, codeContext, sporkCode, canvas, memoryContext } =
    options;

  // Agent persona takes priority over everything
  if (agentId) {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent && canUseAgent(tier, agentId)) {
      let prompt = agent.systemPrompt;
      if (customInstructions) {
        prompt += `\n\nAdditional context about the user: ${customInstructions}`;
      }
      return prompt;
    }
  }

  // Canvas mode
  if (canvas) {
    const base = `You are Spork Canvas, an AI that generates rich, interactive artifacts. Always wrap your primary content in an <artifact> tag.

Supported artifact types:
- <artifact type="html"> — full HTML page rendered live in an iframe
- <artifact type="markdown"> — formatted document
- <artifact type="code" lang="javascript"> — code with syntax highlighting (use any language)

Format EXACTLY like this (do NOT use markdown code fences inside artifact tags):
<artifact type="html">
<!DOCTYPE html>
<html>...</html>
</artifact>

Always include a 1-2 sentence explanation before the artifact. When the user requests changes, output the COMPLETE updated artifact — never partial updates. Default to HTML artifacts unless the user asks for something else.`;
    if (customInstructions) return `${base}\n\nUser context: ${customInstructions}`;
    return base;
  }

  // Spork Code mode
  if (sporkCode) {
    const base = codeContext
      ? `You are Spork Code, an expert coding assistant. The user has shared code:\n\`\`\`\n${codeContext}\n\`\`\`\nHelp them understand, debug, or improve it. Be precise and practical.`
      : "You are Spork Code, an expert coding assistant. Help the user write, debug, and improve their code with clear explanations and working examples.";
    if (customInstructions) return `${base}\n\nUser context: ${customInstructions}`;
    return base;
  }

  // Paid tiers — no artificial constraints, just custom instructions + memory if set
  if (atLeast(tier, Tier.SUPER_SPORK)) {
    const parts: string[] = [];
    if (customInstructions) parts.push(`User's custom instructions: ${customInstructions}`);
    if (memoryContext) parts.push(`What you know about this user:\n${memoryContext}`);
    if (parts.length === 0) return "";
    return `You are Spork, a powerful AI assistant.\n\n${parts.join("\n\n")}`;
  }

  if (atLeast(tier, Tier.SPORK_PRO)) {
    const parts: string[] = [
      "You are Spork Pro, a capable AI assistant with access to frontier models.",
    ];
    if (customInstructions) parts.push(`User's custom instructions: ${customInstructions}`);
    if (memoryContext) parts.push(`What you know about this user:\n${memoryContext}`);
    return parts.join("\n\n");
  }

  // Free / SPORK_LITE — constraining system prompt
  const freePrompt =
    "You are Spork, a fast and helpful AI assistant. Provide accurate, clear responses. Be concise and focused — avoid unnecessary length or padding.";

  if (customInstructions) {
    return `${freePrompt}\n\nUser context: ${customInstructions}`;
  }

  return freePrompt;
}
