import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const user = await getOrCreateUser(userId);

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

  const user = await getOrCreateUser(userId);

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
