import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    select: { pinnedAt: true },
  });
  if (!conversation) return new NextResponse("Not found", { status: 404 });

  const updated = await db.conversation.update({
    where: { id },
    data: { pinnedAt: conversation.pinnedAt ? null : new Date() },
    select: { pinnedAt: true },
  });

  return NextResponse.json({ pinnedAt: updated.pinnedAt });
}
