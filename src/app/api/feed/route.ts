import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "new";
  const cursor = searchParams.get("cursor");
  const take = 20;

  const orderBy =
    filter === "top"
      ? [{ likes: "desc" as const }, { views: "desc" as const }]
      : [{ updatedAt: "desc" as const }];

  // Validate cursor format (cuid: lowercase alphanumeric)
  const safeCursor = cursor && /^[a-z0-9]+$/i.test(cursor) ? cursor : undefined;

  let conversations;
  try {
    conversations = await db.conversation.findMany({
      where: { isPublic: true },
      orderBy,
      take,
      ...(safeCursor ? { skip: 1, cursor: { id: safeCursor } } : {}),
      select: {
        id: true,
        title: true,
        model: true,
        agentId: true,
        likes: true,
        views: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: { content: true, role: true },
        },
        user: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } },
      },
    });
  } catch {
    return NextResponse.json({ conversations: [], nextCursor: null });
  }

  const nextCursor =
    conversations.length === take
      ? conversations[conversations.length - 1].id
      : null;

  return NextResponse.json({ conversations, nextCursor });
}
