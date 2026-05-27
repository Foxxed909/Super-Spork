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
    id: "google/gemma-2-9b-it:free",
    name: "Gemma 2 9B",
    description: "Google's open 9B model — fast and capable",
    tier: "free",
    contextWindow: "8K",
    provider: "Google",
  },
  {
    id: "microsoft/phi-3-mini-128k-instruct:free",
    name: "Phi-3 Mini",
    description: "Microsoft's compact model with 128K context",
    tier: "free",
    contextWindow: "128K",
    provider: "Microsoft",
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
    id: "x-ai/grok-3",
    name: "Grok 3",
    description: "xAI's frontier reasoning model",
    tier: "paid",
    contextWindow: "131K",
    provider: "xAI",
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
    id: "meta-llama/llama-3.1-405b",
    name: "Llama 3.1 405B",
    description: "Meta's largest open-weight model",
    tier: "paid",
    contextWindow: "128K",
    provider: "Meta",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    description: "DeepSeek's chain-of-thought reasoning model",
    tier: "paid",
    contextWindow: "64K",
    provider: "DeepSeek",
  },
];

export const ALL_MODELS = [...FREE_MODELS, ...PAID_MODELS];

export const DEFAULT_FREE_MODEL = FREE_MODELS[0].id;
export const DEFAULT_PAID_MODEL = PAID_MODELS[0].id;

export const FREE_DAILY_LIMIT = 4000;
