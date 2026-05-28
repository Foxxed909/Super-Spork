export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  tier: "free" | "paid";
  contextWindow: string;
  provider: string;
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
