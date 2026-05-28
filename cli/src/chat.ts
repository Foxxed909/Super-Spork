import * as https from "https";

const AGENTS: Record<string, string> = {
  hacker: "You are a hacker-type AI. Blunt, technical, no fluff. Think terminal, not boardroom.",
  dev: "You are a developer assistant. Practical, code-focused, no unnecessary talk.",
  cockroach: "You are the Cockroach — indestructible, scrappy, always finding a way. Speak with attitude.",
  nerd: "You are a passionate tech nerd. Enthusiastic, deep dives, loves explaining things thoroughly.",
  oracle: "You are the Oracle. Wise, measured, speaks in principles and patterns.",
};

interface ChatOptions {
  prompt: string;
  model: string;
  apiKey?: string;
  agentId?: string;
  stream?: boolean;
}

export async function chat(opts: ChatOptions): Promise<void> {
  const { prompt, model, apiKey, agentId, stream = true } = opts;

  const systemPrompt = agentId && AGENTS[agentId]
    ? AGENTS[agentId]
    : "You are Spork, a fast and helpful AI assistant. Be concise and accurate.";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const key = apiKey ?? process.env.OPENROUTER_API_KEY ?? "";
  if (!key) {
    console.error(
      "No API key. Run `spork login <your-openrouter-key>` or set OPENROUTER_API_KEY."
    );
    process.exit(1);
  }

  const body = JSON.stringify({
    model,
    messages,
    stream,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://spork.ai",
          "X-Title": "Spork CLI",
        },
      },
      (res) => {
        // Bug 11: check HTTP status before parsing stream
        if (res.statusCode && res.statusCode >= 400) {
          let errBody = "";
          res.on("data", (c: Buffer) => { errBody += c.toString(); });
          res.on("end", () => {
            console.error(`Error ${res.statusCode}: ${errBody.trim() || "Request failed"}`);
            process.exit(1);
          });
          return;
        }
        if (stream) {
          let buffer = "";
          res.on("data", (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === "data: [DONE]") continue;
              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) process.stdout.write(delta);
                } catch {}
              }
            }
          });
          res.on("end", () => {
            process.stdout.write("\n");
            resolve();
          });
          res.on("error", reject);
        } else {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.message?.content ?? "";
              console.log(content);
            } catch {
              console.error("Failed to parse response:", data);
            }
            resolve();
          });
          res.on("error", reject);
        }
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
