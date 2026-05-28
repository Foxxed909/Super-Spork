import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const conversation = await db.conversation.findFirst({
    where: { id, isPublic: true },
    select: { id: true, likes: true },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  const like = await db.conversationLike.findUnique({
    where: { userId_conversationId: { userId: user.id, conversationId: id } },
  });

  return NextResponse.json({ likes: conversation.likes, likedByMe: !!like });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const conversation = await db.conversation.findFirst({
    where: { id, isPublic: true },
    select: { id: true, likes: true },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  // Check if already liked
  const existing = await db.conversationLike.findUnique({
    where: { userId_conversationId: { userId: user.id, conversationId: id } },
  });

  if (existing) {
    // Already liked — return current state silently
    return NextResponse.json({ likes: conversation.likes, likedByMe: true });
  }

  // Create like + increment counter atomically
  const [, updated] = await db.$transaction([
    db.conversationLike.create({
      data: { userId: user.id, conversationId: id },
    }),
    db.conversation.update({
      where: { id },
      data: { likes: { increment: 1 } },
      select: { likes: true },
    }),
  ]);

  return NextResponse.json({ likes: updated.likes, likedByMe: true });
}
