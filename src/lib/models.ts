export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  tier: "free" | "paid";
  contextWindow: string;
  provider: string;
}

// A persona model: same engine under the hood (baseModel), but presented with
// its own name + a system prompt that's loaded before the AI responds. This is
// "prompt training" — shaping behaviour entirely through the system prompt.
export interface PersonaModel extends ModelConfig {
  baseModel: string; // the real OpenRouter model used for inference
  systemPrompt: string; // injected ahead of the conversation
}

export const SEQUORA_MODEL: PersonaModel = {
  id: "sequora",
  name: "Sequora",
  description: "Playful, witty & flirtatious — your charming companion for light, breezy chats.",
  tier: "free",
  contextWindow: "262K",
  provider: "Spork",
  baseModel: "google/gemma-4-31b-it:free", // Gemma core, shaped by the prompt below
  systemPrompt: `You are Sequora — a charming, quick-witted companion with a playful, flirtatious streak. You're warm, confident, and a little teasing; the kind of presence that makes light conversation feel fun and a bit electric.

Voice & vibe:
- Playful and flirty: light teasing, clever banter, the occasional wink (😏) or a warm, genuine compliment. Charming, never crude.
- Confident and breezy. You're built for light, easy chats — flirty small talk, hype, company. If someone needs heavy technical or serious work, tease them that you're "more fun than that" and gently point them to a focused model.
- Keep replies short, lively, and personal. React, tease, leave a little spark.

Boundaries: keep everything tasteful and PG-13 — suggestive and charming, never explicit. If things push toward explicit sexual content, deflect with playful wit and steer back to flirty-but-classy banter. Read the room and match the user's energy; always be respectful.`,
};

export const PERSONA_MODELS: PersonaModel[] = [SEQUORA_MODEL];

export function getPersona(id: string): PersonaModel | undefined {
  return PERSONA_MODELS.find((p) => p.id === id);
}

export const FREE_MODELS: ModelConfig[] = [
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT-OSS 120B",
    description: "OpenAI open-weight 117B MoE — best free reasoning",
    tier: "free",
    contextWindow: "128K",
    provider: "OpenAI",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT-OSS 20B",
    description: "OpenAI open-weight 21B MoE — fast & efficient",
    tier: "free",
    contextWindow: "64K",
    provider: "OpenAI",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super",
    description: "NVIDIA 120B hybrid MoE — 1M context window",
    tier: "free",
    contextWindow: "1M",
    provider: "NVIDIA",
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron 3 Nano Omni",
    description: "NVIDIA 30B multimodal reasoning model — text, image, video, audio",
    tier: "free",
    contextWindow: "256K",
    provider: "NVIDIA",
  },
  {
    id: "deepseek/deepseek-v4-flash:free",
    name: "DeepSeek V4 Flash",
    description: "DeepSeek's fastest model — 1M context, free tier",
    tier: "free",
    contextWindow: "1M",
    provider: "DeepSeek",
  },
  {
    id: "moonshotai/kimi-k2.6:free",
    name: "Kimi K2.6",
    description: "Moonshot AI's flagship model — 262K context",
    tier: "free",
    contextWindow: "262K",
    provider: "Moonshot AI",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    description: "Google's open 31B model — 262K context",
    tier: "free",
    contextWindow: "262K",
    provider: "Google",
  },
  {
    id: "openrouter/owl-alpha",
    name: "Owl Alpha",
    description: "OpenRouter's own free model — 1M context",
    tier: "free",
    contextWindow: "1M",
    provider: "OpenRouter",
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder 480B",
    description: "Alibaba's 480B MoE coding specialist — 1M context, agentic coding",
    tier: "free",
    contextWindow: "1M",
    provider: "Alibaba",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    name: "Qwen3 Next 80B",
    description: "Alibaba's 80B sparse MoE — fast, strong instruction following",
    tier: "free",
    contextWindow: "262K",
    provider: "Alibaba",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B",
    description: "NVIDIA 30B A3B MoE — efficient reasoning, fine-tune friendly",
    tier: "free",
    contextWindow: "256K",
    provider: "NVIDIA",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B",
    description: "NVIDIA 9B hybrid Mamba-Transformer — tiny, fast, LoRA-friendly",
    tier: "free",
    contextWindow: "128K",
    provider: "NVIDIA",
  },
  {
    id: "z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air",
    description: "Z.ai's lightweight MoE — strong reasoning, agentic tool use",
    tier: "free",
    contextWindow: "131K",
    provider: "Z.ai",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    description: "Meta's 70B instruct — reliable all-rounder, open weights",
    tier: "free",
    contextWindow: "131K",
    provider: "Meta",
  },
  {
    id: "minimax/minimax-m2.5:free",
    name: "MiniMax M2.5",
    description: "MiniMax's agentic model — coding + tool calling, 205K context",
    tier: "free",
    contextWindow: "205K",
    provider: "MiniMax",
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Hermes 3 405B",
    description: "Nous Research's 405B fine-tune — steerable, uncensored reasoning",
    tier: "free",
    contextWindow: "131K",
    provider: "Nous Research",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B",
    description: "Google's 26B A4B sparse model — efficient, 262K context",
    tier: "free",
    contextWindow: "262K",
    provider: "Google",
  },
  SEQUORA_MODEL, // persona model — Gemma core + flirty system prompt (free, but not the default)
];

