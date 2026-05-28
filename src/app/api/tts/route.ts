import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-helper";
import { atLeastPro } from "@/lib/tier";

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  if (!atLeastPro(user.tier)) {
    return new NextResponse("Spork Pro or higher required for high-quality TTS", { status: 403 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return new NextResponse("text is required", { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new NextResponse("TTS not configured", { status: 503 });
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text.slice(0, 4096),
      voice: "alloy",
    }),
  });

  if (!res.ok) {
    return new NextResponse("TTS service error", { status: 502 });
  }

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Transfer-Encoding": "chunked",
    },
  });
}
