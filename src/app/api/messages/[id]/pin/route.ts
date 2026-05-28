import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth-helper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveUser(req);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const message = await db.message.findUnique({
    where: { id },
    include: { conversation: { select: { userId: true } } },
  });
  if (!message || message.conversation.userId !== user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const updated = await db.message.update({
    where: { id },
    data: { pinned: !message.pinned },
    select: { pinned: true },
  });

  return NextResponse.json({ pinned: updated.pinned });
}