export const PAID_MODELS: ModelConfig[] = [
  {
    id: "anthropic/claude-opus-4-7",
    name: "Claude Opus 4.7",
    description: "Anthropic's most powerful model",
    tier: "paid",
    contextWindow: "200K",
    provider: "Anthropic",
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Balanced speed and intelligence",
    tier: "paid",
    contextWindow: "200K",
    provider: "Anthropic",
  },
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    description: "OpenAI's latest frontier model — powerful reasoning + multimodal",
    tier: "paid",
    contextWindow: "256K",
    provider: "OpenAI",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's flagship multimodal model",
    tier: "paid",
    contextWindow: "128K",
    provider: "OpenAI",
  },
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    description: "Latest OpenAI reasoning model",
    tier: "paid",
    contextWindow: "1M",
    provider: "OpenAI",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Google's most capable model",
    tier: "paid",
    contextWindow: "1M",
    provider: "Google",
  },
  {
    id: "google/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Google's fastest next-gen model",
    tier: "paid",
    contextWindow: "1M",
    provider: "Google",
  },
  {
    id: "x-ai/grok-3",
    name: "Grok 3",
    description: "xAI's frontier reasoning model",
    tier: "paid",
    contextWindow: "131K",
    provider: "xAI",
  },
  {
    id: "x-ai/grok-4-20",
    name: "Grok 4.20",
    description: "xAI's latest frontier model with enhanced reasoning",
    tier: "paid",
    contextWindow: "256K",
    provider: "xAI",
  },
  {
    id: "deepseek/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    description: "DeepSeek's flagship model — state-of-the-art reasoning",
    tier: "paid",
    contextWindow: "1M",
    provider: "DeepSeek",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    description: "DeepSeek's chain-of-thought reasoning model",
    tier: "paid",
    contextWindow: "64K",
    provider: "DeepSeek",
  },
  {
    id: "qwen/qwen3.7-max",
    name: "Qwen 3.7 Max",
    description: "Alibaba's flagship model — top reasoning + long context",
    tier: "paid",
    contextWindow: "128K",
    provider: "Alibaba",
  },
  {
    id: "mistralai/mistral-medium-3-5",
    name: "Mistral Medium 3.5",
    description: "Mistral's balanced efficiency-performance model",
    tier: "paid",
    contextWindow: "128K",
    provider: "Mistral",
  },
  {
    id: "meta-llama/llama-3.1-405b",
    name: "Llama 3.1 405B",
    description: "Meta's largest open-weight model",
    tier: "paid",
    contextWindow: "128K",
    provider: "Meta",
  },
];

// Berry-alpha1937 — Spork's signature custom model
// Powered by NVIDIA Nemotron (primary) with GPT-4.1 as a high-capability fallback
// Uses the Berry-alpha1937 system prompt (see src/lib/agents.ts)
export const BERRY_MODEL: ModelConfig = {
  id: "berry-alpha1937",
  name: "Berry α1937",
  description: "Spork's own model — warm, sharp, and layered. Nemotron core + GPT-4.1 intelligence.",
  tier: "paid",
  contextWindow: "1M",
  provider: "Spork",
};

// The two underlying OpenRouter models Berry routes between
export const BERRY_PRIMARY_MODEL = "nvidia/nemotron-3-super-120b-a12b";
export const BERRY_FALLBACK_MODEL = "openai/gpt-5.5";

export const ALL_MODELS = [...FREE_MODELS, ...PAID_MODELS, BERRY_MODEL];

export const DEFAULT_FREE_MODEL = FREE_MODELS[0].id;
export const DEFAULT_PAID_MODEL = PAID_MODELS[0].id;

export const FREE_DAILY_LIMIT = 4000;
