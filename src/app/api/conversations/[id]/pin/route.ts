import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const user = await getOrCreateUser(userId);

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
