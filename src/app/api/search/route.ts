import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function GET(req: NextRequest) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const user = await getOrCreateUser(userId);

  const messages = await db.message.findMany({
    where: {
      conversation: { userId: user.id },
      content: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      content: true,
      role: true,
      conversation: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const results = messages.map((m) => ({
    messageId: m.id,
    conversationId: m.conversation.id,
    conversationTitle: m.conversation.title,
    role: m.role,
    excerpt: m.content.slice(0, 120),
  }));

  return NextResponse.json(results);
}
