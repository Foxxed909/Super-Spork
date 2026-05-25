import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const conversation = await db.conversation.findFirst({
    where: { id, isPublic: true },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  // Increment view count (fire-and-forget)
  db.conversation.update({
    where: { id },
    data: { views: { increment: 1 } },
  }).catch(() => {});

  return NextResponse.json(conversation);
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const conversation = await db.conversation.findFirst({
    where: { id, userId: user.id },
    select: { id: true, isPublic: true },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  const updated = await db.conversation.update({
    where: { id },
    data: { isPublic: !conversation.isPublic },
    select: { isPublic: true },
  });

  return NextResponse.json(updated);
}
