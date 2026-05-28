import * as https from "https";
import { DEFAULT_MODEL } from "../config";

export async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  model = DEFAULT_MODEL,
  apiKey: string
): Promise<string> {
  const body = JSON.stringify({ model, messages, stream: false });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://spork.ai",
          "X-Title": "Spork MCP",
        },
      },
      (res) => {
        let data = "";
        if (res.statusCode && res.statusCode >= 400) {
          res.on("data", (c: Buffer) => { data += c.toString(); });
          res.on("end", () => reject(new Error(`OpenRouter error ${res.statusCode}: ${data}`)));
          return;
        }
        res.on("data", (c: Buffer) => { data += c.toString(); });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.choices?.[0]?.message?.content ?? "");
          } catch {
            reject(new Error("Failed to parse OpenRouter response"));
          }
        });
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
