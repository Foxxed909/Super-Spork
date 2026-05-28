import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-helper";
import { atLeastSuperSpork } from "@/lib/tier";

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  if (!atLeastSuperSpork(user.tier)) {
    return new NextResponse("Super Spork or higher required for Whisper STT", { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new NextResponse("STT not configured", { status: 503 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return new NextResponse("audio file is required", { status: 400 });
  }

  const whisperForm = new FormData();
  whisperForm.append("file", audio, "audio.webm");
  whisperForm.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: whisperForm,
  });

  if (!res.ok) {
    return new NextResponse("STT service error", { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ text: data.text ?? "" });
}
