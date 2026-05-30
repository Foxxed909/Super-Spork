import { canUseModel } from "@/lib/tier";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function POST(req: NextRequest) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { conversationId, newModel } = await req.json();
  if (
    typeof conversationId !== "string" || !conversationId.trim() ||
    typeof newModel !== "string" || !newModel.trim()
  ) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const user = await getOrCreateUser(userId);

  if (!canUseModel(user.tier, newModel)) {
    return new NextResponse("Model requires Super Spork upgrade", { status: 403 });
  }

  const original = await db.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userId: user.id }, { isPublic: true }],
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!original) return new NextResponse("Not found", { status: 404 });

  const forked = await db.conversation.create({
    data: {
      userId: user.id,
      title: `${original.title} (fork)`,
      model: newModel,
      agentId: original.agentId,
      forkedFromId: original.id,
      messages: {
        create: original.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      },
    },
  });

  return NextResponse.json(forked);
}
