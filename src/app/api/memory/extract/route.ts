import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { atLeastPro, getMemoryLimit } from "@/lib/tier";
import { getOrCreateUser } from "@/lib/user";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

function makeOpenRouter(apiKey: string) {
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Spork",
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  if (!atLeastPro(user.tier)) {
    return new NextResponse("Spork Pro required", { status: 403 });
  }

  const { conversationId } = await req.json();
  if (typeof conversationId !== "string" || !conversationId) {
    return new NextResponse("Missing conversationId", { status: 400 });
  }

  // Verify conversation belongs to user
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  // Fetch last 30 messages
  const messages = await db.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  if (messages.length < 2) {
    return NextResponse.json({ extracted: [], saved: 0 });
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const apiKey = user.openrouterKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new NextResponse("OpenRouter not configured", { status: 500 });

  const openrouter = makeOpenRouter(apiKey);

  let facts: string[] = [];
  try {
    const { text } = await generateText({
      model: openrouter("openai/gpt-oss-20b:free"),
      prompt: `Extract 3 to 5 concise, useful facts about the user or their preferences from this conversation. Focus on personal details, goals, expertise, and preferences. Return ONLY a JSON array of strings — no explanation, no markdown fences.

Conversation:
${transcript}`,
    });

    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        facts = parsed.filter((f): f is string => typeof f === "string" && f.trim().length > 0);
      }
    }
  } catch {
    return new NextResponse("Extraction failed", { status: 502 });
  }

  if (facts.length === 0) {
    return NextResponse.json({ extracted: [], saved: 0 });
  }

  // Check memory limit
  const memoryLimit = getMemoryLimit(user.tier);
  if (memoryLimit !== null) {
    const currentCount = await db.userMemory.count({ where: { userId: user.id } });
    const available = memoryLimit - currentCount;
    if (available <= 0) {
      return NextResponse.json({ extracted: facts, saved: 0, limitReached: true });
    }
    facts = facts.slice(0, available);
  }

  // Skip exact duplicates
  const existing = await db.userMemory.findMany({
    where: { userId: user.id },
    select: { content: true },
  });
  const existingSet = new Set(existing.map((m) => m.content.toLowerCase()));
  const newFacts = facts.filter((f) => !existingSet.has(f.toLowerCase()));

  if (newFacts.length === 0) {
    return NextResponse.json({ extracted: facts, saved: 0 });
  }

  await db.userMemory.createMany({
    data: newFacts.map((content) => ({
      userId: user.id,
      content,
      sourceConvId: conversationId,
    })),
  });

  return NextResponse.json({ extracted: facts, saved: newFacts.length });
}
