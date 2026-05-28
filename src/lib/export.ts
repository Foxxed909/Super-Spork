export interface ExportMessage {
  role: string;
  content: string;
}

export function exportAsMarkdown(title: string, messages: ExportMessage[]): string {
  const lines = [`# ${title}`, "", `*Exported from Spork — ${new Date().toLocaleDateString()}*`, ""];
  for (const msg of messages) {
    if (msg.role === "system") continue;
    lines.push(`**${msg.role === "user" ? "You" : "Spork"}:**`, "", msg.content, "");
  }
  return lines.join("\n");
}

export function exportAsJSON(title: string, messages: ExportMessage[]): string {
  return JSON.stringify({ title, exportedAt: new Date().toISOString(), messages }, null, 2);
}

export function exportAsJSONL(messages: ExportMessage[]): string {
  // OpenAI fine-tune format — one JSON object per line
  const pairs: Array<{ messages: ExportMessage[] }> = [];
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === "user" && messages[i + 1]?.role === "assistant") {
      pairs.push({ messages: [messages[i], messages[i + 1]] });
    }
  }
  return pairs.map((p) => JSON.stringify(p)).join("\n");
}

export function exportAsHTML(title: string, messages: ExportMessage[]): string {
  const msgHtml = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const isUser = m.role === "user";
      const escaped = m.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      return `<div class="msg ${isUser ? "user" : "assistant"}"><strong>${isUser ? "You" : "Spork"}</strong><p>${escaped}</p></div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;background:#0f0f0f;color:#f5f5f5}
    h1{font-size:1.5rem;margin-bottom:4px}
    .meta{font-size:0.75rem;color:#888;margin-bottom:32px}
    .msg{margin-bottom:20px;padding:14px 18px;border-radius:14px}
    .msg strong{font-size:0.75rem;text-transform:uppercase;letter-spacing:.05em;color:#888;display:block;margin-bottom:6px}
    .msg p{margin:0;line-height:1.6;font-size:0.9rem}
    .msg.user{background:#1e1b3a;border:1px solid #3d35a0}
    .msg.assistant{background:#1a1a1a;border:1px solid #2a2a2a}
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Exported from Spork on ${new Date().toLocaleDateString()}</p>
  ${msgHtml}
</body>
</html>`;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
