import { PostType } from "@prisma/client";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { hasClerkServerKeys } from "@/lib/clerk-server";

const VALID_POST_TYPES = new Set<string>(["TEXT", "CODE", "QUESTION", "SHOWCASE"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const type = searchParams.get("type") as PostType | null;
  const tag = searchParams.get("tag");
  const username = searchParams.get("username");

  // Validate cursor format (cuid-like: alphanumeric)
  const safeCursor = cursor && /^[a-z0-9]+$/i.test(cursor) ? cursor : undefined;

  const where = {
    isPublic: true,
    ...(type && VALID_POST_TYPES.has(type) ? { type } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(username ? { author: { username } } : {}),
  };

  const posts = await db.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20,
    ...(safeCursor ? { cursor: { id: safeCursor }, skip: 1 } : {}),
    include: {
      author: {
        select: { username: true, displayName: true, avatarUrl: true, isVerified: true, tier: true },
      },
      _count: { select: { postLikes: true } },
    },
  });

  const nextCursor = posts.length === 20 ? posts[posts.length - 1].id : null;
  return NextResponse.json({ posts, nextCursor });
}

export async function POST(req: NextRequest) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  let body: { content?: unknown; type?: unknown; conversationId?: unknown; tags?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { content, type, conversationId, tags } = body;

  if (typeof content !== "string" || content.trim().length === 0) {
    return new NextResponse("content is required", { status: 400 });
  }
  if (content.length > 1000) {
    return new NextResponse("Post must be 1000 characters or fewer", { status: 400 });
  }
  if (type && (typeof type !== "string" || !VALID_POST_TYPES.has(type))) {
    return new NextResponse("Invalid post type", { status: 400 });
  }

  // Validate tags array
  const safeTags: string[] = Array.isArray(tags)
    ? (tags as unknown[]).filter((t): t is string => typeof t === "string" && t.length <= 30).slice(0, 5)
    : [];

  // If a conversationId is provided, verify the user owns it or it's public
  if (conversationId && typeof conversationId === "string") {
    const conv = await db.conversation.findFirst({
      where: { id: conversationId, OR: [{ userId: user.id }, { isPublic: true }] },
    });
    if (!conv) return new NextResponse("Conversation not found", { status: 404 });
  }

  const post = await db.post.create({
    data: {
      authorId: user.id,
      content: content.trim(),
      type: (type as PostType) ?? PostType.TEXT,
      conversationId: typeof conversationId === "string" ? conversationId : null,
      tags: safeTags,
    },
    include: {
      author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } },
    },
  });

  return NextResponse.json(post, { status: 201 });
}
