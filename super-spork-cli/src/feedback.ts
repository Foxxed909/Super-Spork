/**
 * `sporkx feedback <subject>` — submit feedback or complaints to the Spork web inbox.
 * Calls POST {appUrl}/api/feedback with optional bearer auth.
 */
import * as https from "https";
import * as http from "http";
import * as readline from "readline";
import * as url from "url";
import { loadConfig } from "./config";

export type FeedbackType = "bug" | "feature" | "complaint" | "general";

export interface FeedbackOptions {
  subject: string;
  type?: FeedbackType;
  /** Body text — if not provided, user is prompted interactively */
  body?: string;
}

function httpRequest(
  fullUrl: string,
  method: string,
  headers: Record<string, string>,
  body: string
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(fullUrl);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;

    const options: https.RequestOptions = {
      hostname: parsed.hostname ?? "",
      port: parsed.port
        ? parseInt(parsed.port, 10)
        : isHttps
        ? 443
        : 80,
      path: parsed.path ?? "/",
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString(),
        ...headers,
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      res.on("error", reject);
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function promptForBody(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "Enter feedback body (press Enter twice to finish):\n> ",
      (firstLine) => {
        const lines: string[] = [firstLine];
        rl.on("line", (line) => {
          if (line === "" && lines[lines.length - 1] === "") {
            rl.close();
            resolve(lines.join("\n").trimEnd());
          } else {
            lines.push(line);
          }
        });
        // Handle case where user just hits Enter once
        rl.on("close", () => {
          resolve(lines.join("\n").trimEnd());
        });
      }
    );
  });
}

async function promptForType(): Promise<FeedbackType> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "Feedback type [bug/feature/complaint/general] (default: general): ",
      (answer) => {
        rl.close();
        const valid: FeedbackType[] = ["bug", "feature", "complaint", "general"];
        const trimmed = answer.trim().toLowerCase() as FeedbackType;
        resolve(valid.includes(trimmed) ? trimmed : "general");
      }
    );
  });
}

export async function feedback(opts: FeedbackOptions): Promise<void> {
  const cfg = loadConfig();
  const appUrl = cfg.appUrl ?? "https://spork.ai";

  console.log(`\n✦ SporkX Feedback\n  Subject: ${opts.subject}\n`);

  const type: FeedbackType = opts.type ?? (await promptForType());

  let body = opts.body;
  if (!body) {
    body = await promptForBody();
  }

  if (!body.trim()) {
    console.error("Feedback body cannot be empty.");
    process.exit(1);
  }

  const payload = JSON.stringify({
    type,
    subject: opts.subject,
    body: body.trim(),
    source: "CLI",
  });

  const authHeaders: Record<string, string> = {};
  if (cfg.sporkToken) {
    authHeaders["Authorization"] = `Bearer ${cfg.sporkToken}`;
  }

  const endpoint = `${appUrl}/api/feedback`;
  console.log(`\nSubmitting to ${endpoint}...`);

  try {
    const response = await httpRequest(endpoint, "POST", authHeaders, payload);

    if (response.status >= 200 && response.status < 300) {
      console.log(`✓ Feedback submitted successfully (HTTP ${response.status}).`);
      try {
        const json = JSON.parse(response.body) as { message?: string; id?: string };
        if (json.message) console.log(`  ${json.message}`);
        if (json.id) console.log(`  Reference ID: ${json.id}`);
      } catch {}
    } else {
      console.error(
        `Failed to submit feedback. HTTP ${response.status}: ${response.body.trim() || "Unknown error"}`
      );
      process.exit(1);
    }
  } catch (err) {
    console.error(`Network error submitting feedback: ${err}`);
    process.exit(1);
  }
}
