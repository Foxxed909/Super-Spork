/**
 * `sporkx link` — link the local project to a Spork web account.
 * Fetches a token from GET {appUrl}/api/tokens using an interactive auth flow
 * and saves it to the local config as `sporkToken`.
 */
import * as https from "https";
import * as http from "http";
import * as readline from "readline";
import * as url from "url";
import { loadConfig, saveConfig } from "./config";

function httpGet(
  fullUrl: string,
  headers: Record<string, string>
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
      method: "GET",
      headers: {
        "Content-Type": "application/json",
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
    req.end();
  });
}

async function promptForSessionToken(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(
      "Paste your Spork session token (from https://spork.ai/settings/tokens):\n> ",
      (answer) => {
        rl.close();
        resolve(answer.trim());
      }
    );
  });
}

export async function link(): Promise<void> {
  const cfg = loadConfig();
  const appUrl = cfg.appUrl ?? "https://spork.ai";

  console.log(`\n✦ SporkX Link — connect to your Spork web account`);
  console.log(`  App URL: ${appUrl}`);
  console.log();
  console.log(`To get your token, visit: ${appUrl}/settings/tokens`);
  console.log();

  const sessionToken = await promptForSessionToken();

  if (!sessionToken) {
    console.error("No token provided. Aborting.");
    process.exit(1);
  }

  console.log("\nVerifying token...");

  try {
    const response = await httpGet(`${appUrl}/api/tokens`, {
      Authorization: `Bearer ${sessionToken}`,
    });

    if (response.status === 200) {
      let displayInfo = "";
      try {
        const json = JSON.parse(response.body) as {
          email?: string;
          name?: string;
          userId?: string;
          plan?: string;
        };
        if (json.name || json.email) {
          displayInfo = `  Account: ${json.name ?? ""}${json.name && json.email ? " <" : ""}${json.email ?? ""}${json.name && json.email ? ">" : ""}`;
        }
        if (json.plan) {
          displayInfo += `\n  Plan   : ${json.plan}`;
        }
      } catch {}

      saveConfig({ sporkToken: sessionToken });
      console.log(`\n✓ Linked successfully!`);
      if (displayInfo) console.log(displayInfo);
      console.log(
        "\nYour Spork token has been saved. Use `sporkx feedback` to send feedback to your inbox."
      );
    } else if (response.status === 401 || response.status === 403) {
      console.error(
        `\nAuthentication failed (HTTP ${response.status}). Check your token and try again.`
      );
      process.exit(1);
    } else {
      console.error(
        `\nUnexpected response from Spork API (HTTP ${response.status}): ${response.body.trim()}`
      );
      console.log(
        "\nSaving token anyway — it may work once the service is available."
      );
      saveConfig({ sporkToken: sessionToken });
      console.log("✓ Token saved.");
    }
  } catch (err) {
    // Network failure — save the token anyway so the user doesn't have to re-enter it
    console.warn(
      `\nCould not reach ${appUrl} to verify token (${err}). Saving token anyway.`
    );
    saveConfig({ sporkToken: sessionToken });
    console.log("✓ Token saved (unverified).");
  }
}
