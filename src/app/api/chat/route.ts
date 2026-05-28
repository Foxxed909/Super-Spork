import { auth } from "@clerk/nextjs/server";
import { streamText, type CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { canUseModel, hasReachedDailyLimit, getSystemPrompt } from "@/lib/tier";
import { BERRY_MODEL, BERRY_PRIMARY_MODEL, BERRY_FALLBACK_MODEL } from "@/lib/models";
import { getAgent } from "@/lib/agents";
import { hasClerkServerKeys } from "@/lib/clerk-server";
import { getOrCreateUser } from "@/lib/user";

// Resolve Berry-alpha1937 virtual model to its actual OpenRouter backend
function resolveModel(model: string, agentId?: string): string {
  if (model === BERRY_MODEL.id) {
    // If the Berry agent is selected, use the primary Nemotron model
    // Fall back to GPT-4.1 if Nemotron is unavailable (handled at request level)
    return agentId === "berry" ? BERRY_PRIMARY_MODEL : BERRY_FALLBACK_MODEL;
  }
  return model;
}

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
  if (!hasClerkServerKeys()) {
    return new Response("Clerk is not configured for this local run", { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: Array<{ role: string; content: string }>,
    model: string,
    conversationId: string | undefined,
    agentId: string | undefined,
    codeContext: string | undefined,
    sporkCode: boolean | undefined,
    canvas: boolean | undefined;

  try {
    ({ messages, model, conversationId, agentId, codeContext, sporkCode, canvas } =
      await req.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return new Response("Missing required fields", { status: 400 });
  }

  // Atomic: check limit + increment inside transaction to prevent race condition
  let user;
  try {
    user = await db.$transaction(async (tx) => {
      const u = await tx.user.upsert({
        where: { clerkId: userId },
        update: {},
        create: { clerkId: userId, email: `${userId}@clerk.local` },
      });
      if (!canUseModel(u.tier, model)) throw new Error("model_forbidden");
      if (hasReachedDailyLimit(u.tier, u.dailyMessages, u.lastReset))
        throw new Error("limit_reached");

      const now = new Date();
      const isNewDay =
        now.toDateString() !== new Date(u.lastReset).toDateString();

      return tx.user.update({
        where: { id: u.id },
        data: {
          dailyMessages: isNewDay ? 1 : { increment: 1 },
          lastReset: isNewDay ? now : u.lastReset,
        },
      });
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "user_not_found") return new Response("User not found", { status: 404 });
    if (msg === "model_forbidden")
      return new Response("Model requires Super Spork upgrade", { status: 403 });
    if (msg === "limit_reached")
      return new Response("Daily message limit reached", { status: 429 });
    return new Response("Internal error", { status: 500 });
  }

  // Fetch memories for Super Spork users to inject into context
  let memoryContext: string | undefined;
  if (user.tier === "SUPER_SPORK") {
    const memories = await db.userMemory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    if (memories.length > 0) {
      memoryContext = memories.map((m) => `- ${m.content}`).join("\n");
    }
  }

  const systemContent = getSystemPrompt(user.tier, {
    agentId,
    customInstructions: user.customInstructions,
    codeContext,
    sporkCode,
    canvas,
    memoryContext,
  });

  const allMessages: CoreMessage[] = systemContent
    ? [{ role: "system", content: systemContent }, ...(messages as CoreMessage[])]
    : (messages as CoreMessage[]);

  const apiKey = user.openrouterKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response("OpenRouter API key not configured", { status: 500 });
  }
  const openrouter = makeOpenRouter(apiKey);

  // Resolve Berry virtual model to actual OpenRouter backend
  const resolvedModel = resolveModel(model, agentId);

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;

  if (conversationId && lastUserMessage) {
    await db.message.create({
      data: { conversationId, role: "user", content: lastUserMessage },
    });
  }

  try {
    const result = streamText({
      model: openrouter(resolvedModel),
      messages: allMessages,
      onFinish: async ({ text }) => {
        if (conversationId && text) {
          await db.message.create({
            data: { conversationId, role: "assistant", content: text },
          });

          // Atomic sentinel update prevents title race condition (Bug 7)
          if (lastUserMessage) {
            await db.conversation.updateMany({
              where: { id: conversationId, title: "New conversation" },
              data: { title: lastUserMessage.slice(0, 60) },
            });
          }
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (e) {
    console.error("OpenRouter error:", e);
    return new Response("AI service error", { status: 502 });
  }
}
