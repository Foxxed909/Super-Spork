export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export const SPORK_TOOLS: McpTool[] = [
  {
    name: "spork_ask",
    description:
      "Ask Spork AI a question. Fast, single-turn. Great for quick lookups, explanations, second opinions, or any prompt that doesn't require file access.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The question or prompt to send to Spork" },
        agent: {
          type: "string",
          description: "Optional persona to use",
          enum: ["hacker", "dev", "senior-dev", "nerd", "cockroach", "oracle", "rubber-duck"],
        },
        model: {
          type: "string",
          description: "OpenRouter model ID (e.g. openai/gpt-oss-120b:free). Defaults to fastest free model.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "spork_review_code",
    description:
      "Get a structured code review. Returns feedback with severity levels (critical/warning/suggestion). Great for pre-commit checks, PR reviews, or getting a second opinion.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "The code to review" },
        filename: { type: "string", description: "Optional filename hint for language detection" },
        agent: { type: "string", description: "Agent persona (default: hacker)" },
      },
      required: ["code"],
    },
  },
  {
    name: "spork_explain",
    description: "Explain what a code snippet or file does in plain language.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Code to explain" },
        filePath: { type: "string", description: "Optional: path hint for context" },
        depth: {
          type: "string",
          description: "How deep to go",
          enum: ["brief", "detailed", "eli5"],
        },
      },
      required: ["code"],
    },
  },
  {
    name: "spork_fif",
    description:
      "Find, Identify, and Fix bugs in a code snippet. Returns a list of issues with suggested fixes, severity, and line numbers where possible.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Code to analyze for bugs" },
        language: { type: "string", description: "Programming language (optional)" },
        context: {
          type: "string",
          description: "Additional context about what the code is supposed to do",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "spork_generate",
    description:
      "Generate code from a description. Returns clean, working code. Optionally specify language and framework.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "What to build" },
        language: { type: "string", description: "Programming language (e.g. TypeScript, Python)" },
        framework: { type: "string", description: "Framework hint (e.g. React, FastAPI, Express)" },
      },
      required: ["description"],
    },
  },
  {
    name: "spork_save_memory",
    description:
      "Save a fact or context to your personal Spork memory. It will be injected into future Spork web sessions. Requires a Spork API token in config.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The fact or context to remember" },
      },
      required: ["content"],
    },
  },
  {
    name: "spork_list_agents",
    description: "List all available Spork AI agents and their descriptions.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];
